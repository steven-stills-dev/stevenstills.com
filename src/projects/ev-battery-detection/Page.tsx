import { useState } from "react";
import { Article, Prose, Section, Wide, Fn, Footnotes } from "../../components/Article";
import Box from "../../components/Box";
import LineChart from "../../components/charts/LineChart";
import Heatmap from "../../components/charts/Heatmap";
import Histogram from "../../components/charts/Histogram";
import DataTable from "../../components/charts/DataTable";
import Slider from "../../components/charts/Slider";
import { usePageMeta } from "../../lib/meta";
import data from "./data.json";
import "./ev-battery-detection.css";

const NIGHT = "var(--ste-night)", SECONDARY = "var(--ste-secondary)";

/* Half hours on a noon-to-noon day: slot 0 is 12:00. */
const HH = Array.from({ length: 48 }, (_, k) => {
  const m = (12 * 60 + k * 30) % (24 * 60);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${m % 60 ? "30" : "00"}`;
});
const HH_TICKS = [{ i: 0, label: "12:00" }, { i: 12, label: "18:00" }, { i: 24, label: "00:00" }, { i: 36, label: "06:00" }, { i: 47, label: "11:30" }];

type Kind = keyof typeof data.shapes;
const TYPES = data.types as Kind[];

function Chips<T extends string>({ items, on, set, label }: { items: readonly T[]; on: T; set: (v: T) => void; label: string }) {
  return (
    <div className="ev-battery-detection-chips" role="group" aria-label={label}>
      {items.map((v) => (
        <button key={v} aria-pressed={on === v} className={"chip" + (on === v ? " on" : "")} onClick={() => set(v)}>{v}</button>
      ))}
    </div>
  );
}

/** Median import day by household type with the 10th to 90th percentile band; also the home preview. */
export function TypicalDayChart({ h }: { h?: number }) {
  const [kind, setKind] = useState<Kind>("Car and battery");
  const s = data.shapes[kind];
  return (
    <>
      <Box title="Typical Import Day by Household Type" sub="kW" h={h}>
        <LineChart labels={HH} ticks={HH_TICKS} unit="kW" digits={2} yMin={0} yMax={3.5} yTicks={[0, 1, 2, 3]}
          band={{ top: s.hi, bottom: s.lo }} series={[{ name: kind, values: s.mid, color: SECONDARY }]} />
      </Box>
      <Chips items={TYPES} on={kind} set={setKind} label="Household type" />
    </>
  );
}

type Example = keyof typeof data.examples;
const EXAMPLES = Object.keys(data.examples) as Example[];
const DAY_ROWS = Array.from({ length: 30 }, (_, d) => String(d + 1));

function HouseholdMonthChart() {
  const [ex, setEx] = useState<Example>("Car, 7 kW");
  return (
    <>
      <Box title="One Household's Month, Noon to Noon" sub="kWh per half hour" h={480}>
        <Heatmap rows={DAY_ROWS} cols={HH} values={data.examples[ex].kwh} unit="kWh" digits={2} domain={[0, 3.5]}
          colEvery={12} rowW={28} label={`Half-hourly import for one synthetic ${ex} household over 30 days`} />
      </Box>
      <Chips items={EXAMPLES} on={ex} set={setEx} label="Example household" />
    </>
  );
}

type HistKey = keyof typeof data.hist;
function EveningShareChart() {
  const [k, setK] = useState<HistKey>("Battery");
  return (
    <>
      <Box title="Evening Near-Zero Share" sub="households" h={340}>
        <Histogram bins={data.hist[k]} digits={2} xTicks={[0, 0.25, 0.5, 0.75, 1]} yUnit="homes"
          label={`Distribution of the share of evening half hours with near-zero import, ${k.toLowerCase()} homes`} />
      </Box>
      <Chips items={Object.keys(data.hist) as HistKey[]} on={k} set={setK} label="Battery status" />
    </>
  );
}

type Pop = keyof typeof data.confusion;
function ConfusionChart() {
  const [pop, setPop] = useState<Pop>("Core types");
  return (
    <>
      <Box title="Detected Against Actual Devices" sub="households" h={340}>
        <Heatmap rows={data.classes.map((c) => `${c}`)} cols={data.classes.map((c) => `Flagged ${c.toLowerCase()}`)}
          values={data.confusion[pop]} unit="homes" rowW={70} domain={[0, 600]}
          label="Confusion matrix: actual device class down, flagged class across" />
      </Box>
      <Chips items={Object.keys(data.confusion) as Pop[]} on={pop} set={setPop} label="Population" />
    </>
  );
}

function ScoreTable() {
  return (
    <Box title="Precision and Recall With 95% Intervals" sub="%">
      <DataTable caption="Precision and recall of the car and battery flags with bootstrap intervals"
        columns={[
          { key: "device", label: "Device" }, { key: "population", label: "Homes" },
          { key: "precision", label: "Precision", digits: 1, tint: true }, { key: "p_lo", label: "Low", digits: 1 }, { key: "p_hi", label: "High", digits: 1 },
          { key: "recall", label: "Recall", digits: 1, tint: true }, { key: "r_lo", label: "Low", digits: 1 }, { key: "r_hi", label: "High", digits: 1 },
        ]}
        rows={data.table} />
    </Box>
  );
}

const NOISE_LABELS = data.sweep.noise.map((n) => n.toFixed(2));
type Dev = "Car" | "Battery";
function TradeOffChart() {
  const [dev, setDev] = useState<Dev>("Battery");
  const [thr, setThr] = useState(0.5);
  const key = thr.toFixed(1) as keyof typeof data.sweep.ev;
  const s = (dev === "Car" ? data.sweep.ev : data.sweep.bat)[key];
  return (
    <>
      <Box title="Precision and Recall by Noise Level" sub="%" h={360}>
        <LineChart labels={NOISE_LABELS} ticks={NOISE_LABELS.map((label, i) => ({ i, label }))} unit="%" digits={1}
          yMin={0} yMax={100} yTicks={[0, 25, 50, 75, 100]}
          series={[{ name: "Precision", values: s.precision, color: NIGHT }, { name: "Recall", values: s.recall, color: SECONDARY }]} />
        <div className="legend">
          <span><i style={{ background: NIGHT }} />Precision</span>
          <span><i style={{ background: SECONDARY }} />Recall</span>
        </div>
      </Box>
      <div className="ev-battery-detection-controls">
        <Chips items={["Car", "Battery"] as const} on={dev} set={setDev} label="Device" />
        <Slider label="Flag threshold" min={0.3} max={0.8} step={0.1} value={thr} onChange={setThr} digits={1} />
      </div>
    </>
  );
}

function ClusterTable() {
  const rows = data.clusters.map((c) => ({
    cluster: c.id, n: c.n, ordinary: c.counts["Ordinary"], heater: c.counts["Immersion heater"],
    car7: c.counts["Car, 7 kW"], car36: c.counts["Car, 3.6 kW"], battery: c.counts["Battery"], both: c.counts["Car and battery"],
  }));
  return (
    <Box title="Cluster Membership by Household Type" sub="households">
      <DataTable caption="Number of households of each synthetic type in each K-means cluster"
        columns={[
          { key: "cluster", label: "Cluster" }, { key: "n", label: "Homes" },
          { key: "ordinary", label: "Ordinary", tint: true }, { key: "heater", label: "Heater", tint: true },
          { key: "car7", label: "Car 7 kW", tint: true }, { key: "car36", label: "Car 3.6 kW", tint: true },
          { key: "battery", label: "Battery", tint: true }, { key: "both", label: "Car and battery", tint: true },
        ]}
        rows={rows} />
    </Box>
  );
}

const TITLE = "Detecting electric cars and home batteries in half-hourly meter data";

export default function EvBatteryDetection() {
  const lede = "A supplier that knew which homes charge an electric car or run a home battery could forecast them better, but it rarely knows. I wrote simple, explainable rules that look for both in a month of half-hourly import readings and tested them on 1,800 synthetic households. They found 89% of the cars and 78% of the batteries, and the car rule's mistakes taught me the most.";
  usePageMeta(TITLE, lede);

  return (
    <Article kicker="Writing · smart meter data" title={TITLE} lede={lede}>
      <Prose>
        <p>My day job runs on gradient boosting these days. For this piece I went the other way on purpose, with rules simple enough to read out loud.</p>
        <p>They did well enough, but the car rule also flagged a good many immersion heaters along the way. Its mistakes are the most useful part of this piece.</p>
        <p>What I was looking for are the two devices a supplier would most like to know about and is least often told. Electric cars and home batteries.</p>
      </Prose>

      <Section title="What am I trying to find out?" />
      <Prose>
        <p>An electric car or a home battery shifts a household's demand between hours more than anything else in the house, and under half-hourly settlement a supplier pays for each half hour (I covered the battery case in <a href="/batteries">home batteries and settlement risk</a>). Customers rarely tell their supplier when they buy either. The Department for Transport counted 1,737,000 licensed zero emission cars in the UK at the end of 2025.<Fn n={1} /></p>
        <p>I wanted to know whether simple rules can tell a car from a battery from a timed immersion heater using half-hourly import readings alone, and whether unsupervised clustering (grouping homes by similarity without being told the answer) finds the same groups. Ofgem's 2022 changes to the supply licence let suppliers use half-hourly data collected for settlement for forecasting, with personal data anonymised and aggregated as early as is reasonably practicable, and for developing products aimed at broad market segments.<Fn n={2} /> I read that as room to count and forecast segments. Homes that opt out to daily data are invisible to any of this.</p>
        <p>Every household here is synthetic and illustrative: a generator I wrote builds 300 homes of each of six types over a 30-day month, with ordinary use anchored to Ofgem's typical 2,500 kWh a year, about 6.85 kWh a day.<Fn n={3} /> None is a real customer, and because I made them, I know which device each one has.</p>
      </Prose>

      <Section title="What do the devices look like in half-hourly data?" />
      <Prose>
        <p>The cars charge at 7 kW or 3.6 kW, near the two ends of the range in the government's home chargepoint specification,<Fn n={4} /> on between 3% and 60% of nights, starting after 23:30 with a short random delay of the kind smart chargepoints must apply.<Fn n={5} /> The immersion heaters draw 3 kW on 60% to 100% of nights. The batteries hold 3 to 10 kWh, fill from the grid overnight on most nights and run the house through the evening. The chart shows the typical day for each type, with a band for the middle 80% of homes. The car homes look almost ordinary, because a car that charges on two nights in five drops out of a median day.</p>
      </Prose>
      <Wide><TypicalDayChart h={380} /></Wide>
      <Prose>
        <p>The chart shows a month for one household of each kind, one row per day running noon to noon so an overnight charge stays on one row. The 7 kW car is a dark block on some nights only, the heater a fainter stripe on most nights, and the battery home pale through the evening with a stripe after midnight.</p>
      </Prose>
      <Wide><HouseholdMonthChart /></Wide>

      <Section title="How do the rules decide?" />
      <Prose>
        <p>For cars, the baseline is each home's median half hour. A charging block is at least three half hours, each 1.2 kWh or more above baseline (2.4 kW), totalling 5 kWh or more, and flat: the coefficient of variation (spread relative to the average) of its inner half hours is 0.25 or less. The end half hours are ignored because a charge rarely starts on the boundary. To strip loads that run nearly every night, I subtract each half hour's 20th percentile across the month; a block counts if it survives that or runs at 5.8 kW or more. Three charging nights score 0.5, two high-power nights add 0.3, and charging on 80% of nights or fewer adds 0.2. A score of 0.5 raises the flag.</p>
        <p>For batteries, the first clue is the share of evening half hours (16:00 to 23:00) importing 0.03 kWh or less: 40% or more scores 0.6, and 20% or more scores 0.3. The second is a night top-up of at least 2.5 kWh above baseline between 23:30 and 05:30 on most nights (the 20th percentile across nights), which adds 0.4. Days importing under 1.6 kWh count as unoccupied and are dropped, and a home occupied on fewer than half its days is held below the flag, because an empty house is also quiet in the evening.</p>
        <p>The chart shows how cleanly the evening clue separates the groups: 99% of homes without a battery have an evening near-zero share of 0.01 or less, against a median of 0.57 for battery homes.</p>
      </Prose>
      <Wide><EveningShareChart /></Wide>

      <Section title="How often are the rules right?" />
      <Prose>
        <p>Precision is the share of flagged homes that really have the device, and recall is the share of homes with the device that get flagged. The battery rule had a precision of 100% and a recall of 78.2%. The car rule found 89.0% of cars, with a 95% bootstrap interval (the range I got by resampling the homes 1,000 times) of 87.0% to 91.0%, but only 77.6% of its flags were right. The intervals are narrow, so the errors come from the rules themselves. The chart shows where each home ended up.</p>
      </Prose>
      <Wide><ConfusionChart /></Wide>
      <Prose>
        <p>The car rule flagged 45.7% of the heater homes and 31.3% of the battery-only homes. A heater that skips some nights is no longer a recurring load, so its 3 kW block survives the subtraction and looks like a slow car, and a battery that tops up on some nights only does the same. The solar chip adds 300 homes whose batteries fill from panels. The battery rule caught 42% of them; 56% failed the unoccupied test, because solar covers the day and the battery the evening.</p>
      </Prose>
      <Wide><ScoreTable /></Wide>
      <Prose>
        <p>An equal mix of types flatters precision: the car rule flagged 25.7% of homes without a car, all of them heater or battery homes, so if 5% of homes had a car and the rest kept this mix, Bayes' rule (combining recall, that false alarm rate and how common cars are) puts precision at 15.4%.</p>
        <p>The chart shows precision and recall as I add noise to each home's ordinary use, as a log standard deviation (roughly the proportional swing per half hour), at the threshold the slider sets. A car threshold of 0.8 demands high-power nights: precision reaches 100% and recall falls to 48.9%, with 82.0% of 7 kW cars found and none at 3.6 kW. The chart opens on the battery rule, whose recall falls from 79.2% to 65.2% as noise rises; noise barely moves the car rule.</p>
      </Prose>
      <Wide><TradeOffChart /></Wide>

      <Section title="Does clustering find the same groups?" />
      <Prose>
        <p>I ran K-means, which splits homes into k groups around average profiles, on each home's median-day shape plus eight summary figures, without the labels. The silhouette score (how much closer each home sits to its own group than to the next, from minus 1 to 1) chose four groups, at 0.47.<Fn n={6} /> The adjusted Rand index, which scores agreement with the true types after allowing for chance (0 is random, 1 is perfect), came out at 0.35.</p>
        <p>The table shows why. Clusters 3 and 4 held 550 of the 600 battery homes and no home without a battery, so clustering largely agrees with the battery rule. The cars scattered into the ordinary and heater clusters, because the median day hides a car that charges intermittently. A three-level decision tree on the eight summary figures reproduced the clusters for 97.4% of homes, splitting on night share and evening near-zero share, so each cluster has a rule a person can read.</p>
      </Prose>
      <Wide><ClusterTable /></Wide>

      <Section title="What I would do with these rules" />
      <Prose>
        <p>I would use the battery flag for forecast segments. Its precision held at 100% in every test here and clustering found the same homes. It missed 21.8% of batteries, more with solar, so I would treat homes that fail the unoccupied test on most days as a possibly-solar segment instead of dropping them.</p>
        <p>I would not act on the car flag at 0.5 alone: at 5% ownership, with heaters and batteries as common as here, about 85% of its flags would be wrong. The 0.8 threshold gives near-certain 7 kW cars; the rest are candidates to confirm. I would also swap the fixed 23:30 to 05:30 window for each tariff's own off-peak hours.</p>
        <p>I would use clustering on a median day only as a cross-check, because it cannot see intermittent charging. Before trusting any of these numbers I would score the rules on a labelled sample of real homes, because rules tuned on my own generator will flatter themselves on it. And I would keep the flags in aggregate forecast segments; anything aimed at one household should start by asking the customer.<Fn n={7} /></p>
        <p>So simple rules can find a battery, and once cars are as rare as 5% of homes, a car rule on its own mostly flags heaters and batteries. After years of neural networks and gradient boosting, it took only a three-level tree to reproduce the clusters for 97.4% of homes. If you try this on your own meters, start with the evening: a battery home's quiet 16:00 to 23:00 is the cleanest signal in this piece.</p>
      </Prose>

      <Footnotes notes={[
        <>Department for Transport, <a href="https://www.gov.uk/government/statistics/vehicle-licensing-statistics-2025/vehicle-licensing-statistics-united-kingdom-2025" target="_blank" rel="noopener">Vehicle licensing statistics, United Kingdom: 2025</a>, 29 April 2026. Zero emission cars licensed at the end of December 2025.</>,
        <>Ofgem, <a href="https://www.ofgem.gov.uk/sites/default/files/2022-09/Decision%20on%20Modifying%20SLC%2047%20of%20the%20electricity%20supply%20licence.pdf" target="_blank" rel="noopener">Decision to modify electricity supply licence condition 47</a>, September 2022. New-system domestic customers share half-hourly data by default and may opt out to daily. Business readiness covers improving forecasting and developing products aimed at broad market segments. Whether a particular use is lawful also depends on data protection law, which Ofgem does not regulate.</>,
        <>Ofgem, <a href="https://www.ofgem.gov.uk/sites/default/files/2026-06/Summary-of-changes-to-energy-price-cap-1-July-to-30-September-2026-revised-TDCV.pdf" target="_blank" rel="noopener">Energy price cap update from 1 July 2026 (revised TDCV)</a>, 1 July 2026: typical domestic consumption values of 2,500 kWh for single-rate electricity, 3,400 kWh for multi-register meters and 9,500 kWh for gas.</>,
        <>Office for Zero Emission Vehicles, <a href="https://www.gov.uk/guidance/residential-chargepoints-minimum-technical-specification" target="_blank" rel="noopener">Residential chargepoints: minimum technical specification</a>, updated 2 August 2023. Standard AC output must be greater than 3.5 kW and not greater than 7 kW.</>,
        <><a href="https://www.legislation.gov.uk/uksi/2021/1467/made" target="_blank" rel="noopener">The Electric Vehicles (Smart Charge Points) Regulations 2021</a>, regulations 10 and 11: default charging hours outside 08:00 to 11:00 and 16:00 to 22:00 on weekdays, and a default randomised delay of up to 600 seconds.</>,
        <>P. J. Rousseeuw, Silhouettes: a graphical aid to the interpretation and validation of cluster analysis, Journal of Computational and Applied Mathematics 20 (1987), 53 to 65. The wider field of finding appliances in whole-home data started with G. W. Hart, <a href="https://doi.org/10.1109/5.192069" target="_blank" rel="noopener">Nonintrusive appliance load monitoring</a>, Proceedings of the IEEE 80(12), 1992. For cars in hourly data, Hoffmann and others, <a href="https://sintef.no/en/publications/publication/1697556" target="_blank" rel="noopener">Automated detection of electric vehicles in hourly smart meter data</a>, CIRED 2019, report detecting up to 90% of cars at a 10% false positive rate with trained models.</>,
        <>Illustrative data. All 1,800 households (2,100 with the solar-and-battery homes) come from a seeded generator in <code>scripts/ev-battery-detection/build.py</code>: a base day of two daily peaks, an overnight trough, random appliance spikes and multiplicative noise with a log standard deviation of 0.25, scaled to 2,500 kWh a year with household-to-household spread; 1% of readings are removed at random. Days run noon to noon and need 44 of 48 readings; homes need 7 usable days. Precision and recall use a flag threshold of 0.5; intervals are 2.5th and 97.5th percentiles of 1,000 bootstrap resamples of households. Clustering uses K-means with 10 starts for k from 3 to 10; the tree has a depth of 3 and at least 25 homes per leaf. The detector thresholds are my own and were set on this generator.</>,
      ]} />
    </Article>
  );
}
