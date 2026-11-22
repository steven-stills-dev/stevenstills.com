"""Diagnose and recalibrate the GB day-ahead national demand forecast against sunshine.

Run: uv run --with pandas --with numpy --with scipy --with statsmodels scripts/sunshine-drift/build.py
Writes src/projects/sunshine-drift/data.json (chart data plus a `facts` object holding every quoted number).
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.signal import savgol_filter
from statsmodels.nonparametric.smoothers_lowess import lowess

sys.path.insert(0, str(Path(__file__).resolve().parent))
from load import ndf, solar, irradiance, irradiance_forecast  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "src/projects/sunshine-drift/data.json"
RNG = np.random.default_rng(29)
SUMMER = [4, 5, 6, 7, 8, 9]
MID = list(range(21, 33))  # settlement periods 21 to 32: 10:00 to 16:00 local time
BANDS = [0, 300, 400, 500, 600, 700, 1000]
BAND_LABELS = ["Under 300", "300 to 400", "400 to 500", "500 to 600", "600 to 700", "700 and over"]
BRIGHT = 600  # W/m2, forecast peak irradiance that marks a bright day in the scoring
BOUND = 5.0  # % cap on any correction
WINDOWS = [14, 21, 30, 45, 60, 90]
DEFAULT_WINDOW = 30
SCORE_YEARS = [2025, 2026]

# ---------- data ----------
d = ndf()
E = d.pivot(index="date", columns="sp", values="fc")
A = d.pivot(index="date", columns="sp", values="out")
ERR = (E - A) / A * 100  # % of outturn; positive means the forecast was too high
peak = irradiance().resample("D").max().rename("peak")
peak_fc = irradiance_forecast().resample("D").max().rename("peak_fc")
sol = solar()
days = pd.DataFrame(index=ERR.index).join(peak).join(peak_fc).join(sol)
days["mid"] = ERR[MID].mean(axis=1)
days["year"] = days.index.year
summer = days[days.index.month.isin(SUMMER) & days.peak.notna()].copy()
summer["band"] = pd.cut(summer.peak, BANDS, labels=BAND_LABELS, right=False)
YEARS = sorted(summer.year.unique())


def boot_mean(x, n=2000):
    """Return the mean and a 95% bootstrap interval, resampling days."""
    x = np.asarray(x)
    m = RNG.choice(x, (n, len(x))).mean(axis=1)
    return float(x.mean()), float(np.percentile(m, 2.5)), float(np.percentile(m, 97.5))


def slope(x, y, n=2000):
    """Return the OLS slope of y on x per 100 W/m2, its 95% day-bootstrap interval, and R squared."""
    x, y = np.asarray(x), np.asarray(y)
    b = np.polyfit(x, y, 1)[0] * 100
    idx = RNG.integers(0, len(x), (n, len(x)))
    bs = [np.polyfit(x[i], y[i], 1)[0] * 100 for i in idx]
    r2 = np.corrcoef(x, y)[0, 1] ** 2
    return float(b), float(np.percentile(bs, 2.5)), float(np.percentile(bs, 97.5)), float(r2)


# ---------- 1. scatter with LOESS and bootstrap band, all summers ----------
scatter = [{"x": round(float(r.peak)), "y": round(float(r.mid), 2), "year": int(r.year)} for r in summer.itertuples()]
grid = np.arange(150, 851, 25)


def loess_band(x, y, frac=0.4, n=200):
    """Return LOESS on `grid` with a 95% bootstrap band."""
    base = np.interp(grid, *lowess(y, x, frac=frac, return_sorted=True).T)
    sims = []
    for _ in range(n):
        i = RNG.integers(0, len(x), len(x))
        f = lowess(y[i], x[i], frac=frac, return_sorted=True)
        sims.append(np.interp(grid, f[:, 0], f[:, 1]))
    lo, hi = np.percentile(sims, [2.5, 97.5], axis=0)
    ok = (grid >= x.min()) & (grid <= x.max())
    return [{"x": int(g), "y": round(float(b), 2), "lo": round(float(l), 2), "hi": round(float(h), 2)}
            for g, b, l, h, k in zip(grid, base, lo, hi, ok) if k]


fits = {"all": loess_band(summer.peak.values, summer.mid.values)}
for y in YEARS:
    s = summer[summer.year == y]
    fits[str(y)] = loess_band(s.peak.values, s.mid.values)

# ---------- 2. heat map: mean error by irradiance band and half hour, summers 2024 to 2026 ----------
recent = summer[summer.year >= 2024]
heat = ERR.loc[recent.index].groupby(recent.band, observed=False).mean()
heat_n = recent.band.value_counts().reindex(BAND_LABELS)

# ---------- 3. the three-way test per summer ----------
three = []
prev_max = None
for y in YEARS:
    s = summer[summer.year == y]
    b, lo, hi, r2 = slope(s.peak, s.mid)
    row = {
        "year": int(y), "days": int(len(s)), "max_peak": round(float(s.peak.max())),
        "above_prev": None if prev_max is None else round(float((s.peak > prev_max).mean() * 100), 1),
        "bright_share": round(float((s.peak >= 600).mean() * 100), 1),
        "slope": round(b, 2), "lo": round(lo, 2), "hi": round(hi, 2), "r2": round(r2, 2),
        "cap_gw": round(float(s.cap.mean()) / 1000, 1),
        "bias": round(float(s.mid.mean()), 2),
    }
    sf = s.dropna(subset=["peak_fc"])
    if len(sf) > 100:
        bf, lof, hif, r2f = slope(sf.peak_fc, sf.mid)
        row.update(slope_fc=round(bf, 2), lo_fc=round(lof, 2), hi_fc=round(hif, 2), r2_fc=round(r2f, 2))
    three.append(row)
    prev_max = s.peak.max() if prev_max is None else max(prev_max, s.peak.max())

# shift-share: summer midday bias change 2023 to 2026 split into mix of days and error within band
def band_table(y):
    s = summer[summer.year == y]
    return s.band.value_counts(normalize=True).reindex(BAND_LABELS), s.groupby("band", observed=False).mid.mean().reindex(BAND_LABELS)


w0, m0 = band_table(2023)
w1, m1 = band_table(2026)
total = float((w1 * m1).sum() - (w0 * m0).sum())
mix = float(((w1 - w0) * (m0 + m1) / 2).sum())
within = float(((m1 - m0) * (w0 + w1) / 2).sum())
assert abs(mix + within - total) < 1e-9, "shift-share must add up"

# matched bright days: mean midday error on days with measured peak 600 to 800 W/m2, by summer
matched = {}
for y in YEARS:
    s = summer[(summer.year == y) & summer.peak.between(600, 800)]
    matched[int(y)] = [round(v, 2) for v in boot_mean(s.mid)] + [int(len(s))]

# ---------- 4. recalibration, walk-forward ----------
fc_days = days.dropna(subset=["peak_fc"])
ERRv, Ev, Av = (X.loc[fc_days.index].values.astype(float) for X in (ERR, E, A))
IRR = fc_days.peak_fc.values
IDX = {t: i for i, t in enumerate(fc_days.index)}


def smooth(c):
    """Bound a 48-period correction and smooth it across the day."""
    return savgol_filter(np.clip(c, -BOUND, BOUND), 7, 2, mode="interp")


def fit(rows, use_irr=True):
    """Fit per-period error = a + b * peak forecast irradiance (or a alone) on the given rows."""
    X = np.c_[np.ones(len(rows)), IRR[rows]] if use_irr else np.ones((len(rows), 1))
    return np.linalg.lstsq(X, ERRv[rows], rcond=None)[0]


def predict(beta, i):
    """Return the bounded, smoothed % correction for day index i."""
    x = np.r_[1.0, IRR[i]][: beta.shape[0]]
    return smooth(x @ beta)


def score(rows, fc):
    """Score adjusted forecasts against outturn on the given rows."""
    a = Av[rows]
    e = (fc - a) / a * 100
    bright = IRR[rows] >= BRIGHT
    shape = (fc / fc.sum(1, keepdims=True) - a / a.sum(1, keepdims=True)) / (a / a.sum(1, keepdims=True)) * 100
    return {
        "mape": float(np.abs(e).mean()), "mape_mid": float(np.abs(e[:, [p - 1 for p in MID]]).mean()),
        "bias_bright": float(e[bright][:, [p - 1 for p in MID]].mean()),
        "bias_dull": float(e[~bright][:, [p - 1 for p in MID]].mean()),
        "shape": float(np.abs(shape).mean()),
    }


def walk(rows, window, use_irr=True):
    """Return adjusted forecasts for rows, each fitted on the `window` days ending two days before it."""
    out = []
    for i in rows:
        t = fc_days.index[i]
        train = [IDX[x] for x in pd.date_range(t - pd.Timedelta(days=window + 1), t - pd.Timedelta(days=2)) if x in IDX]
        c = predict(fit(np.array(train), use_irr), i)
        out.append(Ev[i] / (1 + c / 100))
    return np.array(out)


score_rows = np.array([i for i, t in enumerate(fc_days.index) if t.month in SUMMER and t.year in SCORE_YEARS])
assert fc_days.index[score_rows[0]] - fc_days.index[0] > pd.Timedelta(days=max(WINDOWS) + 1), "first window must be full"
raw = score(score_rows, Ev[score_rows])

by_window = {}
for w in WINDOWS:
    adj = walk(score_rows, w)
    s = score(score_rows, adj)
    e_adj = (adj - Av[score_rows]) / Av[score_rows] * 100
    bright = IRR[score_rows] >= BRIGHT
    by_window[w] = {**{k: round(v, 2) for k, v in s.items()},
                    "profile": [round(float(v), 2) for v in e_adj[bright].mean(0)]}
    if w == DEFAULT_WINDOW:
        adj_default = adj
roll = score(score_rows, walk(score_rows, DEFAULT_WINDOW, use_irr=False))

# in sample: one regression per summer fitted on that same summer
ins = []
for y in SCORE_YEARS:
    r = np.array([i for i in score_rows if fc_days.index[i].year == y])
    beta = fit(r)
    ins.append(np.array([Ev[i] / (1 + predict(beta, i) / 100) for i in r]))
ins_recal = score(score_rows, np.vstack(ins))


# constant cut on 10:00 to 16:00: in sample uses the scoring summer's own mean, out of sample the previous summer's
def cut(rows, c):
    fc = Ev[rows].copy()
    fc[:, [p - 1 for p in MID]] /= 1 + c / 100
    return fc


cut_in, cut_out = [], []
for y in SCORE_YEARS:
    r = np.array([i for i in score_rows if fc_days.index[i].year == y])
    c_in = float(np.mean(ERRv[r][:, [p - 1 for p in MID]]))
    c_prev = float(np.mean(ERR.loc[[t for t in days.index if t.year == y - 1 and t.month in SUMMER]][MID].values))
    cut_in.append(cut(r, c_in))
    cut_out.append(cut(r, c_prev))
cut_in, cut_out = score(score_rows, np.vstack(cut_in)), score(score_rows, np.vstack(cut_out))

# bootstrap the out-of-sample change in midday MAPE, resampling days
e_raw = np.abs((Ev[score_rows] - Av[score_rows]) / Av[score_rows] * 100)[:, [p - 1 for p in MID]].mean(1)
e_adj = np.abs((adj_default - Av[score_rows]) / Av[score_rows] * 100)[:, [p - 1 for p in MID]].mean(1)
diff = e_adj - e_raw
# moving-block bootstrap (7-day blocks) because errors on neighbouring days are correlated
def block_boot(x, block=7, n=2000):
    """Return the mean and a 95% moving-block bootstrap interval."""
    x = np.asarray(x)
    k = int(np.ceil(len(x) / block))
    starts = RNG.integers(0, len(x) - block + 1, (n, k))
    m = np.array([np.concatenate([x[s:s + block] for s in row])[: len(x)].mean() for row in starts])
    return float(x.mean()), float(np.percentile(m, 2.5)), float(np.percentile(m, 97.5))


dm = block_boot(diff)
dm_roll = block_boot(np.abs((walk(score_rows, DEFAULT_WINDOW, use_irr=False) - Av[score_rows]) / Av[score_rows] * 100)[:, [p - 1 for p in MID]].mean(1) - e_adj)

# histograms of daily midday error, raw and recalibrated
def bins(x, edges):
    n, _ = np.histogram(np.clip(x, edges[0], edges[-1] - 1e-9), edges)
    return [{"x0": float(a), "x1": float(b), "n": int(c)} for a, b, c in zip(edges[:-1], edges[1:], n)]


edges = np.arange(-16, 16.5, 2.0)
mid_raw = ((Ev[score_rows] - Av[score_rows]) / Av[score_rows] * 100)[:, [p - 1 for p in MID]].mean(1)
mid_adj = ((adj_default - Av[score_rows]) / Av[score_rows] * 100)[:, [p - 1 for p in MID]].mean(1)
bright_rows = IRR[score_rows] >= BRIGHT
raw_profile = [round(float(v), 2) for v in ((Ev[score_rows] - Av[score_rows]) / Av[score_rows] * 100)[bright_rows].mean(0)]

# ---------- facts ----------
t26 = next(r for r in three if r["year"] == 2026)
t21 = next(r for r in three if r["year"] == 2021)
facts = {
    "first_day": str(days.index.min().date()), "last_day": str(days.index.max().date()),
    "n_summer_days": int(len(summer)),
    "fit_all_bright": next(p["y"] for p in fits["all"] if p["x"] == 750),
    "fit_all_dull": next(p["y"] for p in fits["all"] if p["x"] == 250),
    "cap_2021_gw": t21["cap_gw"], "cap_2026_gw": t26["cap_gw"],
    "heat_bright_peak": round(float(heat.loc["700 and over"].max()), 1),
    "heat_bright_peak_sp": int(heat.loc["700 and over"].idxmax()),
    "heat_dull_min": round(float(heat.loc["Under 300"].min()), 1),
    "shift_total": round(total, 2), "shift_mix": round(mix, 2), "shift_within": round(within, 2),
    "matched": matched,
    "raw": {k: round(v, 2) for k, v in raw.items()},
    "roll": {k: round(v, 2) for k, v in roll.items()},
    "recal_in": {k: round(v, 2) for k, v in ins_recal.items()},
    "cut_in": {k: round(v, 2) for k, v in cut_in.items()},
    "cut_out": {k: round(v, 2) for k, v in cut_out.items()},
    "mape_mid_change": [round(v, 2) for v in dm],
    "recal_vs_roll": [round(v, 2) for v in dm_roll],
    "n_score_days": int(len(score_rows)), "n_bright_score_days": int(bright_rows.sum()),
    "bound": BOUND, "bright": BRIGHT, "window": DEFAULT_WINDOW,
}
facts["recal_out"] = by_window[DEFAULT_WINDOW]

# sanity checks
assert len(d) % 48 == 0 and d.groupby("date").size().eq(48).all()
assert summer.peak.between(0, 1100).all()
assert facts["last_day"] <= "2026-10-28"

out = {
    "facts": facts,
    "scatter": scatter, "fits": fits, "years": [int(y) for y in YEARS],
    "heat": {"rows": BAND_LABELS, "values": [[None if pd.isna(v) else round(float(v), 2) for v in heat.loc[b]] for b in BAND_LABELS],
             "n": [int(v) for v in heat_n]},
    "three": three,
    "windows": WINDOWS, "by_window": {str(k): v for k, v in by_window.items()}, "raw_profile": raw_profile,
    "hist": {"raw": bins(mid_raw, edges), "recal": bins(mid_adj, edges)},
}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(out, separators=(",", ":")))
print(json.dumps({k: v for k, v in facts.items()}, indent=1))
print(json.dumps(three, indent=1))
print({w: {k: v for k, v in by_window[w].items() if k != "profile"} for w in WINDOWS})
print("bytes", OUT.stat().st_size)
