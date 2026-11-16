"""Score the published day-ahead national demand forecast against two outturns and export chart data.

Run: uv run --python 3.11 --with pandas --with numpy --with scipy scripts/forecast-error/build.py
Forecast: Elexon NDF as published at about 11:45 UTC the day before delivery.
Truth: Elexon INDO (first published) and NESO historic demand ND (later, revised).
Window: 1 January 2024 to 31 December 2025.
"""
import io
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE))
from fetch_cache import get  # noqa: E402
from fetch import NESO, days, indo_urls, ndf_url  # noqa: E402

OUT = HERE.parents[1] / "src" / "projects" / "forecast-error" / "data.json"
RNG = np.random.default_rng(20260519)
NBOOT = 1000
MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def load():
    """Return one row per settlement date and period with forecast, first and final outturn, plus trap counts."""
    traps = {}
    rows = []
    for d in days():
        for r in json.loads(get(ndf_url(d)))["data"]:
            if r["settlementDate"] == str(d) and r.get("nationalDemand") is not None:
                rows.append((r["settlementDate"], r["settlementPeriod"], r["nationalDemand"], r["publishTime"]))
    f = pd.DataFrame(rows, columns=["date", "sp", "F", "pub"])
    rows = [(r["settlementDate"], r["settlementPeriod"], r["initialDemandOutturn"])
            for u in indo_urls() for r in json.loads(get(u))["data"]]
    a0 = pd.DataFrame(rows, columns=["date", "sp", "A0"])
    a1 = pd.concat([pd.read_csv(io.BytesIO(get(u))) for u in NESO.values()], ignore_index=True)
    a1 = a1.rename(columns=str.upper).rename(columns={"SETTLEMENT_DATE": "date", "SETTLEMENT_PERIOD": "sp", "ND": "A1"})
    # the 2024 file uses 01-JAN-2024, the 2025 file ISO dates; dayfirst on ISO would swap day and month
    iso = a1["date"].str.match(r"^\d{4}-")
    # trap demo: one day-first parse across both files silently swaps day and month in the ISO-dated year
    bad = a1.assign(date=pd.to_datetime(a1["date"], format="mixed", dayfirst=True).dt.strftime("%Y-%m-%d"))
    a1["date"] = pd.concat([pd.to_datetime(a1.loc[iso, "date"], format="%Y-%m-%d"),
                            pd.to_datetime(a1.loc[~iso, "date"], format="%d-%b-%Y")]).sort_index().dt.strftime("%Y-%m-%d")
    a1 = a1[["date", "sp", "A1"]]
    m = f.merge(bad[["date", "sp", "A1"]], on=["date", "sp"]).dropna()
    traps["wmape_misparsed"] = round(100 * float(np.abs(m.F - m.A1).sum() / m.A1.sum()), 2)
    for name, df in (("ndf", f), ("indo", a0), ("neso", a1)):
        traps[f"dup_{name}"] = int(df.duplicated(["date", "sp"]).sum())
    # duplicate submissions are identical, not additive: average, never sum
    f = f.groupby(["date", "sp"], as_index=False).agg(F=("F", "mean"), pub=("pub", "first"))
    a0 = a0.groupby(["date", "sp"], as_index=False)["A0"].mean()
    a1 = a1.groupby(["date", "sp"], as_index=False)["A1"].mean()
    df = f.merge(a0, on=["date", "sp"], how="outer").merge(a1, on=["date", "sp"], how="outer")
    df = df[(df.date >= "2024-01-01") & (df.date <= "2025-12-31")]
    traps["rows_all"] = len(df)
    traps["missing_any"] = int(df[["F", "A0", "A1"]].isna().any(axis=1).sum())
    traps["zero_actual"] = int(((df.A0 <= 0) | (df.A1 <= 0)).sum())
    df = df.dropna(subset=["F", "A0", "A1"])
    df = df[(df.A0 > 0) & (df.A1 > 0)].copy()
    per_day = df.groupby("date").sp.max()
    traps["short_days"] = int((per_day == 46).sum())
    traps["long_days"] = int((per_day == 50).sum())
    df["dt"] = pd.to_datetime(df.date)
    df["month"] = df.dt.dt.month
    df["ym"] = df.dt.dt.strftime("%Y-%m")
    df["weekend"] = df.dt.dt.day_of_week >= 5
    df["week"] = df.dt.dt.strftime("%G-%V")
    return df.sort_values(["date", "sp"]).reset_index(drop=True), traps


def wmape(F, A):
    """Return volume-weighted absolute percentage error: sum |F-A| / sum A, in %."""
    return 100 * np.abs(F - A).sum() / A.sum()


def mape(F, A):
    """Return the mean of half-hourly absolute percentage errors, in %."""
    return 100 * np.mean(np.abs(F - A) / A)


def bias(F, A):
    """Return volume-weighted bias: sum (F-A) / sum A, in %. Positive means the forecast was above the outturn."""
    return 100 * (F - A).sum() / A.sum()


def boot(df, fn, key="week", n=NBOOT):
    """Return the 2.5th and 97.5th percentiles of fn over block-bootstrap resamples of whole `key` blocks."""
    groups = [g for _, g in df.groupby(key)]
    out = []
    for _ in range(n):
        pick = RNG.integers(0, len(groups), len(groups))
        out.append(fn(pd.concat([groups[i] for i in pick])))
    return [float(np.percentile(out, 2.5)), float(np.percentile(out, 97.5))]


def r(x, k=2):
    """Round to k decimals for export."""
    return None if x is None or (isinstance(x, float) and np.isnan(x)) else round(float(x), k)


def main():
    df, traps = load()
    F, A0, A1 = df.F.values, df.A0.values, df.A1.values
    assert len(df) > 30000, "expected two years of half hours"
    assert abs(np.median(A1) / 1000 - 25) < 10, "national demand should be tens of GW"
    facts = {"rows": len(df), **traps}
    facts["first_pub"] = df.pub.min()
    facts["last_pub"] = df.pub.max()

    # seasonal naive benchmark: same half hour one week earlier, on the final truth
    key = df.set_index(["date", "sp"]).A1
    prev = pd.to_datetime(df.date) - pd.Timedelta(days=7)
    df["naive"] = [key.get((p.strftime("%Y-%m-%d"), s), np.nan) for p, s in zip(prev, df.sp)]
    nv = df.dropna(subset=["naive"])

    def table_row(name, unit, fn, digits=2):
        """Return one metric row: forecast against final and first outturn, bootstrap interval, naive benchmark."""
        lo, hi = boot(df, lambda g: fn(g.F.values, g.A1.values))
        return {"metric": name, "unit": unit, "final": r(fn(F, A1), digits), "lo": r(lo, digits), "hi": r(hi, digits),
                "first": r(fn(F, A0), digits), "naive": r(fn(nv.naive.values, nv.A1.values), digits)}

    mae = lambda F, A: np.mean(np.abs(F - A))  # noqa: E731
    rmse = lambda F, A: np.sqrt(np.mean((F - A) ** 2))  # noqa: E731
    naive_mae = mae(nv.naive.values, nv.A1.values)
    mase = lambda F, A: mae(F, A) / naive_mae  # noqa: E731
    table = [
        table_row("Weighted MAPE", "%", wmape),
        table_row("MAPE", "%", mape),
        table_row("Bias", "%", bias),
        table_row("MAE", "MW", mae, 0),
        table_row("RMSE", "MW", rmse, 0),
        table_row("MASE", "ratio", mase, 3),
    ]
    T = {t["metric"]: t for t in table}
    facts.update({
        "wmape_final": T["Weighted MAPE"]["final"], "wmape_lo": T["Weighted MAPE"]["lo"], "wmape_hi": T["Weighted MAPE"]["hi"],
        "wmape_first": T["Weighted MAPE"]["first"], "wmape_naive": T["Weighted MAPE"]["naive"],
        "mape_final": T["MAPE"]["final"], "mape_lo": T["MAPE"]["lo"], "mape_hi": T["MAPE"]["hi"], "mape_first": T["MAPE"]["first"],
        "bias_final": T["Bias"]["final"], "bias_lo": T["Bias"]["lo"], "bias_hi": T["Bias"]["hi"], "bias_first": T["Bias"]["first"],
        "mae_final": T["MAE"]["final"], "rmse_final": T["RMSE"]["final"], "mase": T["MASE"]["final"],
        "mase_first": T["MASE"]["first"],
    })
    assert T["MAPE"]["final"] >= T["Weighted MAPE"]["final"] * 0.95, "MAPE should not sit far below weighted MAPE here"
    assert T["Weighted MAPE"]["lo"] <= T["Weighted MAPE"]["final"] <= T["Weighted MAPE"]["hi"]

    # revisions between first and final outturn
    rev = 100 * (A1 - A0) / A0
    facts["rev_share_changed"] = r(100 * np.mean(np.abs(A1 - A0) >= 1), 1)
    facts["rev_mean"] = r(rev.mean(), 2)
    facts["rev_abs_mean"] = r(np.abs(rev).mean(), 2)
    facts["rev_p95_abs"] = r(np.percentile(np.abs(rev), 95), 2)
    facts["rev_total"] = r(100 * (A1.sum() - A0.sum()) / A0.sum(), 2)

    # profile by half hour, weekday against weekend (periods 1-48 only)
    p = df[df.sp <= 48]
    profile = {}
    for m, fn in (("wmape", wmape), ("mape", mape), ("bias", bias)):
        profile[m] = {}
        for lab, sub in (("weekday", p[~p.weekend]), ("weekend", p[p.weekend])):
            profile[m][lab] = [r(fn(g.F.values, g.A1.values)) for _, g in sub.groupby("sp")]
    facts["wmape_weekday"] = r(wmape(p[~p.weekend].F.values, p[~p.weekend].A1.values))
    facts["wmape_weekend"] = r(wmape(p[p.weekend].F.values, p[p.weekend].A1.values))
    facts["bias_weekday"] = r(bias(p[~p.weekend].F.values, p[~p.weekend].A1.values))
    facts["bias_weekend"] = r(bias(p[p.weekend].F.values, p[p.weekend].A1.values))
    wk = np.array(profile["wmape"]["weekend"])
    facts["wmape_weekend_peak_sp"] = int(np.argmax(wk)) + 1
    facts["wmape_weekend_peak"] = r(wk.max())

    # bias heat map: calendar month x half hour, against each truth
    heat = {}
    for t in ("A0", "A1"):
        heat[t] = [[r(bias(c.F.values, c[t].values)) for _, c in g.groupby("sp")] for _, g in p.groupby("month")]
    h1 = np.array(heat["A1"], dtype=float)
    i, j = np.unravel_index(np.nanargmin(h1), h1.shape)
    facts["heat_min"], facts["heat_min_month"], facts["heat_min_sp"] = r(h1[i, j]), MON[i], int(j) + 1
    i, j = np.unravel_index(np.nanargmax(h1), h1.shape)
    facts["heat_max"], facts["heat_max_month"], facts["heat_max_sp"] = r(h1[i, j]), MON[i], int(j) + 1
    summer_mid = p[p.month.isin([5, 6, 7, 8]) & p.sp.between(23, 30)]
    facts["bias_summer_midday"] = r(bias(summer_mid.F.values, summer_mid.A1.values))
    winter_eve = p[p.month.isin([12, 1, 2]) & p.sp.between(33, 38)]
    facts["bias_winter_evening"] = r(bias(winter_eve.F.values, winter_eve.A1.values))

    # signed error distribution, % of outturn
    pe = 100 * (F - A1) / A1
    edges = np.arange(-12, 12.5, 0.5)
    clipped = np.clip(pe, -11.99, 11.99)
    n, _ = np.histogram(clipped, edges)
    mu, sd = pe.mean(), pe.std()
    curve = (stats.norm.pdf((edges[:-1] + edges[1:]) / 2, mu, sd) * 0.5 * len(pe)).tolist()
    hist = [{"x0": float(a), "x1": float(b), "n": int(c)} for a, b, c in zip(edges[:-1], edges[1:], n)]
    facts.update({
        "pe_mean": r(mu), "pe_sd": r(sd), "pe_median": r(np.median(pe)), "pe_skew": r(stats.skew(pe)),
        "pe_kurt": r(stats.kurtosis(pe)), "pe_p1": r(np.percentile(pe, 1)), "pe_p99": r(np.percentile(pe, 99)),
        "pe_beyond5": r(100 * np.mean(np.abs(pe) > 5), 1),
        "pe_beyond5_normal": r(100 * (stats.norm.cdf(-5, mu, sd) + stats.norm.sf(5, mu, sd)), 1),
        "pe_clipped": int(np.sum(np.abs(pe) >= 12)),
        "pe_beyond10": r(100 * np.mean(np.abs(pe) > 10), 2),
        "pe_beyond10_normal": r(100 * (stats.norm.cdf(-10, mu, sd) + stats.norm.sf(10, mu, sd)), 2),
    })

    # absolute percentage error against demand level (sample for the scatter, binned means for the fit)
    ape = np.abs(pe)
    gw = A1 / 1000
    idx = RNG.choice(len(df), 2000, replace=False)
    points = [{"x": r(gw[k], 2), "y": r(ape[k], 2)} for k in idx]
    fit = []
    for lo in np.arange(np.floor(gw.min()), np.ceil(gw.max()), 2):
        m = (gw >= lo) & (gw < lo + 2)
        if m.sum() >= 100:
            s = ape[m].std() / np.sqrt(m.sum())
            fit.append({"x": r(lo + 1), "y": r(ape[m].mean()), "lo": r(ape[m].mean() - 1.96 * s), "hi": r(ape[m].mean() + 1.96 * s)})
    low, high = gw < 18, gw >= 30
    facts["ape_low_gw"] = r(ape[low].mean())
    facts["ape_high_gw"] = r(ape[high].mean())
    facts["mae_low_gw"] = r(np.abs(F - A1)[low].mean(), 0)
    facts["mae_high_gw"] = r(np.abs(F - A1)[high].mean(), 0)
    facts["share_low_gw"] = r(100 * low.mean(), 1)
    facts["gw_min"] = r(gw.min(), 1)
    facts["gw_max"] = r(gw.max(), 1)

    # weighted MAPE by month with a day-bootstrap 95% interval, against each truth
    monthly = {"labels": [], "final": [], "first": [], "lo": [], "hi": [], "bias_final": [], "bias_first": []}
    for ym, g in df.groupby("ym"):
        monthly["labels"].append(ym)
        monthly["final"].append(r(wmape(g.F.values, g.A1.values)))
        monthly["first"].append(r(wmape(g.F.values, g.A0.values)))
        monthly["bias_final"].append(r(bias(g.F.values, g.A1.values)))
        monthly["bias_first"].append(r(bias(g.F.values, g.A0.values)))
        lo, hi = boot(g, lambda x: wmape(x.F.values, x.A1.values), key="date", n=400)
        monthly["lo"].append(r(lo))
        monthly["hi"].append(r(hi))
    mb = np.array(monthly["bias_final"])
    facts["bias_month_mean"] = r(mb.mean())
    facts["bias_month_absmean"] = r(np.abs(mb).mean())
    facts["bias_month_min"], facts["bias_month_max"] = r(mb.min()), r(mb.max())
    facts["bias_month_min_label"] = monthly["labels"][int(mb.argmin())]
    facts["bias_month_max_label"] = monthly["labels"][int(mb.argmax())]
    mw = np.array(monthly["final"])
    facts["wmape_month_min"], facts["wmape_month_max"] = r(mw.min()), r(mw.max())
    facts["wmape_month_min_label"] = monthly["labels"][int(mw.argmin())]
    facts["wmape_month_max_label"] = monthly["labels"][int(mw.argmax())]
    widths = np.array(monthly["hi"]) - np.array(monthly["lo"])
    facts["band_width_mean"] = r(widths.mean())

    # error by reporting grain: sum energy to the grain first, then weighted MAPE
    grains = {"Half hour": ["date", "sp"], "Day": ["date"], "Week": ["week"], "Month": ["ym"]}
    grain = {"labels": list(grains), "final": [], "first": []}
    for cols in grains.values():
        g = df.groupby(cols)[["F", "A0", "A1"]].sum()
        grain["final"].append(r(wmape(g.F.values, g.A1.values)))
        grain["first"].append(r(wmape(g.F.values, g.A0.values)))
    facts.update({f"grain_{k.lower().replace(' ', '')}": v for k, v in zip(grain["labels"], grain["final"])})
    assert grain["final"][0] >= grain["final"][-1], "error should shrink with aggregation"

    # mean of monthly bias against volume-weighted bias: offsetting months cancel in both
    data = {"facts": facts, "table": table, "profile": profile, "heat": heat, "hist": hist, "curve": [r(c, 1) for c in curve],
            "points": points, "fit": fit, "monthly": monthly, "grain": grain}
    OUT.write_text(json.dumps(data, separators=(",", ":")))
    print(json.dumps(facts, indent=1))
    print(f"wrote {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
