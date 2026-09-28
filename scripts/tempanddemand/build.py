"""Build public/data/tempanddemand/bell.json from HadCET daily temperature and National Gas LDZ demand.

Run: uv run --with pandas --with numpy --with openpyxl scripts/tempanddemand/build.py
LDZ offtake is cached in ldz_gwh.csv because the gas portal only keeps five rolling years.
"""
import io
import json
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd

HADCET = "https://www.metoffice.gov.uk/hadobs/hadcet/data/{}temp_daily_totals.txt"
OUT = Path(__file__).resolve().parents[2] / "public/data/tempanddemand/bell.json"
FIRST, BASE = 2015, (1961, 1990)  # first year shown is the earliest public daily gas data
EDGES = [-np.inf, -3, -2, -0.43, 0.43, 2, 3, np.inf]
GRID = np.round(np.arange(-5, 6.01, 0.1), 1)
BW = 0.3  # KDE bandwidth, sigma units
SMOOTH = 31  # days, centred and wrapped round the year
PORTAL = "https://data.nationalgas.com/api/find-gas-data-download"
LDZ = "PUBOBJ1023"  # NTS Energy Offtaken, LDZ Offtake Total, kWh; the portal keeps five rolling years
LDZ_ITEM = "NTS Energy Offtaken, LDZ Offtake Total"
ZENODO = "https://zenodo.org/records/4913872/files/dailyheat_from_GB_ldz_natural_gas.csv"  # 2015-2019, CC BY-NC 4.0
BRUEGEL = ("https://raw.githubusercontent.com/benmcwilliams/gas-demand/28da8b4d04b22a3a8fa1ecf551eed2d6ff95777d/"
           "src/data/raw/uk/UK_gas_data_2019_2024.csv")  # portal export, Jan 2020 to 2024
WINTER = "https://www.nationalgas.com/sites/default/files/documents/Gas%20Winter%20Review%20and%20Consultation%20Datasheet.xlsx"
KWH_PER_M3 = 10.96  # energy over volume on overlapping days; converts the Winter Review's 1-18 Jan 2020 only
LDZ_CACHE = Path(__file__).with_name("ldz_gwh.csv")
GAS = [(2015, 2017), (2022, 2025)]  # complete years in the public daily data
ERA5 = "https://archive-api.open-meteo.com/v1/archive"  # ECMWF ERA5 via Open-Meteo, as the forecasting dashboard uses
ERA5_POINT = (52.48, -1.89)  # Birmingham, the dashboard's central England proxy


def fetch(url: str, browser: bool = True) -> bytes:
    """Download a URL, with a browser user agent unless told otherwise (the gas portal needs one, Zenodo refuses one)."""
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"} if browser else {})
    with urllib.request.urlopen(req, timeout=180) as r:
        return r.read()


def get(url: str) -> str:
    """Download a URL as text."""
    return fetch(url).decode("utf-8", "replace")


def cet(kind: str) -> pd.Series:
    """Load one HadCET daily series (mean, max or min) from the start of the base period."""
    d = pd.read_csv(io.StringIO(get(HADCET.format(kind))), sep=r"\s+", parse_dates=["Date"])
    s = d[d.Value > -99].set_index("Date").Value
    return s[str(BASE[0]):]


def doy(idx: pd.DatetimeIndex) -> np.ndarray:
    """Map dates to a 0-364 day of year, folding 29 February onto 28 February."""
    d = idx.dayofyear.values - 1
    leap = idx.is_leap_year
    return np.where(leap & (d >= 59), d - 1, d)


def wrap_mean(a: np.ndarray, w: int = SMOOTH) -> np.ndarray:
    """Centred moving mean over a 365-day cycle, wrapping December into January."""
    p = np.concatenate([a[-w:], a, a[:w]])
    return np.convolve(p, np.ones(w) / w, "same")[w:-w]


def harmonics(d: np.ndarray, y: np.ndarray, k: int = 3) -> np.ndarray:
    """Least-squares annual cycle with k harmonics, evaluated for days 0-364."""
    def basis(x):
        t = 2 * np.pi * x / 365
        return np.column_stack([np.ones_like(t)] + [f(j * t) for j in range(1, k + 1) for f in (np.cos, np.sin)])
    coef = np.linalg.lstsq(basis(d.astype(float)), y, rcond=None)[0]
    return basis(np.arange(365.0)) @ coef


def kde(z: np.ndarray) -> list[int]:
    """Gaussian kernel density of z on GRID, scaled by 1000 and rounded."""
    dens = np.exp(-0.5 * ((GRID[:, None] - z[None, :]) / BW) ** 2).sum(1) / (len(z) * BW * np.sqrt(2 * np.pi))
    return [int(round(v * 1000)) for v in dens]


def shares(z: np.ndarray) -> list[float]:
    """Percentage of days in each Hansen category."""
    return [round(v, 1) for v in np.histogram(z, EDGES)[0] / len(z) * 100]


def score(s: pd.Series) -> pd.DataFrame:
    """Score every day against its date's 1961-1990 mean and standard deviation."""
    df = pd.DataFrame({"t": s.values, "d": doy(s.index), "y": s.index.year}, index=s.index)
    base = df[df.y.between(*BASE)]
    mu = harmonics(base.d.values, base.t.values)
    sq = pd.Series((base.t.values - mu[base.d.values]) ** 2).groupby(base.d.values).mean()
    sd = np.sqrt(wrap_mean(sq.reindex(range(365)).values))
    df["a"] = df.t - mu[df.d.values]
    df["z"] = df.a / sd[df.d.values]
    return df


def mode(df: pd.DataFrame) -> dict:
    """Per-year curves, shares and changes from FIRST for one series."""
    years = range(FIRST, df.y.max() + 1)
    return {
        "kde": [kde(df[df.y == y].z.values) for y in years],
        "share": [shares(df[df.y == y].z.values) for y in years],
        "shift": [round(df[df.y == y].a.mean(), 2) for y in years],
    }


def by_year(s: pd.Series, digits: int) -> list[dict]:
    """Each year from FIRST as 365 values by day of year, smoothed by a centred 31-day mean, None where there is no data."""
    s = s.asfreq("D").interpolate(limit=3, limit_area="inside")  # bridge single blank days, keep real gaps
    sm = s.rolling(SMOOTH, center=True, min_periods=SMOOTH * 2 // 3).mean().where(s.notna())
    out = []
    for y in range(FIRST, s.index.max().year + 1):
        c = sm[str(y)].dropna()
        if c.empty:
            continue
        m = c.groupby(doy(c.index)).mean().reindex(range(365))
        out.append({"name": str(y), "values": [None if pd.isna(v) else round(v, digits) for v in m]})
    return out


def portal_items(raw: bytes) -> pd.Series:
    """LDZ offtake energy (kWh) by gas day from a National Gas portal CSV export."""
    d = pd.read_csv(io.BytesIO(raw), encoding="utf-8-sig")
    d = d[d["Data Item"] == LDZ_ITEM]
    return d.set_index(pd.to_datetime(d["Applicable For"], format="%d/%m/%Y")).Value.sort_index()


def static_history() -> list[pd.Series]:
    """Public LDZ offtake before the portal window, lowest priority first: Winter Review volumes, Zenodo, Bruegel."""
    w = pd.read_excel(io.BytesIO(fetch(WINTER)), sheet_name="Figure 11", header=1)
    winter = w.set_index(pd.to_datetime(w["Gas Day"]))["LDZ Offtake"].dropna() * KWH_PER_M3 * 1e6
    z = pd.read_csv(io.BytesIO(fetch(ZENODO, browser=False)), index_col=0, parse_dates=True).GB_ldz_natural_gas_kWh
    return [winter.rename("winter_review"), z.rename("zenodo"), portal_items(fetch(BRUEGEL)).rename("bruegel")]


def portal() -> pd.Series:
    """Daily LDZ offtake energy from the National Gas data portal."""
    q = urllib.parse.urlencode({"applicableFor": "Y", "dateFrom": "2021-01-01", "dateTo": date.today().isoformat(),
                                "dateType": "GASDAY", "latestFlag": "Y", "ids": LDZ, "type": "CSV"})
    return portal_items(fetch(f"{PORTAL}?{q}")).rename("portal")


def ldz() -> pd.Series:
    """Daily LDZ offtake in GWh from 2015: the cached history, or the static sources on a first run, overlaid by
    fresh portal days. Later sources win on shared days, and the cache keeps days that leave the portal window."""
    if LDZ_CACHE.exists():
        c = pd.read_csv(LDZ_CACHE, index_col=0, parse_dates=True)
        parts = [pd.DataFrame({"kwh": c.gwh * 1e6, "source": c.source})]
    else:
        parts = [pd.DataFrame({"kwh": v, "source": v.name}) for v in static_history()]
    p = portal()
    parts.append(pd.DataFrame({"kwh": p, "source": p.name}))
    d = pd.concat(parts)
    d = d[~d.index.duplicated(keep="last")].sort_index()[str(FIRST):]
    d.assign(gwh=(d.kwh / 1e6).round(3))[["gwh", "source"]].to_csv(LDZ_CACHE, index_label="gas_day")
    return d.kwh / 1e6


def pairs(t: pd.Series, g: pd.Series) -> list[dict]:
    """Days with both a temperature and a gas figure, grouped by year from FIRST, as [°C, GWh, day of year]."""
    j = pd.concat([t.rename("t"), g.rename("g")], axis=1, join="inner")[str(FIRST):].dropna()
    out = []
    for y, c in j.groupby(j.index.year):
        out.append({"name": str(y), "points": [[round(a, 1), round(b), int(d)] for a, b, d in zip(c.t, c.g, doy(c.index))]})
    return out


def era5() -> pd.Series:
    """Daily mean 2 m temperature at ERA5_POINT from 1991, from the Open-Meteo archive."""
    q = urllib.parse.urlencode({"latitude": ERA5_POINT[0], "longitude": ERA5_POINT[1], "start_date": "1991-01-01",
                                "end_date": (date.today() - pd.Timedelta(days=5)).isoformat(),
                                "daily": "temperature_2m_mean", "timezone": "Europe/London"})
    d = json.loads(get(f"{ERA5}?{q}"))["daily"]
    return pd.Series(d["temperature_2m_mean"], index=pd.to_datetime(d["time"]), dtype=float).dropna()


def normals(t: pd.Series) -> dict:
    """Monthly 30-, 10- and 5-year normals, the last 365 days by month, and their gaps to the 30-year normal,
    on the forecasting dashboard's windows and rounding: values to 0.1, gaps from unrounded values."""
    last = t.index.max()
    y = last.year
    windows = {"n30": (1991, 2020), "n10": (y - 10, y - 1), "n5": (y - 5, y - 1)}
    raw = {k: t[str(a):str(b)].groupby(lambda d: d.month).mean().reindex(range(1, 13)) for k, (a, b) in windows.items()}
    recent = t[last - pd.Timedelta(days=365):]
    by_month = recent.groupby(recent.index.to_period("M")).mean()
    raw["last12"] = pd.Series({p.month: v for p, v in by_month.items()}).reindex(range(1, 13))  # the later month wins
    out = {k: [None if pd.isna(v) else round(float(v), 1) for v in s] for k, s in raw.items()}
    for k, d in (("n10", "d10"), ("n5", "d5"), ("last12", "d12")):
        out[d] = [None if pd.isna(v) else round(float(v), 2) for v in raw[k] - raw["n30"]]
    out["windows"] = {k: f"{a}–{b}" for k, (a, b) in windows.items()}
    out["last12From"] = str(recent.index.min().date())
    out["last"] = str(last.date())
    return out


def main() -> None:
    """Assemble and write the page dataset."""
    scored = {k: score(cet(k)) for k in ("mean", "max", "min")}
    mean = scored["mean"]
    last = mean.index.max()
    gas = ldz()
    data = {
        "last": str(last.date()),
        "years": list(range(FIRST, last.year + 1)),
        "grid": {"z0": float(GRID[0]), "dz": 0.1, "n": len(GRID)},
        "modes": {k: mode(v) for k, v in scored.items()},
        "temp": by_year(mean.t[str(FIRST - 1):], 1),
        "gas": by_year(gas, 0),
        "scatter": pairs(mean.t, gas),
        "normals": normals(era5()),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, separators=(",", ":"), ensure_ascii=False))
    print(f"wrote {OUT} ({OUT.stat().st_size / 1024:.0f} KB), CET to {last.date()}")
    for a, b in GAS:
        c = gas[str(a):str(b)]
        print(f"gas {a}-{b}: {c.count()} days, mean {c.mean():.0f} GWh/d, Jan {c[c.index.month == 1].mean():.0f}, Jul {c[c.index.month == 7].mean():.0f}")
    n = data["normals"]
    print("normals", n["windows"], "last12 from", n["last12From"], "to", n["last"])
    for i, mon in enumerate(["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]):
        print(f"  {mon} " + " ".join(f"{n[k][i]:5.1f}" for k in ("n30", "n10", "n5", "last12"))
              + "  " + " ".join(f"{n[k][i]:+.2f}" for k in ("d10", "d5", "d12")))
    for k, m in data["modes"].items():
        print(k)
        for y, sh, c in zip(data["years"], m["share"], m["shift"]):
            print(f"  {y}: {sh} {c:+.2f}")


if __name__ == "__main__":
    main()
