"""Generate illustrative half-hourly households, detect electric cars and home batteries, cluster, and score.

Run: uv run --with numpy --with scikit-learn scripts/ev-battery-detection/build.py
Writes src/projects/ev-battery-detection/data.json. All households are synthetic.
"""
import json
from pathlib import Path

import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics import adjusted_rand_score, silhouette_score
from sklearn.tree import DecisionTreeClassifier, export_text

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "src" / "projects" / "ev-battery-detection" / "data.json"

SEED = 20260709
DAYS = 30            # noon-to-noon days in the month
SLOTS = 48           # half hours per day; slot 0 is 12:00 to 12:30
PER_TYPE = 300
TDCV_KWH = 2500      # Ofgem medium single-rate electricity TDCV from 1 July 2026, kWh a year
NOISE = 0.25         # default sd of the multiplicative log-noise on household base load

TYPES = ["Ordinary", "Immersion heater", "Car, 7 kW", "Car, 3.6 kW", "Battery", "Car and battery"]
SOLAR_TYPE = "Solar and battery"
HAS_EV = {"Car, 7 kW", "Car, 3.6 kW", "Car and battery"}
HAS_BAT = {"Battery", "Car and battery", SOLAR_TYPE}
CLASSES = ["Neither", "Car", "Battery", "Both"]


def clock(slot):
    """Return the clock hour (0 to 24) at the start of a noon-to-noon slot."""
    return (12 + slot / 2) % 24


HOUR = np.array([clock(s) for s in range(SLOTS)])
NIGHT = np.array([(h >= 23.5) or (h < 5.5) for h in HOUR])          # 23:30 to 05:30, a common off-peak window
EVENING = np.array([16 <= h < 23 for h in HOUR])                     # 16:00 to 23:00
MIDDAY = np.array([10 <= h < 16 for h in HOUR])
NIGHT_START = int(np.where(HOUR == 23.5)[0][0])                     # slot 23


def base_day(rng, daily, noise):
    """Return one day's household load (kWh per slot) from two bumps, a floor and appliance spikes."""
    m, e = rng.normal(7.5, 0.7), rng.normal(18.5, 0.8)
    dist = lambda c: np.minimum(np.abs(HOUR - c), 24 - np.abs(HOUR - c))
    shape = 0.35 + 1.0 * np.exp(-0.5 * (dist(m) / 1.2) ** 2) + 1.7 * np.exp(-0.5 * (dist(e) / 2.0) ** 2)
    shape[NIGHT] *= 0.55
    shape = shape / shape.sum() * daily
    spikes = rng.random(SLOTS) < 0.06 * (1 - 0.7 * NIGHT)
    shape = shape + spikes * rng.uniform(0.2, 0.8, SLOTS)
    return shape * np.exp(rng.normal(0, noise, SLOTS))


def ev_session(rng, power):
    """Return (start slot offset, energy kWh) for one overnight charge; start is fractional for the random delay."""
    start = NIGHT_START + rng.choice([0, 1, 2, 3]) + rng.uniform(0, 0.33)
    return start, rng.uniform(7, 30)


def add_block(load, start, energy, kwh_per_slot):
    """Add a flat block of `kwh_per_slot` from fractional slot `start` until `energy` is delivered."""
    t, left = start, energy
    while left > 1e-6 and t < SLOTS:
        s = int(t)
        frac = min(1 - (t - s), left / kwh_per_slot)
        load[s] += frac * kwh_per_slot
        left -= frac * kwh_per_slot
        t = s + 1
    return load


def household(rng, kind, noise):
    """Return a DAYS x SLOTS import matrix (kWh), NaN for missing reads."""
    daily_mean = TDCV_KWH / 365 * rng.lognormal(0, 0.3)
    ev_power = {"Car, 7 kW": 7.0, "Car, 3.6 kW": 3.6, "Car and battery": rng.choice([3.6, 7.0])}.get(kind)
    ev_rate = rng.uniform(0.03, 0.6)                                # share of nights the car charges
    cap = rng.uniform(3, 10)                                        # battery usable kWh
    topup_rate = rng.uniform(0.5, 1.0)                              # share of nights the battery fills from the grid
    bat_kw = rng.uniform(2.5, 3.5)
    away = np.zeros(DAYS, bool)
    if rng.random() < 0.2:
        a = rng.integers(0, DAYS - 3)
        away[a:a + rng.integers(3, 12)] = True
    heater_start = NIGHT_START + rng.integers(2, 6)
    heater_rate = rng.uniform(0.6, 1.0)                             # thermostat: some nights the tank is still hot
    X = np.zeros((DAYS, SLOTS))
    for d in range(DAYS):
        load = base_day(rng, daily_mean * rng.lognormal(0, 0.15), noise)
        if away[d]:
            load = np.full(SLOTS, rng.uniform(0.04, 0.09)) * np.exp(rng.normal(0, noise / 2, SLOTS))
        gen = np.zeros(SLOTS)
        if kind == SOLAR_TYPE:
            gen = np.clip(np.cos((HOUR - 13) / 7 * np.pi), 0, None) * rng.uniform(0.3, 1.6)   # kWh per slot
        net = np.maximum(load - gen, 0)
        surplus = np.maximum(gen - load, 0)
        if kind in HAS_BAT:
            soc = 0.0 if kind != SOLAR_TYPE else cap * 0.2
            # Night top-up from the grid on battery tariffs (not for the solar home in summer).
            if kind != SOLAR_TYPE and rng.random() < topup_rate:
                need = cap * rng.uniform(0.8, 1.0)
                net = add_block(net, NIGHT_START + 1 + rng.uniform(0, 1), need, bat_kw / 2)
                soc = need
            order = list(range(NIGHT_START + 12, SLOTS)) + list(range(0, NIGHT_START))   # 05:30 onwards
            for s in order:
                if kind == SOLAR_TYPE:
                    soc = min(cap, soc + surplus[s] * 0.9)
                if 16 <= HOUR[s] < 23.5 or (kind == SOLAR_TYPE and not NIGHT[s]) or (6 <= HOUR[s] < 9):
                    use = min(net[s], soc, bat_kw / 2)
                    net[s] -= use
                    soc -= use
            net = np.maximum(net, 0) + 0.005
        if kind == "Immersion heater" and rng.random() < heater_rate:
            net = add_block(net, heater_start, rng.uniform(3, 7), 1.5)
        if ev_power and not away[d] and rng.random() < ev_rate:
            st, en = ev_session(rng, ev_power)
            net = add_block(net, st, en, ev_power / 2)
        X[d] = net
    X[rng.random(X.shape) < 0.01] = np.nan
    return X


# ---------- detectors ----------
UNOCC_KWH = 1.6      # a day importing less than this is treated as unoccupied
MIN_SLOTS = 44       # a day needs at least this many of its 48 reads
MIN_DAYS = 7         # a household needs at least this many usable days
BLOCK_KWH = 1.2      # slot excess that counts as part of a charging block (2.4 kW)
HIGH_KWH = 2.9       # median block level for a high-power charge (5.8 kW)
BLOCK_MIN = 3        # slots
BLOCK_ENERGY = 5.0   # kWh of excess in a block
FLAT_CV = 0.25       # coefficient of variation of interior excess
NEAR_ZERO = 0.03     # kWh in a half hour that counts as near-zero import


def blocks(excess):
    """Return flat runs (start, end) where excess stays above BLOCK_KWH long and flat enough to be a charger."""
    out, s = [], None
    above = np.nan_to_num(excess) >= BLOCK_KWH
    for i, a in enumerate(list(above) + [False]):
        if a and s is None:
            s = i
        if not a and s is not None:
            run = excess[s:i]
            core = run[1:-1] if len(run) >= 4 else run
            if len(run) >= BLOCK_MIN and np.nansum(run) >= BLOCK_ENERGY and np.nanstd(core) / np.nanmean(core) <= FLAT_CV:
                out.append((s, i))
            s = None
    return out


def features(X):
    """Return detector features and plain-English reasons for one household."""
    good = (np.isfinite(X).sum(1) >= MIN_SLOTS)
    kwh = np.nansum(X, 1) * SLOTS / np.maximum(np.isfinite(X).sum(1), 1)
    occ = good & (kwh >= UNOCC_KWH)
    f = {"usable": int(good.sum()), "occupied_share": float(occ.sum() / max(good.sum(), 1))}
    D = X[occ]
    if len(D) < MIN_DAYS:
        return None
    med = np.nanmedian(D)
    recur = np.nanpercentile(D, 20, axis=0)             # each slot's recurring floor across days
    charge = high = 0
    for day in D:
        raw = blocks(day - med)
        resid = blocks(day - np.maximum(recur, med))
        level = lambda a, b: np.nanmedian(day[a:b][1:-1] if b - a >= 4 else day[a:b]) - med
        is_high = any(level(a, b) >= HIGH_KWH for a, b in raw)
        # A raw block counts only at high power; slower loads must survive removal of the recurring profile.
        if resid or is_high:
            charge += 1
        high += is_high
    ev_part = D[:, EVENING]
    nz = float(np.mean(ev_part[np.isfinite(ev_part)] <= NEAR_ZERO))
    night_excess = np.nansum(np.clip(D[:, NIGHT] - med, 0, None), 1)
    topup = float(np.percentile(night_excess, 20))
    day = np.nanmedian(D, 0)
    f.update(charge_days=charge, high_days=high, charge_share=charge / len(D), evening_nz=nz, topup=topup,
             kwh=float(np.median(kwh[occ])), shape=day / day.sum(),
             evening=float(day[EVENING].sum() / day.sum()), night=float(day[NIGHT].sum() / day.sum()),
             midday=float(day[MIDDAY].sum() / day.sum()), peak_mean=float(day.max() / day.mean()))
    return f


def scores(f):
    """Return (ev score, battery score, reasons) on a 0 to 1 scale."""
    ev = 0.5 * (f["charge_days"] >= 3) + 0.3 * (f["high_days"] >= 2) + 0.2 * (f["charge_share"] <= 0.8)
    bat = 0.6 if f["evening_nz"] >= 0.4 else 0.3 if f["evening_nz"] >= 0.2 else 0.0
    bat += 0.4 * (f["topup"] >= 2.5)
    if f["occupied_share"] < 0.5:
        bat = min(bat, 0.45)
    reasons = []
    if f["charge_days"] >= 3:
        reasons.append(f"flat charging blocks on {f['charge_days']} nights")
    if f["evening_nz"] >= 0.2:
        reasons.append(f"{f['evening_nz']:.0%} of evening half hours near zero")
    if f["topup"] >= 2.5:
        reasons.append(f"night top-up of {f['topup']:.1f} kWh on most nights")
    return ev, bat, reasons


def cls(ev, bat):
    """Return the four-way class index from two flags."""
    return int(ev) + 2 * int(bat)


def simulate(noise, solar, seed=SEED):
    """Build the population at one noise level and return per-household rows."""
    rng = np.random.default_rng(seed)
    kinds = [k for k in TYPES for _ in range(PER_TYPE)] + ([SOLAR_TYPE] * PER_TYPE if solar else [])
    rows = []
    for k in kinds:
        X = household(rng, k, noise)
        f = features(X)
        if f is None:
            rows.append({"kind": k, "f": None, "ev": 0.0, "bat": 0.0, "X": X})
            continue
        ev, bat, why = scores(f)
        rows.append({"kind": k, "f": f, "ev": ev, "bat": bat, "why": why, "X": X})
    return rows


def pr(rows, device, thr):
    """Return (precision, recall, false positive rate) for one device at one flag threshold."""
    truth = np.array([r["kind"] in (HAS_EV if device == "ev" else HAS_BAT) for r in rows])
    pred = np.array([r[device] >= thr for r in rows])
    tp, fp, fn = (truth & pred).sum(), (~truth & pred).sum(), (truth & ~pred).sum()
    return tp / max(tp + fp, 1), tp / max(tp + fn, 1), fp / max((~truth).sum(), 1)


def boot(rows, device, thr, n=1000, seed=1):
    """Return 95% bootstrap intervals (resampling households) for precision and recall."""
    rng = np.random.default_rng(seed)
    P, R = [], []
    for _ in range(n):
        p, r, _ = pr([rows[i] for i in rng.integers(0, len(rows), len(rows))], device, thr)
        P.append(p)
        R.append(r)
    return np.percentile(P, [2.5, 97.5]).tolist(), np.percentile(R, [2.5, 97.5]).tolist()


def main():
    """Run the whole pipeline and write the page data."""
    rows = simulate(NOISE, solar=False)
    facts = {"households": len(rows), "per_type": PER_TYPE, "days": DAYS, "tdcv": TDCV_KWH,
             "daily_kwh_anchor": round(TDCV_KWH / 365, 2)}
    facts["dropped"] = sum(r["f"] is None for r in rows)

    # Typical-day shapes per type: median and 10th to 90th percentile of households' median days.
    shapes = {}
    for k in TYPES:
        med_days = np.array([np.nanmedian(r["X"], 0) for r in rows if r["kind"] == k])
        shapes[k] = {"mid": np.round(np.median(med_days, 0) * 2, 3).tolist(),            # kW
                     "lo": np.round(np.percentile(med_days, 10, 0) * 2, 3).tolist(),
                     "hi": np.round(np.percentile(med_days, 90, 0) * 2, 3).tolist()}

    # Example households for the heat map (first of each chosen type with an away spell for the battery one).
    examples = {}
    for k in ["Car, 7 kW", "Immersion heater", "Battery", "Car and battery"]:
        r = next(r for r in rows if r["kind"] == k and r["f"] is not None and r["f"]["occupied_share"] == 1)
        examples[k] = {"kwh": [[None if not np.isfinite(v) else round(float(v), 2) for v in day] for day in r["X"]],
                       "why": r["why"]}

    # Distribution of evening near-zero share by battery status.
    edges = np.linspace(0, 1, 21)
    hist = {}
    for name, test in [("Battery", lambda k: k in HAS_BAT), ("No battery", lambda k: k not in HAS_BAT)]:
        v = [r["f"]["evening_nz"] for r in rows if r["f"] and test(r["kind"])]
        n, _ = np.histogram(v, edges)
        hist[name] = [{"x0": round(edges[i], 2), "x1": round(edges[i + 1], 2), "n": int(n[i])} for i in range(20)]
    facts["nobat_evening_nz_p99"] = round(float(np.percentile(
        [r["f"]["evening_nz"] for r in rows if r["f"] and r["kind"] not in HAS_BAT], 99)), 3)
    facts["bat_evening_nz_median"] = round(float(np.median(
        [r["f"]["evening_nz"] for r in rows if r["f"] and r["kind"] in HAS_BAT])), 2)

    # Confusion matrices: core population and with solar-plus-battery homes added.
    def confusion(rr):
        M = np.zeros((4, 4), int)
        for r in rr:
            t = cls(r["kind"] in HAS_EV, r["kind"] in HAS_BAT)
            M[t, cls(r["ev"] >= 0.5, r["bat"] >= 0.5)] += 1
        return M
    rows_solar = simulate(NOISE, solar=True)
    conf = {"Core types": confusion(rows).tolist(), "With solar and battery": confusion(rows_solar).tolist()}
    solar_rows = [r for r in rows_solar if r["kind"] == SOLAR_TYPE]
    facts["solar_bat_recall"] = round(float(np.mean([r["bat"] >= 0.5 for r in solar_rows])), 2)
    facts["solar_low_occ"] = round(float(np.mean([(r["f"] is None) or r["f"]["occupied_share"] < 0.5 for r in solar_rows])), 2)

    # Precision and recall with bootstrap intervals, by device and by type.
    table = []
    for dev, name in [("ev", "Car"), ("bat", "Battery")]:
        for label, rr in [("Core types", rows), ("With solar and battery", rows_solar)]:
            p, r, fpr = pr(rr, dev, 0.5)
            (plo, phi), (rlo, rhi) = boot(rr, dev, 0.5)
            table.append({"device": name, "population": label, "precision": round(100 * p, 1),
                          "p_lo": round(100 * plo, 1), "p_hi": round(100 * phi, 1), "recall": round(100 * r, 1),
                          "r_lo": round(100 * rlo, 1), "r_hi": round(100 * rhi, 1), "fpr": round(100 * fpr, 2)})
    core = {(t["device"], t["population"]): t for t in table}
    facts["ev_p"], facts["ev_r"] = core[("Car", "Core types")]["precision"], core[("Car", "Core types")]["recall"]
    facts["bat_p"], facts["bat_r"] = core[("Battery", "Core types")]["precision"], core[("Battery", "Core types")]["recall"]
    facts["ev_r_lo"], facts["ev_r_hi"] = core[("Car", "Core types")]["r_lo"], core[("Car", "Core types")]["r_hi"]
    facts["bat_r_solar"] = core[("Battery", "With solar and battery")]["recall"]
    by_type = {}
    for k in TYPES:
        rr = [r for r in rows if r["kind"] == k]
        by_type[k] = {"ev": round(100 * np.mean([r["ev"] >= 0.5 for r in rr]), 1),
                      "bat": round(100 * np.mean([r["bat"] >= 0.5 for r in rr]), 1)}
    facts["by_type"] = by_type
    facts["by_type_strict"] = {k: round(100 * np.mean([r["ev"] >= 0.8 for r in rows if r["kind"] == k]), 1) for k in TYPES}
    # Precision at a lower prevalence, from recall and false positive rate (Bayes' rule).
    for dev, key in [("ev", "Car"), ("bat", "Battery")]:
        _, r, fpr = pr(rows, dev, 0.5)
        fpr = max(fpr, 0.5 / sum(1 for x in rows if x["kind"] not in (HAS_EV if dev == "ev" else HAS_BAT)))
        prev = 0.05
        facts[f"{dev}_p_at_5pct"] = round(100 * r * prev / (r * prev + fpr * (1 - prev)), 1)
        facts[f"{dev}_fpr"] = round(100 * fpr, 2)

    # Noise sweep: precision and recall at each threshold.
    noises = [0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1.0]
    thresholds = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8]
    sweep = {"noise": noises, "thresholds": thresholds, "ev": {}, "bat": {}}
    sims = {n: rows if n == NOISE else simulate(n, solar=False) for n in noises}
    for dev in ["ev", "bat"]:
        for t in thresholds:
            vals = [pr(sims[n], dev, t) for n in noises]
            sweep[dev][str(t)] = {"precision": [round(100 * v[0], 1) for v in vals],
                                  "recall": [round(100 * v[1], 1) for v in vals]}
    facts["ev_r_noise_hi"] = sweep["ev"]["0.5"]["recall"][-1]
    facts["ev_p_noise_hi"] = sweep["ev"]["0.5"]["precision"][-1]
    facts["bat_r_noise_hi"] = sweep["bat"]["0.5"]["recall"][-1]
    facts["bat_p_noise_hi"] = sweep["bat"]["0.5"]["precision"][-1]

    # Clustering on shape plus scalars, without labels.
    ok = [r for r in rows if r["f"]]
    S = np.array([r["f"]["shape"] for r in ok])
    hourly = S.reshape(len(ok), 24, 2).sum(2)
    sc_names = ["Daily kWh", "Evening near-zero share", "Evening share", "Night share", "Midday share",
                "Occupied share", "Charge nights", "Peak to mean"]
    scal = np.array([[np.log(r["f"]["kwh"]), r["f"]["evening_nz"], r["f"]["evening"], r["f"]["night"],
                      r["f"]["midday"], r["f"]["occupied_share"], np.log1p(r["f"]["charge_days"]), r["f"]["peak_mean"]]
                     for r in ok])
    z = lambda a: (a - a.mean(0)) / np.where(a.std(0) > 0, a.std(0), 1)
    F = np.hstack([z(hourly) * np.sqrt(len(sc_names) / 24), z(scal)])
    sil = {}
    fits = {}
    for k in range(3, 11):
        km = KMeans(n_clusters=k, n_init=10, random_state=0).fit(F)
        sil[k] = float(silhouette_score(F, km.labels_))
        fits[k] = km
    kbest = max(sil, key=sil.get)
    lab = fits[kbest].labels_
    # Renumber clusters by evening near-zero share so numbering is stable.
    order = np.argsort([scal[lab == c, 1].mean() for c in range(kbest)])
    remap = {int(c): i for i, c in enumerate(order)}
    lab = np.array([remap[int(c)] for c in lab])
    truth4 = np.array([cls(r["kind"] in HAS_EV, r["kind"] in HAS_BAT) for r in ok])
    kinds = np.array([r["kind"] for r in ok])
    facts["k"] = kbest
    facts["silhouette"] = round(sil[kbest], 2)
    facts["ari_types"] = round(float(adjusted_rand_score(kinds, lab)), 2)
    facts["ari_classes"] = round(float(adjusted_rand_score(truth4, lab)), 2)
    clusters = []
    for c in range(kbest):
        m = lab == c
        counts = {k: int((kinds[m] == k).sum()) for k in TYPES}
        top = max(counts, key=counts.get)
        prof = np.median(S[m], 0) * 100
        clusters.append({"id": c + 1, "n": int(m.sum()), "top": top, "purity": round(100 * counts[top] / m.sum(), 1),
                         "counts": counts, "shape": np.round(prof, 2).tolist(),
                         "nz": round(float(np.median(scal[m, 1])), 2), "charge": int(np.median(np.expm1(scal[m, 6])))})
    bat_cl = [c["id"] for c in clusters if c["nz"] >= 0.2]
    facts["bat_clusters"] = bat_cl
    facts["bat_in_bat_clusters"] = sum(c["counts"][k] for c in clusters if c["id"] in bat_cl for k in ["Battery", "Car and battery"])
    facts["nonbat_in_bat_clusters"] = sum(c["counts"][k] for c in clusters if c["id"] in bat_cl
                                          for k in TYPES if k not in HAS_BAT)
    tree = DecisionTreeClassifier(max_depth=3, min_samples_leaf=25, random_state=0).fit(scal, lab)
    facts["tree_fidelity"] = round(100 * float((tree.predict(scal) == lab).mean()), 1)
    facts["tree_rules"] = export_text(tree, feature_names=sc_names, decimals=2)
    facts["silhouette_by_k"] = {str(k): round(v, 3) for k, v in sil.items()}

    # Sanity checks.
    assert facts["dropped"] < 0.05 * len(rows), "too many households dropped"
    assert all(abs(sum(c["counts"].values()) - c["n"]) == 0 for c in clusters)
    assert 0 <= facts["ev_p"] <= 100 and facts["ev_r"] > 50, "car detector broken"
    assert np.isclose(sum(np.array(conf["Core types"]).ravel()), len(rows))
    median_daily = np.median([r["f"]["kwh"] for r in rows if r["f"] and r["kind"] == "Ordinary"])
    assert 4 < median_daily < 10, median_daily
    facts["ordinary_median_kwh"] = round(float(median_daily), 1)

    data = {"facts": facts, "types": TYPES, "shapes": shapes, "examples": examples, "hist": hist,
            "classes": CLASSES, "confusion": conf, "table": table, "sweep": sweep, "clusters": clusters}
    OUT.write_text(json.dumps(data, separators=(",", ":")))
    print(json.dumps({k: v for k, v in facts.items() if k != "tree_rules"}, indent=1))
    print(facts["tree_rules"])
    print("bytes", OUT.stat().st_size)


if __name__ == "__main__":
    main()
