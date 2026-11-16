import { useState } from "react";
import { Article, Prose, Section, Wide, Fn, Footnotes } from "../../components/Article";
import Box from "../../components/Box";
import LineChart from "../../components/charts/LineChart";
import { usePageMeta } from "../../lib/meta";
import BoostDemo from "./BoostDemo";
import ModelStepper from "./ModelStepper";
import TreeGrowth from "./TreeGrowth";
import { DEMO } from "./demo-data";
import data from "./data.json";
import "./ml.css";

/* ── Average national demand (INDO), non-holiday weekdays, Oct 2024 to Sep 2025, GW by half-hour ── */
const WINTER = [24.7, 25.0, 24.6, 24.2, 23.7, 23.4, 23.0, 22.7, 22.4, 22.4, 22.9, 24.0, 26.6, 28.9, 31.8, 33.1, 34.5, 34.6, 35.0, 34.7, 34.3, 33.9, 33.6, 33.3, 33.4, 33.2, 33.1, 33.0, 33.0, 33.2, 33.6, 34.6, 35.7, 36.9, 37.9, 38.4, 38.5, 38.2, 37.8, 36.8, 35.6, 34.4, 32.7, 31.1, 29.3, 27.7, 26.1, 25.2];
const SUMMER = [21.3, 21.0, 20.7, 20.5, 20.2, 19.8, 19.5, 19.3, 19.1, 19.1, 19.3, 19.9, 21.6, 22.8, 24.6, 25.3, 25.9, 25.6, 25.4, 24.7, 24.0, 23.5, 23.0, 22.7, 22.6, 22.4, 22.1, 21.9, 21.7, 21.8, 21.9, 22.5, 23.3, 24.4, 25.6, 26.8, 27.4, 27.9, 28.3, 28.4, 28.4, 28.0, 27.5, 26.8, 25.7, 24.4, 23.0, 22.1];

/* ── Illustrative bank holiday: the winter weekday with a later, lower morning and a softer day ── */
const BH_ACTUAL = WINTER.map((v, k) => {
  const morning = 3.2 * Math.exp(-(((k - 17) / 5) ** 2));
  const day = k >= 14 && k <= 40 ? 1.6 : 0;
  return +(v - morning - day).toFixed(1);
});
const BH_FORECAST: Record<string, number[]> = {
  SARIMA: WINTER,
  "Gradient boosting": BH_ACTUAL.map((v, k) => +(v + 0.35 * Math.sin(k * 0.9)).toFixed(1)),
};

/* ── Measured forecast error by month, Oct 2024 to Sep 2025 (scripts/ml-through-the-years/build.py) ── */
const MONTHS = data.months;

const HH = Array.from({ length: 48 }, (_, k) => `${String(Math.floor(k / 2)).padStart(2, "0")}:${k % 2 ? "30" : "00"}`);
const HH_TICKS = [{ i: 0, label: "00:00" }, { i: 12, label: "06:00" }, { i: 24, label: "12:00" }, { i: 36, label: "18:00" }, { i: 47, label: "24:00" }];
const MONTH_TICKS = MONTHS.map((label, i) => ({ i, label }));
const NIGHT = "var(--ste-night)", SECONDARY = "var(--ste-secondary)", TERTIARY = "var(--ste-tertiary)";

/** Winter and summer demand shape; also the home preview. */
export function DemandShapeChart({ h }: { h?: number }) {
  return (
    <Box title="Half-Hourly Demand" sub="GW" h={h}>
      <LineChart labels={HH} ticks={HH_TICKS} unit="GW" digits={1}
        series={[{ name: "Winter", values: WINTER, color: NIGHT }, { name: "Summer", values: SUMMER, color: SECONDARY }]} />
      <div className="legend">
        <span><i style={{ background: NIGHT }} />Winter</span>
        <span><i style={{ background: SECONDARY }} />Summer</span>
      </div>
    </Box>
  );
}

function Eq({ children }: { children: string }) {
  return <p className="ml-eq">{children}</p>;
}

const a = (href: string, text: string) => <a href={href} target="_blank" rel="noopener">{text}</a>;

const NOTES = [
  <>G. Box and G. Jenkins, Time Series Analysis: Forecasting and Control, Holden-Day, 1970. {a("https://archive.org/details/timeseriesanalys0000boxg", "Internet Archive")}.</>,
  <>The Prime Minister's address to the nation, 23 March 2020. {a("https://www.gov.uk/government/speeches/pm-address-to-the-nation-on-coronavirus-23-march-2020", "GOV.UK")}.</>,
  <>The M5 competition ran on Kaggle from 3 March to 30 June 2020 on 42,840 Walmart sales series, with 7,092 participants in 5,507 teams from 101 countries. {a("https://www.kaggle.com/c/m5-forecasting-accuracy", "Kaggle, M5 Forecasting Accuracy")}; {a("https://statmodeling.stat.columbia.edu/wp-content/uploads/2021/10/M5_accuracy_competition.pdf", "Makridakis, Spiliotis and Assimakopoulos, The M5 accuracy competition, 2020 preprint")}, published in the International Journal of Forecasting 38(4), 2022.</>,
  <>S. Hochreiter and J. Schmidhuber, Long Short-Term Memory, Neural Computation 9(8), November 1997. {a("https://doi.org/10.1162/neco.1997.9.8.1735", "DOI")}.</>,
  <>M4 was won by Slawek Smyl's hybrid of exponential smoothing and LSTM networks, close to 10% more accurate than the combination benchmark; "the six pure ML methods performed poorly", none of them beating that benchmark. {a("https://pure.unic.ac.cy/en/publications/the-m4-competition-results-findings-conclusion-and-way-forward/", "Makridakis et al., The M4 Competition, IJF 34(4), 2018")}; {a("https://doi.org/10.1016/j.ijforecast.2019.03.017", "Smyl, IJF 36(1), 2020")}.</>,
  <>The winning entry, an equal-weighted average of LightGBM models, was 22.4% more accurate (WRMSSE) than the best benchmark; four of the top five were built on LightGBM and the third was a set of LSTM networks. M5 preprint, note 3, Table 3 and Section 4.2.</>,
  <>17 of the 29 winning solutions published on Kaggle's blog in 2015 used XGBoost; deep neural networks, the next most common, appeared in 11. The regularised objective, leaf weight and split gain are equations 2, 5 and 7 of the paper. {a("https://arxiv.org/abs/1603.02754", "Chen and Guestrin, XGBoost: A Scalable Tree Boosting System, KDD 2016")}.</>,
  <>Ofgem decided on 20 April 2021 to introduce market-wide half-hourly settlement for electricity. {a("https://www.ofgem.gov.uk/decision/electricity-retail-market-wide-half-hourly-settlement-decision-and-full-business-case", "Ofgem, Decision and Full Business Case")}.</>,
  <>Elexon deployed the MHHS central systems on 22 September 2025, with meter migration from 22 October 2025, about 80% of meters by October 2026 and completion in May 2027, processing "up to 500 billion half-hourly readings per year". {a("https://www.elexon.co.uk/2025/09/24/market-wide-half-hourly-settlement-reaches-major-milestone/", "Elexon, 24 September 2025")}.</>,
  <>Gradient-based One-Side Sampling, Exclusive Feature Bundling and leaf-wise growth; up to 9 times faster than histogram-based XGBoost (Allstate: 2.63 against 0.28 seconds per iteration). {a("https://papers.nips.cc/paper_files/paper/2017/file/6449f44a102fde848669bdd9eb6b76fa-Paper.pdf", "Ke et al., LightGBM, NeurIPS 2017")}.</>,
  <>Initial National Demand Outturn (INDO), averaged by half-hour over weekdays that were not bank holidays, winter October 2024 to March 2025 and summer April to September 2025. {a("https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/INDO", "Elexon Insights API, INDO")}.</>,
  <>The bank holiday and boosting charts are illustrative shapes, not model output.</>,
  <>A backtest on public national data, which is smoother than any one supplier's portfolio. Demand is half-hourly national demand with the published estimates of embedded wind and solar generation added back, 1 October 2021 to 30 September 2025, from {a("https://www.neso.energy/data-portal/historic-demand-data", "NESO, Historic Demand Data")}; temperature is the mean of six cities from the {a("https://open-meteo.com/en/docs/historical-weather-api", "Open-Meteo Historical Weather API")}. The models were given the temperature that occurred, so a forecast made from a weather forecast would score worse. The regression has terms for half-hour by day type, weekday, month, bank holidays and Christmas week, temperature and its square by half-hour, the mean temperature of the previous 24 hours, a trend and demand a week earlier. LightGBM had the same inputs and fixed settings (600 trees, learning rate 0.05, 31 leaves), with nothing tuned on the test year. Error is the mean absolute percentage error over 365 days; in gigawatts the mean absolute errors were 0.85, 0.92 and 1.39. The range for the gap comes from resampling whole days 5,000 times and taking the middle 95%, which treats days as independent. Regression had the lower error in October, November and July. The worst days were 24 November 2024 for boosting and 1 January 2025 for regression. On national demand as published, net of embedded generation, the three models scored 5.0%, 6.0% and 8.3%.</>,
  <>J. Friedman, Greedy function approximation: a gradient boosting machine, Annals of Statistics 29(5), October 2001. {a("https://projecteuclid.org/journals/annals-of-statistics/volume-29/issue-5/Greedy-function-approximation-A-gradient-boosting-machine/10.1214/aos/1013203451.full", "Project Euclid")}.</>,
];

export default function Page() {
  const title = "Demand forecasting models from SARIMA to gradient boosting";
  const lede = "Forecasting half-hourly electricity demand, I moved from SARIMA and linear regression in 2016 to LSTMs during lockdown and then to gradient boosting, on a book heading for 5 billion data points a year. I explain what prompted each move, how the three kinds of model read the same half-hour, and what XGBoost and LightGBM do when they learn.";
  usePageMeta(title, lede);
  const [bh, setBh] = useState("SARIMA");

  return (
    <Article kicker="Opinion · machine learning · updated 16 Nov 2026" title={title} lede={lede}>
      <Prose>
        <p>In 2016 I built my first half-hourly demand forecasts with classic statistical models. I spent lockdown building neural networks, and today I forecast with gradient boosting.</p>
        <p>Written down like that, it reads like someone following the evidence. I wasn't quick about it. The forecasting competitions were already pointing at trees, and I still built a few LSTMs through 2020 and 2021.</p>
        <p>Where I've done better is the bad days: over nine years, the very bad days that used to turn up every year have gone.</p>
        <p>A supplier's demand forecast gives a number for every half-hour, and the money is made or lost on the days it is badly wrong. Three things have made those days hard to avoid: bank holidays, the change between winter and summer in how demand responds to temperature, and the volume of half-hourly meter data to retrain on.</p>
        <p>This is how I got from the first model to the last, and what each of those three had to do with it.</p>
      </Prose>

      <Section title="SARIMA and linear regression, 2016 to 2020" />
      <Prose>
        <p>SARIMA (seasonal autoregressive integrated moving average) forecasts a series from its own past, weighting demand at the same half-hour on recent days and last week. George Box and Gwilym Jenkins set the method out in 1970,<Fn n={1} /> and I still treat SARIMA as the benchmark to beat. Linear regression added temperature and the calendar, and every number in both could be defended to a trader.</p>
        <p>A model that learns from its own recent past has no information that a Monday is a bank holiday until the Tuesday, so bank holidays were patched by hand, and now and then forgotten. A linear model also gives temperature one slope for the whole year, so a model tuned on winter heating drifted once the heating went off.</p>
      </Prose>

      <Section title="Reading the M competition results in 2020" />
      <Prose>
        <p>On 23 March 2020 the Prime Minister told the country to stay at home.<Fn n={2} /> Three weeks earlier M5, a forecasting competition on 42,840 Walmart sales series, had opened on Kaggle,<Fn n={3} /> and I used the time inside to read up. The LSTM (long short-term memory network), a neural network that carries a memory along a sequence, dates from 1997.<Fn n={4} /> In M4, in 2018, a hybrid of exponential smoothing and LSTM won, close to 10% more accurate than the benchmark, and none of the six pure machine learning entries beat that benchmark.<Fn n={5} /></p>
        <p>M5 was clearer. The winning entry, an average of LightGBM models, came in 22.4% more accurate than the best benchmark, and four of the top five entries were built on LightGBM, a gradient boosting library.<Fn n={6} /> In 2015, 17 of the 29 winning solutions published on Kaggle's blog had used XGBoost, another such library.<Fn n={7} /> I still built a few LSTM models through 2020 and 2021.</p>
      </Prose>

      <Section title="Why I moved from the LSTM to gradient boosting" />
      <Prose>
        <p>What ended my work on LSTMs was data volume. On 20 April 2021 Ofgem decided that every electricity meter in Great Britain would move to market-wide half-hourly settlement (MHHS),<Fn n={8} /> and Elexon's systems are built to take up to 500 billion half-hourly readings a year once the programme completes in May 2027.<Fn n={9} /> I was looking at about 5 billion data points a year, roughly a hundredth of that national figure, and a neural network would have taken too long to retrain on that volume on my hardware. A model that is slow to retrain is slow to correct.</p>
        <p>LightGBM sorts each input into histogram bins and samples the rows it predicts badly more heavily, and its authors measured it at up to 9 times faster than histogram-based XGBoost.<Fn n={10} /></p>
      </Prose>

      <Section title="How the three models read the same half-hour" />
      <Prose>
        <p>Every one of these models is forecasting the shape below, average national weekday demand from Elexon's published outturn.<Fn n={11} /> Winter peaks at about 38.5 GW at 18:00. Summer tops out at about 28.4 GW in the evening, after a long midday dip that I put down to rooftop solar.</p>
      </Prose>
      <Wide>
        <DemandShapeChart h={380} />
      </Wide>
      <Prose>
        <p>An LSTM reads the recent days in order and keeps a running memory. Gradient boosting reads no sequence: every input, from the time of day to the bank-holiday flag, becomes a set of yes-or-no questions, and the forecast adds up the answers from hundreds of small trees.</p>
      </Prose>
      <Wide>
        <Box title="How Each Model Forecasts">
          <ModelStepper />
        </Box>
      </Wide>
      <Prose>
        <p>Treating the calendar as an input is why bank holidays stopped being a problem for me: the trees learn what a bank holiday does to the morning ramp from every bank holiday in the training data, while SARIMA forecasts an ordinary Monday.<Fn n={12} /></p>
      </Prose>
      <Wide>
        <Box title="Bank Holiday Forecast" sub="GW" h={420}>
          <div className="ml-head">
            <div className="ml-chips">
              {Object.keys(BH_FORECAST).map((m) => (
                <button key={m} className={"chip" + (m === bh ? " on" : "")} onClick={() => setBh(m)}>{m}</button>
              ))}
            </div>
          </div>
          <LineChart labels={HH} ticks={HH_TICKS} unit="GW" digits={1}
            series={[{ name: "Forecast", values: BH_FORECAST[bh] }, { name: "Actual", values: BH_ACTUAL, color: NIGHT, dash: "5 4" }]} />
          <div className="legend">
            <span><i style={{ background: SECONDARY }} />Forecast</span>
            <span><i style={{ background: NIGHT }} />Actual</span>
          </div>
        </Box>
      </Wide>
      <Prose>
        <p>The trees also learn a different response to temperature at each time of year, and in my experience the summer drift goes.</p>
        <p>I tested this on public data with three models: Great Britain's national demand, October 2024 to September 2025, with each month forecast by models refitted on everything before it.<Fn n={13} /> The chart shows the error of each model by month. Gradient boosting averaged 2.8%, a linear regression 3.1% and a seasonal naive forecast (last week's value for the same half-hour) 4.5%. The gap between boosting and regression, 0.3 percentage points, is small but holds when I resample the test days (0.1 to 0.4), and it is wider from May to August (0.4) than from November to February (0.2). On the eight bank holidays the errors were 3.5%, 5.2% and 14.3%.</p>
      </Prose>
      <Wide>
        <Box title="Forecast Error by Month" sub="%" h={380}>
          <LineChart labels={MONTHS} ticks={MONTH_TICKS} unit="%" digits={1}
            series={[{ name: "Gradient boosting", values: data.by_month.gbm }, { name: "Linear regression", values: data.by_month.linear, color: NIGHT }, { name: "Seasonal naive", values: data.by_month.naive, color: TERTIARY }]} />
          <div className="legend">
            <span><i style={{ background: SECONDARY }} />Gradient boosting</span>
            <span><i style={{ background: NIGHT }} />Linear regression</span>
            <span><i style={{ background: TERTIARY }} />Seasonal naive</span>
          </div>
        </Box>
      </Wide>

      <Section title="How a boosted tree learns" />
      <Prose>
        <p>Jerome Friedman set out gradient boosting in 2001.<Fn n={14} /> It starts with a single guess, say average demand, then fits a small tree to the residuals (actual minus forecast), adds a fraction of the tree's answer to the forecast and repeats, so each new tree only learns what the previous trees got wrong.</p>
      </Prose>
      <Prose><Eq>Fₘ(x) = Fₘ₋₁(x) + η · fₘ(x)</Eq></Prose>
      <Prose>
        <p>The fraction η is the learning rate: a small one needs more trees and overfits less. For squared error the residual is the negative gradient of the loss, hence the name. Each tree draws a stepped line, and a few hundred steps add up to a heating curve.<Fn n={12} k="c" /></p>
      </Prose>
      <Wide>
        <Box title="Gradient Boosting on Daily Demand" h={520}>
          <BoostDemo temp={DEMO.temp} demand={DEMO.demand} />
        </Box>
      </Wide>
      <Prose>
        <p>XGBoost adds two things to Friedman's recipe.<Fn n={7} k="b" /> It uses the second derivative of the loss as well as the first, so each tree takes a Newton step, and it charges for complexity inside the objective:</p>
      </Prose>
      <Prose><Eq>Obj = Σᵢ l(yᵢ, ŷᵢ) + Σₖ ( γT + ½ λ‖w‖² )</Eq></Prose>
      <Prose>
        <p>T is the number of leaves and w the leaf values, so γ is a fee for every extra leaf and λ shrinks large leaf values. With G and H the summed first and second derivatives of the loss over a leaf, the best leaf value and the split gain have closed forms:</p>
      </Prose>
      <Prose><Eq>w* = − G / (H + λ)</Eq></Prose>
      <Prose><Eq>Gain = ½ [ G_L² / (H_L + λ) + G_R² / (H_R + λ) − (G_L + G_R)² / (H_L + H_R + λ) ] − γ</Eq></Prose>
      <Prose>
        <p>A split only happens if the gain is positive, so γ sets the minimum improvement a new branch has to earn.</p>
      </Prose>

      <Section title="How XGBoost and LightGBM grow trees differently" />
      <Prose>
        <p>XGBoost by default grows a tree level by level, splitting every leaf at one depth before going deeper. LightGBM grows leaf-wise, splitting whichever single leaf offers the biggest gain.<Fn n={10} k="b" /></p>
      </Prose>
      <Wide>
        <Box title="Tree Growth">
          <TreeGrowth />
        </Box>
      </Wide>
      <Prose>
        <p>Leaf-wise growth reaches a lower loss for the same number of leaves, but its deep, narrow branches can fit noise on a small dataset, so LightGBM users cap the depth or the minimum rows in a leaf.</p>
      </Prose>

      <Section title="What gradient boosting depends on" />
      <Prose>
        <p>Gradient boosting depends on two conditions. Tomorrow has to look like something in the training data, because a tree cannot extrapolate: a record heatwave or a new kind of load such as home batteries gets the answer for the nearest day the model knows. The data also has to be clean, and meter migration runs from 22 October 2025 until implementation completes in May 2027.<Fn n={9} k="b" /></p>
      </Prose>

      <Section title="How I would choose a demand forecasting model now" />
      <Prose>
        <p>So was the slow move worth it? Over nine years the average error has improved a little, and the bigger gain is that those very bad days have gone. On public national demand the gain was narrower: days with an error above 5% were as common under boosting (36) as under regression (34), and what improved was the worst day, 8.5% against 12.0%.</p>
        <p>If you are choosing a model now, I'd judge it by how often it has a bad day before looking at its average error, pick one you can retrain quickly at the data volume you expect, and keep checking the two conditions gradient boosting depends on.</p>
        <p>SARIMA had a fifty-year run and I'd be surprised if tree models get half that. I was slow to let go of the LSTM, so this time the SARIMA benchmark stays switched on.</p>
      </Prose>

      <Footnotes notes={NOTES} />
    </Article>
  );
}
