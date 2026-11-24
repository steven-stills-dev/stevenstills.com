import winter from "./data/seasonal-normal-01-15.json";
import summer from "./data/seasonal-normal-07-15.json";

/** A line or bar figure small enough to draw on a card. */
export type Figure =
  | { kind: "lines"; unit: string; x: string[]; series: { name: string; values: (number | null)[]; tone?: "cool" | "warm" | "now" }[]; zero?: boolean }
  | { kind: "bars"; unit: string; items: { label: string; value: number }[]; mark?: number };

/** One daily insight: the question, a sentence or two, a figure and its source. Nothing else goes on a card. */
export interface Insight {
  slug: string;
  /** ISO date the insight is filed under */
  date: string;
  /** the question answered or the insight given, in Steven's words; the only text on the card's cover */
  title: string;
  /** the insight in one or two sentences, shown once the card is open */
  line: string;
  source: { label: string; url: string };
  figure: Figure;
  /** the figure in words, for screen readers */
  alt: string;
}

const hours = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`);
type Tone = "cool" | "warm" | "now";
/** One line per decade; the coldest, the warmest and the current decade carry the chart and the rest sit behind them. */
const decades = (d: typeof winter, tone: Record<number, Tone>) => d.decades.map((x) => ({ name: `${x.decade}s`, values: x.temp, tone: tone[x.decade] }));
const range = (n: number, f: (i: number) => string) => Array.from({ length: n }, (_, i) => f(i));

// Daily tanker transits through the Strait of Hormuz, 1 February to 16 April 2026 (IMF PortWatch).
const TRANSITS = [19, 41, 33, 20, 36, 34, 40, 32, 33, 39, 49, 32, 54, 53, 42, 35, 40, 54, 63, 55, 53, 69, 65, 49, 59, 45, 37, 36, 5, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 0, 0, 0, 2, 0, 1, 0, 0, 2, 0, 0, 2, 1, 2, 0, 0, 1, 2, 3, 2, 1, 0, 2, 3, 4, 0, 2, 0, 5, 0, 3, 3, 4, 3, 4, 1];
const dayOf = (i: number) => new Date(Date.UTC(2026, 1, 1 + i)).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

// Monthly group correction factor, October 2024 to October 2026 (Elexon).
const GCF = [1.0399, 1.0086, 1.0371, 1.0304, 1.0309, 1.0264, 0.9851, 0.9706, 0.9847, 0.9804, 0.9854, 0.9861, 1.0109, 1.0087, 1.0262, 1.0181, 1.0137, 1.0069, 0.9889, 0.978, 0.965, 0.9196, 0.8956, 0.8941, 0.8463];
const monthOf = (i: number) => new Date(Date.UTC(2024, 9 + i, 1)).toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" });

export const INSIGHTS: Insight[] = [
  {
    slug: "gas-weather-shortfall",
    date: "2026-11-25",
    title: "Seasonal normal weather in gas demand allocation",
    line: "By my estimate the weather running warmer than the seasonal normal accounted for some 19 TWh of the 64 TWh shortfall in 2024/25, about £630m of gas at that year's average price.",
    source: { label: "National Gas data portal: LDZ offtake against seasonal normal demand, gas year 2024/25", url: "https://data.nationalgas.com/find-gas-data" },
    figure: { kind: "bars", unit: "TWh", mark: 0, items: [{ label: "Warmer weather", value: 19 }, { label: "Everything else", value: 45 }] },
    alt: "Two bars splitting the 64 TWh by which gas demand fell short of the seasonal normal forecast in 2024/25: 19 TWh from weather warmer than normal and 45 TWh from everything else.",
  },
  {
    slug: "tv-pickups",
    date: "2026-11-24",
    title: "Television has had bigger days of impact on the grid",
    line: "The biggest TV pickup on NESO's list is 2,800 MW, after a missed penalty in England's 1990 World Cup semi-final. Half-time in the Euro 2024 final was 1,300 MW and the 1966 final 600 MW.",
    source: { label: "NESO, record electricity demand during the FIFA World Cup, 8 June 2026", url: "https://www.neso.energy/news/neso-ready-record-electricity-demand-during-biggest-ever-fifa-world-cup" },
    figure: { kind: "bars", unit: "MW", mark: 1, items: [{ label: "1966 final", value: 600 }, { label: "1990 semi-final", value: 2800 }, { label: "Euro 2024 final", value: 1300 }] },
    alt: "Three bars of the surge in electricity demand after football matches on television: 600 MW after the 1966 World Cup final, 2,800 MW after the 1990 World Cup semi-final and 1,300 MW at half-time in the Euro 2024 final.",
  },
  {
    slug: "seasonal-normal-by-decade",
    date: "2026-11-23",
    title: "Why your seasonal normal weather forecast models are way out of date, in winter",
    line: "The UK's normal temperature for the middle of January was 2.8 °C across the 1940s and 6.0 °C across the 2000s, and the 2020s so far sit at 4.6 °C, so a seasonal normal depends heavily on which years it was built from.",
    source: { label: "ERA5 via Open-Meteo: 8 to 22 January, 12 UK cities, 2020s to 2026", url: "https://open-meteo.com/en/docs/historical-weather-api" },
    figure: { kind: "lines", unit: "°C", x: hours, series: decades(winter, { 1940: "cool", 2000: "warm", 2020: "now" }) },
    alt: "Nine lines, one per decade from the 1940s to the 2020s, showing temperature through the day. Every decade is coldest around 07:00 and warmest at 14:00. The 1940s and 1960s are the lowest lines, the 1990s and 2000s the highest, and the 2020s sit between them.",
  },
  {
    slug: "summer-normal-by-decade",
    date: "2026-11-22",
    title: "Why your seasonal normal weather forecast models are way out of date, in summer",
    line: "The UK's normal temperature for the middle of July was 15.5\u00a0°C across the 1960s and 18.3\u00a0°C across the 2020s so far, and every decade since the 1960s has been warmer than the one before it except the 2000s.",
    source: { label: "ERA5 via Open-Meteo: 8 to 22 July, 12 UK cities, 2020s to 2026", url: "https://open-meteo.com/en/docs/historical-weather-api" },
    figure: { kind: "lines", unit: "°C", x: hours, series: decades(summer, { 1960: "cool", 2020: "warm" }) },
    alt: "Nine lines, one per decade from the 1940s to the 2020s, showing temperature through the day. Every decade is coldest at 04:00 and warmest around 15:00. The 1960s are the lowest line and the 2020s the highest.",
  },
  {
    slug: "hormuz-tanker-transits",
    date: "2026-11-21",
    title: "Tracking ships in the Strait of Hormuz",
    line: "The count of tankers passing through the strait ran at between 19 and 69 a day through February, fell to 5 on the first of March, and stayed at 5 or fewer for the seven weeks to mid-April.",
    source: { label: "IMF PortWatch, Daily Chokepoints Data", url: "https://portwatch.imf.org/" },
    figure: { kind: "lines", unit: "tankers", x: range(TRANSITS.length, dayOf), zero: true, series: [{ name: "Tanker transits", values: TRANSITS }] },
    alt: "A line of daily tanker transits from 1 February to 16 April 2026. It moves between 19 and 69 through February, drops to 5 on 1 March and stays at 5 or below.",
  },
  {
    slug: "eclipse-solar-output",
    date: "2026-11-20",
    title: "What the solar eclipse did to the power grid",
    line: "In the half hour from 18:00 on 12 August Britain's solar panels were producing 3,809 MW, and in the half hour from 19:00, with the eclipse at its deepest, they were producing 140 MW.",
    source: { label: "Sheffield Solar, PV_Live", url: "https://www.solar.sheffield.ac.uk/pvlive/" },
    figure: { kind: "lines", unit: "MW", x: ["15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00"], zero: true, series: [{ name: "Solar output", values: [11990, 10970, 9810, 8420, 6810, 5240, 3809, 1470, 140, 340, 80, 0, 0] }] },
    alt: "A line of Britain's solar output in half hours from 15:00 to 21:00 on 12 August 2026. It falls steadily from about 12,000 MW, then drops from about 3,800 MW at 18:00 to 140 MW at 19:00.",
  },
  {
    slug: "group-correction-factor",
    date: "2026-11-19",
    title: "What's going on with Group Correction Factors",
    line: "The group correction factor, the multiplier that makes metered electricity add up to what the grid supplied, came in at 0.846 for October 2026 against 1.040 in October 2024.",
    source: { label: "Elexon, GSP Group Correction Factors", url: "https://www.elexon.co.uk/bsc/data/trading-operations-report/gsp-group-correction-factors-data-trading-operations-report/" },
    figure: { kind: "lines", unit: "factor", x: range(GCF.length, monthOf), series: [{ name: "Group correction factor", values: GCF }] },
    alt: "A line of the monthly group correction factor from October 2024 to October 2026. It sits between 0.97 and 1.04 until spring 2026, then falls each month to 0.846 in October 2026.",
  },
  {
    slug: "forecast-error-by-grain",
    date: "2026-11-18",
    title: "Measuring demand forecast error",
    line: "The same day-ahead demand forecast scores a weighted error of 2.42% when it is judged every half hour, 1.55% by the day, 0.79% by the week and 0.42% by the month, because adding the half hours up lets the errors cancel.",
    source: { label: "Elexon Insights, day-ahead demand forecast history", url: "https://bmrs.elexon.co.uk/api-documentation/endpoint/forecast/demand/day-ahead/history" },
    figure: { kind: "bars", unit: "%", mark: 0, items: [{ label: "Half hour", value: 2.42 }, { label: "Day", value: 1.55 }, { label: "Week", value: 0.79 }, { label: "Month", value: 0.42 }] },
    alt: "Four bars of weighted forecast error: 2.42% half-hourly, 1.55% daily, 0.79% weekly and 0.42% monthly.",
  },
  {
    slug: "summer-night-prices",
    date: "2026-11-17",
    title: "Electricity supply profile changes in MHHS",
    line: "In summer 2021 the night was the cheapest part of the day, at £80.70 per MWh between midnight and 07:00 against £98.50 from 11:00 to 15:00, and by summer 2025 the early afternoon averaged £52.90 against £68.30 overnight.",
    source: { label: "Elexon Insights, market index data", url: "https://data.elexon.co.uk/bmrs/api/v1" },
    figure: { kind: "bars", unit: "£/MWh", mark: 3, items: [{ label: "Night 2021", value: 80.7 }, { label: "Afternoon 2021", value: 98.5 }, { label: "Night 2025", value: 68.3 }, { label: "Afternoon 2025", value: 52.9 }] },
    alt: "Four bars of average summer power price. In 2021 the night was £80.70 and the early afternoon £98.50. In 2025 the night was £68.30 and the early afternoon £52.90.",
  },
];
