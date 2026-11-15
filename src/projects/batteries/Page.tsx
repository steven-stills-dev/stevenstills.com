import { Article, Prose, Section, Wide, Fn, Footnotes, StatRow } from "../../components/Article";
import Box from "../../components/Box";
import LineChart from "../../components/charts/LineChart";
import { ramp } from "../../components/charts/geom";
import { usePageMeta } from "../../lib/meta";
import BatteryAnim from "./BatteryAnim";
import "./batteries.css";

/* ── Solar generation against demand: hourly profiles, 00:00 -> 24:00 (arbitrary MW) ── */
const SOLAR = [0, 0, 0, 0, 0, 2, 8, 20, 38, 58, 78, 92, 100, 98, 88, 70, 48, 26, 10, 2, 0, 0, 0, 0, 0];
const DEMAND = [42, 40, 38, 37, 38, 42, 52, 64, 66, 60, 56, 54, 52, 53, 55, 60, 68, 80, 86, 82, 72, 62, 52, 46, 42];
const HOUR_LABELS = SOLAR.map((_, h) => `${String(h).padStart(2, "0")}:00`);
const HOUR_TICKS = [0, 6, 12, 18, 24].map((i) => ({ i, label: HOUR_LABELS[i] }));

/* ── Day-ahead against imbalance: 48 half-hours, day-ahead from anchor points,
   imbalance tracking it with a short-system overshoot through the evening peak ── */
const ANCH: [number, number][] = [[0, 46], [3, 42], [6, 48], [8, 73], [10, 57], [13, 39], [15, 47], [17, 80], [19, 121], [20.5, 139], [22, 84], [24, 57]];
function interp(h: number): number {
  for (let a = 0; a < ANCH.length - 1; a++) {
    if (h >= ANCH[a][0] && h <= ANCH[a + 1][0]) {
      const f = (h - ANCH[a][0]) / (ANCH[a + 1][0] - ANCH[a][0]);
      return ANCH[a][1] + (ANCH[a + 1][1] - ANCH[a][1]) * f;
    }
  }
  return ANCH[ANCH.length - 1][1];
}
const DA: number[] = [], IMB: number[] = [];
for (let k = 0; k < 48; k++) {
  const h = k / 2;
  const da = interp(h);
  const wig = 8 * Math.sin(k * 1.27) + 5 * Math.sin(k * 0.53 + 1);
  const eve = h >= 16.5 && h <= 22.5 ? 10 * Math.max(0, 1 - Math.abs(h - 20.5) / 2.2) : 0;
  DA.push(da);
  IMB.push(Math.max(-15, da - 5 + wig + eve * 1.6));
}
DA[41] = 139; IMB[41] = 150;   // the cited 20:30 anchor

const HH_LABELS = Array.from({ length: 48 }, (_, k) => `${String(Math.floor(k / 2)).padStart(2, "0")}:${k % 2 ? "30" : "00"}`);
const PRICE_TICKS = [{ i: 0, label: "00:00" }, { i: 12, label: "06:00" }, { i: 24, label: "12:00" }, { i: 36, label: "18:00" }, { i: 47, label: "00:00" }];
const SHIFT_TICKS = [{ i: 0, label: "00:00" }, { i: 12, label: "06:00" }, { i: 24, label: "12:00" }, { i: 36, label: "18:00" }, { i: 47, label: "24:00" }];

/* ── Modelled grid import, avg kW per home, 48 half-hours from 00:00 ── */
const S_PLAIN = [0.169, 0.169, 0.169, 0.169, 0.169, 0.17, 0.17, 0.171, 0.173, 0.179, 0.195, 0.229, 0.288, 0.366, 0.437, 0.471, 0.451, 0.392, 0.328, 0.281, 0.26, 0.255, 0.26, 0.266, 0.273, 0.278, 0.282, 0.287, 0.295, 0.308, 0.332, 0.368, 0.418, 0.48, 0.548, 0.612, 0.661, 0.683, 0.674, 0.633, 0.569, 0.49, 0.411, 0.339, 0.28, 0.237, 0.208, 0.19];
const S_SOLAR = [0.169, 0.169, 0.169, 0.169, 0.169, 0.17, 0.17, 0.171, 0.173, 0.179, 0.108, 0.108, 0.124, 0.148, 0.155, 0.123, 0.062, 0.017, 0.003, 0.001, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.001, 0.003, 0.012, 0.041, 0.11, 0.212, 0.313, 0.381, 0.409, 0.401, 0.368, 0.323, 0.339, 0.28, 0.237, 0.208, 0.19];
const S_BATT = [0.169, 0.169, 0.169, 0.169, 0.169, 0.17, 0.17, 0.171, 0.173, 0.179, 0.108, 0.108, 0.124, 0.148, 0.155, 0.123, 0.062, 0.017, 0.003, 0.001, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.001, 0.001, 0.002, 0.003, 0.006, 0.01, 0.015, 0.02, 0.024, 0.026, 0.027, 0.028, 0.026, 0.025, 0.023, 0.023];
const S_B10 = [0.166, 0.166, 0.166, 0.167, 0.167, 0.167, 0.167, 0.168, 0.17, 0.176, 0.104, 0.104, 0.119, 0.141, 0.148, 0.116, 0.055, 0.014, 0.002, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.001, 0.002, 0.005, 0.009, 0.012, 0.016, 0.019, 0.02, 0.021, 0.02, 0.019, 0.018, 0.018];
const S_B90 = [0.172, 0.172, 0.172, 0.172, 0.172, 0.173, 0.173, 0.174, 0.176, 0.182, 0.111, 0.112, 0.13, 0.155, 0.163, 0.131, 0.068, 0.02, 0.004, 0.001, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.001, 0.001, 0.001, 0.002, 0.004, 0.006, 0.01, 0.016, 0.022, 0.027, 0.031, 0.034, 0.034, 0.035, 0.032, 0.03, 0.028, 0.027];
const W_PLAIN = [0.212, 0.212, 0.212, 0.212, 0.212, 0.212, 0.213, 0.214, 0.216, 0.224, 0.244, 0.287, 0.361, 0.458, 0.547, 0.589, 0.564, 0.491, 0.41, 0.352, 0.325, 0.319, 0.325, 0.333, 0.341, 0.348, 0.353, 0.359, 0.369, 0.386, 0.415, 0.46, 0.523, 0.601, 0.686, 0.766, 0.827, 0.855, 0.843, 0.792, 0.711, 0.613, 0.513, 0.423, 0.35, 0.297, 0.26, 0.238];
const W_BATT = [0.212, 0.924, 1.611, 2.292, 2.968, 3.274, 3.482, 2.799, 2.127, 1.459, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.001, 0.001, 0.002, 0.004, 0.009, 0.018, 0.034, 0.06, 0.095, 0.133, 0.167, 0.19, 0.199, 0.193, 0.177, 0.157, 0.138, 0.122, 0.111, 0.105];
const W_B10 = [0.208, 0.819, 1.466, 2.138, 2.826, 3.147, 3.359, 2.656, 1.977, 1.329, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.001, 0.004, 0.01, 0.022, 0.045, 0.074, 0.109, 0.143, 0.166, 0.177, 0.173, 0.159, 0.142, 0.125, 0.11, 0.101, 0.095];
const W_B90 = [0.215, 1.032, 1.743, 2.445, 3.111, 3.406, 3.614, 2.935, 2.273, 1.582, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.001, 0.001, 0.002, 0.002, 0.004, 0.008, 0.014, 0.026, 0.046, 0.077, 0.114, 0.156, 0.192, 0.216, 0.222, 0.215, 0.196, 0.172, 0.149, 0.132, 0.12, 0.112];

const NIGHT = "var(--ste-night)", SECONDARY = "var(--ste-secondary)";

/** Solar against demand chart. */
export function SolarDemandChart({ h }: { h?: number }) {
  return (
    <Box title="Solar Generation Against Demand" sub="MW" h={h}>
      <LineChart labels={HOUR_LABELS} ticks={HOUR_TICKS} unit="MW" digits={0}
        series={[
          { name: "Solar", values: SOLAR },
          { name: "Demand", values: DEMAND, dash: "5 4" },
        ]} />
      <div className="legend bat-legend">
        <span><i style={{ background: SECONDARY }} />Solar</span>
        <span className="bat-dash"><i />Demand</span>
      </div>
    </Box>
  );
}

/** Battery charge and discharge animation; also the home preview. */
export function ChargeChart({ h }: { h?: number }) {
  return (
    <Box title="Battery Charge and Discharge" sub="£/MWh" h={h}>
      <BatteryAnim />
      <div className="legend bat-legend">
        <span><i style={{ background: SECONDARY }} />Charging</span>
        <span className="bat-soft"><i />Discharging</span>
      </div>
    </Box>
  );
}

const NOTES = [
  <>UK daytime power prices fell below overnight prices for the first time on record in Q2 2025, after a record-sunny spring lifted solar output. <a href="https://reports.electricinsights.co.uk/" target="_blank" rel="noopener">Drax Electric Insights, Q2 2025</a>.</>,
  <>Abundant midday solar drives a midday price trough; at extremes the wholesale price turns negative, so generators pay to export. <a href="https://en.wikipedia.org/wiki/Duck_curve" target="_blank" rel="noopener">Duck curve, overview</a>.</>,
  <>MCS certified over 40,000 domestic battery-storage installations in 2025, almost double the previous record. <a href="https://mcscertified.com/uk-homes-installing-a-small-scale-renewable-every-90-seconds/" target="_blank" rel="noopener">MCS, 2025 installation records</a>.</>,
  <>Twenty-nine GB energy suppliers failed between July 2021 and May 2022, affecting nearly four million households. <a href="https://www.icaew.com/insights/viewpoints-on-the-news/2022/aug-2022/energy-supplier-collapses-highlight-bigger-sector-crisis" target="_blank" rel="noopener">ICAEW, on the supplier collapses</a>.</>,
  <>The day-ahead peak-to-trough spread a two-hour GB battery could capture ran from under £40/MWh (Feb 2024) to about £70/MWh (Aug 2024). <a href="https://timera-energy.com/" target="_blank" rel="noopener">Timera Energy</a>.</>,
  <>Two-hour GB BESS revenues benchmarked near £50k/MW/year in 2024 and about £73k/MW/year over the twelve months to April 2026. <a href="https://modoenergy.com/research/en/how-does-battery-energy-storage-make-money" target="_blank" rel="noopener">Modo Energy, GB BESS benchmarks</a>.</>,
  <>System (imbalance) prices are published per settlement period by <a href="https://www.elexon.co.uk/" target="_blank" rel="noopener">Elexon</a> on the open Insights API. The £78–£158/MWh range is my average by half-hour across fifteen settlement days, 6–24 July 2026, from that API. The chart's 20:30 example is a £139/MWh day-ahead peak against a £150/MWh imbalance price. The imbalance and day-ahead (APX) wholesale series come from a live half-hourly dashboard I run, and the chart shape is illustrative.</>,
  <>Comparing 10,000 Australian battery-plus-solar homes with 10,000 similar solar-only homes: average grid draw of ~0.3&nbsp;kW against ~1.0&nbsp;kW across the 4–9pm window. This is a fall in grid draw in those hours, not a fall in the home's consumption. <a href="https://www.solarquotes.com.au/blog/20000-homes-home-batteries/" target="_blank" rel="noopener">SolarQuotes, what 20,000 homes reveal</a>.</>,
  <>AEMO reported battery charging in the 10:00–16:00 window up 388&nbsp;MW (+166%) and evening-peak discharge up 463&nbsp;MW (+177%) year on year, NEM-wide across the battery fleet. <a href="https://www.aemo.com.au/-/media/files/major-publications/qed/2025/qed-q3-2025.pdf" target="_blank" rel="noopener">AEMO, Quarterly Energy Dynamics Q3 2025</a>.</>,
  <>Ofgem's Typical Domestic Consumption Value for a medium single-rate electricity user is 2,500&nbsp;kWh a year from 1 July 2026, down from 2,700&nbsp;kWh. <a href="https://www.ofgem.gov.uk/sites/default/files/2026-05/Review%20of%20typical%20domestic%20consumption%20values%20decision.pdf" target="_blank" rel="noopener">Ofgem, Review of typical domestic consumption values: decision, 27 May 2026</a>, Table 1.</>,
  <>My model, so treat accordingly. The shaded band on both modelled-day charts is the P10&ndash;P90 range across fleet draws. 300 Monte&nbsp;Carlo draws of 400-home fleets; stylised double-peak domestic shape; consumption ~8&nbsp;kWh/day (winter +25%); solar 2.5–5&nbsp;kWp with beta-distributed cloud; usable capacity 5.2–13.5&nbsp;kWh at 3–5&nbsp;kW; 85% round trip; greedy self-consumption dispatch, with a staggered 00:00–05:00 grid-charging window in the smart-tariff case. Drift is priced at the July 2026 average cash-out prices in note 7. Modelled estimates, not observed data.</>,
  <>Market-wide Half-Hourly Settlement began migrating meters in October 2025, passed two million by February 2026, and targets ~80% by October 2026 with full cutover in 2027. <a href="https://www.elexon.co.uk/2026/02/16/more-than-two-million-meters-have-now-transitioned-to-half-hourly-settlement/" target="_blank" rel="noopener">Elexon, migration progress</a>; <a href="https://www.elexon.co.uk/bsc/operational/market-wide-half-hourly-settlement/" target="_blank" rel="noopener">Elexon, MHHS</a>.</>,
];

const title = "Home batteries and settlement risk for suppliers";
const lede = "More than 40,000 home batteries were installed in 2025, almost double the previous record. A battery changes the hours in which a household draws from the grid, and I look at how large that change is and what it means for a supplier that has to forecast and settle the household's demand in every half-hour.";

export default function Batteries() {
  usePageMeta(title, lede);

  return (
    <Article kicker="Opinion · energy markets · updated 12 Nov 2026" title={title} lede={lede}>

      <Prose>
        <p>A supplier buys most of its power a day ahead, against a forecast of what its customers will use in each half-hour. Whatever its meters draw above or below that purchase is settled afterwards, at a price the supplier doesn't control. A home battery changes the hours in which a household draws from the grid, so a forecast built on the household's old shape tends to be wrong in the same direction in the same half-hours. I wanted to know how large that error could be for a supplier with a growing number of battery homes on its book.</p>
        <p>The reason to ask now is the pace of installation. In the second quarter of 2025, after a record-sunny spring lifted solar output, daytime power prices in the UK fell below overnight prices for the first time on record.<Fn n={1} /> Abundant midday solar produces a price trough in the middle of the day, and at the extreme the wholesale price turns negative, so a generator pays to export.<Fn n={2} /> A home battery is the product built for that price gap, and in 2025 MCS certified more than 40,000 of them, almost double the previous record.<Fn n={3} /></p>
        <p>I've spent the last three years talking to some very intelligent and passionate people about what a home battery could do for consumer bills and for the grid. Almost all of that thinking looks at the front end of the business: sales, product performance, margin, market benefit. That is where the case gets made. My own background is different. I've been responsible for trade desks for over a decade, and the habit that work leaves is to follow every product through to settlement.</p>
        <p>The supplier failures of 2021 and 2022 are why I think the question is worth the effort. Between July 2021 and May 2022 twenty-nine GB suppliers failed, affecting nearly four million households.<Fn n={4} /> Decentralised solar has already changed the shape of national demand and EVs are changing it again. I would like the industry to be able to show, with data, that home batteries are not adding large balancing swings on top of what settlement already absorbs.</p>
        <p>The piece follows the battery through in order: the product case, then how settlement prices a forecast error, then how far a fleet of batteries moves a household's metered demand (from early Australian data and from a model I built for Britain), then what the modelled error is worth at the settlement price. I'm not a battery expert, and the people I've been talking to are. My end of the market is what happens when metered volume turns up in a different half-hour from the one a supplier bought.</p>
      </Prose>

      <Section title="Why the product case works" />

      <Prose>
        <p>The chart shows solar generation against demand across an illustrative clear summer day. The solar fleet produces most of its output in the middle of the day, when demand sits in the dip between its morning and evening peaks, so the surplus reaches the wholesale market when daytime demand is at its weakest.</p>
      </Prose>

      <Wide>
        <SolarDemandChart h={380} />
      </Wide>

      <Prose>
        <p>A battery sits between that midday surplus and the evening peak. It charges through the cheap midday and overnight hours, holds the energy, and discharges into the expensive hours, as the animation shows. A modern pack returns roughly 85 to 92% of what it takes in, so the round-trip loss is the main cost of each cycle, and the battery earns the gap between the price it charged at and the price it later displaced.</p>
      </Prose>

      <Wide>
        <ChargeChart h={380} />
      </Wide>

      <Prose>
        <p>That price gap has been worth having. The day-ahead peak-to-trough spread a two-hour GB battery could capture ran from under £40/MWh in February 2024 to about £70/MWh that August.<Fn n={5} /> Stacked across day-ahead arbitrage, imbalance avoidance and the Balancing Mechanism, two-hour GB batteries benchmarked near £50k per MW per year in 2024 and about £73k over the twelve months to April 2026.<Fn n={6} /> Those benchmarks are for grid-scale batteries, so I use them only to show that the trade has paid. The product case isn't my subject, and I have no reason to doubt it.</p>
      </Prose>

      <StatRow stats={[{ num: "~£50k", label: "per MW / year, stacked" }]} />

      <Section title="How settlement prices a forecast error" />

      <Prose>
        <p>Every half-hour, a supplier settles the difference between what it bought and what its meters drew. That difference is its imbalance, and the price is Elexon's cash-out price: the imbalance price the market balances to, published half-hour by half-hour on Elexon's open API.<Fn n={7} /> When the forecast is right, the residual is noise. When the forecast is wrong in a consistent direction, because the shape of the book has changed underneath the model, the residual is a position, and the position settles at whatever the cash-out price turns out to be. Across the fifteen July 2026 settlement days I pulled for this piece, the average cash-out price by half-hour ran from £78/MWh in the middle of the day, the solar trough, to £158/MWh at eight in the evening.<Fn n={7} k="b" /></p>
        <p>The chart shows a day-ahead price and an imbalance price across one day. The shape is illustrative, and its 20:30 example is a £139/MWh day-ahead peak against a £150/MWh imbalance price.<Fn n={7} k="c" /></p>
      </Prose>

      <Wide>
        <Box title="Day-Ahead Against Imbalance Price" sub="£/MWh" h={380}>
          <LineChart labels={HH_LABELS} ticks={PRICE_TICKS} unit="£/MWh" digits={0}
            series={[
              { name: "Imbalance", values: IMB },
              { name: "Day-ahead", values: DA, dash: "5 4" },
            ]} />
          <div className="legend bat-legend">
            <span><i style={{ background: SECONDARY }} />Imbalance</span>
            <span className="bat-dash"><i />Day-ahead</span>
          </div>
        </Box>
      </Wide>

      <Section title="How far a battery moves a household's demand" />

      <Prose>
        <p>The observed evidence is early. Australia is years ahead of Britain on rooftop solar and now on home batteries, and data from 20,000 homes there shows battery households drawing about 0.3&nbsp;kW from the grid across the 4 to 9pm window, against about 1.0&nbsp;kW for otherwise similar solar-only homes. Battery homes drew about 70% less from the grid across the evening window.<Fn n={8} /> At system level, AEMO reported daytime charging by batteries on Australia's national electricity market up 166% year on year in the third quarter of 2025, and evening discharge up 177%.<Fn n={9} /> Britain is behind Australia, but MCS certified more than 40,000 battery installations in 2025.<Fn n={3} k="b" /></p>
        <p>Britain doesn't yet have an equivalent public dataset, so I built a simple stochastic model to see what the shift could look like here. The numbers that follow are modelled, and I'd treat them accordingly. I simulated fleets of 400 households, with 300 Monte&nbsp;Carlo draws (random repeats) per scenario: daily consumption of about 8&nbsp;kWh, about a sixth above the 6.8&nbsp;kWh a day implied by Ofgem's typical 2,500&nbsp;kWh a year,<Fn n={10} /> solar between 2.5 and 5&nbsp;kWp with cloud variation, usable battery capacity between 5.2 and 13.5&nbsp;kWh, an 85% round trip, and a battery that serves its own household, charging from surplus solar and discharging when the house needs more than the roof is making. I then ran a winter case in which a smart tariff charges the battery from the grid overnight.<Fn n={11} /></p>
      </Prose>

      <Section title="What the battery does to a summer day" />

      <Wide>
        <Box title="Modelled Summer Day" sub="kW" h={380}>
          <LineChart labels={HH_LABELS} ticks={SHIFT_TICKS} unit="kW" digits={2} yMax={0.8}
            band={{ top: S_B90, bottom: S_B10 }}
            series={[
              { name: "No solar", values: S_PLAIN, color: ramp(0, 2), width: 1.8 },
              { name: "Solar only", values: S_SOLAR, color: ramp(1, 2), width: 1.8 },
              { name: "Solar + battery", values: S_BATT, color: NIGHT, width: 2.4 },
            ]} />
          <div className="legend bat-legend">
            <span><i style={{ background: ramp(0, 2) }} />No solar</span>
            <span><i style={{ background: ramp(1, 2) }} />Solar only</span>
            <span><i style={{ background: NIGHT }} />Solar + battery</span>
          </div>
        </Box>
      </Wide>

      <Prose>
        <p>The chart shows the modelled grid import of an average home across a summer day in three cases: no solar, solar only, and solar with a battery. The shaded band is the range between the 10th and 90th percentile of fleet draws.<Fn n={11} k="b" /> The home without solar imports with the familiar domestic double peak, and a solar-only home still puts about 35% of its much smaller import through the 4 to 9pm window. With the battery the modelled evening share falls to about 4%, and the median half-hour of import moves from 18:30 into the small hours. In the model the change covers the whole afternoon and evening, well beyond the hour or two either side of dinner.</p>
      </Prose>

      <Section title="What changes in winter" />

      <Prose>
        <p>Winter gives two different results, depending on what charges the battery, and the first of them qualifies my summer chart. If the battery only does self-consumption, winter barely changes. There isn't enough solar to store, so the modelled evening share edges from 43% to 42% and the median import half-hour drifts by about thirty minutes. Put the same battery on a cheap overnight tariff and the result is very different, as the chart shows. Total grid import rises about 15%, because of the round-trip losses on the energy charged from the grid, and almost all of the import moves into one synchronised overnight block. The modelled fleet draws a peak of about 3.5&nbsp;kW per home at 3am, roughly sixteen times the natural overnight draw, and very little import is left in the evening.</p>
      </Prose>

      <Wide>
        <Box title="Modelled Winter Day" sub="kW" h={380}>
          <LineChart labels={HH_LABELS} ticks={SHIFT_TICKS} unit="kW" digits={2} yMax={4}
            band={{ top: W_B90, bottom: W_B10 }}
            series={[
              { name: "No battery", values: W_PLAIN, color: SECONDARY, width: 1.8 },
              { name: "Battery, smart tariff", values: W_BATT, color: NIGHT, width: 2.4 },
            ]} />
          <div className="legend bat-legend">
            <span><i style={{ background: SECONDARY }} />No battery</span>
            <span><i style={{ background: NIGHT }} />Battery, smart tariff</span>
          </div>
        </Box>
      </Wide>

      <Section title="What the forecast error is worth at cash-out" />

      <Prose>
        <p>Priced at settlement, the per-home numbers start small. If a supplier kept forecasting a battery home on a solar-only shape, my summer model has the supplier buying about 1.8&nbsp;kWh per home per day, all of it from 15:30 onwards, that the home no longer draws from the grid. That surplus is worth roughly 26p a day per home at July 2026 average cash-out prices, and comes to about 89&nbsp;MWh a day across a 50,000-home book.<Fn n={11} k="c" /> The 26p values the surplus at the cash-out price. The supplier's gain or loss on the surplus is the difference between the cash-out price and the price it paid a day ahead, which the model does not price.</p>
        <p>I don't think the pence per home are the main concern. The error runs in one direction, it is synchronised by tariffs and it is correlated with the weather: whole cohorts of homes move together, overnight blocks switch on and off with tariff changes, and a forecasting model still trained on last year's book shape is wrong in the same direction across the same hours. I think that is how small per-meter errors add up to balancing swings.</p>
      </Prose>

      <Section title="What I would do about battery homes" />

      <Prose>
        <p>This is an opinion backed by a toy model and early data, so I hold it loosely. What I expect the data to show is a third kind of domestic demand profile: a battery home that draws almost nothing from the grid between mid-morning and midnight in summer, and that takes most of its winter import in one overnight block when it is on a smart tariff. The industry grew up profiling the classic double-peak home and, lately, the solar household whose demand drops away around noon and returns for dinner. A battery home looks like neither. Settlement is changing at the same time. Market-wide Half-Hourly Settlement has been migrating meters since October 2025, passed two million by February 2026, targets around 80% by October 2026 and completes in 2027,<Fn n={12} /> so each battery home will soon be settled on its own metered half-hours in place of an assumed profile. The real half-hourly shapes become visible in settlement, and assumptions built on the old profiles stop holding at the same moment.</p>
        <p>So I would build the supplier's forecast around what is installed in each home. I would segment the book by what's bolted to the house, not by what it did last year. I would set up a check that detects a change in a cohort's shape quickly, and I would treat every new device class as a settlement question from its first day on the book, before the first bad quarter. Solar cut how much of a household's demand the grid sees. A battery cuts the evening as well, and on a smart tariff moves the winter import into the night. I'd rather follow that through to settlement now, while it's still cheap to be wrong.</p>
      </Prose>

      <Footnotes notes={NOTES} />
    </Article>
  );
}
