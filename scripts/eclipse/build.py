# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy", "pandas", "astropy", "pyproj", "shapely"]
# ///
"""Estimate what the partial solar eclipse of 12 August 2026 did to GB solar output and demand, and export chart data.

Run: uv run scripts/eclipse/build.py
Sources: Sheffield Solar PV_Live (national and the 14 regions), NESO historic demand data, NESO day-ahead demand
forecast file, Elexon system prices and FUELINST, Open-Meteo archive, NESO licence-area boundaries.
Geometry: astropy's built-in ephemeris. Writes src/projects/eclipse/data.json and prints the headline numbers.
"""
import io
import json
import sys
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pandas as pd
import astropy.units as u
from astropy.coordinates import AltAz, EarthLocation, get_body, solar_system_ephemeris
from astropy.time import Time
from astropy.utils import iers
from pyproj import Transformer
from shapely.geometry import shape

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from fetch_cache import get  # noqa: E402

iers.conf.auto_download = False              # no table downloads: UT1-UTC is under a second, far below what matters here
iers.conf.iers_degraded_accuracy = "ignore"
solar_system_ephemeris.set("builtin")

OUT = ROOT / "src" / "projects" / "eclipse" / "data.json"
PVL = "https://api.pvlive.uk/pvlive/api/v4"
BMRS = "https://data.elexon.co.uk/bmrs/api/v1"
HDD = "https://api.neso.energy/api/3/action/package_show?id=historic-demand-data"
NDF = "https://api.neso.energy/dataset/5281b494-5566-42dd-bf1a-9ce38642fabf/resource/08e41551-80f8-4e28-a416-ea473a695db9/download/1b-incentive.csv"
DNO = "https://api.neso.energy/dataset/0e377f16-95e9-4c15-a1fc-49e06a39cfa0/resource/1c6a7dc0-1b6c-443a-bc67-5f7125649434/download/gb-dno-license-areas-20240503-as-geojson.geojson"
METEO = "https://archive-api.open-meteo.com/v1/archive?latitude={}&longitude={}&start_date={}&end_date={}&hourly=temperature_2m,cloud_cover&timezone=GMT"

DAY = date(2026, 8, 12)
YEARS = range(2022, 2027)
CUTOFF = date(2026, 9, 30)                    # the article is dated late September 2026: nothing later enters a comparison
WINDOW = 21                                   # comparable days sit within this many days of the calendar date
PES = {10: "_A", 11: "_B", 12: "_C", 13: "_D", 14: "_E", 15: "_F", 16: "_G", 17: "_P", 18: "_N", 19: "_J", 20: "_H",
       21: "_K", 22: "_L", 23: "_M"}          # PV_Live pes_id to GSP group, from PV_Live's pes_list endpoint
# Ten population centres spread across Great Britain, equal weight (the set used in scripts/sunshine-drift).
SITES = {"London": (51.51, -0.13), "Southampton": (50.90, -1.40), "Bristol": (51.45, -2.59), "Cardiff": (51.48, -3.18),
         "Norwich": (52.63, 1.30), "Birmingham": (52.48, -1.90), "Manchester": (53.48, -2.24), "Leeds": (53.80, -1.55),
         "Newcastle": (54.98, -1.61), "Glasgow": (55.86, -4.25)}
CITIES = {k: SITES[k] for k in ("London", "Leeds", "Cardiff", "Glasgow")}
HOLIDAYS = {date(2025, 8, 25), date(2026, 8, 31)}
FUTURE = {"2027": date(2027, 8, 2), "2028": date(2028, 1, 26), "2030": date(2030, 6, 1), "2036": date(2036, 8, 21),
          "2039": date(2039, 6, 21), "2090": date(2090, 9, 23)}
R_SUN, R_MOON = 695_700.0, 1_737.4            # km
LIMB_U = 0.6                                  # shortcut: assumed linear limb-darkening coefficient, used for one sensitivity figure only; cite a source before publishing it
DRAWS, SEED = 20_000, 20260812
A1, A2, EVE = range(30, 33), range(33, 36), range(36, 42)     # 15:00-16:30, 16:30-18:00 anchors; 18:00-21:00 targets
D_ANCHOR, D_EVE = range(26, 34), range(34, 44)                # demand: 13:00-17:00 anchor; 17:00-22:00 targets
ECL = range(36, 40)                                           # 18:00-20:00, the half hours the eclipse touched
hhmm = lambda h: f"{h // 2:02d}:{'30' if h % 2 else '00'}"


# ---------- geometry ----------

def overlap(d, rs, rm):
    """Return the share of a disc of radius rs covered by a disc of radius rm whose centre is d away."""
    d, rs, rm = np.broadcast_arrays(d, rs, rm)
    out = np.zeros(d.shape)
    inside = d <= np.abs(rs - rm)
    out[inside] = np.minimum(1.0, (rm[inside] / rs[inside]) ** 2)
    part = (d < rs + rm) & ~inside
    D, a, b = d[part], rs[part], rm[part]
    x = (D**2 + a**2 - b**2) / (2 * D)
    y = (D**2 + b**2 - a**2) / (2 * D)
    lens = a**2 * np.arccos(x / a) + b**2 * np.arccos(y / b) - D * np.sqrt(np.clip(a**2 - x**2, 0, None))
    out[part] = lens / (np.pi * a**2)
    return out


def limb_light(d, rs, rm, n=120):
    """Return the share of sunlight blocked under a linear limb-darkening law, by summing over a grid on the solar disc."""
    g = (np.arange(n) + 0.5) / n * 2 - 1
    x, y = np.meshgrid(g, g)
    r2 = x**2 + y**2
    on = r2 < 1
    w = np.where(on, 1 - LIMB_U * (1 - np.sqrt(np.clip(1 - r2, 0, None))), 0.0)
    hidden = ((x[None] - (d / rs)[:, None, None]) ** 2 + y[None] ** 2) < ((rm / rs) ** 2)[:, None, None]
    return (w[None] * hidden).sum((1, 2)) / w.sum()


def eclipse(day, lat, lon, limb=False):
    """Return per-minute local times (minutes from midnight), obscuration, magnitude and solar altitude for one site and day."""
    start = pd.Timestamp(day, tz="Europe/London")
    mins = np.arange(3 * 60, 22 * 60)
    t = Time([(start + pd.Timedelta(minutes=int(m))).tz_convert("UTC").tz_localize(None).to_pydatetime() for m in mins], scale="utc")
    loc = EarthLocation(lat=lat * u.deg, lon=lon * u.deg, height=50 * u.m)
    sun, moon = get_body("sun", t, loc), get_body("moon", t, loc)
    d = sun.separation(moon).rad
    rs = np.arcsin(R_SUN / sun.distance.to_value(u.km))
    rm = np.arcsin(R_MOON / moon.distance.to_value(u.km))
    alt = sun.transform_to(AltAz(obstime=t, location=loc)).alt.deg
    obs = overlap(d, rs, rm)
    mag = np.clip((rs + rm - d) / (2 * rs), 0, None)
    light = obs.copy()
    if limb and obs.max() > 0:
        k = obs > 0
        light[k] = limb_light(d[k], rs[k], rm[k])
    return mins, obs, mag, alt, light


def halfhour(mins, v):
    """Average a per-minute series into the 48 half hours of the local day (zero where not computed)."""
    out = np.zeros(48)
    for h in range(48):
        k = (mins >= h * 30) & (mins < h * 30 + 30)
        if k.any():
            out[h] = v[k].mean()
    return out


def centroids():
    """Return {gsp group: (name, lat, lon)} for the centre of each licence area."""
    tr = Transformer.from_crs(27700, 4326, always_xy=True)
    out = {}
    for f in json.loads(get(DNO))["features"]:
        c = shape(f["geometry"]).buffer(0).centroid
        lon, lat = tr.transform(c.x, c.y)
        out[f["properties"]["Name"]] = (f["properties"]["Area"], lat, lon)
    return out


# ---------- data ----------

def pv(pes):
    """Return (generation MW, capacity MWp) as date x 48 local half-hour tables for one PV_Live region (0 is national)."""
    rows = []
    for y in YEARS:
        d = json.loads(get(f"{PVL}/pes/{pes}?start={y}-01-01T00:30:00Z&end={y + 1}-01-01T00:00:00Z&extra_fields=capacity_mwp"))
        rows += d["data"]
    df = pd.DataFrame(rows, columns=["pes", "t", "mw", "cap"])
    loc = (pd.to_datetime(df.t, utc=True) - pd.Timedelta(minutes=30)).dt.tz_convert("Europe/London")
    df["date"], df["hh"] = loc.dt.date, loc.dt.hour * 2 + loc.dt.minute // 30
    piv = lambda c: df.pivot_table(index="date", columns="hh", values=c, aggfunc="first").reindex(columns=range(48))
    return piv("mw"), piv("cap")


def neso_demand():
    """Return national demand and embedded wind (MW) as date x 48 tables for 2025 and 2026."""
    frames = []
    for r in json.loads(get(HDD))["result"]["resources"]:
        if r["name"] in ("Historic Demand Data 2025", "Historic Demand Data 2026"):
            d = pd.read_csv(io.BytesIO(get(r["url"])))
            d.columns = [c.upper() for c in d.columns]
            frames.append(d[["SETTLEMENT_DATE", "SETTLEMENT_PERIOD", "ND", "EMBEDDED_WIND_GENERATION"]])
    d = pd.concat(frames)
    d["date"] = pd.to_datetime(d.SETTLEMENT_DATE, format="%Y-%m-%d").dt.date
    d["hh"] = d.SETTLEMENT_PERIOD - 1
    piv = lambda c: d.pivot_table(index="date", columns="hh", values=c, aggfunc="last").reindex(columns=range(48))
    return piv("ND"), piv("EMBEDDED_WIND_GENERATION")


def day_ahead():
    """Return NESO's day-ahead demand forecast and outturn (MW) as date x 48 tables."""
    d = pd.read_csv(io.BytesIO(get(NDF)), encoding="utf-8-sig")
    d["date"], d["hh"] = pd.to_datetime(d.Date).dt.date, d.Settlement_Period - 1
    d = d.dropna(subset=["Demand_Forecast", "Demand_Outturn"])
    piv = lambda c: d.pivot_table(index="date", columns="hh", values=c, aggfunc="last").reindex(columns=range(48))
    return piv("Demand_Forecast"), piv("Demand_Outturn")


def weather():
    """Return hourly mean temperature (C) and cloud cover (%) over the ten sites, indexed by UTC hour, plus per-site cloud."""
    lat = ",".join(str(v[0]) for v in SITES.values())
    lon = ",".join(str(v[1]) for v in SITES.values())
    frames = []
    for y in (2025, 2026):
        res = json.loads(get(METEO.format(lat, lon, f"{y}-05-01", f"{y}-09-30")))
        for name, r in zip(SITES, res):
            h = pd.DataFrame(r["hourly"])
            h["site"] = name
            frames.append(h)
    w = pd.concat(frames)
    w["time"] = pd.to_datetime(w.time)
    return w.groupby("time")[["temperature_2m", "cloud_cover"]].mean(), w


def system_price(d):
    """Return the system sell price (GBP/MWh) for the 48 half hours of one settlement date."""
    rows = json.loads(get(f"{BMRS}/balancing/settlement/system-prices/{d}?format=json"))["data"]
    return [r["systemSellPrice"] for r in sorted(rows, key=lambda r: r["settlementPeriod"])]


def tx5(d):
    """Return five-minute transmission-level generation plus net imports (MW) for one local day, indexed by local minute."""
    a = pd.Timestamp(d, tz="Europe/London").tz_convert("UTC")
    b = a + pd.Timedelta(days=1)
    rows = json.loads(get(f"{BMRS}/datasets/FUELINST?publishDateTimeFrom={a:%Y-%m-%dT%H:%M:%SZ}&publishDateTimeTo={b:%Y-%m-%dT%H:%M:%SZ}&format=json"))["data"]
    df = pd.DataFrame(rows)
    s = df.groupby("startTime").generation.sum()
    loc = pd.to_datetime(s.index, utc=True).tz_convert("Europe/London")
    s.index = loc.hour * 60 + loc.minute
    return s[~s.index.duplicated()].sort_index()


# ---------- models ----------

def ols_loo(X, Y, x0):
    """Fit least squares of Y on X with an intercept; return the prediction at x0, leave-one-out residuals and x0's leverage."""
    X1 = np.column_stack([np.ones(len(X)), X])
    inv = np.linalg.pinv(X1.T @ X1)
    beta = inv @ X1.T @ Y
    lev = np.einsum("ij,jk,ik->i", X1, inv, X1)
    loo = (Y - X1 @ beta) / (1 - lev).reshape(-1, *([1] * (Y.ndim - 1)))
    v0 = np.r_[1.0, x0]
    return v0 @ beta, loo, float(v0 @ inv @ v0)




def blocked(X, Y, groups):
    """Return residuals predicted for each group from a fit on the other groups, and how often they fall inside that fit's 95% leave-one-out band."""
    res, inside = np.full(Y.shape, np.nan), []
    for g in np.unique(groups):
        tr, te = groups != g, groups == g
        X1 = np.column_stack([np.ones(tr.sum()), X[tr]])
        beta = np.linalg.pinv(X1.T @ X1) @ X1.T @ Y[tr]
        _, loo, _ = ols_loo(X[tr], Y[tr], X[tr][0])
        lo, hi = np.quantile(loo, [0.025, 0.975], axis=0)
        r = Y[te] - np.column_stack([np.ones(te.sum()), X[te]]) @ beta
        res[te] = r
        inside.append((r >= lo) & (r <= hi))
    return res, float(np.concatenate(inside).mean())


def near(dates, target, window=WINDOW):
    """Return a mask of dates whose day of year is within `window` days of the target's, wrapping the year end."""
    doy = np.array([d.timetuple().tm_yday for d in dates])
    gap = np.abs(doy - target.timetuple().tm_yday)
    return np.minimum(gap, 365 - gap) <= window


def solar_model(mw, cap):
    """Estimate the no-eclipse evening solar output on the eclipse day from the same afternoon, with out-of-sample error.

    Each evening half hour's capacity factor is regressed on two afternoon anchors (15:00-16:30 and 16:30-18:00)
    and the day's distance from 12 August, across days within three weeks of that date in 2022 to 2026.
    """
    cf = mw / cap
    cf = cf[cf[list(A1) + list(A2) + list(EVE)].notna().all(axis=1)]
    dates = np.array(cf.index)
    pool = near(dates, DAY) & (dates != DAY)
    off = np.array([(d - d.replace(month=8, day=12)).days for d in dates])
    X = np.column_stack([cf[list(A1)].mean(axis=1), cf[list(A2)].mean(axis=1), off])
    Y = cf[list(EVE)].to_numpy()
    i = int(np.where(dates == DAY)[0][0])
    c = float(cap.loc[DAY].dropna().iloc[-1])
    pred, loo, lev = ols_loo(X[pool], Y[pool], X[i])
    cv, cover = blocked(X[pool], Y[pool], np.array([d.year for d in dates[pool]]))
    return {"pred": pred * c, "loo": loo * c, "actual": Y[i] * c, "cap": c, "n": int(pool.sum()), "lev": lev,
            "cv_rmse": np.sqrt(np.nanmean((cv * c) ** 2, axis=0)), "cover": cover}


def demand_model(under, temp):
    """Estimate the eclipse evening's underlying demand from the same afternoon and the evening temperature, with out-of-sample error.

    Each half hour from 17:00 to 22:00 is regressed on mean underlying demand from 13:00 to 17:00, evening temperature,
    degrees above 22C, days from midsummer (linear and squared), a Friday flag and a 2026 flag, across summer weekdays
    of 2025 and 2026. Errors come from predicting each calendar month from a fit on the other months.
    """
    dates = np.array([d for d in under.index if d.weekday() < 5 and d not in HOLIDAYS and d.month in (6, 7, 8, 9)
                      and (d.month, d.day) <= (9, 15) and under.loc[d, list(D_ANCHOR) + list(D_EVE)].notna().all() and d in temp.index])
    U = under.loc[dates]
    t = temp.loc[dates].to_numpy()
    mid = np.array([(d - d.replace(month=6, day=21)).days for d in dates])
    X = np.column_stack([U[list(D_ANCHOR)].mean(axis=1), t, np.clip(t - 22, 0, None), mid, mid**2,
                         [d.weekday() == 4 for d in dates], [d.year == 2026 for d in dates]]).astype(float)
    Y = U[list(D_EVE)].to_numpy()
    i = int(np.where(dates == DAY)[0][0])
    pool = dates != DAY
    pred, loo, lev = ols_loo(X[pool], Y[pool], X[i])
    cv, cover = blocked(X[pool], Y[pool], np.array([f"{d.year}-{d.month}" for d in dates[pool]]))
    return {"pred": pred, "cv": cv, "loo_sd": loo.std(axis=0), "actual": Y[i], "n": int(pool.sum()), "lev": lev, "cover": cover,
            "temp": float(t[i]), "temp_rank": float((t[pool] < t[i]).mean()), "dates": dates[pool], "temps": t[pool]}


def ndf_elexon(d):
    """Return {half hour: MW} from Elexon's day-ahead national demand forecast, as published before 12:00 UTC the day before."""
    rows = json.loads(get(f"{BMRS}/forecast/demand/day-ahead/history?publishTime={d - timedelta(days=1)}T12:00Z&format=json"))["data"]
    return {r["settlementPeriod"] - 1: r["nationalDemand"] for r in rows if r["settlementDate"] == str(d) and r["nationalDemand"] is not None}


def simulate(rng, gens, light, sd, threshold):
    """Draw eclipse outcomes by resampling whole days of national solar output and return summary percentiles.

    gens: days x 48 MW at 2026 capacity. light: 48 values, the share of the Sun's disc covered in each half hour.
    The loss is output times that share times a response ratio drawn log-normally around 1 with log standard deviation sd.
    """
    g = gens[rng.integers(len(gens), size=DRAWS)]
    loss = g * np.clip(light[None] * np.exp(rng.normal(0.0, sd, size=(DRAWS, 1))), 0, 1)
    peak, step = loss.max(1), np.diff(loss, axis=1)
    q = lambda v: [round(float(x) / 1000, 2) for x in np.quantile(v, [0.05, 0.25, 0.5, 0.75, 0.95])]
    edges = np.linspace(0, max(500.0, np.ceil(np.quantile(peak, 0.995) / 500) * 500), 21)
    n, _ = np.histogram(np.clip(peak, 0, edges[-1]), edges)
    return {"days": int(len(gens)), "peak_gw": q(peak), "ramp_down_gw": q(step.max(1)), "ramp_up_gw": q((-step).max(1)),
            "energy_gwh": q(loss.sum(1) / 2), "p_notice": round(float((peak > threshold).mean()), 3),
            "threshold_gw": round(threshold / 1000, 2),
            "hist": [{"x0": round(a / 1000, 2), "x1": round(b / 1000, 2), "n": int(c)} for a, b, c in zip(edges, edges[1:], n)]}


def main():
    rng = np.random.default_rng(SEED)
    gw = lambda v, k=2: [None if x is None or np.isnan(x) else round(float(x) / 1000, k) for x in v]
    mw_ = lambda v: [round(float(x)) for x in v]

    # 1. geometry
    cen = centroids()
    cities = []
    for name, (lat, lon) in CITIES.items():
        m, obs, mag, alt, light = eclipse(DAY, lat, lon, limb=name == "London")
        k = obs > 0
        cities.append({"name": name, "start": hhmm_min(m[k][0]), "max": hhmm_min(m[obs.argmax()]), "end": hhmm_min(m[k][-1] + 1),
                       "magnitude": round(float(mag.max()), 3), "obscuration": round(float(obs.max()) * 100, 1),
                       "altitude": round(float(alt[obs.argmax()]), 1)})
        if name == "London":
            london_light = float(light.max())
    leeds = next(c for c in cities if c["name"] == "Leeds")
    assert abs(to_min(leeds["max"]) - to_min("19:09")) <= 2 and abs(to_min(leeds["start"]) - to_min("18:12")) <= 2, leeds
    assert abs(to_min(leeds["end"]) - to_min("20:03")) <= 2 and abs(leeds["magnitude"] - 0.920) < 0.01, leeds
    geo = {}
    for code, (name, lat, lon) in cen.items():
        m, obs, _, _, _ = eclipse(DAY, lat, lon)
        geo[code] = {"name": name, "obs": halfhour(m, obs), "max": float(obs.max()), "t_max": hhmm_min(m[obs.argmax()])}

    # 2. solar counterfactual, nationally and by region
    nat_mw, nat_cap = pv(0)
    sol = solar_model(nat_mw, nat_cap)
    lo, hi = np.quantile(sol["loo"], [0.025, 0.975], axis=0)
    loss = sol["pred"] - sol["actual"]
    n_e = len(ECL)
    e_lo, e_hi = np.quantile(sol["loo"][:, :n_e].sum(1) / 2, [0.025, 0.975])  # MWh error over 18:00-20:00
    energy = float(loss[:n_e].sum() / 2)
    regs, caps = [], {}
    for pes, code in PES.items():
        r = solar_model(*pv(pes))
        caps[code] = r["cap"]
        rl = r["pred"] - r["actual"]
        rlo, rhi = np.quantile(r["loo"], [0.025, 0.975], axis=0)
        regs.append({"key": code, "name": geo[code]["name"], "obs": round(geo[code]["max"] * 100, 1), "max": geo[code]["t_max"],
                     "obs_avg": round(float(geo[code]["obs"][38]) * 100, 1), "cap_mw": round(r["cap"]),
                     "expected_mw": round(float(r["pred"][2])), "actual_mw": round(float(r["actual"][2])),
                     "loss_mw": round(float(rl[2])), "loss_lo": round(float(rl[2] + rlo[2])), "loss_hi": round(float(rl[2] + rhi[2])),
                     "loss_pct": round(float(100 * rl[2] / r["pred"][2]), 1)})
    weight = lambda table: sum(caps[c] * table[c] for c in caps) / sum(caps.values())
    light_nat = weight({c: geo[c]["obs"] for c in geo})                    # capacity-weighted share of the disc covered, 48 half hours
    nat_geo = sol["pred"] * light_nat[list(EVE)]
    geo_energy = float(nat_geo[:n_e].sum() / 2)
    ratio, ratio_lo, ratio_hi = energy / geo_energy, (energy + e_lo) / geo_energy, (energy + e_hi) / geo_energy
    resp_sd = float((np.log(ratio_hi) - np.log(ratio_lo)) / (2 * 1.96))   # how well one evening pins the response down

    # 3. demand: underlying = national demand + PV_Live solar + NESO embedded wind
    nd, wind = neso_demand()
    under = nd + nat_mw.reindex(nd.index) + wind
    wx, wx_site = weather()
    eve_t = wx.temperature_2m[wx.index.hour.isin([17, 18, 19])]
    temp = eve_t.groupby(eve_t.index.date).mean()
    dem = demand_model(under, temp)
    dlo, dhi = np.quantile(dem["cv"], [0.025, 0.975], axis=0)
    gap = dem["actual"] - dem["pred"]
    sd = dem["cv"].std(axis=0) * np.sqrt(1 + dem["lev"])
    e_idx = [h - D_EVE.start for h in ECL]
    gap_mean, cv_mean = float(gap[e_idx].mean()), dem["cv"][:, e_idx].mean(1)
    p_mean = float((np.abs(cv_mean) >= abs(gap_mean)).mean())
    mlo, mhi = np.quantile(cv_mean, [0.025, 0.975])
    worst_d = int(np.abs(gap).argmax())
    edge = [0, 1, 7, 8, 9]                                                 # 17:00-18:00 and 20:30-22:00, either side of the eclipse
    contrast, cv_contrast = gap_mean - float(gap[edge].mean()), cv_mean - dem["cv"][:, edge].mean(1)
    hot = dem["temps"] >= 25                                              # placebo: do other hot evenings show the same dip?
    assert abs(nd.loc[DAY, 38] - 29081) < 600, nd.loc[DAY, 38]            # NESO national demand agrees with Elexon INDO at 19:00
    cloud = wx_site[(wx_site.time >= "2026-08-12 17:00") & (wx_site.time <= "2026-08-12 19:00")].groupby("site").cloud_cover.mean()

    # day-ahead forecasts that evening against their usual error on the summer's other weekdays
    fc, out = day_ahead()
    err = out - fc
    summer = [d for d in dem["dates"] if d.year == 2026 and d in err.index]
    cols = list(D_EVE)
    el = pd.DataFrame({d: ndf_elexon(d) for d in [DAY] + summer}).T.reindex(columns=cols)
    el_err = out.loc[el.index, cols] - el
    el_day, el_usual = el_err.loc[DAY].to_numpy(), el_err.drop(index=DAY).abs()
    ne_day, ne_usual = err.loc[DAY, cols].to_numpy(), err.loc[summer, cols].abs()
    j19, jw = 38 - D_EVE.start, int(np.abs(el_day).argmax())

    # 4. how far the Sun has to fade: loss against the day-ahead forecast error and against same-day solar noise
    mae = np.abs(err[[d.year >= 2024 and d <= CUTOFF for d in err.index]])
    mae_m = mae.groupby(np.array([d.month for d in mae.index])).mean()     # an array, so pandas does not read the months as column labels
    cap26 = sol["cap"]
    scaled = nat_mw / nat_cap * cap26
    scaled = scaled[[d != DAY and d <= CUTOFF and scaled.loc[d].notna().sum() >= 46 for d in scaled.index]]
    recent = scaled[[d.year >= 2023 for d in scaled.index]]
    months = np.array([d.month for d in recent.index])
    hours = list(range(5, 21))
    fade = {k: [] for k in ("notice_clear", "notice_typical", "detect_clear", "detect_typical")}
    need = lambda q, s_: None if s_ < 50 or q / s_ > 1 else round(100 * q / s_)
    for hr in hours:
        h = hr * 2
        rows = {k: [] for k in fade}
        for mth in range(1, 13):
            s = recent[months == mth]
            y, x = s[h].to_numpy(), s[h - 4].to_numpy()
            k = ~np.isnan(y) & ~np.isnan(x)
            _, loo_p, _ = ols_loo(x[k][:, None], y[k], np.array([x[k].mean()]))
            noise = float(np.quantile(np.abs(loo_p), 0.95))
            clear, typ = float(np.nanquantile(y, 0.9)), float(np.nanmedian(y))
            rows["notice_clear"].append(need(mae_m.loc[mth, h], clear))
            rows["notice_typical"].append(need(mae_m.loc[mth, h], typ))
            rows["detect_clear"].append(need(noise, clear))
            rows["detect_typical"].append(need(noise, typ))
        for k in fade:
            fade[k].append(rows[k])
    aug_mae = float(mae_m.loc[8, 38])
    jun = recent[months == 6]
    jun_clear, jun_typ, jun_mae = float(jun[26].quantile(0.9)), float(jun[26].median()), float(mae_m.loc[6, 26])
    detect_event = float(np.quantile(np.abs(sol["loo"][:, 2]), 0.95))
    steps = list(range(0, 101, 5))
    curve = {"obs": steps, "aug_evening": gw([sol["pred"][2] * s / 100 for s in steps]),
             "jun_midday_clear": gw([jun_clear * s / 100 for s in steps]), "jun_midday_typical": gw([jun_typ * s / 100 for s in steps])}

    # 5. scenarios: resample whole days of national output at 2026 capacity
    gens, gdates = np.nan_to_num(scaled.to_numpy()), np.array(scaled.index)
    lon_max = next(c for c in cities if c["name"] == "London")
    scen = [{"key": "actual", "label": "12 August 2026, as it fell", "date": str(DAY), "max": lon_max["max"], "obs_london": lon_max["obscuration"],
             **simulate(rng, gens[near(gdates, DAY)], light_nat, resp_sd, aug_mae)},
            {"key": "june", "label": "The same eclipse at 13:10 in June", "date": None, "max": "13:10", "obs_london": lon_max["obscuration"],
             **simulate(rng, gens[np.array([d.month == 6 for d in gdates])], np.roll(light_nat, -12), resp_sd, jun_mae)}]  # six hours earlier
    for key, day in FUTURE.items():
        prof = {}
        for c in caps:
            m, obs, _, alt, _ = eclipse(day, cen[c][1], cen[c][2])
            up = np.where(alt > 0, obs, 0)
            prof[c] = halfhour(m, up)
            if c == "_C":
                lon_obs, lon_t = float(up.max()), hhmm_min(m[up.argmax()])
        fl = weight(prof)
        thr = float(mae_m.loc[day.month, int(fl.argmax())])
        scen.append({"key": key, "label": f"{day.day} {day:%B %Y}", "date": str(day), "max": lon_t, "obs_london": round(lon_obs * 100, 1),
                     **simulate(rng, gens[near(gdates, day)], fl, resp_sd, thr)})

    # 6. chart series
    show, dshow = range(30, 43), range(26, 44)                             # 15:00 to 21:00; 13:00 to 21:30
    pad = lambda rng_, tgt, v: [None if h not in tgt else float(v[h - tgt.start]) for h in rng_]
    weds = [DAY + timedelta(weeks=w) for w in (-3, -2, -1, 1, 2, 3)]
    five = tx5(DAY)
    five_cmp = pd.concat([tx5(d) for d in weds], axis=1).mean(axis=1)
    mins5 = [m for m in five.index if 17 * 60 <= m <= 21 * 60 + 30 and m in five_cmp.index]
    price = system_price(DAY)
    pk = int(loss.argmax())

    facts = {
        "capacity_gw": round(sol["cap"] / 1000, 1),
        "solar_days": sol["n"], "solar_cover": round(sol["cover"], 3), "solar_cv_rmse_mw": mw_(sol["cv_rmse"]),
        "solar_before_mw": round(float(nat_mw.loc[DAY, 36])), "solar_min_mw": round(float(sol["actual"][2])), "solar_after_mw": round(float(sol["actual"][3])),
        "expected_mw": round(float(sol["pred"][2])), "expected_lo": round(float(max(0, sol["pred"][2] + lo[2]))), "expected_hi": round(float(sol["pred"][2] + hi[2])),
        "loss_mw": round(float(loss[2])), "loss_lo": round(float(loss[2] + lo[2])), "loss_hi": round(float(loss[2] + hi[2])),
        "loss_pct": round(float(100 * loss[2] / sol["pred"][2])),
        "loss_peak_mw": round(float(loss[pk])), "loss_peak_time": hhmm(EVE[pk]), "loss_peak_lo": round(float(loss[pk] + lo[pk])), "loss_peak_hi": round(float(loss[pk] + hi[pk])),
        "energy_mwh": round(energy), "energy_lo": round(float(energy + e_lo)), "energy_hi": round(float(energy + e_hi)),
        "geo_energy_mwh": round(geo_energy), "response_ratio": round(ratio, 2), "response_lo": round(ratio_lo, 2), "response_hi": round(ratio_hi, 2),
        "response_sd_log": round(resp_sd, 3), "obs_avg_1900_pct": round(float(light_nat[38]) * 100, 1), "light_lost_london_limb_pct": round(london_light * 100, 1),
        "demand_days": dem["n"], "demand_cover": round(dem["cover"], 3), "demand_leverage": round(dem["lev"], 3), "demand_cv_sd_mw": mw_(dem["cv"].std(axis=0)),
        "hot_days": int(hot.sum()), "hot_days_gap_mean_mw": round(float(cv_mean[hot].mean())), "hot_days_gap_min_mw": round(float(cv_mean[hot].min())),
        "evening_temp_c": round(dem["temp"], 1), "evening_temp_rank": round(dem["temp_rank"], 3),
        "gap_mean_mw": round(gap_mean), "gap_mean_lo": round(float(gap_mean - mhi)), "gap_mean_hi": round(float(gap_mean - mlo)), "gap_mean_p": round(p_mean, 3),
        "gap_before_mw": round(float(gap[:2].mean())), "gap_after_mw": round(float(gap[7:].mean())), "gap_contrast_mw": round(contrast),
        "gap_contrast_lo": round(float(contrast - np.quantile(cv_contrast, 0.975))), "gap_contrast_hi": round(float(contrast - np.quantile(cv_contrast, 0.025))),
        "gap_contrast_p": round(float((np.abs(cv_contrast) >= abs(contrast)).mean()), 3),
        "gap_max_mw": round(float(gap[worst_d])), "gap_max_time": hhmm(D_EVE[worst_d]), "gap_max_z": round(float((gap / sd)[worst_d]), 2),
        "gap_max_lo": round(float(gap[worst_d] - dhi[worst_d])), "gap_max_hi": round(float(gap[worst_d] - dlo[worst_d])),
        "fc_days": len(summer),
        "fc_elexon_1900_mw": round(float(el_day[j19])), "fc_elexon_1900_usual_mae": round(float(el_usual.iloc[:, j19].mean())),
        "fc_elexon_1900_share_bigger": round(float((el_usual.iloc[:, j19] >= abs(el_day[j19])).mean()), 3),
        "fc_elexon_worst_mw": round(float(el_day[jw])), "fc_elexon_worst_time": hhmm(D_EVE[jw]),
        "fc_neso_1900_mw": round(float(ne_day[j19])), "fc_neso_1730_mw": round(float(ne_day[1])), "fc_neso_1900_usual_mae": round(float(ne_usual.iloc[:, j19].mean())),
        "cloud_pct": {k: round(float(v)) for k, v in cloud.items()},
        "price_max": round(max(price[34:44])), "price_max_time": hhmm(34 + int(np.argmax(price[34:44]))),
        "aug_mae_mw": round(aug_mae), "detect_event_mw": round(detect_event),
        "fade_notice_event_pct": round(100 * aug_mae / sol["pred"][2]), "fade_detect_event_pct": round(100 * detect_event / sol["pred"][2]),
        "jun_clear_mw": round(jun_clear), "jun_typical_mw": round(jun_typ), "jun_mae_mw": round(jun_mae),
        "fade_notice_jun_clear_pct": round(100 * jun_mae / jun_clear, 1), "fade_notice_jun_typical_pct": round(100 * jun_mae / jun_typ, 1),
        "draws": DRAWS,
    }
    data = {
        "facts": facts, "cities": cities, "regions": regs,
        "solar": {"hh": [hhmm(h) for h in show], "actual": gw(nat_mw.loc[DAY, list(show)]), "expected": gw(pad(show, EVE, sol["pred"])),
                  "lo": gw(pad(show, EVE, np.clip(sol["pred"] + lo, 0, None))), "hi": gw(pad(show, EVE, sol["pred"] + hi)),
                  "geometry": gw(pad(show, EVE, sol["pred"] - nat_geo))},
        "demand": {"hh": [hhmm(h) for h in dshow], "actual": gw(under.loc[DAY, list(dshow)]), "expected": gw(pad(dshow, D_EVE, dem["pred"])),
                   "lo": gw(pad(dshow, D_EVE, dem["pred"] + dlo)), "hi": gw(pad(dshow, D_EVE, dem["pred"] + dhi)),
                   "gap_hh": [hhmm(h) for h in D_EVE], "gap_mw": mw_(gap), "z": [round(float(x), 2) for x in gap / sd]},
        "forecast": {"hh": [hhmm(h) for h in D_EVE], "outturn": gw(out.loc[DAY, cols]),
                     "elexon": gw(el.loc[DAY]), "elexon_error_mw": mw_(el_day), "elexon_usual_mae_mw": mw_(el_usual.mean()),
                     "neso": gw(fc.loc[DAY, cols]), "neso_error_mw": mw_(ne_day), "neso_usual_mae_mw": mw_(ne_usual.mean())},
        "price": {"hh": [hhmm(h) for h in range(30, 44)], "sell": [round(float(p), 1) for p in price[30:44]]},
        "fade": {"hours": [f"{h:02d}:00" for h in hours], "months": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], **fade},
        "curve": curve, "scenarios": scen,
        "five": {"t": [hhmm_min(m) for m in mins5], "day": gw(five.loc[mins5]), "wednesdays": gw(five_cmp.loc[mins5])},
    }
    assert facts["loss_mw"] > 0 and facts["expected_mw"] > facts["solar_min_mw"] and 0.5 < ratio < 2
    assert 0.85 <= sol["cover"] <= 1 and 0.85 <= dem["cover"] <= 1, (sol["cover"], dem["cover"])   # held-out bands are honest
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, separators=(",", ":")) + "\n")
    print(json.dumps(facts, indent=1))
    print("cities", cities)
    for r in regs:
        print(r)
    for s in scen:
        print({k: v for k, v in s.items() if k != "hist"})
    print("solar pred", np.round(sol["pred"]), "actual", np.round(sol["actual"]), "loss", np.round(loss), "geometry loss", np.round(nat_geo))
    print("solar loss band", np.round(loss + lo), np.round(loss + hi), "light", np.round(light_nat[list(EVE)], 3))
    print("demand gap", np.round(gap), "z", np.round(gap / sd, 2), "band", np.round(gap - dhi), np.round(gap - dlo))
    print("elexon err", np.round(el_day), "usual mae", np.round(el_usual.mean().to_numpy()))
    print("neso err", np.round(ne_day), "usual mae", np.round(ne_usual.mean().to_numpy()))
    print("five day", gw(five.loc[mins5])[::3], "weds", gw(five_cmp.loc[mins5])[::3])


def hhmm_min(m):
    """Format minutes from local midnight as HH:MM."""
    return f"{int(m) // 60:02d}:{int(m) % 60:02d}"


def to_min(s):
    """Parse HH:MM into minutes from midnight."""
    return int(s[:2]) * 60 + int(s[3:])


if __name__ == "__main__":
    _, loo, _ = ols_loo(np.arange(6.0)[:, None], np.array([1.0, 2.1, 2.9, 4.2, 5.1, 5.8]), np.array([2.0]))
    X1 = np.column_stack([np.ones(5), np.arange(1, 6.0)])
    assert abs(loo[0] - (1.0 - np.r_[1, 0.0] @ np.linalg.lstsq(X1, np.array([2.1, 2.9, 4.2, 5.1, 5.8]), rcond=None)[0])) < 1e-9   # leave-one-out shortcut equals a refit
    assert abs(overlap(np.array([0.0]), np.array([1.0]), np.array([0.5]))[0] - 0.25) < 1e-12
    main()
