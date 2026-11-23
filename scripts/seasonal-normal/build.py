"""Build src/data/seasonal-normal-MM-DD.json: the UK hourly temperature normal for one calendar day, by decade.

Run: uv run scripts/seasonal-normal/build.py [MM-DD]

ERA5 hourly 2 m temperature (Open-Meteo archive, from 1940) at one population centre per UK ITL1 region,
weighted by ONS mid-2024 population (Nomis). Each decade's normal is the mean, hour by hour, of every day
within WINDOW days of the chosen date in that decade. Times are GMT.
"""
import csv
import io
import json
import sys
import time
import urllib.request
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CACHE = Path(__file__).resolve().parent / "cache"
DAY = sys.argv[1] if len(sys.argv) > 1 else "01-15"
OUT = ROOT / f"src/data/seasonal-normal-{DAY}.json"
WINDOW = 7  # days either side of DAY
FIRST, LAST = 1940, 2026

# One population centre per ITL1 region (latitude, longitude), in Nomis order.
POINTS = [(54.98, -1.61), (53.48, -2.24), (53.80, -1.55), (52.95, -1.15), (52.48, -1.89), (52.21, 0.12),
          (51.51, -0.13), (51.45, -0.97), (51.45, -2.59), (51.48, -3.18), (55.86, -4.25), (54.60, -5.93)]
NOMIS = ("https://www.nomisweb.co.uk/api/v01/dataset/NM_2002_1.data.csv?geography=2013265921...2013265932"
         "&date=2024&gender=0&c_age=200&measures=20100&select=geography_code,obs_value")


def get(url, name):
    """Fetch a URL once and cache the body on disk."""
    path = CACHE / name
    if path.exists():
        return path.read_text()
    for attempt in range(8):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "python-urllib"}), timeout=60) as r:
                body = r.read().decode()
            CACHE.mkdir(exist_ok=True)
            path.write_text(body)
            return body
        except Exception as e:  # the archive API has a per-minute quota
            wait = 20 * (attempt + 1)
            print(f"retry {name} in {wait}s: {e}", flush=True)
            time.sleep(wait)
    raise RuntimeError(f"failed: {url}")


def main():
    """Fetch each year's window, weight the regions and average each hour within each decade."""
    pop = [float(r["OBS_VALUE"]) for r in csv.DictReader(io.StringIO(get(NOMIS, "nomis.csv")))]
    assert len(pop) == len(POINTS), pop
    weights = [p / sum(pop) for p in pop]
    lat = ",".join(str(p[0]) for p in POINTS)
    lon = ",".join(str(p[1]) for p in POINTS)
    month, day = map(int, DAY.split("-"))
    sums, counts = defaultdict(lambda: [0.0] * 24), defaultdict(int)
    for year in range(FIRST, LAST + 1):
        mid = date(year, month, day)
        start, end = mid - timedelta(days=WINDOW), mid + timedelta(days=WINDOW)
        if start < date(FIRST, 1, 1) or end > date(2026, 11, 15):
            start, end = max(start, date(FIRST, 1, 1)), min(end, date(2026, 11, 15))
            if start > end:
                continue
        url = (f"https://archive-api.open-meteo.com/v1/archive?latitude={lat}&longitude={lon}&start_date={start}"
               f"&end_date={end}&hourly=temperature_2m&models=era5&timezone=GMT")
        data = json.loads(get(url, f"{DAY}-{year}.json"))
        series = [d["hourly"]["temperature_2m"] for d in data]
        hours = len(series[0])
        assert hours % 24 == 0 and all(len(s) == hours for s in series)
        decade = year // 10 * 10
        for i in range(hours):
            vals = [s[i] for s in series]
            if any(v is None for v in vals):
                continue
            sums[decade][i % 24] += sum(w * v for w, v in zip(weights, vals))
            if i % 24 == 0:
                counts[decade] += 1
        time.sleep(0.4)
    decades = [{"decade": d, "days": counts[d], "temp": [round(v / counts[d], 2) for v in sums[d]]} for d in sorted(sums)]
    for d in decades:
        assert len(d["temp"]) == 24 and -20 < min(d["temp"]) and max(d["temp"]) < 40, d
        print(d["decade"], d["days"], round(sum(d["temp"]) / 24, 2), d["temp"][:3])
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"day": DAY, "window": WINDOW, "unit": "°C", "decades": decades}))


if __name__ == "__main__":
    main()
