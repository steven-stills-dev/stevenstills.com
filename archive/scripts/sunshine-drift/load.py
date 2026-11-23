"""Load the public day-ahead national demand forecast, outturn, embedded solar and ERA5 irradiance."""
import io
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fetch_cache import get  # noqa: E402

END = "2026-10-28"  # nothing after the publish date of 29 October 2026
NDF_URL = ("https://api.neso.energy/dataset/5281b494-5566-42dd-bf1a-9ce38642fabf/resource/"
           "08e41551-80f8-4e28-a416-ea473a695db9/download/1b-incentive.csv")
HDD = "https://api.neso.energy/api/3/action/package_show?id=historic-demand-data"
# Ten population centres spread across Great Britain, equal weight.
SITES = {
    "London": (51.51, -0.13), "Southampton": (50.90, -1.40), "Bristol": (51.45, -2.59), "Cardiff": (51.48, -3.18),
    "Norwich": (52.63, 1.30), "Birmingham": (52.48, -1.90), "Manchester": (53.48, -2.24), "Leeds": (53.80, -1.55),
    "Newcastle": (54.98, -1.61), "Glasgow": (55.86, -4.25),
}


def ndf():
    """Return the half-hourly day-ahead forecast and outturn, one row per settlement date and period."""
    df = pd.read_csv(io.BytesIO(get(NDF_URL)), encoding="utf-8-sig")
    df["date"] = pd.to_datetime(df["Date"])
    df = df[df["date"] <= END]
    df = df.rename(columns={"Settlement_Period": "sp", "Demand_Forecast": "fc", "Demand_Outturn": "out"})
    df = df[["date", "sp", "fc", "out"]].dropna().drop_duplicates(["date", "sp"], keep="last")
    n = df.groupby("date")["sp"].transform("count")
    mx = df.groupby("date")["sp"].transform("max")
    return df[(n == 48) & (mx == 48)].reset_index(drop=True)  # drop clock-change and incomplete days


def solar():
    """Return daily embedded solar generation (GWh) and capacity (MW) from NESO historic demand data."""
    res = json.loads(get(HDD))["result"]["resources"]
    frames = []
    for r in res:
        name = r["name"]
        if name.startswith("Historic Demand Data") and int(name[-4:]) >= 2021:
            d = pd.read_csv(io.BytesIO(get(r["url"])))
            d.columns = [c.upper() for c in d.columns]
            frames.append(d[["SETTLEMENT_DATE", "SETTLEMENT_PERIOD", "EMBEDDED_SOLAR_GENERATION", "EMBEDDED_SOLAR_CAPACITY"]])
    d = pd.concat(frames)
    d["date"] = pd.to_datetime(d["SETTLEMENT_DATE"], format="mixed", dayfirst=True)
    d = d[d["date"] <= END]
    g = d.groupby("date").agg(sol_mwh=("EMBEDDED_SOLAR_GENERATION", lambda s: s.sum() / 2),
                              sol_peak=("EMBEDDED_SOLAR_GENERATION", "max"),
                              cap=("EMBEDDED_SOLAR_CAPACITY", "max"))
    return g


def irradiance():
    """Return hourly ERA5 shortwave radiation (W/m2, UTC), mean of the ten sites."""
    lat = ",".join(str(v[0]) for v in SITES.values())
    lon = ",".join(str(v[1]) for v in SITES.values())
    url = ("https://archive-api.open-meteo.com/v1/archive?latitude=" + lat + "&longitude=" + lon +
           "&start_date=2021-03-25&end_date=" + END + "&hourly=shortwave_radiation&timezone=GMT")
    js = json.loads(get(url))
    t = pd.to_datetime(js[0]["hourly"]["time"])
    m = np.nanmean(np.array([j["hourly"]["shortwave_radiation"] for j in js], dtype=float), axis=0)
    return pd.Series(m, index=t, name="ghi")


def irradiance_forecast():
    """Return hourly day-ahead forecast shortwave radiation (W/m2, UTC), mean of the ten sites.

    Open-Meteo previous-runs API, `_previous_day2`: the value forecast 48 hours before valid time, so it was available before the day-ahead demand forecast. Available from March 2024.
    """
    lat = ",".join(str(v[0]) for v in SITES.values())
    lon = ",".join(str(v[1]) for v in SITES.values())
    url = ("https://previous-runs-api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon +
           "&start_date=2024-03-07&end_date=" + END + "&hourly=shortwave_radiation_previous_day2&timezone=GMT")
    js = json.loads(get(url))
    t = pd.to_datetime(js[0]["hourly"]["time"])
    a = np.array([j["hourly"]["shortwave_radiation_previous_day2"] for j in js], dtype=float)
    return pd.Series(np.nanmean(a, axis=0), index=t, name="ghi_fc")
