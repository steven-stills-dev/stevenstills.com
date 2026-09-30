# /// script
# requires-python = ">=3.11"
# dependencies = ["pandas", "pyarrow", "requests"]
# ///
"""Value GB electricity suppliers' demand shapes and imbalance at Elexon market index prices.

Run: uv run scripts/electricity-suppliers/value_shapes.py
"""

from __future__ import annotations

import json
import os
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pandas as pd
import requests

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "public" / "data" / "electricity-suppliers"
CACHE = Path(os.environ.get("PRICE_CACHE", "/tmp/claude-1000/-home-stevenstills-py-stevenstills-com/462d8352-c0f7-4238-9ab7-1f92e2f2c61c/scratchpad/prices"))
# Half-hourly S0142 party data (read only); the exact and imbalance steps are skipped when it is absent.
HH = Path(os.environ.get("HH_SOURCE", "/home/stevenstills/python/local-work/competition-analysis"))
API = "https://data.elexon.co.uk/bmrs/api/v1"
START, END = pd.Timestamp("2021-04-01"), pd.Timestamp("2026-09-12")
IMB_START = pd.Timestamp("2024-09-13")
PRIORITY = {"DF": 1, "RF": 2, "R3": 3, "R2": 4, "R1": 5, "SF": 6, "II": 7}
DROP_BRANDS = {"E", "Co-op Energy", "Good Energy", "Utility Warehouse", "100Green", "EDF Energy", "E.ON Next", "ScottishPower"}
GROUP_ACCOUNTS = {"EONEMUK": ("E.ON Next", "whole"), "SPOWER02": ("ScottishPower", "C")}


def season(d: pd.Series) -> pd.Series:
    """Label each date with its trading season (Sum-YY Apr-Sep, Win-YY Oct-Mar)."""
    y, m = d.dt.year, d.dt.month
    summer = m.between(4, 9)
    yy = (y - (m <= 3)).astype(str).str[2:]
    return ("Sum-" + yy).where(summer, "Win-" + yy)


def season_key(s: str) -> int:
    """Return a chronological sort key for a season label."""
    return int(s[4:]) * 2 + s.startswith("Win")


def usable(supplier: str, s: str) -> bool:
    """Return False for Fuse Energy seasons before Win-24, whose volumes are negligible."""
    return supplier != "Fuse Energy" or season_key(s) >= season_key("Win-24")


def get_json(url: str, path: Path, params: dict | None = None):
    """Fetch a JSON response once and cache it at path."""
    if not path.exists():
        r = requests.get(url, params=params, timeout=120)
        r.raise_for_status()
        path.write_text(r.text)
    return json.loads(path.read_text())


def fetch_mid() -> pd.DataFrame:
    """Fetch APX market index data by settlement date, one request per trading year."""
    CACHE.mkdir(parents=True, exist_ok=True)
    rows = []
    for y in range(START.year, END.year + 1):
        a, b = pd.Timestamp(f"{y}-04-01"), min(pd.Timestamp(f"{y + 1}-03-31"), END)
        if a > END:
            break
        # settlementPeriodFrom/To switch from/to to settlement-date filtering (swagger note)
        params = {"from": f"{a:%Y-%m-%d}", "to": f"{b:%Y-%m-%d}", "settlementPeriodFrom": 1, "settlementPeriodTo": 50, "dataProviders": "APXMIDP"}
        rows += get_json(f"{API}/datasets/MID/stream", CACHE / f"mid_{a:%Y%m%d}_{b:%Y%m%d}.json", params)
    m = pd.DataFrame(rows)[["settlementDate", "settlementPeriod", "price", "volume"]]
    m["date"] = pd.to_datetime(m.settlementDate)
    m = m.rename(columns={"settlementPeriod": "sp"}).drop_duplicates(["date", "sp"])
    return m[(m.date >= START) & (m.date <= END)]


def fetch_system_prices() -> pd.DataFrame:
    """Fetch settlement system buy and sell prices for each day of the imbalance window."""
    days = pd.date_range(IMB_START, END)
    with ThreadPoolExecutor(8) as ex:
        out = ex.map(lambda d: get_json(f"{API}/balancing/settlement/system-prices/{d:%Y-%m-%d}", CACHE / f"sp_{d:%Y%m%d}.json")["data"], days)
    s = pd.DataFrame([r for day in out for r in day])
    s["date"] = pd.to_datetime(s.settlementDate)
    return s.rename(columns={"settlementPeriod": "sp", "systemSellPrice": "ssp", "systemBuyPrice": "sbp"})[["date", "sp", "ssp", "sbp"]]


def load_hh() -> pd.DataFrame:
    """Return half-hourly consumption, credited energy and imbalance per brand, as built by competition-analysis/analyse.py."""
    df = pd.concat([pd.read_parquet(HH / "parts"), pd.read_parquet(HH / "backfill")], ignore_index=True)
    df = df[~df.Brand.isin(DROP_BRANDS)]
    df = df.assign(p=df["Run Type"].map(PRIORITY)).sort_values("p").drop_duplicates(["Party ID", "Settlement Date", "Settlement Period"])
    df["demand"] = df["Credited Energy Vol"] + df["MVRN From Credited Energy"].fillna(0).clip(upper=0)
    a = pd.read_parquet(HH / "accounts")
    keys = ["Settlement Date", "Settlement Period"]
    for pid, (brand, basis) in GROUP_ACCOUNTS.items():
        g = a[a["Party ID"] == pid]
        c = g[g.Account == "C"].groupby(keys)[["ECVN Vol", "Credited Energy Vol"]].sum()
        src = (c if basis == "C" else g.groupby(keys)[["ECVN Vol", "Credited Energy Vol"]].sum()).copy()
        src["demand"] = c["Credited Energy Vol"].reindex(src.index)
        df = pd.concat([df, src.reset_index().assign(Brand=brand)], ignore_index=True)
    b = df.groupby(["Brand", *keys], as_index=False)[["ECVN Vol", "Credited Energy Vol", "demand"]].sum()
    b = b.rename(columns={"Settlement Date": "date", "Settlement Period": "sp", "Credited Energy Vol": "ce"})
    b["imbalance"] = b.ce - b["ECVN Vol"]  # MWh, positive = long
    b["demand"] = -b.demand  # consumption as a positive MWh
    b["date"] = pd.to_datetime(b.date)
    return b


def main() -> None:
    """Write supplier_shape_value.json."""
    prof = json.loads((DATA / "supplier_profiles.json").read_text())["profiles"]
    ind = json.loads((DATA / "supplier_shape_indicators.json").read_text())["indicators"]

    mid = fetch_mid()
    n_short, n_long = (mid.groupby("date").sp.max() == 46).sum(), (mid.groupby("date").sp.max() == 50).sum()
    zero = (mid.volume == 0)
    n_zero, n_zero_nonzero_price = int(zero.sum()), int((zero & (mid.price != 0)).sum())
    mid.loc[zero, "price"] = float("nan")  # no trades in that half hour: no market price, not £0
    mid = mid[mid.sp <= 48].assign(season=lambda x: season(x.date))

    by_sp = mid.pivot_table(index="season", columns="sp", values="price", aggfunc="mean")
    seasons = sorted(by_sp.index, key=season_key)
    cal = pd.Series(pd.date_range(START, END))
    days = cal.groupby(season(cal)).size()  # calendar days, for season volume
    price = {s: by_sp.loc[s].reindex(range(1, 49)).to_numpy() for s in seasons}
    base = {s: float(price[s].mean()) for s in seasons}

    shape_price = lambda p, s: float((pd.Series(p).to_numpy() * price[s]).sum() / 48)
    premium, vs_avg, avg_shape = {}, {}, {}
    for s in seasons:
        peers = pd.DataFrame({k: v[s] for k, v in prof.items() if s in v and usable(k, s)})
        if peers.shape[1] < 3:
            continue
        srt = pd.DataFrame(sorted(r) for r in peers.to_numpy())  # each half hour sorted across suppliers
        avg = srt.iloc[:, 1:-1].mean(axis=1)
        avg_shape[s] = avg / avg.mean()  # renormalised to mean 1 so it prices the same MWh
        avg_price = shape_price(avg_shape[s], s)
        for k in peers:
            vol = ind[k][s]["mean_mwh"] * 48 * days[s]
            prem = shape_price(peers[k], s) - base[s]
            d = shape_price(peers[k], s) - avg_price
            premium.setdefault(k, {})[s] = {"gbp_per_mwh": round(prem, 2), "gbp_m": round(prem * vol / 1e6, 2)}
            vs_avg.setdefault(k, {})[s] = {"gbp_per_mwh": round(d, 2), "gbp_m": round(d * vol / 1e6, 2)}

    out_extra, imb_meta = {}, None
    if HH.exists():
        b = load_hh()
        hh = b[b.sp <= 48].merge(mid[["date", "sp", "price"]], on=["date", "sp"]).dropna(subset=["price"])
        hh["season"] = season(hh.date)
        exact = {}
        for (k, s), g in hh.groupby(["Brand", "season"]):
            if k in premium and s in premium[k]:
                # volume-weighted price of actual consumption minus the time-weighted price over the same half hours
                exact.setdefault(k, {})[s] = round(float((g.demand * g.price).sum() / g.demand.sum() - g.price.mean()), 2)
        out_extra["premium_exact"] = exact

        sp = fetch_system_prices()
        w = b[(b.date >= IMB_START) & (b.date <= END)].merge(mid[["date", "sp", "price"]], on=["date", "sp"], how="left").merge(sp, on=["date", "sp"], how="left")
        w["cash"] = w.ssp.where(w.imbalance > 0, w.sbp)
        ok = w.price.notna() & w.cash.notna()
        # cost vs MID = imbalance x (MID - cash-out price): long spill earns cash-out not MID, short top-up pays cash-out not MID
        w["cost"] = w.imbalance * (w.price - w.cash)
        imb = {}
        for k, g in w[ok].groupby("Brand"):
            ce = g.ce.abs().sum()
            imb[k] = {"gbp_m": round(g.cost.sum() / 1e6, 2), "gbp_per_mwh": round(g.cost.sum() / ce, 3), "credited_twh": round(ce / 1e6, 2), "abs_imbalance_twh": round(g.imbalance.abs().sum() / 1e6, 3)}
        out_extra["imbalance"] = imb
        imb_meta = {"window": f"{IMB_START:%-d %B %Y} to {END:%-d %B %Y}", "half_hours_dropped_no_price": int((~ok).sum() / w.Brand.nunique()), "half_hours_ssp_ne_sbp": int((sp.ssp != sp.sbp).sum())}

    out = {
        "meta": {
            "source": "Elexon Insights API: Market Index Data (MID), provider APXMIDP; settlement system prices (DISEBSP), latest settlement run. Volumes: Elexon S0142 (SAA-I014), P114 data.",
            "licence": "Contains BMRS data © Elexon Limited copyright and database right 2026. Contains BSC information that is available from Elexon at no charge and which is licensed under the Elexon Public Data Licence.",
            "licence_url": ["https://www.elexon.co.uk/bsc/data/balancing-mechanism-reporting-agent/copyright-licence-bmrs-data/", "https://www.elexon.co.uk/bsc/documents/bsc-public-data-licence-for-p114-data-items/"],
            "period": f"{START:%-d %B %Y} to {END:%-d %B %Y}",
            "seasons": "Sum-YY = April to September YY; Win-YY = October YY to March YY+1; Sum-26 runs to 12 September 2026",
            "units": "price £/MWh; gbp_m £ million per season",
            "method": {
                "price_by_sp": "mean APX MID price per settlement period across the season's days; half hours with zero MID volume carry no price and are skipped; MID has no rows for 28 April 2021 and partial days on 27 April, 29-30 May 2021 and a handful of single half hours later",
                "clock_change": f"mapped by settlement period number; periods 49-50 on long days dropped ({n_long} long days, {n_short} short days of 46 periods)",
                "zero_volume_rows": f"{n_zero} half hours with zero MID volume ({n_zero_nonzero_price} of them with a non-zero price) treated as missing",
                "baseload": "mean of the 48 settlement-period prices",
                "premium": "sum(profile x price_by_sp)/48 - baseload; gbp_m = premium x mean_mwh x 48 x calendar days in the season (Sum-26 to 12 September)",
                "average_shape": "trimmed mean of supplier profiles at each half hour (highest and lowest dropped), renormalised to mean 1",
                "vs_average": "supplier shape price minus average shape price, £/MWh; gbp_m on the supplier's season volume",
                "premium_exact": "volume-weighted MID of actual half-hourly consumption minus the plain mean MID over the same half hours; captures day-level demand-price covariance that premium ignores",
                "imbalance": "sum of imbalance x (MID - cash-out price), cash-out = SSP when long, SBP when short; positive = cost against trading the same volume at MID; gbp_per_mwh on absolute credited energy",
                "fuse_energy": "seasons before Win-24 excluded (negligible volume)",
            },
        },
        "price_by_sp": {s: [round(float(x), 2) for x in price[s]] for s in seasons},
        "baseload": {s: round(base[s], 2) for s in seasons},
        "average_shape": {s: [round(float(x), 4) for x in v] for s, v in avg_shape.items()},
        "premium": premium,
        "vs_average": vs_avg,
        **out_extra,
    }
    if imb_meta:
        out["meta"]["imbalance_window"] = imb_meta
    (DATA / "supplier_shape_value.json").write_text(json.dumps(out, separators=(",", ":"), ensure_ascii=False))
    print(json.dumps({"baseload": out["baseload"], "days": days.to_dict()}, indent=1))


if __name__ == "__main__":
    main()
