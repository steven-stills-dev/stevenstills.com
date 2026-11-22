# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy"]
# ///
"""Measure the TV pickup around the end of three finals of The Traitors and model the audience a pickup needs.

Run: uv run scripts/traitors/build.py
Demand: Elexon FUELINST, generation by fuel type and interconnector every five minutes; the sum is
the demand the transmission system met. Half-hourly outturn and the day-ahead forecast: Elexon INDO and NDF.
Writes src/projects/traitors/data.json. Broadcast times and audiences in FINALS carry their sources in the article.
"""
import json
import sys
from collections import defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from fetch_cache import get  # noqa: E402

OUT = HERE.parents[1] / "src" / "projects" / "traitors" / "data.json"
API = "https://data.elexon.co.uk/bmrs/api/v1"
UK = ZoneInfo("Europe/London")
SEED, DRAWS = 20260123, 20000
EVERYONE = 24.0                    # millions: the audience for the Queen's address of 5 April 2020, as an upper scenario
LAST = date(2026, 3, 6)            # last day of data used
SPAN = 42                          # comparison weekdays within this many days of a final
SPIKE = 600                        # MW: a one-sample jump this far from its neighbours is telemetry, not demand
RISE = 10                          # minutes: a pickup is measured as the rise over this long
NEAR = (-10, 15)                   # search this many minutes either side of a billed time; credits rarely roll on the minute
HOLIDAYS = [(date(2024, 12, 23), date(2025, 1, 3)), (date(2025, 12, 22), date(2026, 1, 2))]

# BBC One billed slots in minutes after midnight; live is the overnight average audience in millions;
# after is the channel the after-show went out on, after_end when it finished
FINALS = {
    "s3": {"name": "Series 3", "date": date(2025, 1, 24), "start": 20 * 60 + 30, "end": 21 * 60 + 40, "live": 7.4, "after": "BBC One", "after_end": 22 * 60 + 25},
    "celeb1": {"name": "Celebrity series 1", "date": date(2025, 11, 6), "start": 21 * 60, "end": 22 * 60 + 10, "live": 11.1, "after": "BBC Two", "after_end": 22 * 60 + 10},
    "s4": {"name": "Series 4", "date": date(2026, 1, 23), "start": 20 * 60 + 30, "end": 21 * 60 + 45, "live": 9.4, "after": "BBC One", "after_end": 22 * 60 + 40},
}

# kettle assumptions for the timing model (see the article's footnotes)
KETTLE_KW = (2.2, 3.0)             # rated power, uniform
BOIL_MIN = (2.0, 4.0)              # minutes to boil one to one and a half litres, uniform
DELAY = (2.0, 1.5)                 # gamma shape and scale: minutes from the credits to switching on


def hm(m):
    """Format minutes after midnight as HH:MM."""
    return f"{m // 60:02d}:{m % 60:02d}"


def marks(m0, m1):
    """Return the five-minute marks from m0 to m1 inclusive."""
    return list(range(m0, m1 + 5, 5))


def five(d):
    """Return {minutes after local midnight: MW} for one local date, with one-sample telemetry spikes removed."""
    rows = []
    for x in (d - timedelta(days=1), d):
        url = f"{API}/datasets/FUELINST?publishDateTimeFrom={x}T00:00:00Z&publishDateTimeTo={x + timedelta(days=1)}T00:10:00Z&format=json"
        rows += json.loads(get(url))["data"]
    g = {}
    for r in rows:
        t = datetime.fromisoformat(r["startTime"].replace("Z", "+00:00")).astimezone(UK)
        if t.date() == d:
            g[(t.hour * 60 + t.minute, r["fuelType"])] = r["generation"]   # keyed so a repeated row is not counted twice
    s = defaultdict(float)
    for (m, _), v in g.items():
        s[m] += v
    out = dict(s)
    for m in s:
        if m - 5 in s and m + 5 in s:
            med = sorted((s[m - 5], s[m], s[m + 5]))[1]
            if abs(s[m] - med) > SPIKE:
                out[m] = med
    return out


def comparison_days(ev):
    """Return the weekdays within SPAN days of a final, leaving out every final and the Christmas fortnights."""
    finals = {f["date"] for f in FINALS.values()}
    out, d = [], ev - timedelta(days=SPAN)
    while d <= min(ev + timedelta(days=SPAN), LAST):
        hol = any(a <= d <= b for a, b in HOLIDAYS)
        if d.weekday() < 5 and d not in finals and not hol:
            out.append(d)
        d += timedelta(days=1)
    return out


def rises(s, ms, usual=None):
    """Return the ten-minute rise ending at each mark, less the usual rise at that clock time when given."""
    r = np.array([s[m] - s[m - RISE] for m in ms])
    return r if usual is None else r - usual


def test(cache, ev, days, ms):
    """Return the largest centred rise on the event evening, when it ended, and the same statistic for each comparison evening."""
    usual = np.mean([rises(cache[d], ms) for d in days], axis=0)
    null = np.array([rises(cache[d], ms, usual) for d in days])          # days x marks
    x = rises(cache[ev], ms, usual)
    best = null.max(1)
    return {"rise": float(x.max()), "at": ms[int(x.argmax())], "null": null, "best": best,
            "excess": float(x.max() - best.mean()), "sd": float(best.std(ddof=1)),
            "p": float((np.sum(best >= x.max()) + 1) / (len(best) + 1))}


def summary(t):
    """Return the publishable part of one test result."""
    return {"rise": round(t["rise"]), "at": hm(t["at"]), "excess": round(t["excess"]), "z": round(t["excess"] / t["sd"], 1), "p": round(t["p"], 3)}


def measure(key, cache):
    """Return the pickup around the end of one final, around the end of its after-show, and anywhere in its evening."""
    f = FINALS[key]
    ev, end = f["date"], f["end"]
    days = [d for d in comparison_days(ev) if all(m in cache[d] for m in marks(18 * 60, 23 * 60 + 35))]
    near = test(cache, ev, days, marks(end + NEAR[0], end + NEAR[1]))
    wide = test(cache, ev, days, marks(f["start"] - 30, f["after_end"] + 30))
    late = test(cache, ev, days, marks(f["after_end"] + NEAR[0], f["after_end"] + NEAR[1]))
    return {
        "key": key, "name": f["name"], "date": ev.isoformat(), "live": f["live"], "after": f["after"],
        "end": hm(end), "n": len(days), **summary(near), "blind_p": round(wide["p"], 2),
        "late_rise": round(late["rise"]), "late_at": hm(late["at"]), "late_p": round(late["p"], 3),
        "_near": near, "_wide": wide, "_days": days,
    }


def evening(key, cache, m0, m1):
    """Return one final's five-minute demand with the path an ordinary evening would take from the first point."""
    ev = FINALS[key]["date"]
    ms = marks(m0, m1)
    days = [d for d in comparison_days(ev) if all(m in cache[d] for m in ms)]
    paths = np.array([[cache[d][m] - cache[d][m0] for m in ms] for d in days])
    base = cache[ev][m0]
    gw = lambda v: round(float(base + v) / 1000, 2)
    return {"labels": [hm(m) for m in ms], "actual": [round(cache[ev][m] / 1000, 2) for m in ms],
            "expected": [gw(v) for v in paths.mean(0)],
            "lo": [gw(v) for v in np.quantile(paths, 0.1, axis=0)], "hi": [gw(v) for v in np.quantile(paths, 0.9, axis=0)]}


def rise_series(key, cache, m0, m1):
    """Return one final's ten-minute rise at each mark, centred on the usual rise, with the 5% to 95% range of ordinary evenings."""
    ev = FINALS[key]["date"]
    ms = marks(m0, m1)
    days = [d for d in comparison_days(ev) if all(m - RISE in cache[d] and m in cache[d] for m in ms)]
    usual = np.mean([rises(cache[d], ms) for d in days], axis=0)
    null = np.array([rises(cache[d], ms, usual) for d in days])
    r = lambda a: [round(float(v)) for v in a]
    return {"labels": [hm(m) for m in ms], "x": r(rises(cache[ev], ms, usual)), "lo": r(np.quantile(null, 0.05, axis=0)), "hi": r(np.quantile(null, 0.95, axis=0))}


def kettle_curve(rng, n=200_000):
    """Return the mean load of one kettle (kW) through the minutes after the credits, from the timing assumptions."""
    start = rng.gamma(*DELAY, n)
    dur = rng.uniform(*BOIL_MIN, n)
    kw = rng.uniform(*KETTLE_KW, n)
    t = np.arange(0, 40, 1 / 6)                      # ten-second steps
    edge = np.zeros(len(t) + 1)
    np.add.at(edge, np.searchsorted(t, start), kw)
    np.add.at(edge, np.searchsorted(t, start + dur), -kw)
    return t, np.cumsum(edge)[:-1] / n


def forecast_errors(d):
    """Return {settlement period: outturn minus the day-ahead forecast published before noon the day before} in MW."""
    rows = json.loads(get(f"{API}/forecast/demand/day-ahead/history?publishTime={d - timedelta(days=1)}T12:00Z&format=json"))["data"]
    f = {r["settlementPeriod"]: r["nationalDemand"] for r in rows if r["settlementDate"] == d.isoformat()}
    a = {r["settlementPeriod"]: r["initialDemandOutturn"] for r in
         json.loads(get(f"{API}/demand/outturn?settlementDateFrom={d}&settlementDateTo={d}&format=json"))["data"]}
    return {p: a[p] - f[p] for p in a if f.get(p) is not None}


def half_hour_step(key, days):
    """Return the change in forecast error from the half hour before the credits to the half hour after, against ordinary evenings."""
    f = FINALS[key]
    sp = f["end"] // 30 + 1                                  # the half hour the credits fall in
    step = lambda e: e[sp + 1] - e[sp - 1]
    null = np.array([step(e) for e in (forecast_errors(d) for d in days) if sp + 1 in e and sp - 1 in e])
    x = step(forecast_errors(f["date"]))
    return {"step": round(float(x - null.mean())), "sd": round(float(null.std(ddof=1))),
            "p": round(float((np.sum(np.abs(null - null.mean()) >= abs(x - null.mean())) + 1) / (len(null) + 1)), 2)}


def main():
    rng = np.random.default_rng(SEED)
    need = set()
    for f in FINALS.values():
        need |= set(comparison_days(f["date"])) | {f["date"]}
    cache = {d: five(d) for d in sorted(need)}
    assert all(len(cache[f["date"]]) == 288 for f in FINALS.values())

    res = {k: measure(k, cache) for k in FINALS}
    s4, c1 = res["s4"], res["celeb1"]
    f4, days4 = FINALS["s4"], res["s4"]["_days"]
    before = summary(test(cache, f4["date"], days4, marks(f4["start"] - 5 + NEAR[0], f4["start"] - 5 + NEAR[1])))
    for k, r in res.items():
        r["hh"] = half_hour_step(k, r["_days"])

    # how long the celebrity pickup lasted: mean excess over the half hour after it, as a share of the rise
    n1 = c1["_near"]
    ms = marks(n1["at"] - RISE, n1["at"] + 20)
    path = lambda d: np.array([cache[d][m] - cache[d][ms[0]] for m in ms])
    usual_path = np.mean([path(d) for d in c1["_days"]], axis=0)
    held = float((path(FINALS["celeb1"]["date"]) - usual_path)[1:].mean() / n1["rise"])

    # kettle timing: what a five-minute snapshot and a half-hour average see of a one-minute peak
    t, kw = kettle_curve(rng)
    at = lambda m: kw[np.searchsorted(t, m)]
    peak_kw = float(kw.max())
    snap_kw = float(np.mean([max(at(ph), at(ph + 5)) for ph in np.arange(0.5, 5.5, 0.5)]))   # what five-minute snapshots catch
    spike = float(kw[t < 30].mean() / snap_kw)               # a kettle-only pickup, averaged over its half hour
    assert 0.5 < snap_kw / peak_kw <= 1 and spike < held < 1.5

    # response per overnight viewer, with the scatter of ordinary evenings as its uncertainty
    per_viewer = lambda r: (r["_near"]["rise"] - rng.choice(r["_near"]["best"], DRAWS)) / r["live"]   # MW per million
    k_c1, k_s4 = per_viewer(c1), per_viewer(s4)
    k_pos = np.clip(k_c1, 0, None)
    q = lambda a_, ps=(5, 50, 95): [round(float(v), 1) for v in np.percentile(a_, ps)]
    kettles = lambda k: k / 1000 / snap_kw * 100                                                      # per 100 viewers

    # detection power: inject a pickup of A million viewers x k into real ordinary evenings and run the same test
    grid = np.arange(0.5, 40.5, 0.5)
    j = marks(NEAR[0], NEAR[1]).index(10)

    def power_curve(which):
        """Return the share of simulated evenings on which each audience's pickup beats the 5% threshold, and the threshold."""
        null, best = c1[which]["null"], c1[which]["best"]
        thr = float(np.quantile(best, 0.95))
        col = j if which == "_near" else null.shape[1] // 2
        out = []
        for a_ in grid:
            d = rng.integers(0, len(null), DRAWS)
            out.append(round(float(np.mean(np.maximum(best[d], null[d, col] + a_ * rng.choice(k_pos, DRAWS)) > thr)), 3))
        return out, thr
    known, thr_known = power_curve("_near")
    blind, thr_blind = power_curve("_wide")
    errs = [forecast_errors(d) for d in days4]
    abs_err = np.abs([e[p] for e in errs for p in range(41, 47) if p in e])     # 20:00 to 23:00
    mae = float(abs_err.mean())
    night = forecast_errors(f4["date"])
    power = {"audience": grid.tolist(), "known": known, "blind": blind,
             "forecast": [round(float(np.mean(a_ * rng.choice(k_pos, DRAWS) * held > mae)), 3) for a_ in grid]}
    need_at = lambda name, p: float(grid[np.argmax(np.array(power[name]) >= p)]) if max(power[name]) >= p else None

    # scenarios for the series 4 final: the ten-minute rise above an ordinary evening, MW
    live = f4["live"]
    draw = {"as_aired": s4["_near"]["rise"] - rng.choice(s4["_near"]["best"], DRAWS),
            "no_after_show": live * rng.choice(k_pos, DRAWS), "everyone_live": EVERYONE * rng.choice(k_pos, DRAWS)}
    d_ = rng.integers(0, len(n1["null"]), DRAWS)
    seen = lambda v: round(float(np.mean(np.maximum(n1["best"][d_], n1["null"][d_, j] + v) > thr_known)), 2)
    edges = np.arange(-600, 2700, 100)
    hist = lambda a_: [{"x0": int(x0), "x1": int(x0 + 100), "n": round(float(n) / DRAWS * 100, 2)} for x0, n in zip(edges, np.histogram(a_, edges)[0])]

    facts = {
        "before": before, "live": live, "everyone": EVERYONE, "draws": DRAWS,
        "k_celeb": q(k_c1), "k_s4": q(k_s4), "kettles_celeb": q(kettles(k_c1)),
        "peak_kw": round(peak_kw, 2), "snap_share": round(snap_kw / peak_kw, 2), "spike": round(spike, 2), "held": round(held, 2),
        "thr_known": round(thr_known), "thr_blind": round(thr_blind),
        "need_known_50": need_at("known", 0.5), "need_known_80": need_at("known", 0.8),
        "need_blind_50": need_at("blind", 0.5), "need_blind_80": need_at("blind", 0.8),
        "need_forecast_50": need_at("forecast", 0.5), "need_forecast_80": need_at("forecast", 0.8),
        "mae": round(mae), "night_mae": round(float(np.mean([abs(night[p]) for p in range(41, 47)]))),
        "night_err": [round(night[p]) for p in range(41, 47)],
        "celeb_hh": round(c1["rise"] * held), "celeb_hh_spike": round(c1["rise"] * spike),
        "scen": {k: q(v) for k, v in draw.items()},
        "seen": {k: seen(v) for k, v in draw.items() if k != "as_aired"},
        "forecast_hit": {k: round(float(np.mean(v * held > mae)), 2) for k, v in draw.items()},
    }
    for r in res.values():
        for k in [k for k in r if k.startswith("_")]:
            del r[k]
    data = {"facts": facts, "finals": list(res.values()),
            "s4": evening("s4", cache, 20 * 60, 23 * 60), "celeb1": evening("celeb1", cache, 20 * 60 + 30, 23 * 60),
            "rise": {"s4": rise_series("s4", cache, 20 * 60, 23 * 60), "celeb1": rise_series("celeb1", cache, 20 * 60 + 30, 23 * 60)},
            "power": power, "hist": {k: hist(v) for k, v in draw.items()}}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, separators=(",", ":")) + "\n")
    print(json.dumps({"facts": facts, "finals": data["finals"]}))


if __name__ == "__main__":
    main()
