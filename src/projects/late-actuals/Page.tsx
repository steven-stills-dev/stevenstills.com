import { Article, Prose, Section, Wide, Fn, Footnotes } from "../../components/Article";
import { usePageMeta } from "../../lib/meta";
import { KnownWhenFigure, GapChart, DistChart, ImportanceChart, HorizonChart, SweepChart } from "./Charts";
import data from "./data.json";
import "./late-actuals.css";

export { GapChart };

const F = data.facts;
const pc = (v: number) => `${v.toFixed(2)}%`;
const n = (v: number) => v.toLocaleString("en-GB");
const TITLE = "Building lag features when demand actuals arrive late";

export default function LateActuals() {
  const lede = `A forecast learns from past demand, and a supplier sees its settled demand weeks late. I replayed two years of daily GB demand forecasts with each day's actual held back ${F.P_main} days. A model fed yesterday's demand scored ${pc(F.leaky_backtest)} in a careless backtest and ${pc(F.leaky_live)} replayed as it would have run live. Lags that respect the delay held at ${pc(F.asof)}.`;
  usePageMeta(TITLE, lede);

  return (
    <Article kicker="Writing · forecasting" title={TITLE} lede={lede}>
      <Section title="Why do late actuals matter for a demand forecast?" />
      <Prose>
        <p>A supplier forecasting its customers' electricity use learns from its settled volumes, and those arrive in stages. The second settlement run lands 15 working days after each day, and reconciliation runs follow over the next months. The final run moved from 14 months after the day to 7 for days from 1 October 2026.<Fn n={1} /> Whatever a forecast treats as last week's demand must have existed on the morning the forecast was made.</p>
        <p>I don't have a supplier's settled volumes to publish, so I used Great Britain's national demand from NESO as a stand-in.<Fn n={2} /> National demand arrives fast: Elexon publishes its operational outturn within 15 minutes of each half hour.<Fn n={3} /> The delay in this experiment is therefore imposed. I treated each day's demand as usable only {F.P_main} days later, about the 15 working days of that second run. National demand is not a supplier's portfolio, and it isn't revised the way settlement runs revise one, so this tests timing alone.</p>
      </Prose>

      <Section title="Which past values can a forecast see?" />
      <Prose>
        <p>Take a forecast issued on day D for target day T, h days ahead. A lag feature of L days reads demand on day T minus L. If actuals are published P days after the day, that value exists at issue time only when L is at least h plus P. I round L up to a multiple of seven so the lag lands on the same weekday as the target, because daily demand follows a strong weekly pattern.</p>
        <p>With horizons up to {F.horizons} days and a {F.P_main}-day delay, one floor of {F.floor_main} days serves every horizon. An as-of design (one that builds each row from what was published on its own issue date) can go shorter for near horizons: 28 days for one to seven days ahead, 35 beyond. The chart shows the timeline. Solid circles are lags that were published at issue time; hollow ones point into the gap. At a three-week delay, every lag of a naive design (yesterday, a week back and two weeks back from the target) falls in the gap at every horizon.</p>
      </Prose>
      <Wide><KnownWhenFigure /></Wide>

      <Section title="How did I test the designs?" />
      <Prose>
        <p>I trained four small gradient-boosted models (the family at the end of <a href="/ml-through-the-years">demand forecasting models from SARIMA to gradient boosting</a>) on the same calendar and weather features, with the horizon as a feature.<Fn n={4} /> One had no lagged demand. One had the naive leaky lags. One used the single {F.floor_main}-day floor, and one used as-of lags.</p>
        <p>Each was scored on a rolling origin, which means it is trained only on days before the forecast, used for a block of forecasts, then refitted and rolled forward.<Fn n={5} /> I refitted every 28 days from {"13 October 2024"}, forecast each day 1 to {F.horizons} days ahead and stopped at targets on {"12 October 2026"}: {F.refits} refits and {n(F.n_rows)} forecasts. I scored every design twice. The careless backtest trains on all targets before the origin and reads complete lags. The live replay trains only on targets published by the origin and reads only what was published at issue time. Live, the leaky model's missing lags take the latest published value for the same weekday. The metric is WMAPE, total absolute error as a share of total demand, which I cover in <a href="/forecast-error">measuring demand forecast error</a>.</p>
      </Prose>

      <Section title="How much does a leaky backtest flatter the model?" />
      <Prose>
        <p>The chart shows backtest and live error for each design. The leaky model scored {pc(F.leaky_backtest)} in the backtest and {pc(F.leaky_live)} live, {F.gap_ratio} times as much. The gap of {F.gap.toFixed(2)} percentage points has a 90% interval of {F.gap_lo.toFixed(2)} to {F.gap_hi.toFixed(2)} from a block bootstrap (resampling whole weeks of forecasts to see how much the gap moves). The clean designs score the same both ways, because their features are identical in both. In the backtest the leaky model is the best of the four. Live it is the worst, behind the model with no lags at {pc(F.none)}.</p>
      </Prose>
      <Wide><GapChart h={380} /></Wide>
      <Prose>
        <p>Kaufman and colleagues define leakage as information about the target that would not legitimately be available when the prediction is made,<Fn n={6} /> and Kapoor and Narayanan found it behind flawed results in hundreds of papers across 17 fields.<Fn n={7} /> Lags dated after the publication cut-off fit that definition exactly.</p>
        <p>The fill I used is the kind an engineer writes when lags come back empty. Without it the live error was {pc(F.leaky_live_nan)}. A lag table that ends before the target dates hands the model empty columns without raising an error, so this failure can run for weeks unnoticed.</p>
        <p>The chart shows the spread of daily errors, forecast minus actual. In the backtest, {F.within3_leaky_bt}% of leaky forecasts landed within 3% of the actual. Live that fell to {F.within3_leaky_live}%, against {F.within3_asof}% for the as-of model.</p>
      </Prose>
      <Wide><DistChart /></Wide>

      <Section title="Where does the leak come from?" />
      <Prose>
        <p>The chart shows each model's share of split gain, which is how much each group of features reduced training error across all the trees. Lagged demand carried {F.imp_leaky_lags}% of the leaky model's gain and weather {F.imp_leaky_weather}%. In the as-of model lagged demand carried {F.imp_asof_lags}% and weather {F.imp_asof_weather}%. The leaky model learned to copy yesterday, and live it only has stale copies.</p>
      </Prose>
      <Wide><ImportanceChart /></Wide>
      <Prose>
        <p>The chart shows error by horizon with its 90% bootstrap band; the chips switch design. The leaky backtest sits at {pc(F.leaky_bt_h1)} at every horizon, because its lags are measured from the target and so look the same at any lead time. A real forecast gets worse as it reaches further, and a flat line is a warning sign in itself. Live, the leaky model rose from {pc(F.leaky_live_h1)} one day ahead to {pc(F.leaky_live_h14)} at 14 days. The as-of model moved from {pc(F.asof_h1)} to {pc(F.asof_h14)}. Every design here reads archive weather in place of the forecast it would have had, which makes all of them look better than they would live and flattens the horizon curve.<Fn n={8} /></p>
      </Prose>
      <Wide><HorizonChart /></Wide>

      <Section title="What does a longer publication delay cost?" />
      <Prose>
        <p>The chart shows live error as the delay grows from one to eight weeks. The as-of model went from {pc(F.sweep_asof_7)} to {pc(F.sweep_asof_56)}. The leaky model went from {pc(F.sweep_leaky_7)} to {pc(F.sweep_leaky_56)}, because each extra week makes its filled lags staler. The as-of design beat the single floor at every delay I tried, by less than a tenth of a percentage point, which I wouldn't lean on. Lagged demand still earns its place at long delays: at {F.P_main} days, as-of lags cut error from {pc(F.none)} with no lags to {pc(F.asof)}.</p>
      </Prose>
      <Wide><SweepChart /></Wide>

      <Section title="What I would do when actuals arrive late" />
      <Prose>
        <p>I would write the rule into the feature code: a lag of at least the horizon plus the publication delay, rounded up to a whole week, with an assertion that fails the build when a lag reads an unpublished day. The naive design hid {F.gap.toFixed(2)} points of error here.</p>
        <p>I would backtest with as-of frames that gate both the labels and the inputs by issue date, and I would treat a backtest that is flat across horizons as a leak until shown otherwise.</p>
        <p>I would choose the settlement run first and the lags second. Moving from a one-week to an eight-week delay cost the as-of model about half a point, so I would take lags from a mature run whose values have stopped moving.</p>
        <p>I would check lag coverage on every forecast run. Empty lags pushed live error to {pc(F.leaky_live_nan)}, and nothing in the model raises an error when it happens.</p>
      </Prose>

      <Footnotes notes={[
        <>MHHS Programme, <a href="https://mhhs-prod-webapp.azurewebsites.net/programme-information/key-programme-milestones/milestone-16-m16-cutover-to-the-new-settlement-timetable" target="_blank" rel="noopener">Milestone 16: cutover to the new settlement timetable</a>. The final reconciliation (RF) run moves from 14 months to 7 for settlement days from 1 October 2026, agreed on 15 September 2026; later steps, including the second (SF) run moving from 15 working days to 7, are planned.</>,
        <>NESO, <a href="https://www.neso.energy/data-portal/historic-demand-data" target="_blank" rel="noopener">Historic demand data</a>. National demand (ND) is metered generation excluding station load, pumping and interconnector exports. I summed half-hourly ND (MW times half an hour) into daily GWh from 2019 to 12 October 2026; daily demand averaged {F.mean_daily_gwh} GWh over the test period.</>,
        <>Elexon, <a href="https://elexon.co.uk/glossary/initial-transmission-system-demand-out-turn" target="_blank" rel="noopener">glossary: Initial Transmission System Demand Outturn</a>, published within 15 minutes of each settlement period from operational metering.</>,
        <>Open-Meteo, <a href="https://open-meteo.com/en/docs/historical-weather-api" target="_blank" rel="noopener">historical weather API</a> (ERA5 reanalysis): daily mean temperature, solar radiation and maximum wind at eight population centres, averaged, with heating degree days below 15.5 °C. Calendar features: weekday, day of year, England bank holidays and the Christmas week. LightGBM, 300 trees of 15 leaves, learning rate 0.05, no tuning. Training rows from 1 January 2021, to skip the 2020 lockdown.</>,
        <>Hyndman and Athanasopoulos, <a href="https://otexts.com/fpp3/tscv.html" target="_blank" rel="noopener">Forecasting: Principles and Practice, 3rd edition, section 5.10</a>, on evaluation on a rolling forecasting origin. My build script, scripts/late-actuals/build.py in this site's repository, regenerates every number on this page. Bootstrap intervals resample issue weeks, 1,000 draws for the gap and 400 per horizon; neighbouring weeks are correlated, so the intervals are on the narrow side. This is one series over one two-year window with an untuned model, and smooth national demand makes yesterday's value unusually informative, so I expect the leak to be smaller on a noisier portfolio series.</>,
        <>Kaufman, Rosset, Perlich and Stitelman, <a href="https://doi.org/10.1145/2382577.2382579" target="_blank" rel="noopener">Leakage in data mining: formulation, detection, and avoidance</a>, ACM Transactions on Knowledge Discovery from Data 6(4), December 2012.</>,
        <>Kapoor and Narayanan, <a href="https://doi.org/10.1016/j.patter.2023.100804" target="_blank" rel="noopener">Leakage and the reproducibility crisis in machine-learning-based science</a>, Patterns 4(9), 2023. Their taxonomy includes features unavailable at prediction time and test data that precede the training data.</>,
        <>Hyndman and Athanasopoulos, <a href="https://otexts.com/fpp3/forecasting-regression.html" target="_blank" rel="noopener">section 7.6</a>, on ex-post forecasts, which use the actual values of predictors and so are not genuine forecasts.</>,
      ]} />
    </Article>
  );
}
