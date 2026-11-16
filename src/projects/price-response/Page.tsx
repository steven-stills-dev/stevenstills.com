import { useState } from "react";
import { Article, Prose, Section, Wide, Fn, Footnotes, StatRow } from "../../components/Article";
import Box from "../../components/Box";
import LineChart from "../../components/charts/LineChart";
import Scatter from "../../components/charts/Scatter";
import Histogram from "../../components/charts/Histogram";
import GroupedBars from "../../components/charts/GroupedBars";
import Slider from "../../components/charts/Slider";
import { MON, fmt } from "../../lib/format";
import { usePageMeta } from "../../lib/meta";
import ArmChart from "./ArmChart";
import data from "./data.json";
import "./price-response.css";

const F = data.facts;
const NIGHT = "var(--ste-night)", SECONDARY = "var(--ste-secondary)";

type Pt = { x: number; y: number; label?: string };
type Fit = { x: number; y: number; lo?: number; hi?: number };
type Bridge = { v0: number; v1: number; price_change: number; weather: Record<string, number>; price: Record<string, number> };
type ArmSet = Record<"Full sample" | "Fixed cohort" | "Thinned reads", { est: number; lo: number; hi: number }>;

function Chips<T extends string>({ options, value, onChange, label }: { options: readonly T[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div className="price-response-chips" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o} type="button" aria-pressed={value === o} className={"chip" + (value === o ? " on" : "")} onClick={() => onChange(o)}>{o}</button>
      ))}
    </div>
  );
}

const YEARS = ["2019", "2022", "2025"] as const;
type Year = (typeof YEARS)[number];

/** Daily distribution-network gas demand against temperature for one year, with a binned-mean fit. */
function DemandScatter() {
  const [year, setYear] = useState<Year>("2019");
  const s = (data.scatter as Record<Year, { points: Pt[]; fit: Fit[] }>)[year];
  return (
    <>
      <Box title="Daily Gas Demand Against Temperature" sub="GWh a day, °C" h={400}>
        <Scatter points={s.points} fit={s.fit} xUnit="°C" yUnit="GWh" xDomain={[-4, 25]} yDomain={[0, 3000]} r={2}
          label={`Daily LDZ gas demand in GWh against mean temperature in °C, ${year}`} />
      </Box>
      <Chips options={YEARS} value={year} onChange={setYear} label="Year" />
    </>
  );
}

const IDX_LABELS = data.index.months.map((m) => `${MON[parseInt(m.slice(5, 7), 10) - 1]} ${m.slice(0, 4)}`);
const IDX_TICKS = data.index.months.reduce<{ i: number; label: string }[]>((acc, m, i) => {
  if (m.endsWith("-12") && parseInt(m.slice(0, 4), 10) % 2 === 0) acc.push({ i, label: m.slice(0, 4) });
  return acc;
}, []);

/** Twelve-month weather-corrected demand against the 2016 to 2019 average; also the home preview. */
export function DemandIndexChart({ h }: { h?: number }) {
  return (
    <Box title="Weather-Corrected Gas Demand" sub="index, 2016 to 2019 = 100" h={h}>
      <LineChart labels={IDX_LABELS} ticks={IDX_TICKS} digits={1} yMin={80} yMax={105} yTicks={[80, 85, 90, 95, 100, 105]}
        band={{ top: data.index.hi, bottom: data.index.lo }}
        series={[{ name: "Index", values: data.index.mid, color: SECONDARY }]} />
    </Box>
  );
}

function ElasticityScatter() {
  return (
    <Box title="Winter Demand Against Gas Price" sub="% change on a year earlier" h={420}>
      <Scatter points={data.elasticity.points as Pt[]} fit={data.elasticity.fit as Fit[]} xUnit="Price %" yUnit="Demand %"
        xDigits={0} yDigits={0} xDomain={[-40, 140]} yDomain={[-20, 15]} r={3.2}
        label="Year-on-year change in weather-corrected winter gas demand against year-on-year change in the CPI gas price, by month, with a fitted line and bootstrap band" />
    </Box>
  );
}

function BootHistogram() {
  return (
    <Box title="Resampled Price Response" sub="resamples" h={340}>
      <Histogram bins={data.elasticity.hist} digits={2} yUnit="resamples" xTicks={[-0.4, -0.3, -0.2, -0.1, 0, 0.1]}
        label={`Distribution of ${fmt(F.n_boot)} bootstrap estimates of the price response, resampling whole winters`} />
    </Box>
  );
}

const PAIRS = Object.keys(data.bridge) as (keyof typeof data.bridge)[];
const ORDERS = ["Weather first", "Price first"] as const;

function BridgeChart() {
  const [pair, setPair] = useState(PAIRS[0]);
  const [order, setOrder] = useState<(typeof ORDERS)[number]>("Weather first");
  const b = data.bridge[pair] as Bridge;
  const bars = order === "Weather first" ? b.weather : b.price;
  const groups = Object.keys(bars);
  return (
    <>
      <Box title="Change in Winter Gas Demand by Cause" sub="TWh" h={360}>
        <GroupedBars groups={groups} unit="TWh" digits={1}
          series={[{ name: "Change", values: groups.map((g) => bars[g]), color: SECONDARY }]} />
      </Box>
      <Chips options={PAIRS} value={pair} onChange={setPair} label="Winters compared" />
      <Chips options={ORDERS} value={order} onChange={setOrder} label="Order of factors" />
    </>
  );
}

const SCENARIOS = ["Clean data", "Churn and daily reads"] as const;
const ARM_NAMES = ["Full sample", "Fixed cohort", "Thinned reads"] as const;

function ArmsFigure() {
  const [sc, setSc] = useState<(typeof SCENARIOS)[number]>("Churn and daily reads");
  const set = (sc === "Clean data" ? data.synthetic.clean : data.synthetic.messy) as unknown as ArmSet;
  return (
    <>
      <Box title="Winter Change in Use per Meter" sub="%" h={260}>
        <ArmChart arms={ARM_NAMES.map((n) => ({ name: n, ...set[n] }))} domain={[-12, 0]} step={2} unit="%"
          label={`Illustrative synthetic meters, ${sc.toLowerCase()}: estimated winter change in use per meter with 95% bootstrap intervals for three methods`} />
      </Box>
      <Chips options={SCENARIOS} value={sc} onChange={setSc} label="Synthetic data" />
    </>
  );
}

function CapCalculator() {
  const [price, setPrice] = useState(28);
  const [share, setShare] = useState(100);
  const r = 1 + price / 100;
  const eff = (e: number) => (Math.pow(r, e) - 1) * 100 * (share / 100);
  const ends = [eff(F.elasticity_lo), eff(F.elasticity_hi)];
  const pct = (v: number) => `${v > 0.05 ? "+" : ""}${fmt(v, 1)}%`;
  return (
    <Box title="Volume Change for a Price Change" sub="%">
      <Slider label="Change in unit rate" min={-40} max={80} step={1} value={price} onChange={setPrice} unit="%" />
      <Slider label="Share of customers whose rate changes" min={0} max={100} step={5} value={share} onChange={setShare} unit="%" />
      <StatRow stats={[
        { num: pct(eff(F.elasticity)), label: "Central" },
        { num: pct(Math.min(...ends)), label: "Low end of range" },
        { num: pct(Math.max(...ends)), label: "High end of range" },
      ]} />
    </Box>
  );
}

const TITLE = "Measuring how gas demand responds to price changes";

export default function PriceResponse() {
  const lede = `When the price cap moves, a supplier has to decide how much gas to take out of its forecast and its hedge. I weather-corrected Britain's distribution-network gas demand from 2015 and set it against the price households paid. Demand fell about ${Math.abs(F.demand_2223_pct).toFixed(0)}% in the winter prices more than doubled, but nine winters leave the response itself poorly pinned down.`;
  usePageMeta(TITLE, lede);
  const loo = data.elasticity.loo as Record<string, number>;

  return (
    <Article kicker="Writing · gas demand" title={TITLE} lede={lede}>
      <Section title="What am I trying to measure?" />
      <Prose>
        <p>A supplier buys most of its gas months ahead, against a forecast of its customers' use. When Ofgem moves the price cap, that forecast has to move too, because people use less gas when it costs more. The number that links the two is the price elasticity: the percentage change in use for a 1% change in price. An elasticity of −0.1 means a 10% price rise cuts use by about 1%.</p>
        <p>I can't see households directly in public data. The nearest daily series is the gas National Gas hands from the transmission system to the regional distribution networks, which deliver it to homes and businesses.<Fn n={1} /> I treat it as a national picture, never as any supplier's book.</p>
      </Prose>

      <Section title="How do I take the weather out?" />
      <Prose>
        <p>Weather moves gas demand far more than price. The chart shows each day's demand against the average temperature across seven British cities from ERA5, a reanalysis that rebuilds past weather from observations.<Fn n={2} /> In January each degree colder adds about {fmt(Math.abs(F.slope_jan))} GWh a day. Switch years and the cloud for 2022 and 2025 sits below 2019 at the same temperatures.</p>
      </Prose>
      <Wide><DemandScatter /></Wide>
      <Prose>
        <p>For each calendar month I fitted one regression (a best-fit line) of daily demand on temperature, with a separate level for each year and each day of the week. I then moved every day to a fixed normal temperature using that month's slope. The normal is one curve, fitted to 1991 to 2025 and adjusted for warming to 2025, so every year is measured against the same baseline. A normal that is revised between years can make one year look colder than it was and invent a fall in demand.</p>
        <p>The chart shows twelve-month weather-corrected demand against its 2016 to 2019 average. The band is the range from the uncertainty in the temperature slopes, and it is narrow. Demand was {fmt(F.index_by_dec["2022"], 1)} in the year to December 2022 and {fmt(F.index_by_dec["2023"], 1)} a year later, and it was still {fmt(F.index_latest, 1)} in the year to July 2026.</p>
      </Prose>
      <Wide><DemandIndexChart h={380} /></Wide>

      <Section title="How much did demand respond to price?" />
      <Prose>
        <p>For price I used the ONS consumer price index for household gas, which tracks what people paid, including the government's Energy Price Guarantee, which held unit rates below the cap from October 2022 to June 2023.<Fn n={3} /> For each winter month from November to March, I compared weather-corrected demand and price with the same month a year earlier. I left out months that touch the November 2020 to March 2021 lockdowns.</p>
        <p>The chart shows the {F.n_months} winter months from {F.n_winters} winters, with a fitted line and a 95% band. The line is fitted to logarithms of the changes, so its slope reads directly as an elasticity. In winter 2022/23 the gas price was {F.price_2223_pct}% higher than a year before and demand was {fmt(Math.abs(F.demand_2223_pct), 1)}% lower. The slope is {fmt(F.elasticity, 2)}.</p>
      </Prose>
      <Wide><ElasticityScatter /></Wide>
      <Prose>
        <p>That matches the −0.1 the Office for Budget Responsibility assumed in November 2022 and found consistent with weather-adjusted household demand that winter.<Fn n={4} /> The Institute for Fiscal Studies, using spending data from about a quarter of a million households, found a 45% real price rise in April 2022 cut energy use by 15%, an elasticity of −0.33.<Fn n={5} /> A study of 11,519 smart prepayment homes put gas at −0.265.<Fn n={6} /> They measure different things, and put my national figure at the low end. My series also includes businesses and some industry, which pay wholesale-linked prices, and I can't separate their response from households'.</p>
      </Prose>

      <Section title="How fragile is that number?" />
      <Prose>
        <p>Months inside one winter share one price step, so they are not independent evidence. I bootstrapped by winter: drew {F.n_winters} winters at random with replacement, refitted the slope, and repeated that {fmt(F.n_boot)} times. The chart shows the spread of those slopes. The middle 95% runs from {fmt(F.elasticity_lo, 2)} to {fmt(F.elasticity_hi, 2)}, which includes zero. With so few winters even that interval is approximate.</p>
      </Prose>
      <Wide><BootHistogram /></Wide>
      <Prose>
        <p>The reason is that one winter carries the whole estimate. Leave out any other winter and the slope stays between {fmt(F.loo_min, 2)} and {fmt(Math.max(...Object.entries(loo).filter(([w]) => w !== "2022/23").map(([, v]) => v)), 2)}; leave out 2022/23 and it is {fmt(F.loo_without_2223, 2)}. The next winter undermines a symmetric response too. In 2023/24 the price was {Math.abs(F.price_2324_pct)}% lower than a year before, and demand did not rise at all. In winter 2025/26 the price was still {F.price_vs_base_pct}% above the 2016/17 to 2018/19 winters, which at {fmt(F.elasticity, 2)} explains about {fmt(Math.abs(F.pred_vs_base_pct), 1)}% less demand, far short of the {fmt(100 - F.index_by_dec["2025"], 0)}% gap in the index for the year to December 2025. I can't show what makes up the rest from these data. Published work separates a quick response from a slower one, and the gap fits that.<Fn n={5} k="b" /></p>
      </Prose>

      <Section title="Where did a winter's change in volume come from?" />
      <Prose>
        <p>A bridge splits the change between two winters into causes, each applied to the running total left by the one before. Weather is the gap between the raw and the corrected change, price is the price change raised to the power of the {fmt(F.elasticity, 2)} slope, and everything else is left over. From 2021/22 to 2022/23, November to March demand fell from {fmt(data.bridge["2021/22 to 2022/23"].v0, 1)} TWh to {fmt(data.bridge["2021/22 to 2022/23"].v1, 1)} TWh. The chart shows a colder winter adding {fmt(data.bridge["2021/22 to 2022/23"].weather.Weather, 1)} TWh and price taking off {fmt(Math.abs(data.bridge["2021/22 to 2022/23"].weather.Price), 1)} TWh.</p>
      </Prose>
      <Wide><BridgeChart /></Wide>
      <Prose>
        <p>Swap the order and the weather and price bars move by under 1 TWh, because each is applied to a different running total. The leftover bar does not move at all, so I read it as a balancing item (whatever is left once the named causes are counted), not a finding. From 2022/23 to 2023/24 the price bar adds back {fmt(data.bridge["2022/23 to 2023/24"].weather.Price, 1)} TWh for cheaper gas, and the leftover takes away {fmt(Math.abs(data.bridge["2022/23 to 2023/24"].weather.Other), 1)} TWh: the rebound the slope predicts never arrived.</p>
      </Prose>

      <Section title="How would I check a fall in a supplier's own meters?" />
      <Prose>
        <p>Inside a supplier the question is asked of meter reads, where two things can fake a fall. Customers come and go, and smart meters moved many homes from monthly to daily reads. I built {fmt(data.synthetic.messy.meta.meters)} synthetic meters with a planted 5% fall in use per meter and the same weather in both years.<Fn n={7} /> In the messy version, heavier users are more likely to leave, lighter users join, and the second year has daily reads.</p>
        <p>The chart shows three estimates of the winter change, each with a 95% interval from a Poisson bootstrap (refitting with each meter given a random weight). The full sample reads {fmt(data.synthetic.messy["Full sample"].est, 1)}%, because churn changed who is measured. Keeping only meters present in both years gives {fmt(data.synthetic.messy["Fixed cohort"].est, 1)}%, because monthly reads smear the January peak into milder months. Thinning the daily reads back to monthly gives {fmt(data.synthetic.messy["Thinned reads"].est, 1)}%. On clean data all three agree.</p>
      </Prose>
      <Wide><ArmsFigure /></Wide>
      <Prose>
        <p>The intervals are tight and still miss the truth. A bootstrap over meters only measures meter-to-meter noise, and none of these errors is noise.</p>
      </Prose>

      <Section title="What I would do with these figures" />
      <Prose>
        <p>The calculator turns a change in the unit rate into a change in volume at the central slope and both ends of the 95% range, scaled by the share of customers whose rate changes. Ofgem's average gas unit rate rose from {fmt(F.cap_q2, 2)}p to {fmt(F.cap_q3, 2)}p per kWh on 1 July 2026, up {fmt(F.cap_rise_pct, 1)}%, which Ofgem put down to the conflict in the Middle East (the gas price spike I tracked in <a href="/hormuz">the Strait of Hormuz</a>).<Fn n={8} /> For customers on the cap that implies {fmt(F.cap_effect_pct, 1)}%, with a range from {fmt(F.cap_effect_lo, 1)}% to +{fmt(F.cap_effect_hi, 1)}%. Customers on fixed tariffs are not affected until their fix ends.</p>
      </Prose>
      <Wide><CapCalculator /></Wide>
      <Prose>
        <p>For a price rise I would take the central cut out of the forecast for capped customers only, about 2.7% for July 2026, and hedge it late. I think the cut belongs in near-dated purchases, where a wrong estimate costs less to undo, because the range runs from a 3.9% cut to a 2.1% rise.</p>
        <p>For a price fall I would add nothing back. In 2023/24 prices fell {Math.abs(F.price_2324_pct)}% and demand stayed where it was.</p>
        <p>Before I applied a fall measured in a supplier's own meters, I would want the full sample, the fixed cohort and the thinned reads to agree in sign and clear a set size. I would treat the bootstrap interval as a floor on the uncertainty.</p>
        <p>I would refit the slope after every winter; the interval narrows only as winters with real price changes are added.</p>
      </Prose>

      <Footnotes notes={[
        <>My calculations from National Gas Transmission's NTS Energy Offtaken, LDZ Offtake Total, 1 January 2015 to 11 August 2026. 2015 to 2019 is from Grant Wilson and Noah Godfrey's extract of National Grid's MIPI data on <a href="https://zenodo.org/records/4913872" target="_blank" rel="noopener">Zenodo</a> (CC BY-NC 4.0); January 2020 to September 2021 is from an archived portal export in the <a href="https://github.com/benmcwilliams/gas-demand" target="_blank" rel="noopener">gas-demand repository</a> on GitHub, with 1 to 18 January 2020 from National Gas's Gas Winter Review and Consultation 2020 datasheet; later days are from the <a href="https://data.nationalgas.com/find-gas-data" target="_blank" rel="noopener">National Gas data portal</a>. Ofgem describes the <a href="https://www.ofgem.gov.uk/energy-regulation/gas/gas-distribution" target="_blank" rel="noopener">gas distribution networks</a> as taking gas from the transmission system to homes and businesses. LDZ offtake includes businesses and some industry, whose prices are not the household cap.</>,
        <>ECMWF ERA5 daily mean 2 m temperature via the <a href="https://open-meteo.com/en/docs/historical-weather-api" target="_blank" rel="noopener">Open-Meteo archive API</a>, equal-weighted across London, Birmingham, Manchester, Leeds, Glasgow, Bristol and Newcastle. The fixed normal is a linear trend plus three annual harmonics fitted to 1991 to 2025 and evaluated at 2025. Monthly regressions use every day from 2015 with year and day-of-week effects; the index band applies each month's slope plus or minus 1.96 standard errors.</>,
        <>Office for National Statistics, <a href="https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7du/mm23" target="_blank" rel="noopener">CPI index 04.5.2: Gas (D7DU)</a>, 2015 = 100, to June 2026. GOV.UK, <a href="https://www.gov.uk/government/publications/energy-bills-support/energy-price-guarantee-up-until-30-june-2023" target="_blank" rel="noopener">Energy Price Guarantee up to 30 June 2023</a> (withdrawn guidance): a discount on unit rates for domestic customers from 1 October 2022. The slope is ordinary least squares of the log year-on-year change in demand on the log year-on-year change in price, for November to March from January 2016 to March 2026; the chart converts both to percentage changes. The bootstrap resamples whole winters, 5,000 times, and takes the 2.5th and 97.5th percentiles.</>,
        <>Office for Budget Responsibility, <a href="https://obr.uk/box/how-gas-demand-and-supply-have-responded-to-higher-gas-prices/" target="_blank" rel="noopener">How gas demand and supply have responded to higher gas prices</a>, Economic and fiscal outlook, March 2023: weather-adjusted household gas demand that winter was around 15% below the two years before the invasion of Ukraine, with prices around 200% higher.</>,
        <>Peter Levell, Martin O'Connell and Kate Smith, <a href="https://ifs.org.uk/sites/default/files/2025-11/WP202555-The-welfare-effects-of-price-shocks-and-household-relief-packages-evidence-from-an-energy-crisis.pdf" target="_blank" rel="noopener">The welfare effects of price shocks and household relief packages</a>, IFS working paper 25/55, November 2025. Bank and card data for a panel of a quarter of a million UK households, 2019 to 2023; the estimate covers household energy, not gas alone. The paper's literature review attributes the wide range of published elasticities partly to the difference between short-run and long-run responses.</>,
        <>Environmental Change Institute, University of Oxford, <a href="https://www.eci.ox.ac.uk/node/1012" target="_blank" rel="noopener">Finding the fuel poor and framing better policy</a>, August 2023: 11,519 smart prepayment dual-fuel customers, 2019-20 to 2022-23.</>,
        <>My model, so treat accordingly. 4,000 meters with lognormal annual use around 11,000 kWh, a seasonal heating shape, daily noise and a 5% fall in every day of the second year. In the messy version, 20% of above-median users and 5% of the rest leave after the first year, a similar number of new meters join using 15% less, and second-year reads are daily. The estimate is the mean over November to March of the ratio of kWh per meter-day. 1,000 Poisson bootstrap replicates.</>,
        <>Ofgem, <a href="https://www.ofgem.gov.uk/news/changes-energy-price-cap-between-1-april-and-30-june-2026" target="_blank" rel="noopener">Changes to energy price cap between 1 April and 30 June 2026</a>, 25 February 2026, and <a href="https://www.ofgem.gov.uk/news/changes-energy-price-cap-between-1-july-and-30-september-2026" target="_blank" rel="noopener">between 1 July and 30 September 2026</a>, 27 May 2026: average gas unit rates for direct debit including VAT across England, Scotland and Wales. The July note says fixed-tariff customers are not affected by cap changes.</>,
      ]} />
    </Article>
  );
}
