"""Convert the NESO licence-area boundaries (the 14 GSP groups) to SVG paths and count 18 to 34 year olds in each.

Boundaries: NESO, GIS Boundaries for GB DNO Licence Areas, 3 May 2024 (British National Grid).
Population: ONS mid-year estimates by local authority, via Nomis (NM_2002_1).
Console ownership: Ofcom Technology Tracker 2026, table 42 (QD1_4, "Net: Yes - have device in home").
Local authority points: ONS Open Geography, Local Authority Districts May 2023 (BNG_E, BNG_N).
"""
import csv
import io
import json
import sys
from pathlib import Path

import shapely
from shapely.geometry import Point, shape

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fetch_cache import get  # noqa: E402

DNO = "https://api.neso.energy/dataset/0e377f16-95e9-4c15-a1fc-49e06a39cfa0/resource/1c6a7dc0-1b6c-443a-bc67-5f7125649434/download/gb-dno-license-areas-20240503-as-geojson.geojson"
POP = "https://www.nomisweb.co.uk/api/v01/dataset/NM_2002_1.data.csv?geography={}TYPE424&date=latest&gender=0&c_age=0,205,7,8&measures=20100&select=geography_code,geography_name,c_age_name,obs_value,date_name"
# Nomis region id: share of adults with a games console at home, typed from Ofcom's table 42
CONSOLE = {2013265921: 0.47, 2013265922: 0.47, 2013265923: 0.36, 2013265924: 0.36, 2013265925: 0.44, 2013265926: 0.44,
           2013265927: 0.37, 2013265928: 0.46, 2013265929: 0.42, 2013265930: 0.39, 2013265931: 0.46, 2013265932: 0.44}
NI = 2013265932
LAD = "https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/Local_Authority_Districts_May_2023_UK_BUC_V2/FeatureServer/0/query?where=1%3D1&outFields=LAD23CD,BNG_E,BNG_N&returnGeometry=false&f=json"
TOL, MIN_AREA = 600, 10e6          # simplify to 600 m, drop islands under 10 km2
SHETLAND_N = 1_100_000             # parts centred north of this are Shetland


def groups():
    """Return {code: (name, simplified geometry)} for the 14 GSP groups."""
    feats = json.loads(get(DNO))["features"]
    geoms = shapely.coverage_simplify([shape(f["geometry"]).buffer(0) for f in feats], TOL)
    return {f["properties"]["Name"]: (f["properties"]["Area"], g) for f, g in zip(feats, geoms)}


def population(geo):
    """Return {code: {"all", "young", "owners"}} by placing each local authority's point in a GSP group, plus the estimate year and the UK totals.

    `owners` is residents aged 18 to 34 times the share of adults in the authority's region with a console at home.
    """
    pts = {a["attributes"]["LAD23CD"]: Point(a["attributes"]["BNG_E"], a["attributes"]["BNG_N"])
           for a in json.loads(get(LAD))["features"]}
    out = {k: {"all": 0, "young": 0, "owners": 0.0} for k in geo}
    uk = {"all": 0, "young": 0, "owners": 0.0}
    year = None
    for region, share in CONSOLE.items():
        for r in csv.DictReader(io.StringIO(get(POP.format(region)).decode())):
            n = int(r["OBS_VALUE"])
            key = "all" if r["C_AGE_NAME"] == "All Ages" else "young"
            year = r["DATE_NAME"]
            adds = {key: n, "owners": 0 if key == "all" else n * share}
            for k, v in adds.items():
                uk[k] += v
            if region == NI:
                continue            # Northern Ireland sits outside the GB settlement system
            p = pts[r["GEOGRAPHY_CODE"]]
            g = min(geo, key=lambda c: geo[c][1].distance(p))
            for k, v in adds.items():
                out[g][k] += v
    return out, uk, year


def to_svg(geo):
    """Return the UKGeo object: one SVG unit per kilometre, y flipped, origin at the north-west corner."""
    parts = {k: [p for p in (g.geoms if g.geom_type == "MultiPolygon" else [g]) if p.area >= MIN_AREA]
             for k, (_, g) in geo.items()}
    allp = [p for ps in parts.values() for p in ps]
    e0 = min(p.bounds[0] for p in allp)
    n0 = max(p.bounds[3] for p in allp)
    X = lambda e: (e - e0) / 1000
    Y = lambda n: (n0 - n) / 1000

    def path(poly):
        xy = [(X(e), Y(n)) for e, n in poly.exterior.coords[:-1]]
        d = f"M{xy[0][0]:.1f},{xy[0][1]:.1f}"
        px, py = round(xy[0][0], 1), round(xy[0][1], 1)
        for x, y in xy[1:]:
            x, y = round(x, 1), round(y, 1)
            d += f"l{x - px:.1f},{y - py:.1f}"
            px, py = x, y
        return d + "z"

    regions = []
    for k in sorted(parts):
        big = max(parts[k], key=lambda p: p.area).representative_point()
        regions.append({"key": k, "code": k, "name": geo[k][0], "cx": round(X(big.x), 1), "cy": round(Y(big.y), 1),
                        "d": "".join(path(p) for p in parts[k])})
    return {
        "width": round(max(X(p.bounds[2]) for p in allp), 1),
        "height": round(max(Y(p.bounds[1]) for p in allp), 1),
        "shetlandCut": round(Y(max(p.bounds[3] for p in allp if p.centroid.y < SHETLAND_N)), 1),
        "originE": round(e0, 1), "originN": round(n0, 1), "metresPerUnit": 1000, "regions": regions,
    }


if __name__ == "__main__":
    g = groups()
    pop, uk, year = population(g)
    assert len(g) == 14 and all(v["all"] > 1e6 for v in pop.values()), pop
    for k in sorted(pop):
        print(k, g[k][0], pop[k], round(100 * pop[k]["young"] / pop[k]["all"], 1), round(1000 * pop[k]["owners"] / pop[k]["all"]))
    print(year, uk, sum(v["all"] for v in pop.values()))
    s = to_svg(g)
    print({k: v for k, v in s.items() if k != "regions"}, sum(len(r["d"]) for r in s["regions"]))
