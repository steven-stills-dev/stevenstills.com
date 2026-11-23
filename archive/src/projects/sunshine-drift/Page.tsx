import { useState } from "react";
import { Article, Prose, Section, Wide, Fn, Footnotes } from "../../components/Article";
import Box from "../../components/Box";
import LineChart from "../../components/charts/LineChart";
import Scatter from "../../components/charts/Scatter";
import Heatmap from "../../components/charts/Heatmap";
import Histogram from "../../components/charts/Histogram";
import DataTable from "../../components/charts/DataTable";
import { usePageMeta } from "../../lib/meta";
import data from "./data.json";
import "./sunshine-drift.css";

const NIGHT = "var(--ste-night)", SECONDARY = "var(--ste-secondary)";
const HH = Array.from({ length: 48 }, (_, k) => `${String(Math.floor(k / 2)).padStart(2, "0")}:${k % 2 ? "30" : "00"}`);
const HH_TICKS = [{ i: 0, label: "00:00" }, { i: 12, label: "06:00" }, { i: 24, label: "12:00" }, { i: 36, label: "18:00" }, { i: 47, label: "23:30" }];
const F = data.facts;

type YearKey = "all" | `${number}`;

/** Daily midday error against peak sunshine, with a LOESS line and bootstrap band; also the home preview. */
export function SunshineScatter({ h }: { h?: number }) {
  const [year, setYear] = useState<YearKey>("all");
  const pts = data.scatter.filter((p) => year === "all" || p.year === Number(year)).map((p) => ({ x: p.x, y: p.y }));
  const fit = data.fits[year as keyof typeof data.fits];
  const chips: YearKey[] = ["all", ...data.years.map((y) => `${y}` as YearKey)];
  return (
    <div className="sd-fig">
      <Box title="Midday Forecast Error by Peak Sunshine" sub="%" h={h}>
        <Scatter points={pts} fit={fit} xUnit="W/m²" yUnit="%" yDigits={0} xDomain={[0, 900]} yDomain={[-16, 16]}
          label="Scatter of daily midday forecast error against peak sunshine, with a smoothed line rising from about minus 2.6% on dull days to plus 2.4% on bright days" />
      </Box>
      <div className="sd-chips" role="group" aria-label="Summer">
        {chips.map((c) => (
          <button key={c} aria-pressed={year === c} className={"chip" + (year === c ? " on" : "")} onClick={() => setYear(c)}>
            {c === "all" ? "All summers" : c}
          </button>
        ))}
      </div>
    </div>
  );
}

function BandHeatmap() {
  return (
    <Box title="Forecast Error by Peak Sunshine and Half Hour" sub="%" h={340}>
      <Heatmap rows={data.heat.rows.map((r) => `${r} W/m²`)} cols={HH} values={data.heat.values} unit="%" digits={1}
        diverge mid={0} domain={[-5, 5]} colEvery={12} rowW={118}
        label="Heat map of mean forecast error by sunshine band and half hour, summers 2024 to 2026: blue (too high) on bright afternoons, red (too low) on dull ones" />
    </Box>
  );
}

function SensitivityChart() {
  const t = data.three;
  return (
    <Box title="Error Sensitivity to Sunshine by Summer" sub="% per 100 W/m²" h={360}>
      <LineChart labels={t.map((r) => `${r.year}`)} ticks={t.map((r, i) => ({ i, label: `${r.year}` }))} digits={2} yMin={0} yMax={2.5} yTicks={[0, 0.5, 1, 1.5, 2, 2.5]}
        band={{ top: t.map((r) => r.hi), bottom: t.map((r) => r.lo) }}
        series={[
          { name: "Sunshine that arrived", values: t.map((r) => r.slope), color: NIGHT },
          { name: "Sunshine forecast", values: t.map((r) => ("slope_fc" in r ? (r.slope_fc as number) : null)), color: SECONDARY },
        ]} />
      <div className="legend">
        <span><i style={{ background: NIGHT }} />Sunshine that arrived</span>
        <span><i style={{ background: SECONDARY }} />Sunshine forecast</span>
      </div>
    </Box>
  );
}

function ThreeWayTable() {
  const m = F.matched as Record<string, number[]>;
  const rows = data.three.map((r) => ({
    summer: `${r.year}`, max: r.max_peak, above: r.above_prev ?? "None earlier", bright: r.bright_share, matched: m[`${r.year}`][0], cap: r.cap_gw,
  }));
  return (
    <Box title="Range, Sensitivity and Mix by Summer">
      <DataTable caption="Three tests of sunny-day forecast error by summer" columns={[
        { key: "summer", label: "Summer" },
        { key: "max", label: "Brightest day", unit: "W/m²" },
        { key: "above", label: "Days above earlier max", unit: "%", digits: 1 },
        { key: "bright", label: "Days at 600+", unit: "%", digits: 1 },
        { key: "matched", label: "Error, 600 to 800 days", unit: "%", digits: 2, tint: true },
        { key: "cap", label: "Solar capacity", unit: "GW", digits: 1 },
      ]} rows={rows} />
    </Box>
  );
}

function WindowChart() {
  const [i, setI] = useState(data.windows.indexOf(F.window));
  const w = data.windows[i];
  const r = data.by_window[`${w}` as keyof typeof data.by_window];
  return (
    <div className="sd-fig">
      <label className="slider">
        <span>Calibration window</span>
        <input type="range" min={0} max={data.windows.length - 1} step={1} value={i} onChange={(e) => setI(Number(e.target.value))}
          aria-valuetext={`${w} days`} />
        <b>{w} days</b>
      </label>
      <Box title="Bright-Day Forecast Error by Half Hour" sub="%" h={360}>
        <LineChart labels={HH} ticks={HH_TICKS} unit="%" digits={2} yMin={-2} yMax={5} yTicks={[-2, 0, 2, 4]}
          series={[
            { name: "Before", values: data.raw_profile, color: NIGHT, dash: "5 4" },
            { name: "After", values: r.profile, color: SECONDARY },
          ]} />
        <div className="legend">
          <span><i style={{ background: NIGHT }} />Before</span>
          <span><i style={{ background: SECONDARY }} />After</span>
        </div>
      </Box>
      <p className="sd-readout" aria-live="polite">
        Midday MAPE {F.raw.mape_mid.toFixed(2)}% before, {r.mape_mid.toFixed(2)}% after. Bright-day midday bias {F.raw.bias_bright.toFixed(2)}% before, {r.bias_bright.toFixed(2)}% after.
      </p>
    </div>
  );
}

function ScoreTable() {
  const row = (method: string, test: string, s: { mape: number; mape_mid: number; bias_bright: number; bias_dull: number }) =>
    ({ method, test, mape: s.mape, mid: s.mape_mid, bright: s.bias_bright, dull: s.bias_dull });
  const rows = [
    row("No correction", "None", F.raw),
    row("Constant midday cut", "In sample", F.cut_in),
    row("Constant midday cut", "Out of sample", F.cut_out),
    row("Rolling bias", "Out of sample", F.roll),
    row("Sunshine recalibration", "In sample", F.recal_in),
    row("Sunshine recalibration", "Out of sample", F.recal_out),
  ];
  return (
    <Box title="Corrections Scored In and Out of Sample">
      <DataTable caption="Forecast accuracy for each correction, summers 2025 and 2026" columns={[
        { key: "method", label: "Method" },
        { key: "test", label: "Test" },
        { key: "mape", label: "MAPE", unit: "%", digits: 2 },
        { key: "mid", label: "Midday MAPE", unit: "%", digits: 2 },
        { key: "bright", label: "Bright-day bias", unit: "%", digits: 2, tint: true },
        { key: "dull", label: "Other-day bias", unit: "%", digits: 2, tint: true },
      ]} rows={rows} />
    </Box>
  );
}

function ErrorHistogram() {
  const [view, setView] = useState<"raw" | "recal">("raw");
  return (
    <div className="sd-fig">
      <Box title="Daily Midday Forecast Error" sub="days" h={340}>
        <Histogram bins={data.hist[view]} unit="%" yUnit="days" xTicks={[-16, -8, 0, 8, 16]}
          label="Histogram of daily midday forecast error across summers 2025 and 2026, before or after the sunshine recalibration" />
      </Box>
      <div className="sd-chips" role="group" aria-label="Forecast">
        {(["raw", "recal"] as const).map((v) => (
          <button key={v} aria-pressed={view === v} className={"chip" + (view === v ? " on" : "")} onClick={() => setView(v)}>
            {v === "raw" ? "Before" : "After"}
          </button>
        ))}
      </div>
    </div>
  );
}

const TITLE = "Demand forecast errors on sunny days";

export default function SunshineDrift() {
  const lede = "I tested five and a half years of Britain's public day-ahead demand forecast against the sunshine that arrived and the sunshine that was forecast. It runs about 2.4% high at midday on bright summer days and 2.6% low on dull ones, and I wanted to find out how much of that error a forecaster can correct, and how to correct it without fooling myself.";
  usePageMeta(TITLE, lede);

  return (
    <Article kicker="Writing · forecasting" title={TITLE} lede={lede}>
      <Prose>
        <p>One of my hobbies is photography, which is mostly pattern recognition and balancing the settings to get the right shot, and bright sun changes that balance completely.</p>
        <p>Spotting a pattern is the easy part, and correcting for it without fooling myself is harder, on a demand forecast at least.</p>
        <p>Britain's public day-ahead demand forecast has a lean of its own, running high at midday when the sun is out and low when it isn't, and the lean has grown since 2023. Blame the sunshine.</p>
        <p>So I tested five and a half years of that forecast against the sunshine that arrived and the sunshine that was forecast, to see how much of the error anyone could fix.</p>
      </Prose>

      <Section title="Why would sunshine bias a demand forecast?" />
      <Prose>
        <p>Most of Britain's solar panels sit on roofs and small sites inside the local networks. The system operator, NESO, can't meter them, so their output shows up as lower demand on the national grid during sunny spells.<Fn n={1} /> A forecast of national demand is therefore partly a solar forecast, and NESO's estimate of installed embedded solar rose from 13.7 GW in summer 2021 to 23.6 GW in summer 2026.<Fn n={2} /></p>
        <p>I used NESO's day-ahead national demand forecast, published each morning for the next day, as a stand-in for any demand forecast, because it is public and archived half hour by half hour.<Fn n={3} /> National demand is the whole grid, so none of this describes a supplier's portfolio. I measured error as forecast minus outturn, as a share of outturn, so a positive number means the forecast was too high. The metrics themselves are in <a href="/forecast-error">measuring demand forecast error</a>. For sunshine I took the daily peak of hourly solar radiation, averaged over ten British cities, in watts per square metre (W/m²).<Fn n={4} /></p>
      </Prose>

      <Section title="How does the error change with sunshine?" />
      <Prose>
        <p>The chart shows each summer day's average error between 10:00 and 16:00 against that day's peak sunshine, with a LOESS line (a smooth curve that follows the local average) and its 95% bootstrap band (the range the line moves through when I resample the days). Across {F.n_summer_days.toLocaleString("en-GB")} days from April to September, the forecast ran {F.fit_all_bright}% high at 750 W/m² and {Math.abs(F.fit_all_dull)}% low at 250 W/m², and the chips show each summer on its own.</p>
      </Prose>
      <Wide><SunshineScatter h={420} /></Wide>
      <Prose>
        <p>The heat map splits the same error by half hour for summers 2024 to 2026. Nights are close to zero, while on the brightest days the forecast peaked {F.heat_bright_peak}% high between 13:30 and 14:00, and on the dullest it fell to {Math.abs(F.heat_dull_min)}% low, so the error is a solar shape that flips sign with the weather.</p>
      </Prose>
      <Wide><BandHeatmap /></Wide>

      <Section title="Is it new solar, unusual weather or more bright days?" />
      <Prose>
        <p>A forecast can drift on sunny days for three different reasons, and each needs a different fix, so I tested them in turn. The first is range: if a summer is brighter than anything the forecaster trained on, the model is extrapolating. The table shows that was never the case. No summer had more than 1.1% of its days brighter than the brightest day of every earlier summer, and 2024 to 2026 had none.</p>
        <p>The second is sensitivity, which asks whether the error has grown at the same sunshine, and it has. On days peaking between 600 and 800 W/m², midday error sat between 0.70% and 1.25% in 2021 to 2023 and between 3.06% and 3.36% in 2024 to 2026. Solar capacity grew every year, yet the error stepped up between 2023 and 2024 and then held, so I can't pin the step on capacity alone from public data.</p>
        <p>The third is mix, and here 53% of summer 2026 days peaked above 600 W/m², against 43% in 2023. I split the {F.shift_total} percentage point rise in summer midday bias between those two summers into a mix part and a within-band part (a shift-share split): {F.shift_mix} points came from having more bright days and {F.shift_within} from larger error on days of the same brightness.</p>
      </Prose>
      <Wide><ThreeWayTable /></Wide>
      <Prose>
        <p>There is a catch in judging a forecast against the sunshine that arrived. When a day turns out brighter than the weather forecast said, a demand forecast built on that weather forecast assumed too little solar and runs high, even if the demand model is perfect. So I repeated the test against the sunshine forecast made 48 hours ahead, which a forecaster would already hold and which exists in public archives from March 2024.<Fn n={4} k="b" /> The chart shows the slope of midday error on peak sunshine (the change in error for each extra 100 W/m²) with its 95% bootstrap interval. In 2024 the two slopes were close, but in 2025 the slope fell from 1.51 to 1.11, and in 2026 from 1.42 to 1.01, and in 2025 the share of day-to-day error that sunshine explains (R²) fell from 16% to 9%.</p>
      </Prose>
      <Wide><SensitivityChart /></Wide>
      <Prose>
        <p>I read the gap, about a quarter of the slope, as weather-forecast error: the solar surprise that nobody could know when the demand forecast went out. Only the part that tracks the forecast sunshine is open to correction.</p>
      </Prose>

      <Section title="How do I correct it without overfitting?" />
      <Prose>
        <p>I kept the base forecast fixed and added a second stage, an approach that published work on rooftop solar also takes.<Fn n={5} /> For each half hour I fitted a straight line of recent error against forecast peak sunshine, on a trailing window ending two days before the target day, because yesterday's outturn is incomplete when the forecast goes out. I capped each correction at {F.bound}% and smoothed it across the day with a rolling quadratic fit over seven half hours. Every day was scored only on fits made before it, which is evaluation on a rolling origin.<Fn n={6} /></p>
        <p>The chart shows bright-day error by half hour before and after, over {F.n_score_days} days in summers 2025 and 2026. With a {F.window}-day window the midday hump goes and bright-day bias falls from {F.raw.bias_bright}% to {F.recal_out.bias_bright}%. The slider shows that 14 days is noisy and that anything from 30 to 90 days gives much the same answer.</p>
      </Prose>
      <Wide><WindowChart /></Wide>
      <Prose>
        <p>Sadly, the gain in plain accuracy is small, with midday MAPE (mean absolute percentage error) falling from {F.raw.mape_mid}% to {F.recal_out.mape_mid}%, and a block bootstrap that resamples whole weeks puts the fall between {Math.abs(F.mape_mid_change[2])} and {Math.abs(F.mape_mid_change[1])} percentage points. A rolling bias per half hour with no sunshine term got most of the way, to {F.roll.mape_mid}%; the sunshine term's extra gain over it ({F.recal_vs_roll[0]} percentage points, with an interval running from {F.recal_vs_roll[1]} to {F.recal_vs_roll[2]}) is within noise. Where the sunshine term earns its place is in bias: the rolling bias left bright days {F.roll.bias_bright}% high.</p>
        <p>The table shows why I would not trust a simpler fix. A constant midday cut, set to the summer's own average error, scored {F.cut_in.mape_mid}% in sample. Set from the previous summer, as it would have to be in practice, it scored {F.cut_out.mape_mid}%, left bright days {F.cut_out.bias_bright}% high and pushed other days {Math.abs(F.cut_out.bias_dull)}% low. The recalibration scored better in sample ({F.recal_in.mape_mid}%) and out of sample ({F.recal_out.mape_mid}%).</p>
      </Prose>
      <Wide><ScoreTable /></Wide>
      <Prose>
        <p>The chart shows the daily midday errors before and after. The recalibration moves the centre of the distribution towards zero but barely narrows it, which fits the weather-forecast reading: a correction on forecast sunshine can remove the average lean but not the day-to-day solar surprise.</p>
      </Prose>
      <Wide><ErrorHistogram /></Wide>

      <Section title="What I would do with these figures" />
      <Prose>
        <p>So how much of the sunny-day error can a forecaster correct? Less than it first looks. A photographer works with the light that turned up, but a demand forecaster only ever gets a forecast of it. Against the weather that arrived, the 2025 slope looks about a third larger (1.51 against 1.11), and that gap is error no recalibration can reach. The way not to fool myself turned out to be simple: judge sunny-day error against the sunshine forecast the forecaster had.</p>
        <p>If you are about to change a model because of sunny days, I'd run the three tests first: range, sensitivity at matched sunshine, and mix. Here mix explained {F.shift_mix} of the {F.shift_total} percentage point rise from 2023 to 2026, and no summer was out of range, so retraining for unseen weather would have fixed nothing.</p>
        <p>If I recalibrated, I'd fit per half hour on forecast sunshine over 30 to 45 days, cap and smooth the correction, score it on a rolling origin, and expect it to fix bias rather than accuracy: bright-day bias fell from {F.raw.bias_bright}% to {F.recal_out.bias_bright}% while midday MAPE fell {Math.abs(F.mape_mid_change[0])} percentage points. I wouldn't ship a constant midday cut, because it trades bright-day error for dull-day error. The same window-length and late-outturn choices come up in <a href="/late-actuals">lag features when actuals arrive late</a>.</p>
        <p>Part of the remaining error lives in the sunshine forecast, so that is where I'd spend the next effort, for example by forecasting demand before solar and subtracting a separate solar forecast, which is how Sheffield Solar describes NESO's own virtual demand.<Fn n={7} /> Bright days are also when <a href="/batteries">home batteries</a> charge and when <a href="/heatwave">heatwave</a> demand builds, so that's where I'd point the same test next.</p>
      </Prose>

      <Footnotes notes={[
        <>NESO, <a href="https://www.neso.energy/data-portal/embedded-wind-and-solar-forecasts/embedded_solar_and_wind_forecast_archive_2024" target="_blank" rel="noopener">Embedded Solar and Wind Forecast archive 2024</a>, field description for EMBEDDED_SOLAR_FORECAST: embedded solar farms are invisible to NESO, suppress demand in sunny periods, and their output is estimated from NESO's model.</>,
        <>NESO, <a href="https://www.neso.energy/data-portal/historic-demand-data" target="_blank" rel="noopener">Historic Demand Data</a>, 2021 to 2026 files, field EMBEDDED_SOLAR_CAPACITY (NESO's best view of installed embedded solar). Figures are the April to September mean of each day's value, as downloaded; NESO revises solar capacity and outturn retrospectively.</>,
        <>NESO, <a href="https://www.neso.energy/data-portal/day-ahead-half-hourly-demand-forecast-performance" target="_blank" rel="noopener">Day Ahead Half Hourly Demand Forecast Performance</a>: the day-ahead national demand forecast as published on BMRS, with outturn, for every half hour from 1 April 2021. I used data to 28 October 2026 and dropped clock-change days and any day without 48 half hours. Midday is 10:00 to 16:00 local time; summer is April to September.</>,
        <>Open-Meteo, <a href="https://open-meteo.com/en/docs/historical-weather-api" target="_blank" rel="noopener">Historical Weather API</a> (ERA5 reanalysis blended with ECMWF IFS) for the sunshine that arrived, and <a href="https://open-meteo.com/en/docs/previous-runs-api" target="_blank" rel="noopener">Previous Runs API</a> (the value forecast 48 hours before, so it predates the demand forecast) for the sunshine forecast, available here from 7 March 2024. Hourly shortwave radiation, the mean of the preceding hour, averaged with equal weight over London, Southampton, Bristol, Cardiff, Norwich, Birmingham, Manchester, Leeds, Newcastle and Glasgow; the daily peak is the highest hourly value. Slope intervals resample days.</>,
        <>A. Stratman, T. Hong, M. Yi and D. Zhao, <a href="https://www.osti.gov/biblio/2375798" target="_blank" rel="noopener">Net Load Forecasting With Disaggregated Behind-the-Meter PV Generation</a>, IEEE Transactions on Industry Applications 59(5), 2023: separate load and solar forecasts plus a compensator that corrects from recent errors.</>,
        <>R. J. Hyndman and G. Athanasopoulos, <a href="https://otexts.com/fpp3/tscv.html" target="_blank" rel="noopener">Forecasting: Principles and Practice</a>, 3rd edition, section 5.10. My walk-forward refits every day on data ending two days before it. Bright days are those with a forecast peak of {F.bright} W/m² or more ({F.n_bright_score_days} of the {F.n_score_days}). The rolling bias uses the same window, cap and smoothing with no sunshine term. The block bootstrap resamples seven-day blocks 2,000 times. Code: scripts/sunshine-drift/build.py in this site's repository.</>,
        <>Sheffield Solar, <a href="https://www.solar.sheffield.ac.uk/pvlive" target="_blank" rel="noopener">PV_Live</a>: metered national demand understates consumption because most solar is unmetered, and NESO's virtual demand adds estimated embedded generation back.</>,
      ]} />
    </Article>
  );
}
