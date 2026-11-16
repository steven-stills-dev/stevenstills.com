"""Estimate the electricity a game launch adds to one home and to the GB system, and export chart data.

Run: uv run --python 3.11 --with shapely scripts/gta6/build.py
Demand: Elexon initial national demand outturn (INDO) for Thursday 12 November 2026.
Players by GSP group: PLAYERS shared out by residents aged 18 to 34 times regional console ownership (see geo.py).
The constants below carry their sources; the play loops are assumptions.
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE))
from fetch_cache import get  # noqa: E402
from geo import groups, population, to_svg  # noqa: E402

OUT = HERE.parents[1] / "src" / "projects" / "gta6"
INDO = "https://data.elexon.co.uk/bmrs/api/v1/demand/outturn?settlementDateFrom=2026-11-12&settlementDateTo=2026-11-12&format=json"

PLAYERS = 2_800_000        # UK adults planning to play on launch day (Opinium for Uswitch, November 2026)
PLAN_TO_PLAY = 13_500_000  # UK adults planning to play at some point (same survey)
LEAVE = 0.17               # share planning or considering annual leave (OnePoll for Uswitch, September 2026)
CONSOLE_W, TV_W = 200, 100 # watts while playing: PS5 197 to 219 W (Sony), Series X 154 W (Microsoft); the TV is a round allowance
TDCV_KWH = 2500            # Ofgem typical domestic electricity use from 1 July 2026, kWh a year
UNIT_P = 26.32             # price cap electricity unit rate, 1 October to 31 December 2026, p/kWh
LOOP = 6                   # one play loop: three hours, in half hours
STAGGER = 4                # loop starts spread evenly over two hours
DAY_OFF = [18, 26, 38]     # loop starts for a player on leave: 09:00, 13:00, 19:00
AFTER_WORK = [38]          # loop start for everyone else: 19:00


def online(starts, stagger=STAGGER):
    """Return the share of a group playing in each of 48 half hours, starts spread over `stagger` slots."""
    share = [0.0] * 48
    for s in starts:
        for k in range(stagger):
            for t in range(s + k, min(s + k + LOOP, 48)):
                share[t] += 1 / stagger
    return share


def base_day():
    """Return a typical home's use in kWh per half hour: a floor, a morning bump and a larger evening one."""
    from math import exp
    hours = [(t + 0.5) / 2 for t in range(48)]
    dist = lambda h, c: min(abs(h - c), 24 - abs(h - c))
    shape = [(0.35 + exp(-0.5 * (dist(h, 7.5) / 1.2) ** 2) + 1.7 * exp(-0.5 * (dist(h, 18.5) / 2.0) ** 2))
             * (0.55 if h < 6 else 1) for h in hours]
    return [v / sum(shape) * TDCV_KWH / 365 for v in shape]


def main():
    watts = CONSOLE_W + TV_W
    rows = sorted(json.loads(get(INDO))["data"], key=lambda r: r["settlementPeriod"])
    before = [r["initialDemandOutturn"] for r in rows]                      # MW
    assert len(before) == 48
    off, work = online(DAY_OFF), online(AFTER_WORK)
    playing = [PLAYERS * (LEAVE * a + (1 - LEAVE) * b) for a, b in zip(off, work)]
    added = [p * watts / 1e6 for p in playing]                              # MW
    assert abs(max(added) - PLAYERS * watts / 1e6) < 1e-6                   # everyone is on at the evening peak

    home = base_day()
    home_after = [h + a * watts / 2000 for h, a in zip(home, online(DAY_OFF, 1))]
    assert abs(sum(home) - TDCV_KWH / 365) < 1e-9

    geo = groups()
    pop, uk, year = population(geo)
    gb_owners = sum(v["owners"] for v in pop.values())
    gb_players = PLAYERS * gb_owners / uk["owners"]
    table = []
    for k in sorted(pop):
        n = gb_players * pop[k]["owners"] / gb_owners
        table.append({"key": k, "name": geo[k][0], "young": round(100 * pop[k]["young"] / pop[k]["all"], 1),
                      "players": round(n / 1000), "per1000": round(1000 * n / pop[k]["all"], 1),
                      "mw": round(n * watts / 1e6, 1)})
    assert abs(sum(r["mw"] for r in table) - gb_players * watts / 1e6) < 1
    by = lambda key: sorted(table, key=lambda r: r[key])
    eve = max(range(48), key=lambda t: added[t])
    noon = max(range(18, 34), key=lambda t: added[t] / before[t])
    peak_i = max(range(48), key=lambda t: before[t])
    hhmm = lambda t: f"{t // 2:02d}:{'30' if t % 2 else '00'}"
    day_kwh = watts * 3 * len(DAY_OFF) / 1000
    others = [r["young"] for r in table if r["key"] != "_C"]

    facts = {
        "players": PLAYERS, "plan_to_play": PLAN_TO_PLAY, "leave_pct": round(100 * LEAVE), "leave_players": round(PLAYERS * LEAVE / 1000) * 1000,
        "console_w": CONSOLE_W, "tv_w": TV_W, "watts": watts, "loop_kwh": round(watts * 3 / 1000, 1), "day_kwh": round(day_kwh, 1),
        "home_kwh": round(sum(home), 1), "home_after_kwh": round(sum(home_after), 1),
        "home_uplift_pct": round(100 * (sum(home_after) / sum(home) - 1)),
        "slot_kwh": watts / 2000, "cost_p": round(day_kwh * UNIT_P), "unit_p": UNIT_P, "tdcv_kwh": TDCV_KWH,
        "peak_gw": round(max(before) / 1000, 1), "peak_time": hhmm(peak_i),
        "added_peak_mw": round(max(added)), "added_peak_time": hhmm(eve), "eve_gw": round(before[eve] / 1000, 1),
        "added_peak_pct": round(100 * max(added) / before[eve], 1),
        "added_day_mw": round(added[noon]), "added_day_pct": round(100 * added[noon] / before[noon], 1),
        "added_gwh": round(sum(added) / 2 / 1000, 1), "day_gwh": round(sum(before) / 2 / 1000),
        "added_energy_pct": round(100 * sum(added) / sum(before), 1),
        "all_mw": round(PLAN_TO_PLAY * watts / 1e6),
        "pop_year": int(year), "gb_players": round(gb_players / 1000) * 1000,
        "top": by("per1000")[-1], "second": by("per1000")[-2], "low": by("per1000")[0], "biggest": by("mw")[-1],
        "others_young": [min(others), max(others)],
    }
    data = {"facts": facts, "before": [round(v / 1000, 2) for v in before],
            "after": [round((b + a) / 1000, 2) for b, a in zip(before, added)],
            "home": [round(v, 3) for v in home], "home_after": [round(v, 3) for v in home_after], "table": table}
    (OUT / "data.json").write_text(json.dumps(data, indent=1) + "\n")
    (OUT / "gsp-geo.ts").write_text(
        "/**\n * The 14 GSP groups (distribution licence areas) of Great Britain as SVG paths, one unit per kilometre.\n"
        " * Generated by scripts/gta6/build.py from NESO's GIS Boundaries for GB DNO Licence Areas (3 May 2024).\n"
        " * Supported by National Energy SO Open Data.\n */\n"
        'import type { UKGeo } from "../../components/maps/uk-geo";\n\n'
        f"export const GSP_GEO: UKGeo = {json.dumps(to_svg(geo))};\n")
    print(json.dumps(facts, indent=1))


if __name__ == "__main__":
    main()
