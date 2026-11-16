# /// script
# requires-python = ">=3.11"
# dependencies = ["pandas"]
# ///
"""Sum operational onshore wind by region from the DESNZ Renewable Energy Planning Database
and set each data centre site beside the wind in its region.

Writes src/projects/data-centre-demand/data.json.

Run: uv run scripts/data-centre-demand/build.py
"""
import io
import json
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from fetch_cache import get  # noqa: E402

OUT = ROOT / "src" / "projects" / "data-centre-demand" / "data.json"
REPD = "https://assets.publishing.service.gov.uk/media/6af42ff0a4004bdbe54e54a5/REPD_Publication_Q3_2026.csv"
KEYS = {
    "Scotland": "scotland", "Wales": "wales", "Northern Ireland": "northern-ireland", "Yorkshire and Humber": "yorkshire",
    "North East": "north-east", "North West": "north-west", "Eastern": "east", "East Midlands": "east-midlands",
    "South West": "south-west", "South East": "south-east", "London": "london", "West Midlands": "west-midlands",
}
# site, REPD region, status, published MW (None where no figure is published for the site on its own)
SITES = [
    ("Cambois", "North East", "First phase consented", 720),
    ("Airdrie", "Scotland", "AI Growth Zone", 500),
    ("Culham", "South East", "AI Growth Zone", 100),
    ("Cobalt Park", "North East", "AI Growth Zone", None),
    ("Trawsfynydd", "Wales", "AI Growth Zone", None),
    ("Anglesey", "Wales", "AI Growth Zone", None),
    ("Bridgend", "Wales", "AI Growth Zone", None),
    ("Slough", "South East", "Existing cluster", 1000),
    ("Docklands", "London", "Existing cluster", None),
]


def main() -> None:
    """Write regional onshore wind, the site table and the facts quoted in the prose."""
    df = pd.read_csv(io.BytesIO(get(REPD)), encoding="latin-1", low_memory=False)
    df.columns = [c.strip() for c in df.columns]
    df["mw"] = pd.to_numeric(df["Installed Capacity (MWelec)"].astype(str).str.replace(",", ""), errors="coerce")
    live = df[df["Development Status (short)"] == "Operational"]
    onshore = live[live["Technology Type"] == "Wind Onshore"]
    by_region = onshore.groupby("Region").mw.sum().round().astype(int)
    assert set(by_region.index) == set(KEYS), sorted(by_region.index)
    assert 12_000 < by_region.sum() < 18_000, by_region.sum()  # GB and NI onshore wind is about 15 GW
    wind = {KEYS[r]: int(v) for r, v in by_region.items()}
    updated = pd.to_datetime(df["Record Last Updated (dd/mm/yyyy)"], dayfirst=True, errors="coerce").max()
    facts = {
        "extract": "REPD_Publication_Q3_2026",
        "records_to": f"{updated:%-d %B %Y}",
        "scotland_mw": wind["scotland"],
        "england_mw": int(onshore[onshore.Country == "England"].mw.sum().round()),
        "south_east_mw": wind["south-east"],
        "london_mw": wind["london"],
        "north_east_mw": wind["north-east"],
        "wales_mw": wind["wales"],
        "offshore_mw": int(live[live["Technology Type"] == "Wind Offshore"].mw.sum().round()),
    }
    sites = [{"site": s, "region": r, "status": st, "mw": mw if mw is not None else "", "wind": wind[KEYS[r]]} for s, r, st, mw in SITES]
    out = {
        "meta": {
            "source": "DESNZ, Renewable Energy Planning Database, quarterly extract; operational sites, technology Wind Onshore, installed capacity summed by the database's Region field",
            "url": REPD,
            "sites": "published megawatts from the sources in the article's notes; blank where none is published for the site on its own",
        },
        "facts": facts,
        "wind": wind,
        "sites": sites,
    }
    OUT.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
    print(json.dumps(facts, indent=1))
    print(wind)


if __name__ == "__main__":
    main()
