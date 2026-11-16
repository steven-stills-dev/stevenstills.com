"""Build src/projects/price-response/data.json: weather-corrected LDZ gas demand, its response to the household gas
price, a cluster bootstrap of that response, a winter volume bridge and a three-arm test on synthetic meters.

Run: uv run --with pandas --with numpy scripts/price-response/build.py
Gas demand is read from scripts/tempanddemand/ldz_gwh.csv (National Gas LDZ offtake, built by that page's script).
"""
import io
import json
import sys
import urllib.parse
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fetch_cache import get  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "src/projects/price-response/data.json"
LDZ = ROOT / "scripts/tempanddemand/ldz_gwh.csv"
END = "2026-08-11"  # the day before the publish date
PRICE_END = "2026-06"  # last CPI month published before 12 August 2026 (July's index came out on 19 August)
ERA5 = "https://archive-api.open-meteo.com/v1/archive"
# Seven population centres across Great Britain, equal weights: London, Birmingham, Manchester, Leeds, Glasgow, Bristol, Newcastle
POINTS = [(51.51, -0.13), (52.48, -1.89), (53.48, -2.24), (53.80, -1.55), (55.86, -4.25), (51.45, -2.59), (54.98, -1.61)]
CPI_GAS = "https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7du/mm23/data"  # CPI index 04.5.2 gas, 2015=100
NORMAL_YEARS, REF_YEAR = (1991, 2025), 2025
WINTER = [11, 12, 1, 2, 3]
LOCKDOWN = ("2020-11", "2021-03")  # months on either side of a comparison are dropped
BASE_YEARS = (2016, 2019)  # pre-crisis reference for the index
SCATTER_YEARS = [2019, 2022, 2025]
BRIDGES = [("2021/22", "2022/23"), ("2022/23", "2023/24"), ("2024/25", "2025/26")]
RNG = np.random.default_rng(20260812)
B = 5000
CAP_Q2, CAP_Q3 = 5.74, 7.33  # Ofgem average gas unit rate, p/kWh incl. VAT, direct debit: 1 Apr-30 Jun and 1 Jul-30 Sep 2026


def era5() -> pd.Series:
    """Daily mean 2 m temperature, equal-weighted mean of POINTS, 1991 to END."""
    q = urllib.parse.urlencode({"latitude": ",".join(str(p[0]) for p in POINTS), "longitude": ",".join(str(p[1]) for p in POINTS),
                                "start_date": "1991-01-01", "end_date": END, "daily": "temperature_2m_mean", "timezone": "Europe/London"})
    js = json.loads(get(f"{ERA5}?{q}"))
    frames = [pd.Series(d["daily"]["temperature_2m_mean"], index=pd.to_datetime(d["daily"]["time"]), dtype=float) for d in js]
    return pd.concat(frames, axis=1).mean(axis=1).rename("t")


def doy(idx: pd.DatetimeIndex) -> np.ndarray:
    """Day of year 0-364, folding 29 February onto 28 February."""
    d = idx.day_of_year.values - 1
    return np.where(idx.is_leap_year & (d >= 59), d - 1, d)


def fixed_normal(t: pd.Series) -> pd.Series:
    """One trend-adjusted normal: linear trend plus three annual harmonics fitted to NORMAL_YEARS, evaluated at REF_YEAR
    for every date, so a revised normal can never move a year-on-year comparison."""
    fit = t[str(NORMAL_YEARS[0]):str(NORMAL_YEARS[1])]
    def basis(d, yr):
        a = 2 * np.pi * d / 365
        return np.column_stack([np.ones_like(a), yr - REF_YEAR] + [f(k * a) for k in (1, 2, 3) for f in (np.cos, np.sin)])
    yr = fit.index.year + doy(fit.index) / 365
    coef = np.linalg.lstsq(basis(doy(fit.index).astype(float), yr.values), fit.values, rcond=None)[0]
    d = doy(t.index).astype(float)
    return pd.Series(basis(d, REF_YEAR + d / 365) @ coef, index=t.index, name="tn")


def weather_correct(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """Per calendar month, regress daily demand on temperature with year and day-of-week fixed effects, then move each
    day to the fixed normal by the month's slope. Returns the frame with corrected demand and the slopes with standard errors."""
    out, slopes = [], {}
    for m in range(1, 13):
        g = df[df.index.month == m]
        X = np.column_stack([g.t.values,
                             pd.get_dummies(g.index.year).values.astype(float),
                             pd.get_dummies(g.index.day_of_week).values[:, 1:].astype(float)])
        beta, *_ = np.linalg.lstsq(X, g.gwh.values, rcond=None)
        res = g.gwh.values - X @ beta
        s2 = res @ res / (len(g) - X.shape[1])
        se = float(np.sqrt(s2 * np.linalg.pinv(X.T @ X)[0, 0]))
        slopes[m] = (float(beta[0]), se)
        h = g.copy()
        for k, b in (("dc", beta[0]), ("dc_lo", beta[0] - 1.96 * se), ("dc_hi", beta[0] + 1.96 * se)):
            h[k] = h.gwh + b * (h.tn - h.t)
        out.append(h)
    return pd.concat(out).sort_index(), slopes


def cpi_gas() -> pd.Series:
    """Monthly CPI gas index (2015=100) to PRICE_END."""
    js = json.loads(get(CPI_GAS))
    s = pd.Series({pd.Period(pd.to_datetime(m["date"], format="%Y %b"), "M"): float(m["value"]) for m in js["months"]})
    return s.sort_index()[:PRICE_END]


def winter_of(p: pd.Period) -> str:
    """Label a winter month by its winter, e.g. November 2022 and March 2023 are both 2022/23."""
    y = p.year if p.month >= 11 else p.year - 1
    return f"{y}/{str(y + 1)[2:]}"


def pc(v: float) -> float:
    """Log change to percentage change."""
    return float((np.exp(v) - 1) * 100)


def ols(x: np.ndarray, y: np.ndarray) -> tuple[float, float]:
    """Slope and intercept of y on x."""
    b, a = np.polyfit(x, y, 1)
    return float(b), float(a)


def elasticity(mon: pd.DataFrame, price: pd.Series) -> dict:
    """Log year-on-year change in corrected demand against log year-on-year change in price, winter months, with a
    bootstrap over whole winters (months inside one winter share one price step, so they are not independent)."""
    rows = []
    for p in mon.index:
        q = p - 12
        if p.month not in WINTER or q not in mon.index or p not in price.index or q not in price.index:
            continue
        if any(LOCKDOWN[0] <= str(x) <= LOCKDOWN[1] for x in (p, q)):
            continue
        rows.append({"month": str(p), "winter": winter_of(p), "x": np.log(price[p] / price[q]), "y": np.log(mon.dc[p] / mon.dc[q])})
    e = pd.DataFrame(rows)
    b, a = ols(e.x.values, e.y.values)
    winters = e.winter.unique()
    groups = {w: e[e.winter == w] for w in winters}
    boot = []
    for _ in range(B):
        pick = pd.concat([groups[w] for w in RNG.choice(winters, len(winters))])
        if pick.x.std() < 1e-6:
            continue
        boot.append(ols(pick.x.values, pick.y.values))
    boot = np.array(boot)
    lo, hi = np.percentile(boot[:, 0], [2.5, 97.5])
    loo = {w: ols(e[e.winter != w].x.values, e[e.winter != w].y.values)[0] for w in winters}
    xs = np.linspace(e.x.min(), e.x.max(), 25)
    band = np.percentile(boot[:, :1] * xs + boot[:, 1:], [2.5, 97.5], axis=0)
    hist, edges = np.histogram(boot[:, 0], bins=np.arange(-0.40, 0.1001, 0.02))
    assert hist.sum() > 0.95 * len(boot), "bootstrap slopes fall outside the histogram range"
    return {"rows": e, "b": b, "a": a, "lo": float(lo), "hi": float(hi), "loo": loo, "n_boot": len(boot),
            "fit": [{"x": round(pc(x), 2), "y": round(pc(b * x + a), 2), "lo": round(pc(l), 2), "hi": round(pc(h), 2)}
                    for x, l, h in zip(xs, band[0], band[1])],
            "hist": [{"x0": round(edges[i], 2), "x1": round(edges[i + 1], 2), "n": int(hist[i])} for i in range(len(hist))]}


def bridge(day: pd.DataFrame, price: pd.Series, eps: float) -> dict:
    """Multiplicative winter volume bridge, November to March, in TWh: weather, price, then everything else.
    Weather is the gap between the raw and the corrected change; price is (P1/P0)^eps - 1 on winter-mean CPI."""
    w = day[day.index.month.isin(WINTER)].copy()
    w["winter"] = [winter_of(pd.Period(d, "M")) for d in w.index]
    out = {}
    for a, b in BRIDGES:
        A, Bw = w[w.winter == a], w[w.winter == b]
        v0, v1 = A.gwh.sum() / 1000, Bw.gwh.sum() / 1000
        raw = Bw.gwh.mean() / A.gwh.mean() - 1  # per day, so a leap February does not count as a change
        adj = Bw.dc.mean() / A.dc.mean() - 1
        wf = (1 + raw) / (1 + adj) - 1
        pm = lambda s: price[[pd.Period(f"{s[:4]}-{m:02d}", "M") + (12 if m < 11 else 0) for m in WINTER]].mean()
        pf = (pm(b) / pm(a)) ** eps - 1
        orders = {}
        for name, seq in (("weather", [("Weather", wf), ("Price", pf)]), ("price", [("Price", pf), ("Weather", wf)])):
            run, bars = v0, {}
            for k, f in seq:
                bars[k] = run * f
                run *= 1 + f
            bars["Other"] = v1 - run
            assert abs(v0 + sum(bars.values()) - v1) < 1e-9, "bridge does not close"
            orders[name] = {k: round(v, 2) for k, v in bars.items()}
        assert abs(orders["weather"]["Other"] - orders["price"]["Other"]) < 0.01, "residual should not depend on order"
        out[f"{a} to {b}"] = {"v0": round(v0, 1), "v1": round(v1, 1), "days0": len(A), "days1": len(Bw),
                              "price_change": round((pm(b) / pm(a) - 1) * 100, 1), **orders}
    return out


# ---------- synthetic meters ----------

def synthetic(scenario: str, n: int = 4000, true_change: float = -0.05) -> dict:
    """Illustrative meters over two years from 1 July: year A then year B with use per meter lower by true_change.
    'clean' keeps every meter and monthly reads in both years. 'messy' swaps a quarter of the meters (higher users
    leave, lower users join) and moves year B to daily reads. Returns each arm's winter change with a Poisson
    bootstrap interval over meters."""
    rng = np.random.default_rng(7 if scenario == "clean" else 11)
    D = 730
    days = pd.date_range("2024-07-01", periods=D)
    clim = 10.5 - 6.5 * np.cos(2 * np.pi * (np.arange(D) - 20) / 365.25 - np.pi)  # coldest in mid January
    shape = 0.25 + np.maximum(0, 15.5 - clim)
    shape = shape / shape[:365].mean()
    aq = rng.lognormal(np.log(11000), 0.45, n)
    yearB = np.arange(D) >= 365
    daily = (aq[:, None] / 365) * shape[None, :] * np.where(yearB, 1 + true_change, 1)[None, :] * rng.lognormal(0, 0.25, (n, D))
    inA, inB = np.ones(n, bool), np.ones(n, bool)
    if scenario == "messy":
        leave = rng.random(n) < np.where(aq > np.median(aq), 0.2, 0.05)  # higher users more likely to leave
        join = (rng.random(n) < leave.mean()) & ~leave
        inB[leave] = False
        inA[join] = False  # joiners arrive in year B and use less than the meters they replace
        daily[join] *= 0.85
    month = np.array([(d.year, d.month) for d in days])
    winter_mask = np.isin(month[:, 1], WINTER)

    def spread(read_days: np.ndarray, use: np.ndarray) -> np.ndarray:
        """Spread consumption between consecutive reads evenly over the interval's days; NaN outside the reads."""
        out = np.full(D, np.nan)
        c = np.concatenate([[0], np.cumsum(use)])
        for s, e in zip(read_days[:-1], read_days[1:]):
            out[s:e] = (c[e] - c[s]) / (e - s)
        return out

    def reads(i: int, daily_b: bool, thin: bool) -> np.ndarray:
        lo, hi = (0 if inA[i] else 365), (D if inB[i] else 365)
        off = rng.integers(0, 30)
        monthly = np.arange(lo + off, hi, 30)
        if daily_b and inB[i]:
            b_reads = np.arange(max(lo, 365), hi)
            if thin:  # keep one read about every 30 days, as in year A
                b_reads = b_reads[::30]
            r = np.concatenate([monthly[monthly < 365], b_reads])
        else:
            r = monthly
        return np.unique(np.concatenate([[lo], r, [hi]]))

    def arm(cohort_only: bool, thin: bool) -> np.ndarray:
        """Per-meter kWh and meter-days for each winter month of each year: arrays meters x 10."""
        keys = [(y, m) for y, m in sorted(set(map(tuple, month[winter_mask])), key=lambda k: (k[0], k[1]))]
        kwh, cnt = np.zeros((n, len(keys))), np.zeros((n, len(keys)))
        idx = [np.where((month[:, 0] == y) & (month[:, 1] == m))[0] for y, m in keys]
        for i in range(n):
            if cohort_only and not (inA[i] and inB[i]):
                continue
            s = spread(reads(i, scenario == "messy", thin), daily[i])
            for j, ix in enumerate(idx):
                v = s[ix]
                ok = ~np.isnan(v)
                kwh[i, j], cnt[i, j] = v[ok].sum(), ok.sum()
        return kwh, cnt, keys

    def change(kwh, cnt, keys, w):
        """Mean over the five winter months of (kWh per meter-day in B) / (kWh per meter-day in A), minus 1."""
        k = (w @ kwh) / np.maximum(w @ cnt, 1e-9)
        a = {m: k[..., j] for j, (y, m) in enumerate(keys) if (y == 2024 and m >= 11) or (y == 2025 and m <= 3)}
        b = {m: k[..., j] for j, (y, m) in enumerate(keys) if (y == 2025 and m >= 11) or (y == 2026 and m <= 3)}
        return np.mean([b[m] / a[m] for m in WINTER], axis=0) - 1

    res = {}
    W = rng.poisson(1.0, (1000, n)).astype(float)
    for name, (co, th) in {"Full sample": (False, False), "Fixed cohort": (True, False), "Thinned reads": (True, True)}.items():
        kwh, cnt, keys = arm(co, th)
        est = float(change(kwh, cnt, keys, np.ones(n)))
        bs = change(kwh, cnt, keys, W)
        res[name] = {"est": round(est * 100, 2), "lo": round(float(np.percentile(bs, 2.5)) * 100, 2),
                     "hi": round(float(np.percentile(bs, 97.5)) * 100, 2)}
    res["meta"] = {"meters": n, "true": true_change * 100, "left": int((~inB).sum()), "joined": int((~inA).sum())}
    return res


def main() -> None:
    ldz = pd.read_csv(LDZ, index_col=0, parse_dates=True).gwh[:END]
    t = era5()
    tn = fixed_normal(t)
    df = pd.concat([ldz, t, tn], axis=1, join="inner").dropna()
    df = df["2015-01-01":END]
    day, slopes = weather_correct(df)
    assert all(slopes[m][0] < 0 for m in WINTER), "winter demand should fall as temperature rises"

    full = day[:"2026-07-31"]  # complete months only
    mon = full.groupby(full.index.to_period("M"))[["gwh", "dc", "dc_lo", "dc_hi"]].mean()
    price = cpi_gas()
    el = elasticity(mon, price)

    # 12-month rolling index of corrected demand against the same months of BASE_YEARS
    base = mon[(mon.index.year >= BASE_YEARS[0]) & (mon.index.year <= BASE_YEARS[1])].dc.groupby(lambda p: p.month).mean()
    roll = {k: mon[k].rolling(12).sum() for k in ("dc", "dc_lo", "dc_hi")}
    idx = {k: (v / base.sum() * 100) for k, v in roll.items()}
    keep = idx["dc"].dropna().index
    keep = keep[keep >= pd.Period("2016-12", "M")]
    index_series = {"months": [str(p) for p in keep], "mid": [round(idx["dc"][p], 1) for p in keep],
                    "lo": [round(min(idx["dc_lo"][p], idx["dc_hi"][p]), 1) for p in keep],
                    "hi": [round(max(idx["dc_lo"][p], idx["dc_hi"][p]), 1) for p in keep]}
    yearly = {y: round(idx["dc"][pd.Period(f"{y}-12", "M")], 1) for y in range(2017, 2026)}

    scatter = {}
    for y in SCATTER_YEARS:
        g = df.loc[str(y)]
        bins = np.arange(-4, 25, 1.0)
        cut = pd.cut(g.t, bins)
        fit = g.groupby(cut, observed=True).gwh.agg(["mean", "size"])
        scatter[str(y)] = {"points": [{"x": round(a, 1), "y": round(b)} for a, b in zip(g.t, g.gwh)],
                           "fit": [{"x": round(iv.mid, 1), "y": round(r["mean"])} for iv, r in fit.iterrows() if r["size"] >= 5]}

    bridges = bridge(full, price, el["b"])
    syn = {s: synthetic(s) for s in ("clean", "messy")}
    assert abs(syn["clean"]["Full sample"]["est"] - (-5)) < 1.0, "clean synthetic data should recover the planted change"

    def pw(s: str) -> float:
        """Mean CPI gas index over one winter, November to March."""
        return float(price[[pd.Period(f"{s[:4]}-{m:02d}", "M") + (12 if m < 11 else 0) for m in WINTER]].mean())

    e = el["rows"]
    w22 = e[e.winter == "2022/23"]
    w23 = e[e.winter == "2023/24"]
    facts = {
        "elasticity": round(el["b"], 3), "elasticity_lo": round(el["lo"], 3), "elasticity_hi": round(el["hi"], 3),
        "drift_pct": round(el["a"] * 100, 1), "n_months": len(e), "n_winters": int(e.winter.nunique()),
        "first_month": e.month.iloc[0], "last_month": e.month.iloc[-1],
        "loo_min": round(min(el["loo"].values()), 3), "loo_max": round(max(el["loo"].values()), 3),
        "loo_without_2223": round(el["loo"]["2022/23"], 3),
        "price_2223_pct": round((np.exp(w22.x.mean()) - 1) * 100), "demand_2223_pct": round((np.exp(w22.y.mean()) - 1) * 100, 1),
        "price_2324_pct": round((np.exp(w23.x.mean()) - 1) * 100), "demand_2324_pct": round((np.exp(w23.y.mean()) - 1) * 100, 1),
        "index_by_dec": yearly, "index_latest": index_series["mid"][-1], "index_latest_month": index_series["months"][-1],
        "slope_jan": round(slopes[1][0], 1), "slope_jan_se": round(slopes[1][1], 1),
        "n_boot": el["n_boot"],
        "cap_q2": CAP_Q2, "cap_q3": CAP_Q3, "cap_rise_pct": round((CAP_Q3 / CAP_Q2 - 1) * 100, 1),
        "cap_effect_pct": round(((CAP_Q3 / CAP_Q2) ** el["b"] - 1) * 100, 1),
        "cap_effect_lo": round(((CAP_Q3 / CAP_Q2) ** el["lo"] - 1) * 100, 1),
        "cap_effect_hi": round(((CAP_Q3 / CAP_Q2) ** el["hi"] - 1) * 100, 1),
        "price_vs_base_pct": round((pw("2025/26") / np.mean([pw(f"{y}/{str(y + 1)[2:]}") for y in range(2016, 2019)]) - 1) * 100),
        "pred_vs_base_pct": round(((pw("2025/26") / np.mean([pw(f"{y}/{str(y + 1)[2:]}") for y in range(2016, 2019)])) ** el["b"] - 1) * 100, 1),
    }
    data = {"facts": facts, "scatter": scatter, "index": index_series,
            "elasticity": {"points": [{"x": round(pc(r.x), 1), "y": round(pc(r.y), 1), "label": f"{r.month}"} for r in e.itertuples()],
                           "fit": el["fit"], "hist": el["hist"], "loo": {k: round(v, 3) for k, v in el["loo"].items()}},
            "bridge": bridges, "synthetic": syn}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, separators=(",", ":")))
    print(json.dumps(facts, indent=1))
    print(json.dumps(bridges, indent=1))
    print(json.dumps(syn, indent=1))
    print({m: tuple(round(v, 1) for v in s) for m, s in slopes.items()})
    print(OUT, OUT.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
