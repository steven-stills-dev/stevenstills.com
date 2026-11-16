import { useState } from "react";
import { Article, Prose, Section, Wide, Fn, Footnotes, StatRow } from "../../components/Article";
import Box from "../../components/Box";
import AnimatedUKMap from "../../components/maps/AnimatedUKMap";
import Scatter from "../../components/charts/Scatter";
import Heatmap from "../../components/charts/Heatmap";
import Histogram from "../../components/charts/Histogram";
import LineChart from "../../components/charts/LineChart";
import Slider from "../../components/charts/Slider";
import { fmt } from "../../lib/format";
import { usePageMeta } from "../../lib/meta";
import data from "./data.json";
import "./winter-replay.css";

const F = data.facts;
const NIGHT = "var(--ste-night)", SECONDARY = "var(--ste-secondary)";
const m = (k: number, d = 1) => `£${fmt(Math.abs(k) / 1000, d)}m`; // £ thousand to £m, sign dropped for prose

/* Map values are degrees below normal, so colder is the stronger colour; the tooltip shows the signed anomaly. */
const FRAMES = data.frames.map((f) => ({
  label: f.label,
  values: Object.fromEntries(Object.entries(f.values).map(([k, v]) => [k, -v])),
}));

function ColdSpellMap() {
  return (
    <Box title="Temperature Anomaly by Region" sub="°C" h={620} className="wr-map">
      <AnimatedUKMap frames={FRAMES} domain={[0, 12]} ms={800} stills={5}
        format={(v) => `${fmt(-v || 0, 1)} °C`} legendTitle="Below normal, darker is colder" />
    </Box>
  );
}

function HeatingCurveChart() {
  return (
    <Box title="Gas Demand and Effective Temperature" sub="GWh a day" h={400}>
      <Scatter points={data.curve.points} fit={data.curve.fit} xUnit="°C" yUnit="GWh" 
        label="Daily local distribution zone gas demand against effective temperature, with the fitted heating curve" />
    </Box>
  );
}

function WinterHeat() {
  return (
    <Box title="Monthly Temperature Anomaly by Winter" sub="°C below normal" h={300}>
      <Heatmap rows={data.heat.rows} cols={data.heat.cols} values={data.heat.values} unit="°C below normal" digits={1}
        diverge mid={0} domain={[-5.5, 5.5]} colEvery={5} rowW={40}
        label="Monthly national temperature anomaly for each winter from 1991/92 to 2025/26; cobalt is colder, red is warmer" />
    </Box>
  );
}

function PriceGateChart() {
  return (
    <Box title="Gas Price Change and Temperature Anomaly" sub="%" h={400}>
      <Scatter points={data.price.points} fit={data.price.fit} xUnit="°C" yUnit="%" xDigits={1}
        label="Monthly change in gas price against the month's temperature anomaly, winter months 2018 to 2025, with fitted line and 95% band" />
    </Box>
  );
}

type Case = "fixed" | "moves";
const HEDGES = Object.keys(data.dist.fixed);

/** Histogram of replayed winter margin in £m; with `controls`, a price case toggle and a hedge cover slider. */
export function MarginChart({ h, controls = false }: { h?: number; controls?: boolean }) {
  const [kase, setKase] = useState<Case>("fixed");
  const [cover, setCover] = useState(100);
  const key = HEDGES.find((k) => Math.round(Number(k) * 100) === cover) ?? "1.0";
  const s = data.dist[kase][key as keyof typeof data.dist.fixed];
  const bins = s.bins.map((b) => ({ x0: b.x0 / 1000, x1: b.x1 / 1000, n: b.n }));
  return (
    <>
      <Box title="Replayed Winter Margin" sub="£m" h={h}>
        <Histogram bins={bins} curve={s.curve} unit="£m" yUnit="winters" digits={1} xTicks={[-2, -1, 0, 1, 2]}
          label="Distribution of margin change across 35 replayed winters, with fitted curve" />
        <div className="legend">
          <span><i style={{ background: SECONDARY }} />Winters</span>
          <span><i style={{ background: NIGHT }} />Fitted</span>
        </div>
      </Box>
      {controls && (
        <div className="wr-controls">
          <div className="wr-chips" role="group" aria-label="Price case">
            {(["fixed", "moves"] as Case[]).map((c) => (
              <button key={c} className={"chip" + (kase === c ? " on" : "")} aria-pressed={kase === c} onClick={() => setKase(c)}>
                {c === "fixed" ? "Price fixed" : "Price follows weather"}
              </button>
            ))}
          </div>
          {kase === "moves" && (
            <Slider label="Hedge cover" min={80} max={120} step={5} value={cover} onChange={setCover} unit="%" />
          )}
          <p className="wr-read">One-in-ten: {s.one_in_10 < 0 ? "loss of " : "gain of "}{m(s.one_in_10)} · median {s.p50 < 0 ? "loss of " : "gain of "}{m(s.p50)}</p>
        </div>
      )}
    </>
  );
}

const EX = data.exceed;
const EX_MIN = Math.floor(Math.min(...EX.lo) / 500) * 500;

function ExceedanceChart() {
  const yt = Array.from({ length: Math.round(-EX_MIN / 500) + 2 }, (_, i) => (EX_MIN + i * 500) / 1000);
  return (
    <Box title="Margin by Exceedance Probability" sub="£m" h={380}>
      <LineChart labels={EX.labels} digits={2} unit="£m" yMin={EX_MIN / 1000} yMax={0.5} yTicks={yt}
        ticks={[0, 9, 19, 29, 39, 49].map((i) => ({ i, label: EX.labels[i] }))}
        band={{ top: EX.hi.map((v) => v / 1000), bottom: EX.lo.map((v) => v / 1000) }}
        series={[{ name: "Fitted", values: EX.fit.map((v) => v / 1000), color: SECONDARY }]} />
      <div className="legend">
        <span><i style={{ background: SECONDARY }} />Fitted</span>
        <span><i className="wr-band" />90% bootstrap band</span>
      </div>
    </Box>
  );
}

const TITLE = "Replaying thirty-five winters through a hedge book";

export default function WinterReplay() {
  const lede = `A supplier sets its hedge before it knows the winter. I replayed every winter since ${F.first_winter} through an illustrative book of ${fmt(F.customers)} gas customers to see how much margin the weather alone can move. A one-in-ten warm winter costs about ${m(F.m_1in10)}, roughly £${fmt(-F.m_1in10_per_customer, 0)} a customer, and 35 winters can only place that between ${m(F.boot_1in10_hi)} and ${m(F.boot_1in10_lo)}.`;
  usePageMeta(TITLE, lede);

  return (
    <Article kicker="Writing · weather risk" title={TITLE} lede={lede}>
      <Section title="What is weather risk for a gas supplier?" />
      <Prose>
        <p>A supplier buys most of its winter gas months ahead, sized to the volume it expects in a normal winter. Customers then use whatever the weather asks of them. In a cold winter the supplier sells more gas than it bought and has to buy the rest at the day's price. In a mild one it sells less and has gas left over. I wanted one number for that exposure, with an honest range, built from the weather Britain has actually had.</p>
        <p>The book is made up, and every figure from it is illustrative:<Fn n={1} /> {fmt(F.customers)} households, a round number chosen for the arithmetic, on Ofgem's typical {fmt(F.tdcv)} kWh a year, {fmt(F.portfolio_twh_year, 2)} TWh in all, paying the October to December 2026 cap rate of {fmt(F.tariff_ex_vat, 2)} p/kWh before VAT. The replay holds customer behaviour fixed; how households respond to price is a separate question I looked at in <a href="/price-response">measuring price response</a>.</p>
      </Prose>
      <Wide>
        <StatRow stats={[
          { num: m(F.m_1in10), label: "One-in-ten warm winter, margin lost" },
          { num: `${m(F.boot_1in10_hi)} to ${m(F.boot_1in10_lo)}`, label: "90% bootstrap range of that figure" },
          { num: `${fmt(-F.price_slope, 1)}%`, label: "Price rise per degree colder, not significant" },
        ]} />
      </Wide>

      <Section title="What does a cold spell look like region by region?" />
      <Prose>
        <p>I started from ERA5 (the European Centre's reconstruction of past weather) daily temperature at one large town in each of the UK's 12 regions, from 1991 to 13 September 2026.<Fn n={2} /> Every day is measured against one fixed normal for 2026. I took out the warming trend, {fmt(F.trend_per_decade, 2)} °C a decade nationally, so a 1990s winter is replayed in the 2026 climate, and the normal never moves between years.</p>
        <p>The chart shows the cold spell of late February 2018, when high pressure over Russia drove very cold air across the UK on easterly winds.<Fn n={3} /> Press play and watch England and Wales darken from 26 February, reach about 10 °C below normal on 28 February and 1 March, then clear from London and the south from 3 March while Scotland stays cold to the 6th.</p>
      </Prose>
      <Wide><ColdSpellMap /></Wide>
      <Prose>
        <p>Averaged across the regions, {F.spell_coldest_day} was {fmt(-F.spell_coldest_day_mean, 1)} °C below normal, and the East reached {fmt(-F.spell_min_value, 1)} °C below. Over the {F.spell_days} days Great Britain ran {fmt(-F.spell_gb_anom, 1)} °C below normal.</p>
      </Prose>

      <Section title="How much gas does a degree of cold add?" />
      <Prose>
        <p>To turn temperature into volume I fitted a heating curve to national daily gas demand from the local distribution zones (the networks that feed homes and small businesses), October 2023 to September 2026.<Fn n={4} /> Demand is a base load plus a fixed amount for every degree the effective temperature sits below {fmt(F.curve_thr)} °C. Effective temperature blends {fmt((1 - F.curve_a) * 100)}% of today with {fmt(F.curve_a * 100)}% of yesterday's value, because buildings cool slowly. I covered that link in more depth in <a href="/tempanddemand">temperature and demand</a>.</p>
        <p>The chart shows {fmt(F.curve_days)} days against that curve: {fmt(F.curve_slope)} GWh a day for each degree below {fmt(F.curve_thr)} °C on a base of {fmt(F.curve_base)} GWh, and the curve explains {fmt(F.curve_r2 * 100, 1)}% of the day-to-day variation.</p>
      </Prose>
      <Wide><HeatingCurveChart /></Wide>
      <Prose>
        <p>As a check, I refitted it three times, leaving out one gas year each time, and predicted that winter. With the real weather the average daily error was {fmt(F.loyo_weather_mape, 1)}%. With normal weather fed into the same curve it was {fmt(F.loyo_normal_mape, 1)}%, so the weather accounts for a good part of the miss.</p>
      </Prose>

      <Section title="Which winters were cold, and when?" />
      <Prose>
        <p>I took every November to March from {F.first_winter} to {F.last_winter}, {F.winters} winters, and laid each one's daily anomalies onto the coming winter's normal. The chart shows the monthly anomaly for each winter, cobalt for colder and red for warmer. Cold winters tend to hang on one month: December 2010 was {fmt(-F.dec2010_anom, 1)} °C below normal and March 2013 was {fmt(-F.mar2013_anom, 1)} °C below. A single month has a standard deviation (its typical swing) of {fmt(F.sd_month_anom, 2)} °C, a whole winter only {fmt(F.sd_winter_anom, 2)} °C, because the months partly cancel.</p>
      </Prose>
      <Wide><WinterHeat /></Wide>
      <Prose>
        <p>Run through the curve, the replayed winters move the book's November to March volume, {fmt(F.winter_mwh_normal / 1e6, 2)} TWh in a normal winter, by between {fmt(F.vol_p10, 1)}% and +{fmt(F.vol_p90, 1)}% in eight winters out of ten, and from {fmt(F.vol_min, 1)}% to +{fmt(F.vol_max, 1)}% at the extremes.</p>
      </Prose>

      <Section title="Does cold weather also move the price?" />
      <Prose>
        <p>If cold weather lifted prices too, the supplier would be short of gas exactly when gas is dear, and the share it hedged would matter. I only let that into the model when the data supports it: the slope has to point the right way and sit at least two standard errors (its typical sampling wobble) from zero. The month-ahead price a hedge would lock in is licensed, so I used the average System Average Price of gas over the five days before each month as a stand-in.<Fn n={5} /> The chart shows {F.price_n} winter months from February 2018 to November 2025.</p>
      </Prose>
      <Wide><PriceGateChart /></Wide>
      <Prose>
        <p>The slope is {fmt(F.price_slope, 1)}% per degree warmer, so colder months run a little dearer, but its standard error is {fmt(F.price_se, 1)}%, so it fails the gate. The 2021/22 and 2022/23 crisis winters pull the slope towards zero: leave their {F.price_n - F.calm_n} months out and the slope steepens to {fmt(F.calm_slope, 1)}% with a standard error of {fmt(F.calm_se, 1)}%, which would pass. I keep price fixed in my central case, as the gate says, and use the calmer slope as a what-if.</p>
      </Prose>

      <Section title="How much margin is at risk?" />
      <Prose>
        <p>Each extra kWh earns the tariff before VAT, less variable non-commodity costs of {fmt(F.non_commodity, 2)} p/kWh, less the hedge price of {fmt(F.hedge_price, 2)} p/kWh: a margin of {fmt(F.unit_margin, 2)} p/kWh. I split the change at the hedge price into volume margin and hedge drift, the gain or loss on gas bought or sold at the market price instead of the hedge price.<Fn n={6} /> The chart shows the {F.winters} replayed outcomes with a fitted curve. Their skewness (how far the spread leans to one side) is {fmt(F.m_skew, 2)}, above my threshold of 0.5, so the fit is a skew-normal, a bell curve allowed to lean.</p>
      </Prose>
      <Wide><MarginChart h={400} controls /></Wide>
      <Prose>
        <p>With price fixed, a warm winter is the danger. {F.worst_winter} replayed into the 2026 climate would cost {m(F.worst_winter_margin)} and {F.best_winter} would add {m(F.best_winter_margin)}. The fitted one-in-ten is a loss of {m(F.m_1in10)}, or £{fmt(-F.m_1in10_per_customer, 2)} a customer, and the one-in-twenty is {m(F.m_1in20)}. The middle winter is itself a small loss of {m(F.m_p50, 2)}, because the replayed winters have a long cold tail, which leaves the typical one a touch warmer than the average.</p>
        <p>Switch to the price what-if and the hedge slider starts to matter. With the calmer {fmt(F.calm_slope, 1)}% slope, cold winters now cost too, because the extra gas is bought dear, and each 10 points of cover above normal volume deepens the one-in-ten loss by about {m(F.mv_cost_per_10pts, 2)}, from {m(F.mv_1in10_100)} at 100% to {m(F.mv_1in10_120)} at 120%. Cover below 100% looks cheaper here only because the model ignores price moves unrelated to weather, so I wouldn't read it as a case for under-hedging.</p>
      </Prose>

      <Section title="How sure can I be of a one-in-ten from 35 winters?" />
      <Prose>
        <p>Not very. A one-in-ten from 35 winters rests on the three or four warmest. I resampled the 35 winters 1,000 times with replacement (a bootstrap), refitted each sample and read off the spread. The chart shows the fitted margin at each exceedance probability (the chance of doing worse), with that band around it.</p>
      </Prose>
      <Wide><ExceedanceChart /></Wide>
      <Prose>
        <p>The 90% band on the one-in-ten runs from a {m(F.boot_1in10_hi)} loss to a {m(F.boot_1in10_lo)} loss. Dropping any single winter and refitting moves the estimate between {m(F.drop_1in10_max)} and {m(F.drop_1in10_min)}, so no single winter drives it.</p>
      </Prose>

      <Section title="What I would do with these figures" />
      <Prose>
        <p>I would price the weather premium near the top of the band. On this book that means holding about £{fmt(F.boot_1in10_hi_per_customer, 2)} a customer against a warm winter, the upper end of the bootstrap range, in place of the £{fmt(-F.m_1in10_per_customer, 2)} point estimate, because 35 winters can't narrow it further.</p>
        <p>I would hedge to normal-weather volume and stop there. With price fixed, extra cover buys no protection against weather. If the calmer price slope holds, every 10 points above 100% costs about {m(F.mv_cost_per_10pts, 2)} at one-in-ten.</p>
        <p>I would rerun the price gate each autumn as winter months accumulate. Outside the crisis winters it already passes, so I expect to switch weather-driven price on soon, and when it does the one-in-ten at full cover rises to {m(F.mv_1in10_100)}, which is the figure I would then hold the premium against.</p>
        <p>I would keep one fixed, detrended normal and replay whole winters. The industry's seasonal normal is revised from time to time,<Fn n={7} /> which moves the baseline under any year-on-year comparison, and its one-in-twenty peak day answers a different question, about the single coldest day a network must supply.<Fn n={8} /></p>
      </Prose>

      <Footnotes notes={[
        <>The supplier, tariff margin and hedge are illustrative. Customers use Ofgem's medium gas typical domestic consumption value of 11,500 kWh a year: Ofgem, <a href="https://www.ofgem.gov.uk/sites/default/files/2023-05/TDCV%202023%20Decision%20Letter.pdf" target="_blank" rel="noopener">decision on typical domestic consumption values</a>, 25 May 2023. Tariff is the average Direct Debit gas unit rate under the cap for 1 October to 31 December 2026, 7.97 p/kWh including 5% VAT, divided by 1.05: Ofgem, <a href="https://www.ofgem.gov.uk/news/changes-energy-price-cap-between-1-october-and-31-december-2026" target="_blank" rel="noopener">Changes to energy price cap between 1 October and 31 December 2026</a>, 26 August 2026. The book's daily volume follows the shape of national distribution zone demand, scaled to {fmt(F.portfolio_twh_year, 2)} TWh in a normal year.</>,
        <>ECMWF ERA5 daily mean 2 m temperature through the <a href="https://open-meteo.com/en/docs/historical-weather-api" target="_blank" rel="noopener">Open-Meteo historical weather API</a> (0.25° grid), 1 January 1991 to 13 September 2026, at Newcastle, Manchester, Leeds, Nottingham, Birmingham, Cambridge, London, Reading, Bristol, Cardiff, Glasgow and Belfast. Great Britain is the mean of the 11 GB points weighted by ONS mid-2024 population estimates (Nomis). Each series is detrended on complete-year means from 1991 to 2025 to the 2026 climate, then given a three-harmonic day-of-year normal; the anomaly is the difference.</>,
        <>Met Office, <a href="https://www.metoffice.gov.uk/about-us/news-and-media/media-centre/weather-and-climate-news/2018/cold-and-snowy-week-ahead" target="_blank" rel="noopener">Bitterly cold with widespread snow</a>, 25 February 2018; Met Office, <a href="https://www.metoffice.gov.uk/about-us/news-and-media/media-centre/weather-and-climate-news/2018/march-statistics" target="_blank" rel="noopener">March statistics</a>, 29 March 2018, which records a maximum of −4.7 °C at Tredegar on 1 March 2018, the lowest March daily maximum on UK record. The map runs from 22 February to 6 March 2018.</>,
        <>National Gas daily LDZ offtake, 1 October 2023 to 13 September 2026, as collected for my temperature and demand piece. Curve: demand = base + slope × max(0, threshold − effective temperature), with the lag (0 to 0.8) and threshold (12 to 19 °C) chosen by grid search on R². The check refits on two gas years and scores the third, November to March, as mean absolute percentage error.</>,
        <>ONS, <a href="https://www.ons.gov.uk/economy/economicoutputandproductivity/output/datasets/systemaveragepricesapofgas" target="_blank" rel="noopener">System Average Price (SAP) of gas</a>, release of 18 December 2025 (source National Gas Transmission). For each November to March month, 100 × ln(month's mean SAP ÷ mean SAP of the five days before it) regressed on the Great Britain monthly anomaly by least squares: slope {fmt(F.price_slope, 1)}% per °C, standard error {fmt(F.price_se, 1)}%, {F.price_n} months. The five-day mean stands in for the month-ahead price, which is not public.</>,
        <>Margin change by month = (replayed volume − normal volume) × (tariff − non-commodity cost − hedge price) + (replayed volume − hedge cover) × (hedge price − market price). Non-commodity cost of 2.0 p/kWh is my assumption. The hedge price is the mean SAP from November 2024 to March 2025. Hedge cover is a share of each month's normal-weather volume. The what-if sets market price = hedge price × exp(slope × anomaly). Fit: skew-normal when the absolute sample skewness is at least 0.5, otherwise normal. Bootstrap: 1,000 resamples of the 35 winters, refitted, 5th to 95th percentile.</>,
        <>Joint Office of Gas Transporters, <a href="https://gasgovernance.co.uk/sites/default/files/2023-06/10%20TPD%20Section%20H%20-%20Demand%20Estimation%20and%20Demand%20Forecasting.pdf" target="_blank" rel="noopener">Uniform Network Code TPD Section H</a>, paragraphs 1.5.1 to 1.5.3: seasonal normal demand uses a seasonal normal composite weather variable that a committee reviews and may revise from the start of a gas year.</>,
        <>Northern Gas Networks, <a href="https://northerngasnetworks.co.uk/wp-content/uploads/2024/10/NGN-ECPG-Annual-Report_Final_Redacted.pdf" target="_blank" rel="noopener">ECPG annual report</a>, October 2024, quoting the Uniform Network Code definition (section W2.6.4(c)): peak one-in-twenty demand is the daily demand that would be exceeded in one winter out of twenty.</>,
      ]} />
    </Article>
  );
}
