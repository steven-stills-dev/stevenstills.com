"""Build src/projects/late-actuals/data.json: lag features under an imposed publication lag.

Run: uv run --python 3.11 --with pandas --with numpy --with lightgbm --with scikit-learn --with holidays scripts/late-actuals/build.py

Target: daily GB national demand (ND) from NESO historic demand data, in GWh.
Weather: ERA5 daily means at eight population centres via the Open-Meteo archive.
The publication lag P is imposed: NESO publishes national demand quickly, so the script
pretends day s's actual only becomes usable on day s + P, the way a supplier's settled
volumes arrive weeks after delivery.
"""
import io
import json
import math
import sys
import urllib.parse
from pathlib import Path

import holidays
import lightgbm as lgb
import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fetch_cache import get  # noqa: E402

OUT = Path(__file__).resolve().parents[2] / "src" / "projects" / "late-actuals" / "data.json"
NESO_PKG = "https://api.neso.energy/api/3/action/package_show?id=historic-demand-data"
ERA5 = "https://archive-api.open-meteo.com/v1/archive"
FIRST, LAST = pd.Timestamp("2019-01-01"), pd.Timestamp("2026-10-12")
TRAIN_FROM = pd.Timestamp("2021-01-01")          # skips the 2020 lockdown year
EVAL_FROM = pd.Timestamp("2024-10-13")           # two years of issue dates
H = 14                                           # horizons 1 to 14 days
P_MAIN = 21                                      # imposed lag: about 15 working days, the second (SF) settlement run
P_SWEEP = [7, 14, 21, 28, 35, 42, 49, 56]
REFIT_DAYS = 28
CITIES = {"London": (51.51, -0.13), "Birmingham": (52.48, -1.90), "Manchester": (53.48, -2.24),
          "Leeds": (53.80, -1.55), "Glasgow": (55.86, -4.25), "Bristol": (51.45, -2.59),
          "Newcastle": (54.98, -1.61), "Cardiff": (51.48, -3.18)}
PARAMS = dict(objective="regression", learning_rate=0.05, n_estimators=300, num_leaves=15,
              min_child_samples=40, subsample=0.9, subsample_freq=1, colsample_bytree=0.9,
              random_state=0, verbose=-1, n_jobs=1)
BASE = ["h", "dow", "doy_s", "doy_c", "hol", "xmas", "temp", "hdd", "solar", "wind"]
LAGS = ["lag_a", "lag_b", "lag_c", "week"]
GROUP = {"h": "Horizon", "dow": "Calendar", "doy_s": "Calendar", "doy_c": "Calendar", "hol": "Calendar",
         "xmas": "Calendar", "temp": "Weather", "hdd": "Weather", "solar": "Weather", "wind": "Weather",
         "lag_a": "Lagged demand", "lag_b": "Lagged demand", "lag_c": "Lagged demand", "week": "Lagged demand"}


def demand() -> pd.Series:
    """Return daily national demand (ND) in GWh, FIRST to LAST."""
    res = json.loads(get(NESO_PKG))["result"]["resources"]
    frames = []
    for y in range(FIRST.year, LAST.year + 1):
        url = next(r["url"] for r in res if r["url"].endswith(f"_{y}.csv"))
        df = pd.read_csv(io.BytesIO(get(url)), usecols=["SETTLEMENT_DATE", "SETTLEMENT_PERIOD", "ND"])
        frames.append(df)
    df = pd.concat(frames)
    s = df["SETTLEMENT_DATE"].astype(str)   # 01-JAN-2019, 01-Jan-23 (2023 file) and 2025-01-01 all occur
    df["d"] = pd.NaT
    for fmt in ("%d-%b-%Y", "%d-%b-%y", "%Y-%m-%d"):
        df["d"] = df["d"].fillna(pd.to_datetime(s, format=fmt, errors="coerce"))
    assert df["d"].notna().all()
    df = df.drop_duplicates(["d", "SETTLEMENT_PERIOD"])
    g = df.groupby("d")
    y = g["ND"].sum() * 0.5 / 1000                # MW per half hour to GWh
    y = y[g.size().between(46, 50)]
    return y.loc[FIRST:LAST].asfreq("D")


def weather() -> pd.DataFrame:
    """Return daily mean temperature, solar radiation and wind, averaged over CITIES."""
    q = urllib.parse.urlencode({
        "latitude": ",".join(str(a) for a, _ in CITIES.values()),
        "longitude": ",".join(str(b) for _, b in CITIES.values()),
        "start_date": FIRST.date().isoformat(), "end_date": LAST.date().isoformat(),
        "daily": "temperature_2m_mean,shortwave_radiation_sum,wind_speed_10m_max", "timezone": "Europe/London"})
    sites = json.loads(get(f"{ERA5}?{q}"))
    cols = {"temperature_2m_mean": "temp", "shortwave_radiation_sum": "solar", "wind_speed_10m_max": "wind"}
    parts = [pd.DataFrame(s["daily"]).set_index("time").rename(columns=cols) for s in sites]
    w = sum(parts) / len(parts)
    w.index = pd.to_datetime(w.index)
    w["hdd"] = (15.5 - w["temp"]).clip(lower=0)
    return w


def ceil7(x):
    return (np.ceil(np.asarray(x) / 7) * 7).astype(int)


def frame(y, w, days, design, P, live):
    """Build feature rows for issue dates `days` x horizons 1..H under one lag design.

    `live` hides every actual dated after D - P, as at issue time; a leaky lag then takes
    the latest published value for the same weekday ("fill") or stays missing ("nan").
    """
    D = np.repeat(days.values, H)
    h = np.tile(np.arange(1, H + 1), len(days))
    T = D + h.astype("timedelta64[D]")
    cut = D - np.timedelta64(P, "D")
    r7 = y.rolling(7).mean()
    f = pd.DataFrame({"D": D, "T": T, "h": h})
    Ti = pd.DatetimeIndex(T)
    f["dow"] = Ti.day_of_week
    f["doy_s"], f["doy_c"] = np.sin(2 * np.pi * Ti.day_of_year / 365.25), np.cos(2 * np.pi * Ti.day_of_year / 365.25)
    eng = holidays.country_holidays("GB", subdiv="ENG", years=range(FIRST.year, LAST.year + 2))
    f["hol"] = [int(t in eng) for t in Ti.date]
    f["xmas"] = (((Ti.month == 12) & (Ti.day >= 24)) | ((Ti.month == 1) & (Ti.day == 1))).astype(int)
    for c in ["temp", "hdd", "solar", "wind"]:
        f[c] = w[c].reindex(Ti).values
    f["y"] = y.reindex(Ti).values

    def pick(series, src):
        src = np.asarray(src, dtype="datetime64[ns]")
        if live:
            late = src > cut
            assert design == "leaky" or not late.any(), "a clean design read an unpublished actual"
            if late.any() and live == "fill":
                back = ceil7((src - cut) / np.timedelta64(1, "D"))
                src = np.where(late, src - back.astype("timedelta64[D]"), src)
            vals = series.reindex(pd.DatetimeIndex(src)).values
            return np.where(late & (live == "nan"), np.nan, vals)
        return series.reindex(pd.DatetimeIndex(src)).values

    day = np.timedelta64(1, "D")
    if design == "leaky":
        f["lag_a"] = pick(y, T - 1 * day)
        f["lag_b"] = pick(y, T - 7 * day)
        f["lag_c"] = pick(y, T - 14 * day)
        if live == "fill":
            f["week"] = np.where(T - day > cut, r7.reindex(pd.DatetimeIndex(cut)).values, r7.reindex(pd.DatetimeIndex(T - day)).values)
        else:
            f["week"] = pick(r7, T - day)
    elif design in ("fixed", "asof"):
        ks = np.full_like(h, ceil7(H + P)) if design == "fixed" else ceil7(h + P)
        for name, extra in (("lag_a", 0), ("lag_b", 7), ("lag_c", 14)):
            f[name] = pick(y, T - (ks + extra).astype("timedelta64[D]"))
        f["week"] = pick(r7, T - ks.astype("timedelta64[D]")) if design == "fixed" else pick(r7, cut)
    return f


def feats(design):
    return BASE if design == "none" else BASE + LAGS


def run(y, w, design, P, live_policy="fill"):
    """Rolling-origin replay: refit every REFIT_DAYS, forecast each issue date in the block.

    Returns (backtest frame, live frame, gain importance by feature).
    Backtest = what a careless backtest scores: labels up to the origin and complete lags.
    Live = labels published by the origin (T <= M - P) and features as known at issue time.
    """
    days = pd.date_range(EVAL_FROM, LAST - pd.Timedelta(days=H))
    hist = pd.date_range(TRAIN_FROM, LAST)
    full_hist = frame(y, w, hist, design, P, live=False)
    out_bt, out_lv, gain = [], [], pd.Series(0.0, index=feats(design))
    for i in range(0, len(days), REFIT_DAYS):
        block = days[i:i + REFIT_DAYS]
        M = block[0]
        X = feats(design)
        tr_lv = full_hist[(full_hist["T"] <= M - pd.Timedelta(days=P)) & full_hist["y"].notna()]
        m_lv = lgb.LGBMRegressor(**PARAMS).fit(tr_lv[X], tr_lv["y"])
        gain += pd.Series(m_lv.booster_.feature_importance("gain"), index=X)
        lv = frame(y, w, block, design, P, live=live_policy if design == "leaky" else True)
        lv["f"] = m_lv.predict(lv[X])
        out_lv.append(lv)
        if design == "leaky":
            tr_bt = full_hist[(full_hist["T"] < M) & full_hist["y"].notna()]
            m_bt = lgb.LGBMRegressor(**PARAMS).fit(tr_bt[X], tr_bt["y"])
            bt = frame(y, w, block, design, P, live=False)
            bt["f"] = m_bt.predict(bt[X])
        else:
            bt = lv.copy()                                # identical by construction
        out_bt.append(bt)
    return pd.concat(out_bt), pd.concat(out_lv), gain / gain.sum()


def wmape(f):
    return float((f["f"] - f["y"]).abs().sum() / f["y"].sum() * 100)


def boot(f, stat, n=1000, seed=1):
    """Resample whole issue weeks (blocks of 7 issue dates) and return the 5th and 95th percentiles."""
    rng = np.random.default_rng(seed)
    wk = ((f["D"] - EVAL_FROM).dt.days // 7).values
    groups = {k: np.flatnonzero(wk == k) for k in np.unique(wk)}
    keys = np.array(list(groups))
    vals = []
    for _ in range(n):
        idx = np.concatenate([groups[k] for k in rng.choice(keys, len(keys))])
        vals.append(stat(f.iloc[idx]))
    return np.percentile(vals, [5, 95])


def by_h(f):
    return [wmape(f[f["h"] == k]) for k in range(1, H + 1)]


def hist(f, lo=-12, hi=12, step=1):
    e = ((f["f"] - f["y"]) / f["y"] * 100).clip(lo, hi - 1e-9)
    n, edges = np.histogram(e, bins=np.arange(lo, hi + step, step))
    return [{"x0": float(a), "x1": float(b), "n": int(c)} for a, b, c in zip(edges[:-1], edges[1:], n)]


def r(x, d=2):
    return round(float(x), d)


def main():
    y, w = demand(), weather()
    assert y.diff().abs().loc[EVAL_FROM:].median() < 40, "day-to-day jumps suggest scrambled dates"
    assert y.notna().mean() > 0.99 and 350 < y.loc[EVAL_FROM:].mean() < 800, "daily ND outside plausible GWh"
    assert w["temp"].between(-15, 35).all()

    res = {d: run(y, w, d, P_MAIN) for d in ["none", "leaky", "fixed", "asof"]}
    _, leaky_nan, _ = run(y, w, "leaky", P_MAIN, live_policy="nan")
    names = {"none": "No lags", "leaky": "Leaky lags", "fixed": "Leak-free lags", "asof": "As-of lags"}

    # clean designs: backtest and live are the same rows
    for d in ["none", "fixed", "asof"]:
        assert np.allclose(res[d][0]["f"], res[d][1]["f"])

    bt, lv = res["leaky"][0], res["leaky"][1]
    assert (bt["D"].values == lv["D"].values).all() and (bt["h"].values == lv["h"].values).all()
    paired = bt[["D", "h", "y"]].assign(fb=bt["f"].values, fl=lv["f"].values)
    gap_ci = boot(paired, lambda g: (g["fl"] - g["y"]).abs().sum() / g["y"].sum() * 100 - (g["fb"] - g["y"]).abs().sum() / g["y"].sum() * 100)

    designs = []
    for d in ["none", "leaky", "fixed", "asof"]:
        b, l, _ = res[d]
        designs.append({"key": d, "name": names[d], "backtest": r(wmape(b)), "live": r(wmape(l))})

    horizon = {}
    for d in ["leaky", "fixed", "asof", "none"]:
        b, l, _ = res[d]
        lo_hi = np.array([boot(l[l["h"] == k], wmape, n=400) for k in range(1, H + 1)])
        horizon[d] = {"live": [r(v) for v in by_h(l)], "backtest": [r(v) for v in by_h(b)],
                      "lo": [r(v) for v in lo_hi[:, 0]], "hi": [r(v) for v in lo_hi[:, 1]]}

    imp = {}
    for d in ["leaky", "asof"]:
        g = res[d][2].groupby(lambda c: GROUP[c]).sum() * 100
        assert g.get("Horizon", 0) < 1, "horizon carries no gain here, so the chart leaves it out"
        imp[d] = {k: r(g.get(k, 0), 1) for k in ["Lagged demand", "Weather", "Calendar"]}

    sweep = []
    for P in P_SWEEP:
        row = {"P": P, "floor": int(ceil7(H + P)), "asofMin": int(ceil7(1 + P))}
        for d in ["leaky", "fixed", "asof"]:
            row[d] = r(wmape(run(y, w, d, P)[1])) if P != P_MAIN else next(x["live"] for x in designs if x["key"] == d)
        sweep.append(row)
        print("sweep", row)

    dist = {"leakyBacktest": hist(bt), "leakyLive": hist(lv), "asof": hist(res["asof"][1])}

    D = {x["key"]: x for x in designs}
    facts = {
        "P_main": P_MAIN, "horizons": H, "floor_main": int(ceil7(H + P_MAIN)),
        "eval_from": EVAL_FROM.date().isoformat(), "eval_to": (LAST - pd.Timedelta(days=H)).date().isoformat(),
        "last_target": LAST.date().isoformat(), "train_from": TRAIN_FROM.date().isoformat(),
        "n_rows": int(len(lv)), "refits": int(math.ceil(len(lv) / H / REFIT_DAYS)),
        "mean_daily_gwh": r(y.loc[EVAL_FROM:].mean(), 0),
        "leaky_backtest": D["leaky"]["backtest"], "leaky_live": D["leaky"]["live"],
        "leaky_live_nan": r(wmape(leaky_nan)),
        "gap": r(D["leaky"]["live"] - D["leaky"]["backtest"]), "gap_lo": r(gap_ci[0]), "gap_hi": r(gap_ci[1]),
        "gap_ratio": r(D["leaky"]["live"] / D["leaky"]["backtest"], 1),
        "none": D["none"]["live"], "fixed": D["fixed"]["live"], "asof": D["asof"]["live"],
        "leaky_bt_h1": horizon["leaky"]["backtest"][0], "leaky_live_h1": horizon["leaky"]["live"][0],
        "leaky_live_h14": horizon["leaky"]["live"][-1], "leaky_bt_h14": horizon["leaky"]["backtest"][-1],
        "asof_h1": horizon["asof"]["live"][0], "asof_h14": horizon["asof"]["live"][-1],
        "fixed_h1": horizon["fixed"]["live"][0],
        "imp_leaky_lags": imp["leaky"]["Lagged demand"], "imp_asof_lags": imp["asof"]["Lagged demand"],
        "imp_leaky_weather": imp["leaky"]["Weather"], "imp_asof_weather": imp["asof"]["Weather"],
        "within3_leaky_bt": r((((bt["f"] - bt["y"]) / bt["y"]).abs() < 0.03).mean() * 100, 0),
        "within3_leaky_live": r((((lv["f"] - lv["y"]) / lv["y"]).abs() < 0.03).mean() * 100, 0),
        "within3_asof": r((((res["asof"][1]["f"] - res["asof"][1]["y"]) / res["asof"][1]["y"]).abs() < 0.03).mean() * 100, 0),
        "sweep_asof_7": sweep[0]["asof"], "sweep_asof_56": sweep[-1]["asof"],
        "sweep_leaky_7": sweep[0]["leaky"], "sweep_leaky_56": sweep[-1]["leaky"],
    }
    assert facts["leaky_live"] > facts["leaky_backtest"], "the leak should flatter the backtest"
    out = {"facts": facts, "designs": designs, "horizon": horizon, "importance": imp, "sweep": sweep, "dist": dist}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, separators=(",", ":")))
    print(json.dumps(facts, indent=1))


if __name__ == "__main__":
    main()
