"""Build the chart data for the GCF article from gcf_hh.parquet (made by load.py)."""
import json
from pathlib import Path

import pandas as pd

HERE = Path(__file__).parent
OUT = HERE.parents[1] / "src/projects/gcf/data.json"


def main():
    d = pd.read_parquet(HERE / "gcf_hh.parquet")
    d = d[d.gcf_type != "mhhs_export_gcf"]  # the import GCF continues the legacy series
    # simple mean over the 14 GSP Groups and every half hour; no volumes to weight by
    m = d.groupby(d.settlement_date.dt.to_period("M")).gcf.mean()
    s = d[d.settlement_date.dt.month.isin([7, 8])]
    shape = s.groupby([s.settlement_date.dt.year, "settlement_period"]).gcf.mean().unstack(0)
    shape = shape.loc[1:48]
    out = {
        "months": [str(p) for p in m.index],
        "monthly": [round(v, 4) for v in m],
        "shape2024": [round(v, 4) for v in shape[2024]],
        "shape2026": [round(v, 4) for v in shape[2026]],
        "last": str(d.settlement_date.max().date()),
    }
    assert len(out["shape2024"]) == 48 and abs(m["2024-10"] - 1.04) < 0.01
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, separators=(",", ":")))
    print(len(out["months"]), "months ->", OUT)


if __name__ == "__main__":
    main()
