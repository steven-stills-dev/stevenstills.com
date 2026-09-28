"""Build the 30-year-normal dataset from HadCET and NESO historic demand.

Run: uv run --with pandas --with numpy scripts/normals/build_normals.py <out.json>
"""
import io
import json
import sys
import urllib.request

import numpy as np
import pandas as pd

HADCET = "https://www.metoffice.gov.uk/hadobs/hadcet/data/meantemp_daily_totals.txt"
NESO = {
    2022: "bb44a1b5-75b1-4db2-8491-257f23385006/download/demanddata_2022.csv",
    2023: "bf5ab335-9b40-4ea4-b93a-ab4af7bce003/download/demanddata_2023.csv",
    2024: "f6d02c0f-957b-48cb-82ee-09003f2ba759/download/demanddata_2024.csv",
    2025: "b2bde559-3455-4021-b179-dfe60c0337b0/download/demanddata_2025.csv",
}
NESO_BASE = "https://api.neso.energy/dataset/8f2fe0af-871c-488d-8bad-960426f24601/resource/"
BASE_T = 15.5
LAST_FULL = 2025


def get(url: str) -> str:
    """Download a URL as text."""
    with urllib.request.urlopen(url, timeout=120) as r:
        return r.read().decode("utf-8", "replace")


def r2(x):
    """Round floats (recursively) to 2 dp for compact JSON."""
    if isinstance(x, dict):
        return {k: r2(v) for k, v in x.items()}
    if isinstance(x, list):
        return [r2(v) for v in x]
    if isinstance(x, (float, np.floating)):
        return None if np.isnan(x) else round(float(x), 2)
    if isinstance(x, np.integer):
        return int(x)
    return x


def trailing(series: pd.Series, year: int, n: int) -> float:
    """Mean of the n years before `year`."""
    return series.loc[year - n: year - 1].mean()


def main(out: str) -> None:
    cet = pd.read_csv(io.StringIO(get(HADCET)), sep=r"\s+", parse_dates=["Date"])
    cet = cet[cet.Value > -99].set_index("Date").Value
    last_day = cet.index.max()
    cet = cet["1869":]
    yr = cet.index.year

    annual = cet.groupby(yr).mean()
    hdd_daily = (BASE_T - cet).clip(lower=0)
    hdd = hdd_daily.groupby(yr).sum()
    full = annual.index <= LAST_FULL
    ann_f, hdd_f = annual[full], hdd[full]

    # winter Oct(Y-1)-Mar(Y), labelled by the year it ends
    wy = np.where(cet.index.month >= 10, yr + 1, yr)
    wmask = np.isin(cet.index.month, [10, 11, 12, 1, 2, 3])
    winter = cet[wmask].groupby(wy[wmask]).agg(["mean", "count"])
    winter = winter[winter["count"] >= 180]["mean"]

    annual_rows = [
        {"year": int(y), "cet": annual[y], "hdd": hdd[y], "winter_oct_mar": winter.get(y, np.nan),
         **({"partial_to": str(last_day.date())} if y > LAST_FULL else {})}
        for y in annual.index if y >= 1900
    ]

    normals = []
    for y in range(1960, int(annual.index.max()) + 1):
        row = {"year": y, "actual": annual[y] if y <= LAST_FULL else np.nan,
               "actual_hdd": hdd[y] if y <= LAST_FULL else np.nan}
        for n in (30, 10, 5):
            row[f"n{n}"] = trailing(ann_f, y, n)
            row[f"hdd_n{n}"] = trailing(hdd_f, y, n)
        normals.append(row)
    nd = pd.DataFrame(normals).set_index("year")

    # monthly profiles
    mon = cet.groupby([yr, cet.index.month]).mean().unstack()
    mon = mon.loc[:LAST_FULL]
    profiles = {name: mon.loc[a:b].mean().tolist()
                for name, (a, b) in {"1961-1990": (1961, 1990), "1991-2020": (1991, 2020),
                                     "2016-2025": (2016, 2025), "2021-2025": (2021, 2025)}.items()}
    cy = cet[str(LAST_FULL + 1)]
    ytd = cy.groupby(cy.index.month).mean()
    profiles["2026_ytd"] = [ytd.get(m, np.nan) for m in range(1, 13)]
    periods = {name: {"cet": ann_f.loc[a:b].mean(), "hdd": hdd_f.loc[a:b].mean()}
               for name, (a, b) in {"1961-1990": (1961, 1990), "1991-2020": (1991, 2020),
                                    "2016-2025": (2016, 2025), "2021-2025": (2021, 2025)}.items()}
    m_ytd = sorted(ytd.index)
    periods["2026_ytd_anomaly_vs_1991_2020_same_months"] = {
        "months": f"Jan-{m_ytd[-1]} (last month partial to {last_day.date()})",
        "cet": float(np.mean([ytd[m] - profiles["1991-2020"][m - 1] for m in m_ytd]))}

    # bias vs own trailing 30y normal, 1991-2025
    b = nd.loc[1991:LAST_FULL].copy()
    b["bias"] = b.actual - b.n30
    b["bias_hdd"] = b.actual_hdd - b.hdd_n30
    b["bias10"] = b.actual - b.n10
    b["bias5"] = b.actual - b.n5
    b["decade"] = (b.index // 10) * 10
    warmer = int((b.bias > 0).sum())
    warmer10, warmer5 = int((b.bias10 > 0).sum()), int((b.bias5 > 0).sum())
    fewer_hdd = int((b.bias_hdd < 0).sum())
    by_decade = b.groupby("decade")[["bias", "bias10", "bias5", "bias_hdd"]].mean()
    bias = {
        "years": int(len(b)), "warmer_than_30y": warmer, "warmer_than_10y": warmer10,
        "warmer_than_5y": warmer5, "share_warmer": warmer / len(b),
        "fewer_hdd_than_30y": fewer_hdd, "share_fewer_hdd": fewer_hdd / len(b),
        "mean_bias_c": {"n30": b.bias.mean(), "n10": b.bias10.mean(), "n5": b.bias5.mean()},
        "mean_abs_error_c": {"n30": b.bias.abs().mean(), "n10": b.bias10.abs().mean(),
                             "n5": b.bias5.abs().mean()},
        "mean_bias_hdd": b.bias_hdd.mean(),
        "by_decade": [{"decade": f"{int(d)}s" + (" (to 2025)" if d == 2020 else ""), **r.to_dict()}
                      for d, r in by_decade.iterrows()],
        "warmer_by_decade": b.groupby("decade").bias.apply(lambda s: f"{(s > 0).sum()}/{len(s)}").to_dict(),
    }
    bias["warmer_by_decade"] = {f"{int(k)}s": v for k, v in bias["warmer_by_decade"].items()}

    # demand sensitivity
    frames = []
    for y, path in NESO.items():
        d = pd.read_csv(io.StringIO(get(NESO_BASE + path)))
        d["date"] = pd.to_datetime(d.SETTLEMENT_DATE, format="mixed", dayfirst=False)
        frames.append(d)
    dem = pd.concat(frames)
    daily = dem.groupby("date")[["ND", "TSD"]].mean().rename(columns=str.lower) / 1000  # MW -> GW
    daily = daily.join(cet.rename("t"), how="inner")
    annual_twh = dem.groupby(dem.date.dt.year).ND.sum() * 0.5 / 1e6
    tsd_twh = dem.groupby(dem.date.dt.year).TSD.sum() * 0.5 / 1e6

    md = daily.index.month * 100 + daily.index.day
    sel = daily[(daily.index.dayofweek < 5) & (daily.t < 15) & ~((md >= 1220) | (md <= 103))]
    reg = {}
    for col in ("nd", "tsd"):
        slope, icpt = np.polyfit(sel.t, sel[col], 1)
        pred = icpt + slope * sel.t
        r2v = 1 - ((sel[col] - pred) ** 2).sum() / ((sel[col] - sel[col].mean()) ** 2).sum()
        reg[col] = {"slope_gw_per_c": slope, "intercept_gw": icpt, "r2": r2v, "n": int(len(sel))}
    # same fit with year dummies, to strip the demand trend (check only)
    X = pd.get_dummies(sel.index.year, dtype=float).values
    X = np.column_stack([sel.t.values, X])
    coef = np.linalg.lstsq(X, sel.nd.values, rcond=None)[0]
    reg["nd_year_fixed_effects_slope"] = coef[0]
    scatter = sel.assign(date=sel.index.strftime("%Y-%m-%d"))[["date", "t", "nd"]].values.tolist()

    # energy translation for latest full year
    y = LAST_FULL
    s = reg["nd"]["slope_gw_per_c"]  # GW per degC (negative)
    row = nd.loc[y]
    dhdd = row.hdd_n30 - row.hdd_n10  # degC-days
    twh = -s * dhdd * 24 / 1000  # GW * degC-days/degC * 24h -> GWh -> TWh
    energy = {
        "year": y, "slope_gw_per_c": s, "hdd_n30": row.hdd_n30, "hdd_n10": row.hdd_n10,
        "hdd_n5": row.hdd_n5, "hdd_actual": row.actual_hdd,
        "hdd_diff_30_minus_10": dhdd,
        "twh_30_vs_10": twh,
        "twh_30_vs_5": -s * (row.hdd_n30 - row.hdd_n5) * 24 / 1000,
        "twh_30_vs_actual": -s * (row.hdd_n30 - row.actual_hdd) * 24 / 1000,
        "nd_annual_twh": annual_twh[y], "tsd_annual_twh": tsd_twh[y],
        "pct_of_nd": twh / annual_twh[y] * 100,
        "arithmetic": f"|{s:.3f}| GW/C x ({row.hdd_n30:.1f} - {row.hdd_n10:.1f}) C-days x 24 h "
                      f"= {abs(s) * dhdd * 24:.0f} GWh = {twh:.2f} TWh; / {annual_twh[y]:.1f} TWh ND "
                      f"= {twh / annual_twh[y] * 100:.2f}%",
    }

    out_d = {
        "meta": {"hadcet_last_day": str(last_day.date()), "hdd_base_c": BASE_T,
                 "hadcet_url": HADCET, "neso_dataset": "https://www.neso.energy/data-portal/historic-demand-data",
                 "notes": "normals are trailing means of years Y-n..Y-1; winter labelled by ending year (Oct Y-1..Mar Y)"},
        "annual": annual_rows,
        "normals": nd.reset_index().to_dict("records"),
        "monthly_profiles": profiles,
        "period_means": periods,
        "bias_1991_2025": bias,
        "regression": reg,
        "regression_scatter_date_t_ndgw": scatter,
        "demand_annual_twh": {"nd": annual_twh.to_dict(), "tsd": tsd_twh.to_dict()},
        "energy_impact": energy,
    }
    with open(out, "w") as f:
        json.dump(r2(out_d), f, separators=(",", ":"))
    print(json.dumps(r2({k: out_d[k] for k in ("bias_1991_2025", "regression", "energy_impact")}), indent=1))
    print("profiles", json.dumps(r2(profiles)))
    print("periods", json.dumps(r2(periods)), "warmer10/5", warmer10, warmer5)
    print(nd.loc[[1990, 2000, 2010, 2020, 2025, 2026]].round(2))
    print(annual.sort_values().tail(6).round(2))


if __name__ == "__main__":
    main(sys.argv[1])
