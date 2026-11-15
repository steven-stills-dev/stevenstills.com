# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Build the daily GB demand, imbalance price and heatwave table for 1 May to 31 July 2026.

Run: uv run scripts/heatwave/build.py

Sources (all public, no key):
  - Open-Meteo archive API, daily maximum 2 m temperature at ten cities.
  - Elexon Insights API, system prices (DISEBSP) per settlement period.
  - Elexon Insights API, initial national demand outturn (INDO) per settlement period.
  - NESO Historic Demand Data 2026, embedded solar and wind generation estimates per settlement period.

Writes to public/data/heatwave/:
  - city_tmax.csv             daily maximum temperature per city, °C
  - demand_price_daily.csv    one row per settlement date
  - demand_price_summary.json each hot spell against its trend and day-type baseline
"""

from __future__ import annotations

import csv
import io
import json
import time
import urllib.parse
import urllib.request
from datetime import date, timedelta
from pathlib import Path
from statistics import linear_regression, mean, stdev

OUT = Path(__file__).resolve().parents[2] / "public" / "data" / "heatwave"
START, END = date(2026, 5, 1), date(2026, 7, 31)
ELEXON = "https://data.elexon.co.uk/bmrs/api/v1"
OPEN_METEO = "https://archive-api.open-meteo.com/v1/archive"
NESO = "https://api.neso.energy/dataset/8f2fe0af-871c-488d-8bad-960426f24601/resource/8a4a771c-3929-4e56-93ad-cdf13219dea5/download/demanddataupdate_2026.csv"
AGENT = "heatwave-build/1.0"

# Met Office heatwave definition: at least three consecutive days at or above the
# county threshold, which runs from 25 to 28°C. 28°C is the highest county value,
# so a run that passes it qualifies in any county.
THRESHOLD_C, MIN_RUN = 28.0, 3
CITIES = {
    "London": (51.51, -0.13), "Cambridge": (52.21, 0.12), "Birmingham": (52.48, -1.90),
    "Bristol": (51.45, -2.59), "Manchester": (53.48, -2.24), "Cardiff": (51.48, -3.18),
    "Southampton": (50.91, -1.40), "Norwich": (52.63, 1.30), "Leeds": (53.80, -1.55),
    "Nottingham": (52.95, -1.15),
}
# England and Wales bank holidays in the window (gov.uk/bank-holidays.json), counted as weekend days.
BANK_HOLIDAYS = {date(2026, 5, 4), date(2026, 5, 25)}
HIGH_PRICE = 150.0   # £/MWh
PRICE_MARGIN = 0.10  # timing test: daily mean price at least 10% above its baseline

DAYS = [START + timedelta(n) for n in range((END - START).days + 1)]


def get(url: str, parse=json.load) -> object:
    """Fetch a URL and parse the body, retrying on failure."""
    for attempt in range(5):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": AGENT})
            with urllib.request.urlopen(req, timeout=60) as res:
                return parse(res)
        except Exception:
            if attempt == 4:
                raise
            time.sleep(3 * (attempt + 1))
    raise AssertionError("unreachable")


def fetch_tmax() -> dict[str, list[float]]:
    """Fetch the daily maximum temperature for each city."""
    query = urllib.parse.urlencode({
        "latitude": ",".join(str(lat) for lat, _ in CITIES.values()),
        "longitude": ",".join(str(lon) for _, lon in CITIES.values()),
        "start_date": START.isoformat(), "end_date": END.isoformat(),
        "daily": "temperature_2m_max", "timezone": "Europe/London",
    })
    body = get(f"{OPEN_METEO}?{query}")
    out = {}
    for city, loc in zip(CITIES, body):
        assert loc["daily"]["time"] == [d.isoformat() for d in DAYS], city
        out[city] = loc["daily"]["temperature_2m_max"]
        assert all(v is not None for v in out[city]), f"missing temperature for {city}"
    return out


def find_heatwaves(tmax: dict[str, list[float]]) -> list[list[date]]:
    """Group the days on which any city sits in a qualifying run into hot spells."""
    hot = set()
    for series in tmax.values():
        run = []
        for i, v in enumerate(series + [float("-inf")]):
            if v >= THRESHOLD_C:
                run.append(i)
                continue
            if len(run) >= MIN_RUN:
                hot.update(run)
            run = []
    spells: list[list[date]] = []
    for i in sorted(hot):
        if spells and DAYS[i] - spells[-1][-1] == timedelta(1):
            spells[-1].append(DAYS[i])
        else:
            spells.append([DAYS[i]])
    return spells


def fetch_prices() -> dict[date, list[float]]:
    """Fetch the system price for every settlement period of every day."""
    out = {}
    for d in DAYS:
        rows = get(f"{ELEXON}/balancing/settlement/system-prices/{d.isoformat()}?format=json")["data"]
        by_period = {r["settlementPeriod"]: r for r in rows}
        assert sorted(by_period) == list(range(1, 49)), f"{d}: {len(by_period)} price periods"
        assert all(r["systemSellPrice"] == r["systemBuyPrice"] for r in rows), f"{d}: buy and sell prices differ"
        out[d] = [by_period[p]["systemSellPrice"] for p in range(1, 49)]
    return out


def fetch_demand() -> dict[date, list[float]]:
    """Fetch the initial national demand outturn for every settlement period of every day."""
    out: dict[date, dict[int, float]] = {d: {} for d in DAYS}
    for i in range(0, len(DAYS), 28):  # the endpoint allows 28 days a call
        a, b = DAYS[i], DAYS[min(i + 27, len(DAYS) - 1)]
        rows = get(f"{ELEXON}/demand/outturn?settlementDateFrom={a}&settlementDateTo={b}&format=json")["data"]
        for r in rows:
            out[date.fromisoformat(r["settlementDate"])][r["settlementPeriod"]] = r["initialDemandOutturn"]
    for d, periods in out.items():
        assert sorted(periods) == list(range(1, 49)), f"{d}: {len(periods)} demand periods"
    return {d: [periods[p] for p in range(1, 49)] for d, periods in out.items()}


def fetch_embedded() -> dict[date, tuple[float, float]]:
    """Fetch the daily mean embedded solar and embedded wind generation estimates, in MW."""
    text = get(NESO, lambda res: res.read().decode())
    periods: dict[date, list[tuple[float, float]]] = {d: [] for d in DAYS}
    for r in csv.DictReader(io.StringIO(text)):
        d = date.fromisoformat(r["SETTLEMENT_DATE"][:10])
        if d in periods:
            periods[d].append((float(r["EMBEDDED_SOLAR_GENERATION"]), float(r["EMBEDDED_WIND_GENERATION"])))
    for d, p in periods.items():
        assert len(p) == 48, f"{d}: {len(p)} embedded generation periods"
    return {d: (mean(s for s, _ in p), mean(w for _, w in p)) for d, p in periods.items()}


def day_type(d: date) -> str:
    """Return weekend for Saturdays, Sundays and bank holidays, weekday otherwise."""
    return "weekend" if d.weekday() >= 5 or d in BANK_HOLIDAYS else "weekday"


def pct(value: float, base: float) -> float:
    """Return the percentage difference of a value from its baseline."""
    return 100 * (value / base - 1)


KEYS = ("demand_mw", "price_mean", "periods_over", "solar_mw", "underlying_mw")


def fit_baseline(cold: list[dict]) -> dict[str, dict]:
    """Fit each quantity on the non-heatwave days as one straight line through the window with a level per day type."""
    kinds = {kind: [r for r in cold if r["day_type"] == kind] for kind in ("weekday", "weekend")}
    mid = {kind: mean(r["t"] for r in sel) for kind, sel in kinds.items()}
    fit = {}
    for k in KEYS:
        level = {kind: mean(r[k] for r in sel) for kind, sel in kinds.items()}
        # one slope for both day types: regress each quantity on the day number after removing the day-type means
        slope = linear_regression([r["t"] - mid[r["day_type"]] for r in cold], [r[k] - level[r["day_type"]] for r in cold]).slope
        fit[k] = {"slope": slope, "level": level, "mid": mid}
    return fit


def expected(r: dict, k: str, fit: dict[str, dict]) -> float:
    """Return the baseline value of a quantity for one day's date and day type."""
    f = fit[k]
    return f["level"][r["day_type"]] + f["slope"] * (r["t"] - f["mid"][r["day_type"]])


def summarise(rows: list[dict], fit: dict[str, dict]) -> dict:
    """Compare a set of days with the baseline for each day's own date and day type."""
    expect = {k: mean(expected(r, k, fit) for r in rows) for k in KEYS}
    demand, price = mean(r["demand_mw"] for r in rows), mean(r["price_mean"] for r in rows)
    solar, underlying = mean(r["solar_mw"] for r in rows), mean(r["underlying_mw"] for r in rows)
    return {
        "days": len(rows),
        "demand_mw": round(demand), "demand_gwh_day": round(demand * 24 / 1000, 1),
        "demand_baseline_mw": round(expect["demand_mw"]), "demand_baseline_gwh_day": round(expect["demand_mw"] * 24 / 1000, 1),
        "demand_pct": round(pct(demand, expect["demand_mw"]), 1),
        "price_mean": round(price, 2), "price_max": round(max(r["price_max"] for r in rows), 2),
        "price_baseline": round(expect["price_mean"], 2), "price_pct": round(pct(price, expect["price_mean"]), 1),
        "periods_over_per_day": round(mean(r["periods_over"] for r in rows), 2),
        "periods_over_total": sum(r["periods_over"] for r in rows),
        "periods_over_baseline_per_day": round(expect["periods_over"], 2),
        "embedded_solar_mw": round(solar), "embedded_solar_baseline_mw": round(expect["solar_mw"]),
        "embedded_solar_pct": round(pct(solar, expect["solar_mw"]), 1),
        "demand_plus_embedded_mw": round(underlying), "demand_plus_embedded_baseline_mw": round(expect["underlying_mw"]),
        "demand_plus_embedded_pct": round(pct(underlying, expect["underlying_mw"]), 1),
    }


def main() -> None:
    """Fetch the three sources, write the daily table and print each hot spell against baseline."""
    OUT.mkdir(parents=True, exist_ok=True)
    tmax = fetch_tmax()
    spells = find_heatwaves(tmax)
    number = {d: n for n, spell in enumerate(spells, 1) for d in spell}
    prices, demand, embedded = fetch_prices(), fetch_demand(), fetch_embedded()

    with open(OUT / "city_tmax.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["date", *CITIES])
        for i, d in enumerate(DAYS):
            w.writerow([d, *(tmax[c][i] for c in CITIES)])

    rows = []
    for d in DAYS:
        rows.append({
            "date": d.isoformat(), "t": (d - START).days, "day_type": day_type(d), "heatwave": number.get(d, 0),
            "demand_mw": mean(demand[d]), "energy_gwh": sum(demand[d]) * 0.5 / 1000,
            "price_mean": mean(prices[d]), "price_max": max(prices[d]),
            "periods_over": sum(p > HIGH_PRICE for p in prices[d]),
            "solar_mw": embedded[d][0], "wind_mw": embedded[d][1],
            "underlying_mw": mean(demand[d]) + sum(embedded[d]),
        })
    for r in rows:  # 48 half-hours: daily energy in GWh is mean MW times 24 hours
        assert abs(r["energy_gwh"] - r["demand_mw"] * 24 / 1000) < 1e-6
    with open(OUT / "demand_price_daily.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["date", "day_type", "heatwave", "demand_mw", "energy_gwh", "price_mean_gbp_mwh", "price_max_gbp_mwh", f"periods_over_{HIGH_PRICE:.0f}",
                    "embedded_solar_mw", "embedded_wind_mw"])
        for r in rows:
            w.writerow([r["date"], r["day_type"], r["heatwave"], round(r["demand_mw"]), round(r["energy_gwh"], 1),
                        round(r["price_mean"], 2), round(r["price_max"], 2), r["periods_over"],
                        round(r["solar_mw"]), round(r["wind_mw"])])

    cold = [r for r in rows if not r["heatwave"]]
    fit = fit_baseline(cold)
    for k in KEYS:  # self-check: the fitted baseline averages to the baseline days' own mean
        assert abs(mean(expected(r, k, fit) for r in cold) - mean(r[k] for r in cold)) < 1e-6, k
    base = {}
    for kind in ("weekday", "weekend"):
        sel = [r for r in cold if r["day_type"] == kind]
        base[kind] = {k: mean(r[k] for r in sel) for k in KEYS}
        base[kind]["days"] = len(sel)
        base[kind]["price_max"] = max(r["price_max"] for r in sel)
        base[kind]["demand_sd_mw"] = stdev(r["demand_mw"] - expected(r, "demand_mw", fit) for r in sel)  # day-to-day spread about the baseline
        base[kind]["price_sd"] = stdev(r["price_mean"] - expected(r, "price_mean", fit) for r in sel)

    summary = {
        "window": [START.isoformat(), END.isoformat()],
        "heatwave_rule": f">= {THRESHOLD_C}°C daily maximum for >= {MIN_RUN} consecutive days at any of {len(CITIES)} cities",
        "high_price_gbp_mwh": HIGH_PRICE,
        "baseline": {k: {m: round(v, 2) for m, v in b.items()} for k, b in base.items()},
        "baseline_slope_per_day": {k: round(fit[k]["slope"], 3) for k in KEYS},
        "heatwaves": [],
    }
    for n, spell in enumerate(spells, 1):
        sel = [r for r in rows if r["heatwave"] == n]
        first_price = next((i for i, r in enumerate(sel, 1) if r["price_mean"] >= expected(r, "price_mean", fit) * (1 + PRICE_MARGIN)), None)
        summary["heatwaves"].append({
            "n": n, "start": spell[0].isoformat(), "end": spell[-1].isoformat(), **summarise(sel, fit),
            "days_price_10pct_above": sum(r["price_mean"] >= expected(r, "price_mean", fit) * (1 + PRICE_MARGIN) for r in sel),
            "first_day_price_10pct_above": first_price,
            "daily_pct": [{"date": r["date"], "demand": round(pct(r["demand_mw"], expected(r, "demand_mw", fit)), 1),
                           "price": round(pct(r["price_mean"], expected(r, "price_mean", fit)), 1),
                           "demand_plus_embedded": round(pct(r["underlying_mw"], expected(r, "underlying_mw", fit)), 1)} for r in sel],
        })
    hot = [r for r in rows if r["heatwave"]]
    summary["all_heatwave_days"] = summarise(hot, fit)
    spike = max(hot, key=lambda r: r["price_max"])
    summary["all_heatwave_days_without_highest_price_day"] = {"dropped": spike["date"], **summarise([r for r in hot if r is not spike], fit)}
    peak = max(DAYS, key=lambda d: max(prices[d]))
    clock = lambda period: f"{(period - 1) // 2:02d}:{(period - 1) % 2 * 30:02d}"  # local start time of a settlement period
    summary["highest_price"] = {
        "date": peak.isoformat(), "period": prices[peak].index(max(prices[peak])) + 1,
        "starts_local": clock(prices[peak].index(max(prices[peak])) + 1), "price": max(prices[peak]),
        "periods_over_450": {clock(n): p for n, p in enumerate(prices[peak], 1) if p > 450},
    }
    above = lambda sel: sum(r["price_mean"] >= expected(r, "price_mean", fit) * (1 + PRICE_MARGIN) for r in sel)
    summary["days_price_10pct_above"] = {"heatwave": [above(hot), len(hot)], "baseline": [above(cold), len(cold)]}
    # self-check: heatwave and baseline days partition the window
    assert summary["all_heatwave_days"]["days"] + sum(b["days"] for b in base.values()) == len(DAYS) == 92
    (OUT / "demand_price_summary.json").write_text(json.dumps(summary, indent=1) + "\n")
    print(json.dumps(summary, indent=1))


if __name__ == "__main__":
    main()
