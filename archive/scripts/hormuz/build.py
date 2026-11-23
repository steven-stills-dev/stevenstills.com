"""Compare daily moves in the gas System Average Price before and after 28 February 2026.

Data: ONS "System Average Price (SAP) of gas", edition of 5 November 2026 (National Gas Transmission
data, p/kWh), and IMF PortWatch Daily Chokepoints Data for the Strait of Hormuz (n_tanker).
Checks the two series inlined in Page.tsx against those sources, then writes the distribution of
absolute daily price changes for the two periods and every number quoted in the prose.

Run: uv run --python 3.11 --with pandas --with numpy --with openpyxl scripts/hormuz/build.py
"""
import io
import json
import re
import sys
import urllib.parse
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from fetch_cache import get  # noqa: E402

PAGE = HERE.parents[1] / "src/projects/hormuz/Page.tsx"
OUT = HERE.parents[1] / "src/projects/hormuz/data.json"
ONS = ("https://www.ons.gov.uk/file?uri=/economy/economicoutputandproductivity/output/datasets/"
       "systemaveragepricesapofgas/2026/systemaveragepriceofgasdataset051126.xlsx")
PORTWATCH = "https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/Daily_Chokepoints_Data/FeatureServer/0/query?"
KWH_PER_THERM = 29.3071
START, END, EVENT = "2026-02-01", "2026-04-16", "2026-02-28"  # the page's window; strikes on Iran began 28 Feb
GRID = np.arange(0, 35.5, 0.5)  # p/therm


def load_sap():
    """Return the daily System Average Price in p/therm, January 2018 onwards."""
    d = pd.read_excel(io.BytesIO(get(ONS)), sheet_name="1.Daily SAP Gas", header=4, usecols=[0, 1])
    d.columns = ["date", "p_kwh"]
    d["date"] = pd.to_datetime(d.date)
    return d.dropna().set_index("date").p_kwh.sort_index() * KWH_PER_THERM


def load_tankers():
    q = {"where": f"portid='chokepoint6' AND date >= DATE '{START}' AND date <= DATE '2026-06-30'",
         "outFields": "date,n_tanker", "orderByFields": "date", "f": "json"}
    js = json.loads(get(PORTWATCH + urllib.parse.urlencode(q)))
    assert not js.get("exceededTransferLimit")
    t = pd.DataFrame([f["attributes"] for f in js["features"]])
    t["date"] = pd.to_datetime(t.date, unit="ms") if t.date.dtype != object else pd.to_datetime(t.date)
    return t.set_index("date").n_tanker


def inlined(name):
    return [float(x) for x in re.search(rf"const {name} = \[([^\]]+)\]", PAGE.read_text()).group(1).split(",")]


def main():
    sap, tank = load_sap(), load_tankers()
    win = sap[START:END]
    # the page's inlined series must equal the public sources
    assert len(win) == 75 and np.allclose(win.to_numpy() / KWH_PER_THERM, inlined("SAP"), atol=1e-6)
    assert tank[START:END].astype(int).tolist() == [int(v) for v in inlined("TRANSITS")]

    chg = win.diff().dropna()  # p/therm, change on the day before
    before, after = chg[:"2026-02-27"], chg[EVENT:]
    assert len(before) == 26 and len(after) == 48
    ab, aa = before.abs().to_numpy(), after.abs().to_numpy()

    # bootstrap the ratio of median absolute moves; days are resampled as if independent
    rng = np.random.default_rng(1)
    ratio = np.median(rng.choice(aa, (10000, len(aa))), axis=1) / np.median(rng.choice(ab, (10000, len(ab))), axis=1)

    share = (rng.choice(aa, (10000, len(aa))) > 5).mean(axis=1) - (rng.choice(ab, (10000, len(ab))) > 5).mean(axis=1)

    # how unusual each period is against every 48-day window of the series before the event
    hist = sap[:"2026-02-27"].diff().abs().dropna()
    roll = hist.rolling(48).median().dropna()
    big = (hist > 5).rolling(48).mean().dropna()  # share of moves above 5p in each 48-day window
    pct = lambda v: round(float((roll < v).mean() * 100), 1)

    ecdf = lambda a: [round(float((a <= g).mean() * 100), 1) for g in GRID]
    facts = {
        "n_before": len(ab), "n_after": len(aa),
        "median_abs_before": round(float(np.median(ab)), 1), "median_abs_after": round(float(np.median(aa)), 1),
        "ratio": round(float(np.median(aa) / np.median(ab)), 1),
        "ratio_ci": [round(float(np.percentile(ratio, 2.5)), 1), round(float(np.percentile(ratio, 97.5)), 1)],
        "share_over_5p_before": round(float((ab > 5).mean() * 100)), "share_over_5p_after": round(float((aa > 5).mean() * 100)),
        "days_over_5p_before": int((ab > 5).sum()), "days_over_5p_after": int((aa > 5).sum()),
        "share_rise_points": round(float(((aa > 5).mean() - (ab > 5).mean()) * 100)),
        "share_rise_ci": [round(float(np.percentile(share, 2.5) * 100)), round(float(np.percentile(share, 97.5) * 100))],
        "history_windows_with_median_at_least_after": round(float((roll >= np.median(aa)).mean() * 100), 1),
        "history_windows_with_share_at_least_after": round(float((big >= (aa > 5).mean()).mean() * 100), 1),
        "of_those_ending_2021_to_2023": round(float(big[big >= (aa > 5).mean()].index.year.isin([2021, 2022, 2023]).mean() * 100), 1),
        "of_those_by_year": {int(k): int(v) for k, v in big[big >= (aa > 5).mean()].index.year.value_counts().sort_index().items()},
        "max_rise": [str(after.idxmax().date()), round(float(after.max()), 1)],
        "max_fall": [str(after.idxmin().date()), round(float(after.min()), 1)],
        "max_abs_before": [str(before.abs().idxmax().date()), round(float(ab.max()), 1)],
        "history_from": str(hist.index[0].date()), "history_windows": int(len(roll)),
        "after_median_percentile_of_history": pct(np.median(aa)), "before_median_percentile_of_history": pct(np.median(ab)),
        "tanker_18_apr": int(tank["2026-04-18"]), "tanker_29_apr": int(tank["2026-04-29"]),
        "tanker_late_may": [int(tank["2026-05-16":"2026-05-31"].min()), int(tank["2026-05-16":"2026-05-31"].max())],
        "tanker_17apr_15may_max": int(tank["2026-04-17":"2026-05-15"].max()),
        "sap_late_may_min": round(float(sap["2026-05-16":"2026-05-31"].min()), 1), "sap_17_jun": round(float(sap["2026-06-17"]), 1),
    }
    out = {"grid": [float(g) for g in GRID], "before": ecdf(ab), "after": ecdf(aa), "facts": facts}
    assert out["before"][-1] == 100 and out["after"][-1] == 100, "grid must cover the largest move"
    OUT.write_text(json.dumps(out, separators=(",", ":")))
    print(json.dumps(facts, indent=1))
    print("before:", before.round(1).tolist())
    print("after:", after.round(1).tolist())


if __name__ == "__main__":
    main()
