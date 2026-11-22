# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy", "pandas"]
# ///
"""Put a resampling interval on each supplier's shape cost against the average shape.

Reads the published seasonal profiles, fetches Elexon market index prices (APXMIDP) for
Sum-25 and Win-25, and resamples whole weeks of price days with replacement.
Writes src/projects/electricity-suppliers/interval.json.

Run: uv run scripts/electricity-suppliers/build.py
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from fetch_cache import get  # noqa: E402

DATA = ROOT / "public" / "data" / "electricity-suppliers"
OUT = ROOT / "src" / "projects" / "electricity-suppliers" / "interval.json"
API = "https://data.elexon.co.uk/bmrs/api/v1/datasets/MID/stream"
SEASONS = {"Sum-25": ("2025-04-01", "2025-09-30"), "Win-25": ("2025-10-01", "2026-03-31")}
DRAWS, BLOCK, SEED = 2000, 7, 20261116


def prices(start: str, end: str) -> np.ndarray:
    """Return a days x 48 matrix of market index prices, NaN where nothing traded."""
    url = f"{API}?from={start}&to={end}&settlementPeriodFrom=1&settlementPeriodTo=50&dataProviders=APXMIDP"
    m = pd.DataFrame(json.loads(get(url)))
    m = m[(m.settlementDate >= start) & (m.settlementDate <= end) & (m.settlementPeriod <= 48)]
    m = m.drop_duplicates(["settlementDate", "settlementPeriod"])
    m.loc[m.volume == 0, "price"] = np.nan
    grid = m.pivot(index="settlementDate", columns="settlementPeriod", values="price").reindex(columns=range(1, 49))
    return grid.sort_index().to_numpy()


def average_shape(peers: np.ndarray) -> np.ndarray:
    """Return the trimmed mean across suppliers at each half hour, rescaled to a mean of 1."""
    avg = np.sort(peers, axis=0)[1:-1].mean(axis=0)
    return avg / avg.mean()


def main() -> None:
    """Write the point estimates and 90% block-bootstrap intervals."""
    prof = json.loads((DATA / "supplier_profiles.json").read_text())["profiles"]
    published = json.loads((DATA / "supplier_shape_value.json").read_text())["vs_average"]
    rng = np.random.default_rng(SEED)
    rows: dict[str, dict] = {}
    facts: dict[str, float | int | str] = {"draws": DRAWS, "block_days": BLOCK, "interval": "5th to 95th percentile"}
    for season, (start, end) in SEASONS.items():
        names = [k for k in prof if season in prof[k]]
        shapes = np.array([prof[k][season] for k in names])
        gap = shapes - average_shape(shapes)  # each supplier's shape less the average shape, by half hour
        px = prices(start, end)
        point = gap @ np.nanmean(px, axis=0) / 48
        for k, v in zip(names, point):
            assert abs(v - published[k][season]["gbp_per_mwh"]) < 0.011, (k, season, v)
        # whole weeks drawn with replacement, so runs of similar price days stay together
        blocks = [px[i:i + BLOCK] for i in range(0, len(px), BLOCK)]
        draws = np.empty((DRAWS, len(names)))
        for d in range(DRAWS):
            pick = np.concatenate([blocks[i] for i in rng.integers(0, len(blocks), len(blocks))])
            draws[d] = gap @ np.nanmean(pick, axis=0) / 48
        lo, hi = np.percentile(draws, [5, 95], axis=0)
        tag = season[:3].lower()
        for k, p, a, b in zip(names, point, lo, hi):
            rows.setdefault(k, {"supplier": k}).update({tag: round(float(p), 2), f"{tag}_lo": round(float(a), 2), f"{tag}_hi": round(float(b), 2)})
        clear = int(((lo > 0) | (hi < 0)).sum())
        facts[f"{tag}_days"] = int(len(px))
        facts[f"{tag}_suppliers"] = len(names)
        facts[f"{tag}_excludes_zero"] = clear
        facts[f"{tag}_widest_half_width"] = round(float(((hi - lo) / 2).max()), 2)
        facts[f"{tag}_median_half_width"] = round(float(np.median((hi - lo) / 2)), 2)
    out = {
        "meta": {
            "source": "Elexon Insights API, Market Index Data (MID), provider APXMIDP; supplier profiles from Elexon S0142 (P114 data)",
            "method": "shape cost against the trimmed-mean shape at the season's mean price by half hour; interval from resampling 7-day blocks of price days with replacement, each supplier's seasonal shape held fixed",
            "units": "£/MWh",
        },
        "facts": facts,
        "rows": sorted(rows.values(), key=lambda r: r["supplier"]),
    }
    OUT.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
    print(json.dumps(facts, indent=1))
    for r in out["rows"]:
        print(r)


if __name__ == "__main__":
    main()
