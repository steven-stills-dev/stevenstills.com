"""Fetch the public series behind the forecast-error article into the shared cache.

Elexon Insights: day-ahead national demand forecast (NDF) as published at about
11:45 UTC the day before delivery, and initial national demand outturn (INDO).
NESO data portal: historic demand data (ND), the later revised outturn.
"""
import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fetch_cache import get  # noqa: E402

BASE = "https://data.elexon.co.uk/bmrs/api/v1"
START, END = date(2024, 1, 1), date(2025, 12, 31)
NESO = {
    2024: "https://api.neso.energy/dataset/8f2fe0af-871c-488d-8bad-960426f24601/resource/f6d02c0f-957b-48cb-82ee-09003f2ba759/download/demanddata_2024.csv",
    2025: "https://api.neso.energy/dataset/8f2fe0af-871c-488d-8bad-960426f24601/resource/b2bde559-3455-4021-b179-dfe60c0337b0/download/demanddata_2025.csv",
}


def days(a=START, b=END):
    """Yield every date from a to b inclusive."""
    d = a
    while d <= b:
        yield d
        d += timedelta(days=1)


def ndf_url(d):
    """Return the NDF history URL for the forecast published before 12:00 UTC on the day before d."""
    return f"{BASE}/forecast/demand/day-ahead/history?publishTime={d - timedelta(days=1)}T12:00Z&format=json"


def indo_urls():
    """Yield INDO URLs in 7-day chunks."""
    d = START
    while d <= END:
        e = min(d + timedelta(days=6), END)
        yield f"{BASE}/demand/outturn?settlementDateFrom={d}&settlementDateTo={e}&format=json"
        d = e + timedelta(days=1)


if __name__ == "__main__":
    for y, u in NESO.items():
        get(u)
    for u in indo_urls():
        get(u)
    for i, d in enumerate(days()):
        get(ndf_url(d))
        if i % 100 == 0:
            print(d, flush=True)
    print("done")
