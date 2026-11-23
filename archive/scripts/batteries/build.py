# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy", "pandas"]
# ///
"""Price the modelled battery-home forecast surplus at each summer day's cash-out prices.

The surplus is the gap between the solar-only and solar-plus-battery import shapes in
src/projects/batteries/Page.tsx (modelled, illustrative) from 15:30 onwards. Prices are
Elexon settlement system prices and APX market index prices, 1 April to 30 September 2026.
Writes src/projects/batteries/data.json.

Run: uv run scripts/batteries/build.py
"""
import json
import re
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from fetch_cache import get  # noqa: E402

PAGE = ROOT / "src" / "projects" / "batteries" / "Page.tsx"
OUT = ROOT / "src" / "projects" / "batteries" / "data.json"
API = "https://data.elexon.co.uk/bmrs/api/v1"
START, END = "2026-04-01", "2026-09-30"
FIRST = 31  # 15:30, the first half hour of the surplus
HOMES = 50_000
BIN = 5  # pence


def shape(name: str) -> np.ndarray:
    """Read one 48-value import shape (kW per home) from the page source."""
    m = re.search(rf"const {name} = \[([^\]]+)\]", PAGE.read_text())
    v = np.array([float(x) for x in m.group(1).split(",")])
    assert len(v) == 48, name
    return v


def system_prices() -> pd.DataFrame:
    """Return days x 48 system prices (£/MWh), dropping clock-change days."""
    rows = []
    for d in pd.date_range(START, END):
        rows += json.loads(get(f"{API}/balancing/settlement/system-prices/{d:%Y-%m-%d}?format=json"))["data"]
    s = pd.DataFrame(rows)
    assert (s.systemSellPrice == s.systemBuyPrice).all()  # single cash-out price
    g = s.pivot(index="settlementDate", columns="settlementPeriod", values="systemSellPrice")
    return g[g.notna().sum(axis=1) == 48][list(range(1, 49))]


def market_index(days: pd.Index) -> pd.DataFrame:
    """Return APX market index prices on the same grid, NaN where nothing traded."""
    url = f"{API}/datasets/MID/stream?from={START}&to={END}&settlementPeriodFrom=1&settlementPeriodTo=50&dataProviders=APXMIDP"
    m = pd.DataFrame(json.loads(get(url))).drop_duplicates(["settlementDate", "settlementPeriod"])
    m.loc[m.volume == 0, "price"] = np.nan
    return m.pivot(index="settlementDate", columns="settlementPeriod", values="price").reindex(index=days, columns=range(1, 49))


def main() -> None:
    """Write the daily value distribution, its histogram and the facts quoted in the prose."""
    surplus = ((shape("S_SOLAR") - shape("S_BATT")) * 0.5)[FIRST:]  # kWh per home per half hour
    kwh = float(surplus.sum())
    assert 1.7 < kwh < 1.9, kwh

    sp = system_prices()
    eve = sp.to_numpy()[:, FIRST:]
    value = eve @ surplus / 10  # pence per home per day (kWh x £/MWh / 10)

    july = sp[(sp.index >= "2026-07-06") & (sp.index <= "2026-07-24") & (pd.to_datetime(sp.index).day_of_week < 5)]
    july_mean = july.mean().to_numpy()
    assert len(july) == 15

    mid = market_index(sp.index).to_numpy()[:, FIRST:]
    ok = ~np.isnan(mid).any(axis=1)
    gain = ((eve - mid)[ok] @ surplus) / 10  # pence per home per day against the market index

    q = lambda x, p: float(np.percentile(x, p))
    lo = int(np.floor(value.min() / BIN) * BIN)
    hi = int(np.ceil((value.max() + 1e-9) / BIN) * BIN)
    edges = np.arange(lo, hi + BIN, BIN)
    counts, _ = np.histogram(value, bins=edges)
    assert counts.sum() == len(value)

    facts = {
        "window": f"{START} to {END}",
        "days": int(len(value)),
        "surplus_kwh_per_home": round(kwh, 2),
        "book_homes": HOMES,
        "book_mwh_per_day": round(kwh * HOMES / 1000, 1),
        "july_weekdays": int(len(july)),
        "july_min_price": round(float(july_mean.min()), 0),
        "july_min_at": f"{int(july_mean.argmin()) // 2:02d}:{'30' if int(july_mean.argmin()) % 2 else '00'}",
        "july_2000_price": round(float(july_mean[40]), 0),
        "july_value_pence": round(float(july_mean[FIRST:] @ surplus / 10), 1),
        "value_p10": round(q(value, 10), 1), "value_p50": round(q(value, 50), 1), "value_p90": round(q(value, 90), 1),
        "value_min": round(float(value.min()), 1), "value_max": round(float(value.max()), 1),
        "value_mean": round(float(value.mean()), 1),
        "book_gbp_p10": round(q(value, 10) * HOMES / 100, -2), "book_gbp_p50": round(q(value, 50) * HOMES / 100, -2), "book_gbp_p90": round(q(value, 90) * HOMES / 100, -2),
        "price_p10": round(q(eve, 10), 0), "price_p50": round(q(eve, 50), 0), "price_p90": round(q(eve, 90), 0),
        "price_min": round(float(eve.min()), 0), "price_max": round(float(eve.max()), 0),
        "price_share_negative_pct": round(float((eve < 0).mean() * 100), 1),
        "gain_days": int(ok.sum()),
        "gain_p10": round(q(gain, 10), 1), "gain_p50": round(q(gain, 50), 1), "gain_p90": round(q(gain, 90), 1),
        "gain_mean": round(float(gain.mean()), 1),
        "gain_loss_days_pct": round(float((gain < 0).mean() * 100), 0),
    }
    out = {
        "meta": {
            "source": "Elexon Insights API: settlement system prices (DISEBSP) and Market Index Data (APXMIDP). Contains BMRS data © Elexon Limited copyright and database right 2026.",
            "method": "modelled surplus (solar-only less solar-plus-battery import, 15:30 to midnight, illustrative) priced at each day's system price by half hour; gain is the same surplus at system price less market index price",
            "units": "pence per home per day; prices £/MWh",
        },
        "facts": facts,
        "bins": [{"x0": int(a), "x1": int(a + BIN), "n": int(n)} for a, n in zip(edges[:-1], counts)],
    }
    OUT.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
    print(json.dumps(facts, indent=1))
    print([b["n"] for b in out["bins"]], lo, hi)


if __name__ == "__main__":
    main()
