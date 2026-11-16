import { useState } from "react";
import { Article, Prose, Section, Wide, Fn, Footnotes, StatRow } from "../../components/Article";
import Box from "../../components/Box";
import LineChart from "../../components/charts/LineChart";
import GroupedBars from "../../components/charts/GroupedBars";
import Histogram from "../../components/charts/Histogram";
import Scatter from "../../components/charts/Scatter";
import Heatmap from "../../components/charts/Heatmap";
import DataTable from "../../components/charts/DataTable";
import { MON } from "../../lib/format";
import { usePageMeta } from "../../lib/meta";
import data from "./data.json";
import "./forecast-error.css";

const f = data.facts;
const NIGHT = "var(--ste-night)", SECONDARY = "var(--ste-secondary)";
const HH = Array.from({ length: 48 }, (_, k) => `${String(Math.floor(k / 2)).padStart(2, "0")}:${k % 2 ? "30" : "00"}`);
const HH_TICKS = [{ i: 0, label: "00:00" }, { i: 12, label: "06:00" }, { i: 24, label: "12:00" }, { i: 36, label: "18:00" }, { i: 47, label: "23:30" }];
const ML = data.monthly.labels.map((m) => `${MON[parseInt(m.slice(5, 7), 10) - 1]} ${m.slice(2, 4)}`);
const M_TICKS = data.monthly.labels.flatMap((m, i) => (m.endsWith("-01") || m.endsWith("-07") ? [{ i, label: ML[i] }] : []));
const hhLabel = (sp: number) => HH[sp - 1];

/** Pick a chip from a small set of options. */
function Chips<T extends string>({ options, value, onChange, label }: { options: readonly T[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div className="forecast-error-chips" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o} aria-pressed={value === o} className={"chip" + (value === o ? " on" : "")} onClick={() => onChange(o)}>{o}</button>
      ))}
    </div>
  );
}

function Legend({ items }: { items: [string, string][] }) {
  return <div className="legend">{items.map(([n, c]) => <span key={n}><i style={{ background: c }} />{n}</span>)}</div>;
}

function MetricTable() {
  return (
    <Box title="Accuracy Metrics">
      <DataTable caption="Accuracy metrics for the day-ahead national demand forecast" rows={data.table}
        columns={[
          { key: "metric", label: "Metric" }, { key: "unit", label: "Unit" },
          { key: "final", digits: 2, label: "Final outturn" }, { key: "lo", digits: 2, label: "95% low" }, { key: "hi", digits: 2, label: "95% high" },
          { key: "first", digits: 2, label: "First outturn" }, { key: "naive", digits: 2, label: "Last week" },
        ]} />
    </Box>
  );
}

const METRICS = ["Weighted MAPE", "MAPE", "Bias"] as const;
type Metric = (typeof METRICS)[number];
const MKEY: Record<Metric, "wmape" | "mape" | "bias"> = { "Weighted MAPE": "wmape", MAPE: "mape", Bias: "bias" };

function ProfileChart() {
  const [m, setM] = useState<Metric>("Weighted MAPE");
  const p = data.profile[MKEY[m]];
  return (
    <>
      <Box title="Error by Half Hour" sub="%" h={380}>
        <LineChart labels={HH} ticks={HH_TICKS} unit="%" digits={2}
          yMin={m === "Bias" ? -2 : 0} yMax={m === "Bias" ? 2 : 5} yTicks={m === "Bias" ? [-2, -1, 0, 1, 2] : [0, 1, 2, 3, 4, 5]}
          series={[{ name: "Weekday", values: p.weekday, color: NIGHT }, { name: "Weekend", values: p.weekend, color: SECONDARY }]} />
        <Legend items={[["Weekday", NIGHT], ["Weekend", SECONDARY]]} />
      </Box>
      <Chips label="Metric" options={METRICS} value={m} onChange={setM} />
    </>
  );
}

function LevelChart() {
  return (
    <Box title="Absolute Percentage Error by Demand" sub="%" h={400}>
      <Scatter points={data.points} fit={data.fit} xUnit="GW" yUnit="%" xDigits={0} yDigits={1} xDomain={[10, 48]} yDomain={[0, 16]}
        label="Absolute percentage error of each half hour against national demand, with the mean error in 2 GW bands" />
    </Box>
  );
}

function SignedErrorChart() {
  return (
    <Box title="Signed Error" sub="half hours" h={380}>
      <Histogram bins={data.hist} curve={data.curve} unit="%" digits={0} xTicks={[-12, -8, -4, 0, 4, 8, 12]}
        label="Histogram of forecast minus outturn as a percentage of outturn, with a normal curve of the same mean and spread" />
    </Box>
  );
}

const TRUTHS = ["Final outturn", "First outturn"] as const;
type Truth = (typeof TRUTHS)[number];

function BiasHeatmap() {
  const [t, setT] = useState<Truth>("Final outturn");
  return (
    <>
      <Box title="Bias by Month and Half Hour" sub="%" h={420}>
        <Heatmap rows={MON} cols={HH} values={t === "Final outturn" ? data.heat.A1 : data.heat.A0} unit="%" digits={2}
          diverge mid={0} domain={[-2.5, 2.5]} colEvery={12}
          label="Forecast bias by calendar month and half hour; positive means the forecast was above the outturn" />
      </Box>
      <Chips label="Outturn" options={TRUTHS} value={t} onChange={setT} />
    </>
  );
}

const MONTHLY = ["Weighted MAPE", "Bias"] as const;
type MonthlyMetric = (typeof MONTHLY)[number];

/** Monthly weighted MAPE with a 95% bootstrap band, or monthly bias, against both outturns; also the home preview. */
export function MonthlyChart({ h, chips = true }: { h?: number; chips?: boolean }) {
  const [m, setM] = useState<MonthlyMetric>("Weighted MAPE");
  const mo = data.monthly;
  const w = m === "Weighted MAPE";
  return (
    <>
      <Box title="Forecast Error by Month" sub="%" h={h}>
        <LineChart labels={ML} ticks={M_TICKS} unit="%" digits={2}
          yMin={w ? 0 : -1.5} yMax={w ? 4 : 1.5} yTicks={w ? [0, 1, 2, 3, 4] : [-1.5, -0.75, 0, 0.75, 1.5]}
          band={w ? { top: mo.hi, bottom: mo.lo } : undefined}
          series={[
            { name: "Final outturn", values: w ? mo.final : mo.bias_final, color: SECONDARY },
            { name: "First outturn", values: w ? mo.first : mo.bias_first, color: NIGHT, dash: "5 4" },
          ]} />
        <Legend items={[["Final outturn", SECONDARY], ["First outturn", NIGHT]]} />
      </Box>
      {chips && <Chips label="Metric" options={MONTHLY} value={m} onChange={setM} />}
    </>
  );
}

function GrainChart() {
  return (
    <Box title="Weighted MAPE by Reporting Grain" sub="%" h={340}>
      <GroupedBars groups={data.grain.labels} unit="%" digits={2}
        series={[{ name: "Final outturn", values: data.grain.final, color: SECONDARY }]} />
    </Box>
  );
}

const TITLE = "Measuring demand forecast error";

export default function ForecastError() {
  const lede = `I scored two years of the day-ahead forecast for Great Britain's electricity demand against what was actually used. The same forecast is ${f.wmape_final}% out on one measure, ${f.grain_month}% on another and almost exactly unbiased on a third, depending on how the error is averaged. Here is which number I would trust, and for what.`;
  usePageMeta(TITLE, lede);

  return (
    <Article kicker="Writing · forecasting" title={TITLE} lede={lede}>
      <Prose>
        <p>I studied advertising, which still surprises people who assumed I did something in maths. I've spent the last 16 years in energy doing the maths anyway, mostly as charts with boxes and arrows, and I'm quick to spot an anomaly in a slide deck.</p>
        <p>Other people's decks, at least. The first time I scored the forecast in this piece, the error came out at more than double the right answer, because I'd read a column of dates the wrong way round.</p>
        <p>Once the dates were right, the harder problem was one that never shows up as a bug. The same two years of forecasts are {f.wmape_final}% out on one measure, {f.grain_month}% on another and almost exactly unbiased on a third. All three are correct, and a slide only has room for one.</p>
        <p>That is the trouble with forecast error.</p>
        <p>So I took Britain's day-ahead demand forecast, scored it six ways, and worked out which number I would trust, and for what.</p>
      </Prose>

      <Section title="Why does one forecast have several scores?" />
      <Prose>
        <p>Every half hour the system operator publishes a forecast of national demand for the next day, and every half hour a measured outturn follows.<Fn n={1} /> The gap between them is the error, and I want one number that says how big it usually is. Averaging percentage errors, weighting them by volume, keeping the sign or dropping it, and adding up to days or months first all give different answers from the same rows.</p>
        <p>I took the forecast as published shortly before noon on the day before delivery for every day of 2024 and 2025, {f.rows.toLocaleString("en-GB")} half hours in all, and scored it against two outturns: Elexon's initial figure, published within minutes, and NESO's historic figure, which can be edited later.<Fn n={2} /> I write error as forecast minus outturn, so a positive number means the forecast was too high.</p>
      </Prose>
      <Wide>
        <StatRow stats={[
          { num: `${f.wmape_final}%`, label: "Weighted MAPE, half-hourly" },
          { num: `${f.bias_final}%`, label: "Bias, half-hourly" },
          { num: `${f.grain_month}%`, label: "Weighted MAPE, monthly" },
        ]} />
      </Wide>

      <Section title="Which average should a headline use?" />
      <Prose>
        <p>The textbook choice is the mean absolute percentage error (MAPE): the size of each half hour's miss as a share of that half hour's demand, averaged. Hyndman and Athanasopoulos list its faults: it breaks when the actual is zero, swings wildly near zero and punishes some misses more than others.<Fn n={3} /> The weighted version divides the total absolute miss by the total demand, so a quiet half hour counts for less. A third option, the mean absolute scaled error (MASE), divides the miss by that of a simple benchmark; here the benchmark is "the same half hour last week".<Fn n={4} /> For all the faults of plain MAPE, NESO still publishes the percentage error of each half hour of this forecast.<Fn n={5} /></p>
        <p>The table shows every measure with a 95% interval, a measure of how far the score could move on the luck of which weeks happened to fall in the sample, which I estimated by resampling whole weeks.<Fn n={6} /> Weighted MAPE is {f.wmape_final}% ({f.wmape_lo}% to {f.wmape_hi}%), plain MAPE {f.mape_final}%, and the last-week benchmark manages {f.wmape_naive}%, so the forecast's MASE is {f.mase}.</p>
      </Prose>
      <Wide><MetricTable /></Wide>
      <Prose>
        <p>At national scale the two percentages barely differ, because national demand never fell below {f.gw_min} GW in these two years. Low demand still inflates the plain version. The chart shows each half hour's error as a share of demand against the level of demand. Below 18 GW the average error was {f.ape_low_gw}% and above 30 GW it was {f.ape_high_gw}%, yet the miss in megawatts was smaller at low demand ({f.mae_low_gw} MW against {f.mae_high_gw} MW).</p>
      </Prose>
      <Wide><LevelChart /></Wide>
      <Prose>
        <p>For a supplier's portfolio, where overnight or summer demand can fall close to zero, that effect stops being small, and a handful of near-empty half hours can dominate a plain MAPE. I would use the weighted figure as the headline and keep the plain one only as a cross-check.</p>
      </Prose>

      <Section title="Why can a forecast be unbiased and still wrong in the same direction for months?" />
      <Prose>
        <p>Over two years the bias, the signed total miss over total demand, is {f.bias_final}%, with an interval of {f.bias_lo}% to {f.bias_hi}% that straddles zero. On its own that looks like a clean result, but Ofgem has shown that bias is a separate failing worth policing: in 2021 the system operator paid £1.5m after its week-ahead demand forecasts ran biased through much of 2017.<Fn n={7} /> The monthly view shows why one bias number is not enough. Monthly bias ranged from {f.bias_month_min}% to {f.bias_month_max}%, and the plain average of the monthly values is {f.bias_month_mean}%, because over- and under-forecast months cancel. The average size of the monthly bias, ignoring the sign, is {f.bias_month_absmean}%, and that is the figure that tells a desk how far one month's position can drift.</p>
      </Prose>
      <Wide><MonthlyChart h={400} /></Wide>
      <Prose>
        <p>The heat map shows the same cancelling inside the day. In {f.heat_max_month} the half hour from {hhLabel(f.heat_max_sp)} ran {f.heat_max}% high on average; in {f.heat_min_month} the half hour from {hhLabel(f.heat_min_sp)} ran {f.heat_min}% low. Summer middays, May to August from 11:00 to 15:00, ran {f.bias_summer_midday}% high.</p>
      </Prose>
      <Wide><BiasHeatmap /></Wide>
      <Prose>
        <p>Weekends are harder: weighted MAPE was {f.wmape_weekday}% on weekdays and {f.wmape_weekend}% at weekends, where the worst half hour, from {hhLabel(f.wmape_weekend_peak_sp)}, averaged {f.wmape_weekend_peak}%. The chart lets you switch between the three measures by half hour.</p>
      </Prose>
      <Wide><ProfileChart /></Wide>

      <Section title="How big are the misses that matter?" />
      <Prose>
        <p>An average hides the shape of the errors. The histogram shows the signed error of every half hour against a normal (bell-shaped) curve with the same mean and spread. The typical half hour is close to the centre, with a median of {f.pe_median}%, but the tails are heavier than the curve: {f.pe_beyond10}% of half hours missed by more than 10%, against {f.pe_beyond10_normal}% if the errors were normal. The skew of {f.pe_skew} means the large misses lean towards over-forecasting.</p>
      </Prose>
      <Wide><SignedErrorChart /></Wide>
      <Prose>
        <p>That gap is why I report the root mean squared error (RMSE), which squares each miss before averaging and so punishes the big ones, alongside the mean absolute error: {f.rmse_final} MW against {f.mae_final} MW here.</p>
      </Prose>

      <Section title="Does the score depend on the reporting grain and the outturn?" />
      <Prose>
        <p>The grain changes the score a lot and the outturn hardly at all. Adding the half hours up to days, weeks or months before scoring lets errors cancel, so weighted MAPE falls from {f.grain_halfhour}% half-hourly to {f.grain_day}% daily, {f.grain_week}% weekly and {f.grain_month}% monthly. A monthly number quoted next to a half-hourly one is not a comparison.</p>
      </Prose>
      <Wide><GrainChart /></Wide>
      <Prose>
        <p>NESO's later figure differed from Elexon's initial one in {f.rev_share_changed}% of half hours, but by only {f.rev_abs_mean}% on average. Weighted MAPE is {f.wmape_first}% against either, while bias moves from {f.bias_first}% to {f.bias_final}%. National demand is measured on the transmission system, and NESO's later edits are small. A supplier's settled volumes keep changing until the final reconciliation run, 14 months after the day,<Fn n={8} /> so the choice of truth matters far more there, and I would score against the most mature figure and show both.</p>
        <p>Plumbing errors can move a score more than any modelling choice. The two NESO files I used write dates differently, and when I first read both with one day-first rule the 2025 dates swapped day and month for the first twelve days of each month. Weighted MAPE came out at {f.wmape_misparsed}%, more than double the right answer. I also checked for duplicate half hours, which inflate any total-over-total measure ({f.dup_ndf + f.dup_indo + f.dup_neso} found), zero outturns ({f.zero_actual}) and the two short and two long clock-change days, which I left out of the half-hour charts.</p>
      </Prose>

      <Section title="What I would do with these figures" />
      <Prose>
        <p>So which number goes on the slide? Weighted MAPE, at a stated grain and with an interval. Here that is {f.wmape_final}% half-hourly ({f.wmape_lo}% to {f.wmape_hi}%), and it should never sit beside a monthly {f.grain_month}% as if the two were the same measure, however much better the monthly one looks.</p>
        <p>Bias gets its own line, month by month, with its average size ignoring the sign ({f.bias_month_absmean}% here). I wouldn't rely on the two-year bias of {f.bias_final}%, which only looks clean because over- and under-forecast months cancel inside it.</p>
        <p>Every score needs a naive benchmark beside it. A MASE of {f.mase} shows the forecast beating "the same half hour last week" by a wide margin, which a percentage on its own can't show. The models that have had to beat that benchmark over the years are in <a href="/ml-through-the-years">demand forecasting models from SARIMA to gradient boosting</a>.</p>
        <p>As for my eye for an anomaly, the biggest one in this piece was my own: a column of dates read the wrong way round, which more than doubled the score. If you publish a forecast score, check for duplicate rows, zero actuals, clock-change days and date parsing first, and say which outturn you scored against. Then put the weighted number on the slide.</p>
      </Prose>

      <Footnotes notes={[
        <>Elexon, <a href="https://www.elexon.co.uk/glossary/national-demand-forecast/" target="_blank" rel="noopener">glossary: National Demand Forecast</a>. The forecast is produced by the system operator from historically metered generation, includes transmission losses and excludes interconnectors, station load and pumped storage. I took the history from the Elexon Insights API (<a href="https://bmrs.elexon.co.uk/api-documentation/endpoint/forecast/demand/day-ahead/history" target="_blank" rel="noopener">forecast/demand/day-ahead/history</a>), using for each delivery day the latest forecast published before 12:00 UTC the day before: in practice the 11:45 to 11:47 UTC publication.</>,
        <>Initial outturn: Elexon Insights API, demand/outturn (INDO), the half-hour average measured on the transmission company's operational metering. Final outturn: NESO data portal, <a href="https://www.neso.energy/data-portal/historic-demand-data/historic_demand_data_2024" target="_blank" rel="noopener">historic demand data</a> 2024 and 2025, column ND, which NESO describes as equivalent to INDO; the portal notes that the data is populated 21 days in arrears and that demand may be edited retrospectively. {(f.missing_any).toLocaleString("en-GB")} half hours without all three values were left out.</>,
        <>Hyndman, R. J. and Athanasopoulos, G., <a href="https://otexts.com/fpp3/accuracy.html" target="_blank" rel="noopener">Forecasting: Principles and Practice</a>, 3rd edition, section 5.8, Evaluating point forecast accuracy.</>,
        <>Hyndman, R. J. and Koehler, A. B. (2006), <a href="https://robjhyndman.com/publications/another-look-at-measures-of-forecast-accuracy/" target="_blank" rel="noopener">Another look at measures of forecast accuracy</a>, International Journal of Forecasting 22(4), 679 to 688. Here MASE is the forecast's mean absolute error divided by that of the same half hour one week earlier, both over the same two years and against the final outturn.</>,
        <>NESO publishes the absolute percentage error of each half hour of its day-ahead national demand forecast from April 2021: <a href="https://www.neso.energy/data-portal/day-ahead-half-hourly-demand-forecast-performance" target="_blank" rel="noopener">Day Ahead Half Hourly Demand Forecast Performance</a>.</>,
        <>My analysis, <code>scripts/forecast-error/build.py</code>. Intervals are 2.5th to 97.5th percentiles of 1,000 resamples of whole ISO weeks (400 resamples of days for the monthly band). Bias is the sum of forecast minus outturn over the sum of outturn. Half-hour charts use settlement periods 1 to 48 and label them by local clock time. Histogram values beyond ±12% ({f.pe_clipped} half hours) are counted in the end bins; the curve is a normal with mean {f.pe_mean}% and standard deviation {f.pe_sd}%. The demand-level fit is the mean in 2 GW bands with a 95% interval; the scatter shows a random 2,000 of the half hours.</>,
        <>Ofgem, <a href="https://ofgem.gov.uk/press-release/national-grid-electricity-system-operator-pay-ps15-million-over-electricity-demand-forecasts" target="_blank" rel="noopener">National Grid Electricity System Operator to pay £1.5 million over electricity demand forecasts</a>, 8 April 2021. The forecasts were seven days ahead, April to October 2017.</>,
        <>MHHS Programme, <a href="https://mhhs-prod-webapp.azurewebsites.net/uploads/5afb6ff7-7f6d-45ba-9663-5a7f66075f97/MHHS-DEL4484_Settlement_Timetable_Consultation_on_RF_Reductions_v1.0.pdf" target="_blank" rel="noopener">Settlement timetable consultation on RF reductions</a>, 29 April 2026. The final reconciliation (RF) run is 14 months after the settlement day; the consultation proposes cutting it to 7 months and later to 4.</>,
      ]} />
    </Article>
  );
}
