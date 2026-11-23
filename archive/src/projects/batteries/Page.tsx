import { Article, Prose, Section, Wide, Fn, Footnotes, StatRow } from "../../components/Article";
import Box from "../../components/Box";
import LineChart from "../../components/charts/LineChart";
import Histogram from "../../components/charts/Histogram";
import { ramp } from "../../components/charts/geom";
import { usePageMeta } from "../../lib/meta";
import BatteryAnim from "./BatteryAnim";
import data from "./data.json";
import "./batteries.css";

/* ── Solar generation against demand: hourly profiles, 00:00 -> 24:00 (arbitrary MW) ── */
export const SOLAR = [0, 0, 0, 0, 0, 2, 8, 20, 38, 58, 78, 92, 100, 98, 88, 70, 48, 26, 10, 2, 0, 0, 0, 0, 0];
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
export const S_PLAIN = [0.169, 0.169, 0.169, 0.169, 0.169, 0.17, 0.17, 0.171, 0.173, 0.179, 0.195, 0.229, 0.288, 0.366, 0.437, 0.471, 0.451, 0.392, 0.328, 0.281, 0.26, 0.255, 0.26, 0.266, 0.273, 0.278, 0.282, 0.287, 0.295, 0.308, 0.332, 0.368, 0.418, 0.48, 0.548, 0.612, 0.661, 0.683, 0.674, 0.633, 0.569, 0.49, 0.411, 0.339, 0.28, 0.237, 0.208, 0.19];
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
  <>UK daytime power prices fell below overnight prices for the first time on record in Q2 2025, after a record-sunny spring lifted solar output. <a href="https://reports.electricinsights.co.uk/?p=2499" target="_blank" rel="noopener">Drax Electric Insights, Q2 2025, "Power prices turned upside down"</a>.</>,
  <>MCS certified over 40,000 domestic battery-storage installations in 2025, almost double the previous record. <a href="https://mcscertified.com/uk-homes-installing-a-small-scale-renewable-every-90-seconds/" target="_blank" rel="noopener">MCS, 2025 installation records</a>.</>,
  <>Twenty-nine GB energy suppliers failed between July 2021 and May 2022, affecting nearly four million households. <a href="https://www.nao.org.uk/reports/the-energy-supplier-market/" target="_blank" rel="noopener">National Audit Office, The energy supplier market, June 2022</a>.</>,
  <>A typical two-hour GB BESS earned £73,145/MW/year over the twelve months to April 2026, across stacked revenue streams. <a href="https://modoenergy.com/research/en/how-does-battery-energy-storage-make-money" target="_blank" rel="noopener">Modo Energy, GB BESS benchmarks</a>.</>,
  <>System (imbalance) prices are published per settlement period by <a href="https://www.elexon.co.uk/" target="_blank" rel="noopener">Elexon</a> on the open Insights API. The £78 to £158/MWh range is my average by half-hour across fifteen settlement days, 6–24 July 2026, from that API. The chart's 20:30 example is a £139/MWh day-ahead peak against a £150/MWh imbalance price. The imbalance and day-ahead (APX) wholesale series come from a live half-hourly dashboard I run, and the chart shape is illustrative.</>,
  <>Comparing 10,000 Australian battery-plus-solar homes with 10,000 similar solar-only homes: average grid draw of ~0.3&nbsp;kW against ~1.0&nbsp;kW across the 4–9pm window. This is a fall in grid draw in those hours, not a fall in the home's consumption. <a href="https://www.solarquotes.com.au/blog/20000-homes-home-batteries/" target="_blank" rel="noopener">SolarQuotes, what 20,000 homes reveal</a>.</>,
  <>My model, so treat accordingly. The shaded band on both modelled-day charts is the P10&ndash;P90 range across fleet draws. 300 Monte&nbsp;Carlo draws of 400-home fleets; stylised double-peak domestic shape; consumption ~8&nbsp;kWh/day (winter +25%); solar 2.5–5&nbsp;kWp with beta-distributed cloud; usable capacity 5.2–13.5&nbsp;kWh at 3–5&nbsp;kW; 85% round trip; greedy self-consumption dispatch, with a staggered 00:00–05:00 grid-charging window in the smart-tariff case. Drift is priced at the July 2026 average cash-out prices in note 5. The daily figures price the same surplus at each day's system prices, 1 April to 30 September 2026, and against the APX market index price for the same half-hours on the 182 days with trades in every one; both series are from the Elexon Insights API. The surplus is held at the modelled average day, so the daily figures leave out any link between sunnier days and prices. Modelled estimates, not observed data.</>,
  <>Market-wide Half-Hourly Settlement began migrating meters in October 2025, passed two million by February 2026, and had completed 23,179,061 migrations, 68.56% of meter points, by the week ending 18 September 2026; implementation completes in May 2027. <a href="https://www.elexon.co.uk/2026/02/16/more-than-two-million-meters-have-now-transitioned-to-half-hourly-settlement/" target="_blank" rel="noopener">Elexon, migration progress</a>; <a href="https://www.elexon.co.uk/bsc/documents/groups/mhhs-transitional-operations-group/mhhs-transitional-operations-group-meeting-49-slide-deck-25-sept-2026/" target="_blank" rel="noopener">Elexon, Transitional Operations Group meeting 49, 25 September 2026</a>; <a href="https://www.elexon.co.uk/bsc/operational/market-wide-half-hourly-settlement/" target="_blank" rel="noopener">Elexon, MHHS</a>.</>,
];

const title = "Home batteries and settlement risk for suppliers";
const lede = "More than 40,000 home batteries were installed in 2025, almost double the previous record. A battery changes the hours in which a household draws from the grid, and I look at how large that change is and what it means for a supplier that has to forecast and settle the household's demand in every half-hour.";

export default function Batteries() {
  usePageMeta(title, lede);

  return (
    <Article kicker="Opinion · energy markets · updated 16 Nov 2026" title={title} lede={lede}>

      <Prose>
        <p>I've been responsible for trade desks for over a decade, and the habit that work leaves is following every new product through to settlement, because that is where somebody ends up paying for it.</p>
        <p>In the second quarter of 2025, after a record-sunny spring lifted solar output, daytime power prices in the UK fell below overnight prices for the first time on record.<Fn n={1} /> A home battery is the product built for that price gap, and in 2025 MCS certified more than 40,000 of them, almost double the previous record.<Fn n={2} /></p>
        <p>A supplier buys most of its power a day ahead, against a forecast of what its customers will use in each half-hour, and whatever its meters draw above or below that purchase is settled afterwards at a price it doesn't control. A battery moves the hours in which a household draws from the grid, so a forecast built on the household's old shape tends to be wrong in the same direction in the same half-hours.</p>
        <p>That is where the habit kicks in, because between July 2021 and May 2022 twenty-nine GB suppliers failed, affecting nearly four million households,<Fn n={3} /> and I'd like the industry to be able to show, with data, that home batteries aren't adding large balancing swings on top of what settlement already absorbs. So I wanted to know how large that error could be for a supplier with a growing number of battery homes.</p>
      </Prose>

      <Section title="Why the product case works" />

      <Wide>
        <SolarDemandChart h={380} />
      </Wide>

      <Prose>
        <p>A battery charges through the cheap midday and overnight hours and discharges into the expensive hours. It earns the gap between the price it charged at and the price it later displaced, less the energy lost on the round trip, which I set at 15% in the model below.</p>
      </Prose>

      <Wide>
        <ChargeChart h={380} />
      </Wide>

      <Prose>
        <p>A typical two-hour GB battery earned about £73k per MW per year over the twelve months to April 2026.<Fn n={4} /> That is a grid-scale benchmark, so I use it only to show that the trade has paid.</p>
      </Prose>

      <StatRow stats={[{ num: "~£73k", label: "per MW / year, stacked" }]} />

      <Section title="How settlement prices a forecast error" />

      <Prose>
        <p>Every half-hour, a supplier settles the difference between what it bought and what its meters drew, at Elexon's cash-out price.<Fn n={5} /> When the forecast is wrong in a consistent direction because the shape of the book has changed, the residual is a position that settles at whatever the cash-out price turns out to be. Across the fifteen July 2026 settlement days I pulled, the average cash-out price by half-hour ran from £78/MWh in the middle of the day to £158/MWh at eight in the evening.<Fn n={5} k="b" /></p>
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
        <p>The best evidence I could find comes from Australia, where data from 20,000 homes shows battery households drawing about 0.3&nbsp;kW from the grid across the 4 to 9pm window, against about 1.0&nbsp;kW for otherwise similar solar-only homes.<Fn n={6} /></p>
        <p>Britain doesn't yet have an equivalent public dataset, so I built a simple stochastic model. I simulated fleets of 400 households, with 300 Monte&nbsp;Carlo draws per scenario: daily consumption of about 8&nbsp;kWh, solar between 2.5 and 5&nbsp;kWp with cloud variation, usable battery capacity between 5.2 and 13.5&nbsp;kWh, an 85% round trip, and a battery serving its own household.<Fn n={7} /></p>
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
        <p>The shaded band is the range between the 10th and 90th percentile of fleet draws.<Fn n={7} k="b" /> A solar-only home puts about 35% of its import through the 4 to 9pm window. With the battery the modelled evening share falls to about 4%, and the median half-hour of import moves from 18:30 into the small hours.</p>
      </Prose>

      <Section title="What changes in winter" />

      <Prose>
        <p>If the battery only does self-consumption, winter barely changes: the modelled evening share edges from 43% to 42%. On a smart tariff that charges it from the grid overnight, total grid import rises about 15%, because of the round-trip losses on the energy charged from the grid, and almost all of it moves into one synchronised overnight block. The modelled fleet draws a peak of about 3.5&nbsp;kW per home at 3am, roughly sixteen times the natural overnight draw, from homes where everyone is fast asleep.</p>
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
        <p>If a supplier kept forecasting a battery home on a solar-only shape, my summer model has it buying about 1.8&nbsp;kWh per home per day, all of it from 15:30 onwards, that the home no longer draws from the grid. That surplus is worth roughly 26p a day per home at July 2026 average cash-out prices, and comes to about 89&nbsp;MWh a day across a 50,000-home book.<Fn n={7} k="c" /> The supplier's gain or loss on it is the difference between the cash-out price and the price it paid a day ahead, which the model does not price.</p>
        <p>One month's average hides the spread, so I priced the same surplus at each day's cash-out prices from 1 April to 30 September 2026.<Fn n={7} k="d" /> The chart shows the value of the surplus on each of the 183 days: the median day is 24p a home, four days in five fall between 19p and 33p, and one day reached 97p. Against Elexon's market index price for the same half-hours, which I use as a stand-in for what the supplier paid, the supplier gained 0.4p on the median day and lost money on 43% of days, with four days in five between a 2.5p loss and a 3.5p gain.</p>
      </Prose>

      <Wide>
        <Box title="Daily Value of the Forecast Surplus" sub="p per home per day" h={380}>
          <Histogram bins={data.bins} unit="p" yUnit="days" xTicks={[0, 25, 50, 75, 100]}
            label="Histogram of the daily value of the modelled surplus at cash-out prices, 183 days from April to September 2026: most days fall between 15p and 35p a home, with one day near 97p" />
        </Box>
      </Wide>

      <Prose>
        <p>I don't think the pence per home are the main concern. The error runs in one direction, it is synchronised by tariffs and it is correlated with the weather, so whole cohorts of homes move together. I think that is how small per-meter errors add up to balancing swings.</p>
      </Prose>

      <Section title="What I would do about battery homes" />

      <Prose>
        <p>This is an opinion backed by a toy model and early data, so I hold it loosely. I expect the data to show a third kind of domestic demand profile: a battery home that draws almost nothing from the grid between mid-morning and midnight in summer, and that takes most of its winter import in one overnight block when it is on a smart tariff. Market-wide Half-Hourly Settlement has been migrating meters since October 2025, passed two million by February 2026, had moved 69% of meter points by 18 September 2026 and completes in 2027,<Fn n={8} /> so each battery home will soon be settled on its own metered half-hours.</p>
        <p>So I would segment the book by what's bolted to the house, set up a check that detects a change in a cohort's shape quickly, and treat every new device class as a settlement question from its first day on the book. I would size the exposure from the daily range and its worst day, and keep the monthly average for context.</p>
        <p>So how large could the error be? Small in pence, about 24p a home on the median day, but it all runs one way from 15:30 onwards, whole cohorts of homes make it together, and in winter the same homes on a smart tariff pile into one overnight block. That is why the trade desk habit applies: I'd rather follow battery homes through to settlement now, while it's still cheap to be wrong. If you're adding them to a book this winter, start by checking what your forecast thinks they're doing at 3am.</p>
      </Prose>

      <Footnotes notes={NOTES} />
    </Article>
  );
}
