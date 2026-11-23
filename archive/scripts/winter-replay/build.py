"""Build src/projects/winter-replay/data.json: replay every winter since 1991/92 through an illustrative gas hedge book.

Run: uv run --with pandas --with numpy --with scipy --with openpyxl scripts/winter-replay/build.py

Public inputs: ERA5 daily mean temperature (Open-Meteo archive) at one population centre per UK ITL1 region,
ONS mid-2024 population weights (Nomis), National Gas LDZ offtake (the tempanddemand cache), ONS daily SAP of gas.
The supplier, tariff margin and hedge book are illustrative, sized from Ofgem's TDCV and price cap.
"""
import io
import json
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fetch_cache import get  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "src/projects/winter-replay/data.json"
END = "2026-09-13"  # data cut-off, the day before publication
REF = 2026  # climate year every winter is replayed into
WINTERS = range(1991, 2026)  # winter y runs November y to March y+1
MONTHS = [11, 12, 1, 2, 3]
SPELL = ("2018-02-22", "2018-03-06")

# One population centre per ITL1 region (latitude, longitude).
POINTS = {
    "north-east": (54.98, -1.61), "north-west": (53.48, -2.24), "yorkshire": (53.80, -1.55),
    "east-midlands": (52.95, -1.15), "west-midlands": (52.48, -1.89), "east": (52.21, 0.12),
    "london": (51.51, -0.13), "south-east": (51.45, -0.97), "south-west": (51.45, -2.59),
    "wales": (51.48, -3.18), "scotland": (55.86, -4.25), "northern-ireland": (54.60, -5.93),
}
NOMIS = ("https://www.nomisweb.co.uk/api/v01/dataset/NM_2002_1.data.csv?geography=2013265921...2013265932"
         "&date=2024&gender=0&c_age=200&measures=20100&select=geography_code,obs_value")
CODES = ["north-east", "north-west", "yorkshire", "east-midlands", "west-midlands", "east", "london",
         "south-east", "south-west", "wales", "scotland", "northern-ireland"]  # Nomis returns them in this order
ONS_SAP = ("https://www.ons.gov.uk/file?uri=/economy/economicoutputandproductivity/output/datasets/"
           "systemaveragepricesapofgas/2025/systemaveragepriceofgasdataset181225.xlsx")
LDZ = ROOT / "scripts/tempanddemand/ldz_gwh.csv"
FIT = ("2023-10-01", END)  # three recent gas years for the heating curve, after demand fell in 2022

# Illustrative supplier, sized from public values (Ofgem TDCV medium gas 11,500 kWh; Oct-Dec 2026 cap 7.97 p/kWh inc 5% VAT).
CUSTOMERS = 100_000  # a round number chosen for the arithmetic
TDCV_KWH = 11_500
TARIFF = 7.97 / 1.05  # p/kWh ex VAT
NON_COMMODITY = 2.0  # p/kWh, illustrative variable non-commodity cost
HEDGE_FRACTIONS = [round(x, 2) for x in np.arange(0.8, 1.201, 0.05)]


def era5(lat, lon):
    """Daily ERA5 mean 2 m temperature at one point, 1991 to the cut-off."""
    url = (f"https://archive-api.open-meteo.com/v1/archive?latitude={lat}&longitude={lon}&start_date=1991-01-01"
           f"&end_date={END}&daily=temperature_2m_mean&models=era5&timezone=Europe%2FLondon")
    for _ in range(12):  # the archive API has a per-minute quota shared by every caller on this machine
        try:
            d = json.loads(get(url))["daily"]
            break
        except Exception as e:
            print("waiting on Open-Meteo:", e)
            time.sleep(65)
    return pd.Series(d["temperature_2m_mean"], index=pd.to_datetime(d["time"]), dtype=float)


def doy(idx):
    """Day of year 0-364, folding 29 February onto 28 February."""
    d = idx.day_of_year.values - 1
    return np.where(idx.is_leap_year & (d >= 59), d - 1, d)


def harmonics(d, y, k=3):
    """Least-squares annual cycle with k harmonics, evaluated for days 0-364."""
    def basis(x):
        t = 2 * np.pi * x / 365
        return np.column_stack([np.ones_like(t)] + [f(j * t) for j in range(1, k + 1) for f in (np.cos, np.sin)])
    return basis(np.arange(365.0)) @ np.linalg.lstsq(basis(d.astype(float)), y, rcond=None)[0]


def anomalies(t):
    """Detrend to REF on complete-year annual means, fit one harmonic normal, return (anomaly, normal, trend per decade)."""
    full = t[: f"{REF - 1}-12-31"]
    ann = full.groupby(full.index.year).mean()
    slope = np.polyfit(ann.index, ann.values, 1)[0]
    adj = t + slope * (REF - t.index.year)  # each year moved to REF's climate
    normal = harmonics(doy(full.index), adj[full.index].values)
    return pd.Series(adj.values - normal[doy(t.index)], t.index), normal, slope * 10


def eff_temp(t, a):
    """Effective temperature: today's weight 1-a, yesterday's effective temperature weight a."""
    out = np.empty(len(t))
    out[0] = t[0]
    for i in range(1, len(t)):
        out[i] = a * out[i - 1] + (1 - a) * t[i]
    return out


def curve_fit(et, thr, y):
    """OLS of demand on max(0, threshold - ET); return (base, slope, r2)."""
    x = np.maximum(0, thr - et)
    b1, b0 = np.polyfit(x, y, 1)
    r2 = 1 - ((y - b0 - b1 * x) ** 2).sum() / ((y - y.mean()) ** 2).sum()
    return b0, b1, r2


def fit_heating(t, gas):
    """Grid-search the lag and threshold of a floored heating curve on daily LDZ demand."""
    best = None
    for a in np.arange(0, 0.81, 0.05):
        et = pd.Series(eff_temp(t.values, a), t.index)[gas.index]
        for thr in np.arange(12, 19.1, 0.5):
            b0, b1, r2 = curve_fit(et.values, thr, gas.values)
            if best is None or r2 > best["r2"]:
                best = dict(a=round(float(a), 2), thr=float(thr), base=b0, slope=b1, r2=r2)
    assert best["slope"] > 0, "colder must mean more gas"
    return best


def demand(t, p):
    """Daily demand from temperature through the fitted curve."""
    return p["base"] + p["slope"] * np.maximum(0, p["thr"] - eff_temp(np.asarray(t, float), p["a"]))


def replay_days():
    """Calendar for the coming winter: a two-week warm-up from 17 October 2026, then 1 November 2026 to 31 March 2027."""
    return pd.date_range(f"{REF}-10-18", f"{REF + 1}-03-31")


def skewfit(x):
    """Skewness-gated fit: skew-normal when |sample skewness| >= 0.5, else normal. Returns a frozen distribution and its name."""
    if abs(stats.skew(x)) >= 0.5:
        return stats.skewnorm(*stats.skewnorm.fit(x)), "skew-normal"
    return stats.norm(*stats.norm.fit(x)), "normal"


def main():
    temps = pd.DataFrame({k: era5(*v) for k, v in POINTS.items()})
    assert temps.notna().all().all() and temps.index[-1] == pd.Timestamp(END)
    pop = pd.read_csv(io.BytesIO(get(NOMIS))).OBS_VALUE.values
    w = pd.Series(pop, CODES).drop("northern-ireland")  # LDZ demand is Great Britain only
    gb = (temps[w.index] * w / w.sum()).sum(axis=1)

    reg_anom = {k: anomalies(temps[k])[0] for k in POINTS}
    anom, normal, trend = anomalies(gb)
    facts = {"trend_per_decade": round(trend, 2), "winters": len(WINTERS),
             "first_winter": f"{WINTERS[0]}/{str(WINTERS[0] + 1)[2:]}", "last_winter": f"{WINTERS[-1]}/{str(WINTERS[-1] + 1)[2:]}"}

    # Monthly national anomaly by winter.
    mon = anom.groupby([anom.index.year, anom.index.month]).mean()
    grid = [[round(float(mon[(y if m >= 11 else y + 1, m)]), 2) for y in WINTERS] for m in MONTHS]
    wmean = [float(anom[f"{y}-11-01":f"{y + 1}-03-31"].mean()) for y in WINTERS]
    order = np.argsort(wmean)
    facts["coldest_winter"] = f"{WINTERS[order[0]]}/{str(WINTERS[order[0]] + 1)[2:]}"
    facts["coldest_winter_anom"] = round(wmean[order[0]], 2)
    facts["warmest_winter"] = f"{WINTERS[order[-1]]}/{str(WINTERS[order[-1]] + 1)[2:]}"
    facts["warmest_winter_anom"] = round(wmean[order[-1]], 2)
    facts["dec2010_anom"] = round(float(mon[(2010, 12)]), 1)
    facts["mar2013_anom"] = round(float(mon[(2013, 3)]), 1)
    facts["spell_days"] = len(pd.date_range(*SPELL))
    facts["sd_month_anom"] = round(float(np.std(grid)), 2)
    facts["sd_winter_anom"] = round(float(np.std(wmean)), 2)

    # The 2018 cold spell, region by region.
    days = pd.date_range(*SPELL)
    frames = [{"label": d.strftime("%-d %b %Y"), "values": {k: round(float(reg_anom[k][d]), 1) for k in POINTS}} for d in days]
    spell = pd.DataFrame({k: reg_anom[k][SPELL[0]:SPELL[1]] for k in POINTS})
    coldest_day = spell.mean(axis=1).idxmin()
    facts["spell_coldest_day"] = coldest_day.strftime("%-d %B %Y")
    facts["spell_coldest_day_mean"] = round(float(spell.mean(axis=1).min()), 1)
    facts["spell_min_region"] = spell.min().idxmin()
    facts["spell_min_value"] = round(float(spell.min().min()), 1)
    facts["spell_gb_anom"] = round(float(anom[SPELL[0]:SPELL[1]].mean()), 1)
    facts["spell_first_below4"] = spell.index[(spell.mean(axis=1) < -4).values][0].strftime("%-d %B")
    assert coldest_day in (pd.Timestamp("2018-02-28"), pd.Timestamp("2018-03-01")), coldest_day

    # Heating curve on recent LDZ demand.
    ldz = pd.read_csv(LDZ, index_col=0, parse_dates=True).gwh[FIT[0]:FIT[1]].dropna()
    p = fit_heating(gb, ldz)
    et = pd.Series(eff_temp(gb.values, p["a"]), gb.index)
    facts.update(curve_a=p["a"], curve_thr=p["thr"], curve_slope=round(p["slope"]), curve_base=round(p["base"]),
                 curve_r2=round(p["r2"], 3), curve_days=len(ldz))
    rng = np.random.default_rng(1)
    pick = np.sort(rng.choice(len(ldz), min(len(ldz), 1100), replace=False))
    scatter = [{"x": round(float(et[ldz.index[i]]), 1), "y": round(float(ldz.iloc[i]))} for i in pick]
    lo_et, hi_et = et[ldz.index].min(), et[ldz.index].max()
    xs = np.append(np.arange(np.floor(lo_et), hi_et, 0.5), [p["thr"]])
    xs = np.sort(xs)
    facts["curve_et_min"] = round(float(lo_et), 1)
    fitline = [{"x": float(x), "y": round(float(p["base"] + p["slope"] * max(0, p["thr"] - x)))} for x in xs]

    # Leave-one-gas-year-out: winter error with actual weather against the same curve fed normal weather.
    gy = np.where(ldz.index.month >= 10, ldz.index.year, ldz.index.year - 1)
    loyo = []
    for y in sorted(set(gy)):
        tr, te = ldz[gy != y], ldz[(gy == y) & ldz.index.month.isin(MONTHS)]
        if len(te) < 100:
            continue
        q = fit_heating(gb, tr)
        pw = pd.Series(demand(gb.values, q), gb.index)[te.index]
        nt = pd.Series(normal[doy(gb.index)] - trend / 10 * (REF - gb.index.year), gb.index)
        pn = pd.Series(demand(nt.values, q), gb.index)[te.index]
        loyo.append({"year": f"{y}/{str(y + 1)[2:]}", "weather": float((abs(pw - te) / te).mean() * 100),
                     "normal": float((abs(pn - te) / te).mean() * 100)})
    facts["loyo_weather_mape"] = round(np.mean([r["weather"] for r in loyo]), 1)
    facts["loyo_normal_mape"] = round(np.mean([r["normal"] for r in loyo]), 1)
    facts["loyo_years"] = len(loyo)

    # Replay every winter into November 2026 to March 2027.
    cal = replay_days()
    base_t = normal[doy(cal)]
    keep = cal >= f"{REF}-11-01"
    nat = demand(base_t, p)[keep]
    scale = CUSTOMERS * TDCV_KWH / 1e3 / (p["base"] + p["slope"] * np.maximum(0, p["thr"] - normal)).sum()  # MWh per GWh of LDZ
    v0_day = nat * scale
    mkey = cal[keep].month
    v0 = pd.Series(v0_day).groupby(mkey).sum()
    vols = {}
    for y in WINTERS:
        src = pd.date_range(f"{y}-10-18", f"{y + 1}-03-31")
        a = anom[src]
        a = a[~((a.index.month == 2) & (a.index.day == 29))]
        assert len(a) == len(cal)
        vols[y] = pd.Series(demand(base_t + a.values, p)[keep] * scale).groupby(mkey).sum()
    facts["winter_mwh_normal"] = round(float(v0.sum()))
    facts["portfolio_twh_year"] = round(CUSTOMERS * TDCV_KWH / 1e9, 3)
    dv = np.array([vols[y].sum() / v0.sum() - 1 for y in WINTERS]) * 100
    facts["vol_p10"], facts["vol_p90"] = round(float(np.percentile(dv, 10)), 1), round(float(np.percentile(dv, 90)), 1)
    facts["vol_min"], facts["vol_max"] = round(float(dv.min()), 1), round(float(dv.max()), 1)

    # Price against weather: ONS daily SAP, month mean against the last five days before the month (a public stand-in for month-ahead).
    sap = pd.read_excel(io.BytesIO(get(ONS_SAP)), sheet_name="1.Daily SAP Gas", header=4)
    sap = sap.set_index(pd.to_datetime(sap.iloc[:, 0], errors="coerce")).iloc[:, 1].dropna().astype(float)
    sap = sap[sap.index.notna()]
    rows = []
    for m in pd.period_range(sap.index[0].to_period("M") + 1, sap.index[-1].to_period("M") - 1, freq="M"):
        if m.month not in MONTHS:
            continue
        prior = sap[: m.start_time - pd.Timedelta(days=1)].iloc[-5:]
        cur = sap[m.start_time: m.end_time]
        if len(cur) < 25:
            continue
        rows.append({"m": str(m), "x": float(mon[(m.year, m.month)]), "y": float(np.log(cur.mean() / prior.mean()) * 100)})
    pr = pd.DataFrame(rows)
    lr = stats.linregress(pr.x, pr.y)
    gate = lr.slope < 0 and abs(lr.slope) >= 2 * lr.stderr
    beta = lr.slope / 100 if gate else 0.0
    facts.update(price_n=len(pr), price_slope=round(lr.slope, 1), price_se=round(lr.stderr, 1), price_gate=bool(gate),
                 price_first=pr.m.iloc[0], price_last=pr.m.iloc[-1])
    calm = pr[~pr.m.between("2021-11", "2023-03")]  # leave out the 2021/22 and 2022/23 crisis winters
    lc = stats.linregress(calm.x, calm.y)
    facts.update(calm_n=len(calm), calm_slope=round(lc.slope, 1), calm_se=round(lc.stderr, 1),
                 calm_gate=bool(lc.slope < 0 and abs(lc.slope) >= 2 * lc.stderr))
    tcrit = stats.t.ppf(0.975, len(pr) - 2)
    xg = np.linspace(pr.x.min(), pr.x.max(), 25)
    resid = pr.y - (lr.intercept + lr.slope * pr.x)
    s = np.sqrt((resid ** 2).sum() / (len(pr) - 2))
    sxx = ((pr.x - pr.x.mean()) ** 2).sum()
    half = tcrit * s * np.sqrt(1 / len(pr) + (xg - pr.x.mean()) ** 2 / sxx)
    yfit = lr.intercept + lr.slope * xg
    price_fit = [{"x": round(float(x), 2), "y": round(float(f), 1), "lo": round(float(f - h), 1), "hi": round(float(f + h), 1)}
                 for x, f, h in zip(xg, yfit, half)]
    price_pts = [{"x": round(r.x, 2), "y": round(r.y, 1), "label": pd.Period(r.m).strftime("%b %Y")} for r in pr.itertuples()]

    # Illustrative hedge price: mean SAP over the last full winter in the ONS file (November 2024 to March 2025).
    hedge = float(sap["2024-11-01":"2025-03-31"].mean())
    unit = TARIFF - NON_COMMODITY - hedge  # p/kWh margin on each extra kWh at the hedge price
    assert unit > 0
    facts.update(tariff_ex_vat=round(TARIFF, 2), hedge_price=round(hedge, 2), unit_margin=round(unit, 2),
                 non_commodity=NON_COMMODITY, customers=CUSTOMERS, tdcv=TDCV_KWH)
    # What-if for when price does move with weather: the slope fitted without the crisis winters, used only for the toggle.
    beta_whatif = lc.slope / 100

    def margins(h, b):
        """Margin change (GBP thousand) per replayed winter at hedge fraction h and price slope b, with its two parts."""
        out = []
        for y in WINTERS:
            vm, dr = 0.0, 0.0
            for m in MONTHS:
                a_m = float(mon[(y if m >= 11 else y + 1, m)])
                pm = hedge * np.exp(b * a_m)
                vm += (vols[y][m] - v0[m]) * unit * 10  # MWh x p/kWh x 10 = GBP
                dr += (vols[y][m] - h * v0[m]) * (hedge - pm) * 10
            out.append((vm / 1e3, dr / 1e3))
        return np.array(out)

    every = np.concatenate([margins(h, b).sum(1) for h in HEDGE_FRACTIONS for b in (beta, beta_whatif)])
    edges = np.arange(np.floor(every.min() / 200) * 200, np.ceil(every.max() / 200) * 200 + 200, 200)  # one x axis for every setting

    def summary(h, b):
        """Histogram, fitted curve, bands and tails for one hedge fraction and price slope."""
        parts = margins(h, b)
        tot = parts.sum(1)
        n = np.histogram(tot, edges)[0]
        dist, name = skewfit(tot)
        curve = [round(float((dist.cdf(edges[i + 1]) - dist.cdf(edges[i])) * len(tot)), 2) for i in range(len(n))]
        return {"bins": [{"x0": float(edges[i]), "x1": float(edges[i + 1]), "n": int(n[i])} for i in range(len(n))],
                "curve": curve, "fit": name, "skew": round(float(stats.skew(tot)), 2),
                "p10": round(float(np.percentile(tot, 10))), "p50": round(float(np.percentile(tot, 50))),
                "p90": round(float(np.percentile(tot, 90))), "one_in_10": round(float(dist.ppf(0.1))),
                "one_in_20": round(float(dist.ppf(0.05))), "values": [round(float(v)) for v in tot],
                "volume": [round(float(v)) for v in parts[:, 0]], "drift": [round(float(v)) for v in parts[:, 1]]}

    dist_out = {"fixed": {str(h): summary(h, beta) for h in HEDGE_FRACTIONS},
                "moves": {str(h): summary(h, beta_whatif) for h in HEDGE_FRACTIONS}}
    base = dist_out["fixed"]["1.0"]
    facts.update(m_p10=base["p10"], m_p50=base["p50"], m_p90=base["p90"], m_1in10=base["one_in_10"],
                 m_1in20=base["one_in_20"], m_fit=base["fit"], m_skew=base["skew"])
    mv = dist_out["moves"]
    facts.update(mv_1in10_100=mv["1.0"]["one_in_10"], mv_1in10_80=mv["0.8"]["one_in_10"], mv_1in10_120=mv["1.2"]["one_in_10"],
                 mv_p50_100=mv["1.0"]["p50"], mv_fit_100=mv["1.0"]["fit"])
    best_h = max(HEDGE_FRACTIONS, key=lambda h: mv[str(h)]["one_in_10"])
    facts["mv_best_h"] = best_h
    facts["mv_1in10_best"] = mv[str(best_h)]["one_in_10"]
    # Margin per customer at the 1-in-10 cold-side outcome, price fixed.
    facts["m_1in10_per_customer"] = round(base["one_in_10"] * 1e3 / CUSTOMERS, 2)

    # Exceedance curve with bootstrap band (central case: price fixed); drop-one-winter stability of the 1-in-10.
    tot = np.array(base["values"], float)
    probs = np.arange(1, 51) / 100
    fitted, _ = skewfit(tot)
    boot = np.array([skewfit(rng.choice(tot, len(tot), replace=True))[0].ppf(probs) for _ in range(1000)])
    lo_b, hi_b = np.percentile(boot, 5, axis=0), np.percentile(boot, 95, axis=0)
    exceed = {"labels": [f"{int(q * 100)}%" for q in probs], "fit": [round(float(v)) for v in fitted.ppf(probs)],
              "lo": [round(float(v)) for v in lo_b], "hi": [round(float(v)) for v in hi_b],
              "emp": [round(float(v)) for v in np.percentile(tot, probs * 100)]}
    facts["boot_1in10_lo"], facts["boot_1in10_hi"] = round(float(lo_b[9])), round(float(hi_b[9]))
    drop = [skewfit(np.delete(tot, i))[0].ppf(0.1) for i in range(len(tot))]
    facts["drop_1in10_min"], facts["drop_1in10_max"] = round(float(min(drop))), round(float(max(drop)))
    worst = int(np.argmin(tot))
    facts["worst_winter"] = f"{WINTERS[worst]}/{str(WINTERS[worst] + 1)[2:]}"
    facts["worst_winter_margin"] = round(float(tot[worst]))
    assert all(np.diff(fitted.ppf(probs)) > 0), "quantiles must rise"
    assert lo_b[9] <= fitted.ppf(0.1) <= hi_b[9], "point estimate inside its band"
    facts["boot_1in10_hi_per_customer"] = round(float(-lo_b[9]) * 1e3 / CUSTOMERS, 2)
    best = int(np.argmax(tot))
    facts["best_winter"] = f"{WINTERS[best]}/{str(WINTERS[best] + 1)[2:]}"
    facts["best_winter_margin"] = round(float(tot[best]))
    facts["mv_cost_per_10pts"] = round((mv["1.2"]["one_in_10"] - mv["1.0"]["one_in_10"]) / 2)
    chk = margins(1.0, beta)
    assert np.allclose(chk.sum(1), tot, atol=1), "parts sum to total"

    data = {
        "facts": facts,
        "frames": frames,
        "heat": {"rows": ["Nov", "Dec", "Jan", "Feb", "Mar"], "cols": [f"{str(y)[2:]}/{str(y + 1)[2:]}" for y in WINTERS],
                 "values": [[-v for v in r] for r in grid]},
        "curve": {"points": scatter, "fit": fitline},
        "price": {"points": price_pts, "fit": price_fit},
        "dist": dist_out,
        "exceed": exceed,
        "winters": [f"{y}/{str(y + 1)[2:]}" for y in WINTERS],
        "hedges": HEDGE_FRACTIONS,
        "loyo": [{k: (round(v, 1) if isinstance(v, float) else v) for k, v in r.items()} for r in loyo],
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, separators=(",", ":")))
    print(json.dumps(facts, indent=1))
    print(OUT, OUT.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
