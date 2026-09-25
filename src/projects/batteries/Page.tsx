import { Article, Prose, Section, Wide, Fn, Footnotes, StatRow } from "../../components/Article";
import Box from "../../components/Box";
import LineChart from "../../components/charts/LineChart";
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
    <Box icon="activity" title="Solar Generation Against Demand" sub="MW" h={h}>
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
    <Box icon="zap" title="Battery Charge and Discharge" sub="£/MWh" h={h}>
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
  <>MCS certified over 40,000 domestic battery-storage installations in 2025, almost double the previous record, with the growth continuing into 2026. <a href="https://mcscertified.com/uk-homes-installing-a-small-scale-renewable-every-90-seconds/" target="_blank" rel="noopener">MCS, 2025 installation records</a>.</>,
  <>Twenty-nine GB energy suppliers failed between July 2021 and May 2022, affecting nearly four million households. <a href="https://www.icaew.com/insights/viewpoints-on-the-news/2022/aug-2022/energy-supplier-collapses-highlight-bigger-sector-crisis" target="_blank" rel="noopener">ICAEW, on the supplier collapses</a>.</>,
  <>The day-ahead peak-to-trough spread a two-hour GB battery could capture ran from under £40/MWh (Feb 2024) to about £70/MWh (Aug 2024). <a href="https://timera-energy.com/" target="_blank" rel="noopener">Timera Energy</a>.</>,
  <>Two-hour GB BESS revenues benchmarked near £50k/MW/year in 2024 and about £73k/MW/year over the twelve months to April 2026. <a href="https://modoenergy.com/research/en/how-does-battery-energy-storage-make-money" target="_blank" rel="noopener">Modo Energy, GB BESS benchmarks</a>.</>,
  <>System (imbalance) prices are published per settlement period by <a href="https://www.elexon.co.uk/" target="_blank" rel="noopener">Elexon</a> on the open Insights API. The £78–£158/MWh range is my average by half-hour across fifteen settlement days, 6–24 July 2026, from that API. The chart's 20:30 example is a £139/MWh day-ahead peak against a £150/MWh imbalance price, and the shaded gap is the spread mistimed volume lands on the wrong side of. The imbalance and day-ahead (APX) wholesale series come from a live half-hourly dashboard I run; the chart shape is illustrative, the annotated levels are from that data.</>,
  <>Comparing 10,000 Australian battery-plus-solar homes with 10,000 similar solar-only homes: average grid draw of ~0.3&nbsp;kW against ~1.0&nbsp;kW across the 4–9pm window. This is power draw shifted in time, not energy saved. <a href="https://www.solarquotes.com.au/blog/20000-homes-home-batteries/" target="_blank" rel="noopener">SolarQuotes, what 20,000 homes reveal</a>.</>,
  <>AEMO reported battery charging in the 10:00–16:00 window up 388&nbsp;MW (+166%) and evening-peak discharge up 463&nbsp;MW (+177%) year on year, NEM-wide across the battery fleet. <a href="https://www.aemo.com.au/-/media/files/major-publications/qed/2025/qed-q3-2025.pdf" target="_blank" rel="noopener">AEMO, Quarterly Energy Dynamics Q3 2025</a>.</>,
  <>Ofgem's Typical Domestic Consumption Value for a medium electricity user is around 2,700&nbsp;kWh a year; values were revised down slightly from July 2026. <a href="https://www.energy-uk.org.uk/publications/euk-explains-typical-domestic-consumption-values-2/" target="_blank" rel="noopener">Energy UK, on TDCVs</a>.</>,
  <>My model, so treat accordingly. The shaded band on both modelled-day charts is the P10&ndash;P90 range across fleet draws. 300 Monte&nbsp;Carlo draws of 400-home fleets; stylised double-peak domestic shape; consumption ~8&nbsp;kWh/day (winter +25%); solar 2.5–5&nbsp;kWp with beta-distributed cloud; usable capacity 5.2–13.5&nbsp;kWh at 3–5&nbsp;kW; 85% round trip; greedy self-consumption dispatch, with a staggered 00:00–05:00 grid-charging window in the smart-tariff case. Drift is priced at the July 2026 average cash-out prices in note 7. Modelled estimates, not observed data.</>,
  <>Market-wide Half-Hourly Settlement began migrating meters in October 2025, passed two million by February 2026, and targets ~80% by October 2026 with full cutover in 2027. <a href="https://www.elexon.co.uk/2026/02/16/more-than-two-million-meters-have-now-transitioned-to-half-hourly-settlement/" target="_blank" rel="noopener">Elexon, migration progress</a>; <a href="https://www.elexon.co.uk/bsc/operational/market-wide-half-hourly-settlement/" target="_blank" rel="noopener">Elexon, MHHS</a>.</>,
];

export default function Batteries() {
  usePageMeta("Home batteries add up at the front of the business. What happens at settlement?", "More than 40,000 home batteries were installed in 2025 and the sums behind them work. I follow a fleet of them through to the half-hour where a supplier is billed for being wrong, and model what they do to the shape of demand.");

  return (
    <Article kicker="Opinion · energy markets" title="Home batteries add up at the front of the business. What happens at settlement?"
      lede="More than 40,000 home batteries were installed in 2025, almost double the previous record, and the sums behind them work. I follow a fleet of them past the product case to the half-hour where a supplier is billed for being wrong, and model what they do to the shape of demand.">

      <Prose>
        <p>In the second quarter of 2025, after the sunniest spring on record, something happened in the British power market that had never happened before: electricity in the middle of the day was cheaper than electricity in the middle of the night.<Fn n={1} /> Solar had pushed the midday price below the overnight one, and on the sunniest afternoons it went negative, so a generator paid to export.<Fn n={2} /> The product built for exactly that gap is the home battery, and in 2025 MCS certified more than 40,000 of them, almost double the previous record.<Fn n={3} /></p>
        <p>I've spent the last three years talking to some very intelligent and passionate people about what that battery could do for consumer bills and for the grid. Almost all of that thinking looks at the front end of the business: sales, product performance, margin, market benefit. Fair enough, that's where the case gets made. But I've been responsible for trade desks for over a decade, and that leaves you with a habit you don't shake. You follow every product through to settlement.</p>
        <p>Settlement is where the last crisis was decided. Between July 2021 and May 2022, twenty-nine GB suppliers failed, taking nearly four million households with them, because prices moved faster than balance sheets.<Fn n={4} /> Decentralised solar has already changed the shape of national demand and EVs are changing it again, and I'd like the industry to be able to say, with data rather than optimism, that home batteries aren't building the conditions for a second collapse: big balancing swings stacked on top of everything settlement is already absorbing.</p>
        <p>So this piece follows the battery through. First the product case, which is strong. Then how far a fleet of batteries moves a household's metered volume through the day, from the early Australian data and from a model I built for Britain. Then what that shift costs at cash-out, and why I think the pennies are not the point. One thing to be clear about up front: I'm not a battery expert and won't pretend to be one here. The people I've been talking to are. My end of the market is what happens when metered volume turns up in a different half-hour from the one you bought.</p>
      </Prose>

      <Section title="The product case is real money" />

      <Prose>
        <p>On a clear summer day a solar fleet produces most of its output in the middle of the day, exactly when demand is lowest, so the surplus clears the wholesale market at the worst possible time. That is the shape in the chart below, and it is the shape that turned the price table upside down in 2025.</p>
      </Prose>

      <Wide>
        <SolarDemandChart h={380} />
      </Wide>

      <Prose>
        <p>A battery sits between that surplus and the evening peak. It charges through the cheap midday and overnight hours, holds the energy, and discharges it back into the dear evening. A modern pack returns roughly 85 to 92% of what it takes in, so the round-trip loss is close to the only cost of the trade. The battery earns the gap between the price it charged at and the price it later displaced.</p>
      </Prose>

      <Wide>
        <ChargeChart h={380} />
      </Wide>

      <Prose>
        <p>And the gap is worth having. The day-ahead peak-to-trough spread a two-hour GB battery could capture ran from under £40/MWh in February 2024 to about £70 that August,<Fn n={5} /> and stacked across day-ahead arbitrage, imbalance avoidance and the Balancing Mechanism, GB batteries benchmarked near £50k per MW per year in 2024 and about £73k over the twelve months to April 2026.<Fn n={6} /> None of that is in dispute, and it isn't my subject. The front of the business has done its sums, and the sums work.</p>
      </Prose>

      <StatRow stats={[{ num: "~£50k", label: "per MW / year, stacked" }]} />

      <Section title="Settlement is where mistimed volume gets priced" />

      <Prose>
        <p>A supplier buys most of its power a day ahead, against a forecast of what its customers will use. Then, every half-hour, it settles the difference between what it bought and what its meters actually drew, at Elexon's cash-out price: the imbalance price the market balances to, published half-hour by half-hour on Elexon's open API.<Fn n={7} /> When the forecast is right, the residual is noise. When the forecast is systematically wrong, because the shape of the book has changed underneath the model, the residual is a position, and it settles at some of the most volatile prices in the market. Across the fifteen July 2026 settlement days I pulled for this piece, the average cash-out price by half-hour ran from £78/MWh in the middle of the day, the solar trough, to £158 at eight in the evening.<Fn n={7} k="b" /></p>
      </Prose>

      <Wide>
        <Box icon="activity" title="Day-Ahead Against Imbalance Price" sub="£/MWh" h={380}>
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

      <Section title="How far can a battery move a household?" />

      <Prose>
        <p>The observed evidence is early, but it isn't nothing. Australia is years ahead of Britain on rooftop solar and now on home batteries, and data from 20,000 homes there shows battery households drawing about 0.3&nbsp;kW from the grid across the 4 to 9pm window, against about 1.0&nbsp;kW for otherwise similar solar-only homes. Roughly 70% of the evening draw has moved to other hours of the day.<Fn n={8} /> At system level, AEMO reported daytime charging across its battery fleet up 166% year on year in the third quarter of 2025, and evening discharge up 177%.<Fn n={9} /> Britain is behind that curve and accelerating: the 40,000 installations MCS certified in 2025 took battery storage into 2026 as the fastest-growing segment of the domestic renewables market.<Fn n={3} k="b" /></p>
        <p>Britain doesn't yet have an equivalent public dataset, so I built a simple stochastic model to see what the shift could look like here. What follows are my modelled numbers, not observed ones. I simulated fleets of 400 households, 300 Monte&nbsp;Carlo draws per scenario: daily consumption drawn around the typical domestic 2,700&nbsp;kWh a year,<Fn n={10} /> solar between 2.5 and 5&nbsp;kWp with cloud variation, usable battery capacity between 5 and 13.5&nbsp;kWh, an 85% round trip, and a battery that simply serves its own household, charging from surplus solar and discharging when the house needs more than the roof is making. Then a winter case where a smart tariff charges it from the grid overnight instead.<Fn n={11} /></p>
      </Prose>

      <Wide>
        <Box icon="layers" title="Modelled Summer Day" sub="kW" h={380}>
          <LineChart labels={HH_LABELS} ticks={SHIFT_TICKS} unit="kW" digits={2} yMax={0.8}
            band={{ top: S_B90, bottom: S_B10 }}
            series={[
              { name: "No solar", values: S_PLAIN, color: NIGHT, width: 1.6, dash: "5 4" },
              { name: "Solar only", values: S_SOLAR, color: NIGHT, width: 1.6 },
              { name: "Solar + battery", values: S_BATT, color: SECONDARY, width: 2.2 },
            ]} />
          <div className="legend bat-legend">
            <span className="bat-dash"><i />No solar</span>
            <span><i style={{ background: NIGHT }} />Solar only</span>
            <span><i style={{ background: SECONDARY }} />Solar + battery</span>
          </div>
        </Box>
      </Wide>

      <Section title="In summer the whole day moves" />

      <Prose>
        <p>The plain home imports with the familiar domestic double peak, and a solar-only home still puts about 35% of its much smaller import through the 4 to 9pm window. Add the battery and the modelled evening share collapses to about 4%, and the median half-hour of import moves from 18:30 into the small hours. That is the whole day moving, not the hour or two either side of dinner.</p>
      </Prose>

      <Section title="Winter splits in two" />

      <Prose>
        <p>Winter is two different stories, and this is where I'd push back on my own summer chart. If the battery only does self-consumption, winter barely moves anything. There isn't enough solar to store, so the modelled evening share edges from 43% to 42% and the median import half-hour drifts by about thirty minutes, the "one to two hours at best" end of the range. Put the same battery on a cheap overnight tariff and the picture inverts. Total grid import <em>rises</em> about 15%, round-trip losses plus charging from the grid, and almost all of it relocates into one synchronised overnight block. The modelled fleet draws a peak of about 3.5&nbsp;kW per home at 3am, roughly sixteen times the natural overnight draw, and the evening peak is gone.</p>
      </Prose>

      <Wide>
        <Box icon="layers" title="Modelled Winter Day" sub="kW" h={380}>
          <LineChart labels={HH_LABELS} ticks={SHIFT_TICKS} unit="kW" digits={2} yMax={4}
            band={{ top: W_B90, bottom: W_B10 }}
            series={[
              { name: "No battery", values: W_PLAIN, color: NIGHT, width: 1.6, dash: "5 4" },
              { name: "Battery, smart tariff", values: W_BATT, color: SECONDARY, width: 2.2 },
            ]} />
          <div className="legend bat-legend">
            <span className="bat-dash"><i />No battery</span>
            <span><i style={{ background: SECONDARY }} />Battery, smart tariff</span>
          </div>
        </Box>
      </Wide>

      <Section title="What it costs when the forecast is wrong" />

      <Prose>
        <p>Priced at settlement, the per-home numbers start small. If a supplier kept forecasting a battery home on a solar-only shape, my summer model puts about 1.8&nbsp;kWh per home per day in the wrong half-hours: roughly 26p a day per home at July 2026 average cash-out prices, or about 89&nbsp;MWh a day of misplaced volume across a 50,000-home book.<Fn n={11} k="b" /> I don't think the pennies are the point. The error is one-directional, tariff-synchronised and weather-correlated: whole cohorts of homes move together, overnight blocks switch on and off with tariff changes, and a forecasting model still trained on last year's book shape is wrong the same way in every half-hour at once. That is how small per-meter errors become balancing swings.</p>
      </Prose>

      <Section title="What I take from this" />

      <Prose>
        <p>It's early days, and this is an opinion backed by a toy model, not a settled result. But I expect the data to show a third category of domestic demand profile emerging: a battery home that is flat against the floor all summer and a synchronised overnight mountain all winter. The industry grew up profiling the classic double-peak home and, lately, the solar household that vanishes at noon and comes back for dinner. Neither looks anything like this.</p>
        <p>And the clock is running, because settlement itself is mid-rebuild. Market-wide Half-Hourly Settlement has been migrating meters since October 2025, passed two million by February 2026, expects around 80% by October 2026 and completes in 2027,<Fn n={12} /> so every one of these battery homes will shortly be settled on its own metered half-hours rather than an assumed profile. That cuts both ways. The real half-hourly shapes finally become visible in settlement, and every assumption built on the old profiles stops working at the same time.</p>
        <p>Which is why my conclusion isn't really about batteries. Supplier forecasting teams need building from the ground up around the data: segment the book by what's bolted to the house, not by what it did last year; detect shape-shift quickly; and treat every new device class as a settlement question from day one, before the first bad quarter. From the front end, batteries look like the new solar panel, and the sums are good. From the back office they look bigger. Solar changed how much of a household the grid sees. Batteries change <em>when</em> it sees them at all. I'd rather follow that through to settlement now, while it's still cheap to be wrong.</p>
      </Prose>

      <Footnotes notes={NOTES} />
    </Article>
  );
}
