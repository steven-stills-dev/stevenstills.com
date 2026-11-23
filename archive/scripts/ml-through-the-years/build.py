"""Backtest three day-ahead demand models on public GB national demand.

Data: NESO Historic Demand Data (ND, half-hourly, with NESO's embedded wind and solar estimates),
Open-Meteo Historical Weather API (2 m temperature, six cities), GOV.UK bank holidays.
Data to 30 September 2025 only.
Target: demand as used (ND plus embedded wind and solar); published ND is scored too.
Models: seasonal naive (same half-hour a week earlier), linear regression on calendar and
temperature terms, LightGBM on the same inputs. Rolling origin: each test month from October 2024
to September 2025 is forecast by models refitted on everything before it. The models see the
temperature that occurred, not a weather forecast.

Run: uv run --python 3.11 --with pandas --with numpy --with lightgbm scripts/ml-through-the-years/build.py
"""
import io
import json
import sys
from pathlib import Path

import lightgbm as lgb
import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from fetch_cache import get  # noqa: E402

OUT = HERE.parents[1] / "src/projects/ml-through-the-years/data.json"
NESO = "https://api.neso.energy/dataset/8f2fe0af-871c-488d-8bad-960426f24601/resource/{}/download/demanddata_{}.csv"
RES = {
    2021: "18c69c42-f20d-46f0-84e9-e279045befc6", 2022: "bb44a1b5-75b1-4db2-8491-257f23385006",
    2023: "bf5ab335-9b40-4ea4-b93a-ab4af7bce003", 2024: "f6d02c0f-957b-48cb-82ee-09003f2ba759",
    2025: "b2bde559-3455-4021-b179-dfe60c0337b0",
}
# London, Birmingham, Manchester, Leeds, Glasgow, Bristol: simple mean, a stand-in for a national temperature
CITIES = [(51.51, -0.13), (52.48, -1.90), (53.48, -2.24), (53.80, -1.55), (55.86, -4.25), (51.45, -2.59)]
START, END = "2021-10-01", "2025-09-30"
TEST = pd.period_range("2024-10", "2025-09", freq="M")
MODELS = ["naive", "linear", "gbm"]
BAD_DAY = 5.0  # a "bad day": mean absolute percentage error over the day above 5%


def load_demand():
    """Return half-hourly national demand (GW) with UTC timestamps."""
    frames = []
    for year, rid in RES.items():
        d = pd.read_csv(io.BytesIO(get(NESO.format(rid, year))), usecols=["SETTLEMENT_DATE", "SETTLEMENT_PERIOD", "ND", "EMBEDDED_WIND_GENERATION", "EMBEDDED_SOLAR_GENERATION"])
        # three date styles across the files: 01-JAN-2021, 01-Jan-23 and 2025-01-01
        iso = d.SETTLEMENT_DATE.iloc[0][:2] == "20"
        d["date"] = pd.to_datetime(d.SETTLEMENT_DATE, format="ISO8601") if iso else pd.to_datetime(d.SETTLEMENT_DATE, format="mixed", dayfirst=True)
        assert d.date.dt.year.eq(year).all() and d.date.dt.month.nunique() == 12 and d.groupby("date").size().between(46, 50).all()
        frames.append(d)
    d = pd.concat(frames).rename(columns={"SETTLEMENT_PERIOD": "sp", "ND": "nd"})
    d = d[(d.date >= "2021-09-01") & (d.date <= END)].sort_values(["date", "sp"])
    midnight = d.date.dt.tz_localize("Europe/London").dt.tz_convert("UTC")
    d["utc"] = (midnight + pd.to_timedelta((d.sp - 1) * 30, unit="min")).dt.tz_localize(None)
    d["nd"] = d.nd / 1000
    # demand as used: NESO's estimates of embedded wind and solar generation added back to national demand
    d["used"] = d.nd + (d.EMBEDDED_WIND_GENERATION + d.EMBEDDED_SOLAR_GENERATION) / 1000
    return d[["date", "sp", "utc", "nd", "used"]].reset_index(drop=True)


def load_temp():
    """Return the six-city mean temperature at half-hourly UTC steps."""
    url = ("https://archive-api.open-meteo.com/v1/archive?latitude={}&longitude={}"
           "&start_date=2021-08-25&end_date={}&hourly=temperature_2m&timezone=GMT").format(
        ",".join(str(c[0]) for c in CITIES), ",".join(str(c[1]) for c in CITIES), END)
    js = json.loads(get(url))
    t = pd.concat([pd.Series(j["hourly"]["temperature_2m"], index=pd.to_datetime(j["hourly"]["time"])) for j in js], axis=1).mean(axis=1)
    return t.resample("30min").interpolate()


def features(target):
    """Return the model table for one target column ("used" or "nd"), held as `gw`."""
    d = load_demand()
    d["gw"] = d[target]
    t = load_temp()
    d["temp"] = t.reindex(d.utc).to_numpy()
    d["temp24"] = t.rolling(48).mean().reindex(d.utc).to_numpy()  # mean of the previous 24 hours
    hols = {e["date"] for e in json.loads(get("https://www.gov.uk/bank-holidays.json"))["england-and-wales"]["events"]}
    d["hol"] = d.date.dt.strftime("%Y-%m-%d").isin(hols).astype(int)
    d["dow"] = d.date.dt.day_of_week
    d["month"] = d.date.dt.month
    d["doy"] = d.date.dt.day_of_year
    d["xmas"] = (((d.month == 12) & (d.date.dt.day >= 24)) | ((d.month == 1) & (d.date.dt.day == 1))).astype(int)
    d["trend"] = (d.date - pd.Timestamp(START)).dt.days / 365.25
    d["hh"] = d.sp.clip(upper=48) - 1
    lag = d[["date", "sp", "gw"]].assign(date=lambda x: x.date + pd.Timedelta(days=7)).rename(columns={"gw": "lag7"})
    d = d.merge(lag, on=["date", "sp"], how="left")
    d["lag7"] = d.lag7.ffill()  # clock-change days: periods 49 and 50 have no match a week earlier
    d = d[d.date >= START].reset_index(drop=True)
    assert d[["temp", "temp24", "lag7", "gw"]].notna().all().all()
    assert 17_500 * 3.9 < len(d) < 17_600 * 4.1 and 10 < d.gw.min() and d.gw.max() < 50
    return d


def design(d):
    """Build the regression matrix: half-hour by day type, day of week, month, and temperature terms by half-hour."""
    daytype = np.where(d.hol == 1, 3, np.where(d.dow == 5, 1, np.where(d.dow == 6, 2, 0)))
    hh = d.hh.to_numpy()
    n = len(d)
    X = np.zeros((n, 192 + 7 + 12 + 96 + 6), dtype=np.float64)
    r = np.arange(n)
    X[r, hh * 4 + daytype] = 1
    X[r, 192 + d.dow.to_numpy()] = 1
    X[r, 199 + d.month.to_numpy() - 1] = 1
    X[r, 211 + hh] = d.temp
    X[r, 259 + hh] = d.temp ** 2
    X[:, 307:] = np.c_[d.temp24, d.temp24 ** 2, d.lag7, d.trend, d.xmas, np.ones(n)]
    return X


GBM_COLS = ["hh", "dow", "hol", "month", "doy", "xmas", "trend", "temp", "temp24", "lag7"]


def backtest(d):
    X = design(d)
    period = d.date.dt.to_period("M")
    out = []
    for m in TEST:
        tr, te = (period < m).to_numpy(), (period == m).to_numpy()
        beta = np.linalg.lstsq(X[tr], d.gw[tr].to_numpy(), rcond=None)[0]
        # fixed settings, chosen before the test year was scored; nothing is tuned on the test months
        g = lgb.train(dict(objective="regression", learning_rate=0.05, num_leaves=31, min_data_in_leaf=40,
                           bagging_fraction=0.8, bagging_freq=1, feature_fraction=0.8, seed=1,
                           num_threads=4, deterministic=True, force_row_wise=True, verbose=-1),
                      lgb.Dataset(d.loc[tr, GBM_COLS], d.gw[tr]), num_boost_round=600)
        o = d.loc[te, ["date", "sp", "hh", "hol", "gw", "month"]].copy()
        o["naive"], o["linear"], o["gbm"] = d.lag7[te], X[te] @ beta, g.predict(d.loc[te, GBM_COLS])
        out.append(o)
        print(m, len(o), "rows; trained on", int(tr.sum()))
    return pd.concat(out)


def score(target):
    d = features(target)
    r = backtest(d)
    ape = pd.DataFrame({k: (r[k] - r.gw).abs() / r.gw * 100 for k in MODELS})
    ae = pd.DataFrame({k: (r[k] - r.gw).abs() for k in MODELS})
    ym = r.date.dt.to_period("M")
    by_month = ape.groupby(ym).mean()
    by_hh = ape.groupby(r.hh).mean()
    daily = ape.groupby(r.date).mean()

    # block bootstrap by day: resample whole days so the half-hours of a day stay together
    rng = np.random.default_rng(1)
    dv = daily.to_numpy()
    idx = rng.integers(0, len(dv), size=(5000, len(dv)))
    boot = dv[idx].mean(axis=1)  # 5000 x 3 overall MAPEs
    ci = lambda a: [round(float(np.percentile(a, 2.5)), 2), round(float(np.percentile(a, 97.5)), 2)]
    summer, winter = by_month.loc["2025-05":"2025-08"].mean(), by_month.loc["2024-11":"2025-02"].mean()

    hol_days = daily[daily.index.isin(r.date[r.hol == 1])]
    facts = {
        "test_days": int(len(daily)), "test_from": str(r.date.min().date()), "test_to": str(r.date.max().date()),
        "train_from": START, "mape": {k: round(float(ape[k].mean()), 2) for k in MODELS},
        "mae_gw": {k: round(float(ae[k].mean()), 2) for k in MODELS},
        "mape_ci": {k: ci(boot[:, i]) for i, k in enumerate(MODELS)},
        "gbm_minus_linear": round(float(ape.gbm.mean() - ape.linear.mean()), 2), "gbm_minus_linear_ci": ci(boot[:, 2] - boot[:, 1]),
        "gbm_minus_naive": round(float(ape.gbm.mean() - ape.naive.mean()), 2), "gbm_minus_naive_ci": ci(boot[:, 2] - boot[:, 0]),
        "bad_day_threshold": BAD_DAY, "bad_days": {k: int((daily[k] > BAD_DAY).sum()) for k in MODELS},
        "worst_day": {k: [str(daily[k].idxmax().date()), round(float(daily[k].max()), 1)] for k in MODELS},
        "bank_holidays": int(len(hol_days)), "bank_holiday_mape": {k: round(float(hol_days[k].mean()), 1) for k in MODELS},
        "summer_mape": {k: round(float(summer[k]), 2) for k in MODELS}, "winter_mape": {k: round(float(winter[k]), 2) for k in MODELS},
        "gbm_wins_months": int((by_month.gbm < by_month.linear).sum()),
    }
    assert len(by_month) == 12 and len(by_hh) == 48 and facts["test_days"] == 365
    assert facts["mape"]["gbm"] < facts["mape"]["naive"], "a model with weather should beat last week's demand"
    return facts, by_month, by_hh, d


def main():
    facts, by_month, by_hh, _ = score("used")
    nd_facts, _, _, d = score("nd")
    facts["published_nd_mape"] = nd_facts["mape"]
    # the article's weekday shape chart: non-holiday weekdays, winter Oct 2024 to Mar 2025, summer Apr to Sep 2025
    wd = d[(d.dow < 5) & (d.hol == 0) & (d.date >= "2024-10-01") & (d.sp <= 48)]  # d.gw is published national demand here
    shape = lambda a, b: wd[(wd.date >= a) & (wd.date <= b)].groupby("sp").gw.mean()
    w, s = shape("2024-10-01", "2025-03-31"), shape("2025-04-01", "2025-09-30")

    facts["winter_peak_gw"], facts["winter_peak_sp"] = round(float(w.max()), 1), int(w.idxmax())
    facts["summer_peak_gw"], facts["summer_peak_sp"] = round(float(s.max()), 1), int(s.idxmax())
    out = {
        "months": [p.strftime("%b") for p in by_month.index],
        "by_month": {k: [round(float(v), 2) for v in by_month[k]] for k in MODELS},
        "facts": facts,
    }
    OUT.write_text(json.dumps(out, separators=(",", ":")))
    print(json.dumps(facts, indent=1))
    print(by_month.round(2))
    print(by_hh.round(2).T.to_string())
    print("shape arrays for checking the page's inlined weekday shapes:", [round(float(v), 1) for v in w], [round(float(v), 1) for v in s])


if __name__ == "__main__":
    main()
