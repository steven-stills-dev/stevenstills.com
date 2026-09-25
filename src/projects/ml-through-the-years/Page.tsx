import { useState } from "react";
import { Article, Prose, Section, Wide, Fn, Footnotes } from "../../components/Article";
import Box from "../../components/Box";
import LineChart from "../../components/charts/LineChart";
import { usePageMeta } from "../../lib/meta";
import BoostDemo from "./BoostDemo";
import ModelStepper from "./ModelStepper";
import TreeGrowth from "./TreeGrowth";
import { DEMO } from "./demo-data";
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

/* ── Illustrative forecast error by month, Oct to Sep ── */
const MONTHS = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];
const ERR_OLD = [3.1, 2.8, 3.0, 2.7, 2.8, 3.4, 4.3, 4.9, 5.4, 5.6, 5.2, 4.2];
const ERR_GBM = [2.4, 2.3, 2.5, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.7, 2.6, 2.5];

const HH = Array.from({ length: 48 }, (_, k) => `${String(Math.floor(k / 2)).padStart(2, "0")}:${k % 2 ? "30" : "00"}`);
const HH_TICKS = [{ i: 0, label: "00:00" }, { i: 12, label: "06:00" }, { i: 24, label: "12:00" }, { i: 36, label: "18:00" }, { i: 47, label: "24:00" }];
const MONTH_TICKS = MONTHS.map((label, i) => ({ i, label }));
const NIGHT = "var(--ste-night)", SECONDARY = "var(--ste-secondary)";

/** Winter and summer demand shape; also the home preview. */
export function DemandShapeChart({ h }: { h?: number }) {
  return (
    <Box icon="activity" title="Half-Hourly Demand" sub="GW" h={h}>
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
  <>Across 1,045 monthly M3 series, statistical methods beat machine learning at every horizon: average sMAPE of 10.89% for Theta against 12.09% for the best machine learning method. {a("https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0194889", "Makridakis, Spiliotis and Assimakopoulos, PLOS ONE, 27 March 2018")}.</>,
  <>The winning entry, an equal-weighted average of LightGBM models, was 22.4% more accurate (WRMSSE) than the best benchmark; four of the top five were built on LightGBM and the third was a set of LSTM networks. M5 preprint, note 3, Table 3 and Section 4.2.</>,
  <>17 of the 29 winning solutions published on Kaggle's blog in 2015 used XGBoost; deep neural networks, the next most common, appeared in 11. The regularised objective, leaf weight and split gain are equations 2, 5 and 7 of the paper. {a("https://arxiv.org/abs/1603.02754", "Chen and Guestrin, XGBoost: A Scalable Tree Boosting System, KDD 2016")}.</>,
  <>Ofgem decided on 20 April 2021 to introduce market-wide half-hourly settlement for electricity. {a("https://www.ofgem.gov.uk/decision/electricity-retail-market-wide-half-hourly-settlement-decision-and-full-business-case", "Ofgem, Decision and Full Business Case")}.</>,
  <>Elexon deployed the MHHS central systems on 22 September 2025, with meter migration from 22 October 2025, about 80% of meters by October 2026 and completion in May 2027, processing "up to 500 billion half-hourly readings per year". {a("https://www.elexon.co.uk/2025/09/24/market-wide-half-hourly-settlement-reaches-major-milestone/", "Elexon, 24 September 2025")}.</>,
  <>Gradient-based One-Side Sampling, Exclusive Feature Bundling and leaf-wise growth; up to 9 times faster than histogram-based XGBoost (Allstate: 2.63 against 0.28 seconds per iteration). {a("https://papers.nips.cc/paper_files/paper/2017/file/6449f44a102fde848669bdd9eb6b76fa-Paper.pdf", "Ke et al., LightGBM, NeurIPS 2017")}.</>,
  <>Across 45 datasets, "tree-based models remain state-of-the-art on medium-sized data (~10K samples) even without accounting for their superior speed". {a("https://arxiv.org/abs/2207.08815", "Grinsztajn, Oyallon and Varoquaux, NeurIPS 2022")}.</>,
  <>Initial National Demand Outturn (INDO), averaged by half-hour over weekdays that were not bank holidays, winter October 2024 to March 2025 and summer April to September 2025. {a("https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/INDO", "Elexon Insights API, INDO")}.</>,
  <>The bank holiday, monthly error and boosting charts are illustrative shapes, not model output.</>,
  <>J. Friedman, Greedy function approximation: a gradient boosting machine, Annals of Statistics 29(5), October 2001. {a("https://projecteuclid.org/journals/annals-of-statistics/volume-29/issue-5/Greedy-function-approximation-A-gradient-boosting-machine/10.1214/aos/1013203451.full", "Project Euclid")}.</>,
  <>At GEFCom2014 gradient boosting won the wind and solar tracks and sat inside the winning price ensemble; the load track went to quantile regression and generalised additive models. {a("https://robjhyndman.com/papers/gefcom2014.pdf", "Hong et al., IJF 32(3), 2016")}.</>,
];

export default function Page() {
  const title = "Machine learning through the years";
  const lede = "I built my first half-hourly demand forecasts on SARIMA and linear regression in 2016, spent lockdown building LSTMs, and now forecast with gradient boosting on a book heading for 5 billion data points a year. I look at why each model rose and fell, how the three read the same half-hour, and what XGBoost and LightGBM are doing when they learn.";
  usePageMeta(title, lede);
  const [bh, setBh] = useState("SARIMA");

  return (
    <Article kicker="Opinion · machine learning" title={title} lede={lede}>
      <Section title="Four years of SARIMA and straight lines" />
      <Prose>
        <p>SARIMA (seasonal autoregressive integrated moving average) forecasts a series from its own past. Tomorrow's demand at 17:30 is a weighted sum of demand at 17:30 on recent days and on the same day last week, plus a correction for how wrong the last few forecasts were. George Box and Gwilym Jenkins set the method out in 1970,<Fn n={1} /> and it is still the benchmark a new forecasting method has to beat.</p>
        <p>Linear regression did the other half of the work. Demand becomes a straight-line function of temperature, day of week and time of year, with one coefficient per input. Both methods are transparent. Every number in them can be read out to a trader and defended.</p>
        <p>The weaknesses showed up on the calendar. A model that learns from its own recent past has no idea a Monday is a bank holiday until the Tuesday, so bank holidays were patched by hand, and now and then forgotten. And because a linear model gives temperature one slope for the whole year, a model tuned on winter heating drifted once the heating went off. The result was a model that worked well in winter and badly in summer.</p>
      </Prose>

      <Section title="Lockdown, and a lot of reading" />
      <Prose>
        <p>On 23 March 2020 the Prime Minister told the country to stay at home.<Fn n={2} /> Three weeks earlier a competition called M5 had opened on Kaggle, asking entrants to forecast 42,840 Walmart sales series. It closed on 30 June with 5,507 teams from 101 countries.<Fn n={3} /> A long time inside meant a lot of time to read up on what was emerging in machine learning, including the M competitions.</p>
        <p>The evidence at the time pointed both ways. The LSTM (long short-term memory network), a neural network that carries a memory from one step of a sequence to the next, dates from 1997, so by lockdown it was 23 years old.<Fn n={4} /> In M4, the 2018 edition, the winner was a hybrid of exponential smoothing and LSTM, close to 10% more accurate than the benchmark, yet none of the six pure machine learning entries beat a simple combination of statistical methods.<Fn n={5} /> A PLOS ONE paper the same year found statistics ahead of machine learning at every horizon on 1,045 monthly series.<Fn n={6} /></p>
        <p>M5 moved the argument. The winning entry was an average of LightGBM models and came in 22.4% more accurate than the best benchmark. Four of the top five were built on LightGBM, and the third was a set of LSTMs.<Fn n={7} /> Gradient boosting was no stranger to Kaggle either: in 2015, 17 of the 29 winning solutions published on its blog used XGBoost.<Fn n={8} /></p>
        <p>Through 2020 and 2021 I built a few LSTM models on AWS infrastructure and worked with a couple of third parties building neural networks for demand. The LSTM was also the architecture inside the M4 winner.</p>
      </Prose>

      <Section title="Why the LSTM gave way" />
      <Prose>
        <p>What ended it was volume. On 20 April 2021 Ofgem decided that every electricity meter in Great Britain would move to half-hourly settlement,<Fn n={9} /> and Elexon's new systems are built to take up to 500 billion half-hourly readings a year once the programme completes in May 2027.<Fn n={10} /> As MHHS moved from decision to delivery, I was looking at ingesting about 5 billion data points a year, roughly a hundredth of that national figure, and a neural network trained on that would have taken too long on the hardware I had. A forecast that is slow to retrain is slow to correct.</p>
        <p>Gradient boosting has its advantages at exactly that step. LightGBM sorts each input into a small number of histogram bins before it looks for a split, samples the rows it still predicts badly more heavily than the ones it already fits, and bundles inputs that are rarely non-zero at the same time. Its authors measured it at up to 9 times faster than histogram-based XGBoost.<Fn n={11} /> Trees also hold their own on this shape of data: across 45 tabular datasets, a NeurIPS 2022 study found them still ahead of deep learning on medium-sized data.<Fn n={12} /></p>
      </Prose>

      <Section title="Three ways to read the same half-hour" />
      <Prose>
        <p>The chart below is the shape every one of these models is trying to forecast: average national demand on a weekday in winter and in summer, half-hour by half-hour, from Elexon's published outturn.<Fn n={13} /> Winter peaks at about 38.5 GW at 18:00. Summer tops out near 28 GW in the evening, with a long midday dip where rooftop solar supplies homes before the grid sees them.</p>
      </Prose>
      <Wide>
        <DemandShapeChart h={380} />
      </Wide>
      <Prose>
        <p>The three families read that curve in different ways. SARIMA looks only at the series itself: the same half-hour two days ago and last week, weighted and summed, with temperature bolted on. An LSTM reads the recent days in order and keeps a running memory, with gates that decide what to hold, what to forget and what to pass on. Gradient boosting doesn't read a sequence at all. It turns every input, from the time of day to the bank-holiday flag, into yes-or-no questions, and adds up the answers from hundreds of small trees.</p>
      </Prose>
      <Wide>
        <Box icon="layers" title="How Each Model Forecasts">
          <ModelStepper />
        </Box>
      </Wide>
      <Prose>
        <p>That last difference is why the calendar stopped being a problem. A bank holiday is one more input the trees can split on, so the model learns what a bank holiday does to the morning ramp from every one in its training data. SARIMA, with no such input, forecasts an ordinary Monday.<Fn n={14} /></p>
      </Prose>
      <Wide>
        <Box icon="activity" title="Bank Holiday Forecast" sub="GW" h={420}>
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
        <p>The seasons work the same way. Instead of one temperature slope for the year, the trees learn a different response to temperature at each time of year, and a classification model can sort days into regimes before the forecast is made. The accuracy on an average winter day barely moves. The summer drift goes.</p>
      </Prose>
      <Wide>
        <Box icon="bars" title="Forecast Error by Month" sub="%" h={380}>
          <LineChart labels={MONTHS} ticks={MONTH_TICKS} unit="%" digits={1}
            series={[{ name: "Gradient boosting", values: ERR_GBM }, { name: "SARIMA", values: ERR_OLD, color: NIGHT }]} />
          <div className="legend">
            <span><i style={{ background: SECONDARY }} />Gradient boosting</span>
            <span><i style={{ background: NIGHT }} />SARIMA</span>
          </div>
        </Box>
      </Wide>

      <Section title="How a boosted tree learns" />
      <Prose>
        <p>Gradient boosting is older than either library. Jerome Friedman set it out in 2001 as a way to build one strong model out of many weak ones.<Fn n={15} /> Start with a single guess, say average demand. Work out the residual (actual minus forecast) for every half-hour. Fit a small tree to those residuals, add a fraction of its answer to the forecast, and repeat. Each new tree only has to learn what the previous ones got wrong.</p>
      </Prose>
      <Prose><Eq>Fₘ(x) = Fₘ₋₁(x) + η · fₘ(x)</Eq></Prose>
      <Prose>
        <p>The fraction η is the learning rate. A small one needs more trees and overfits less. For squared error the residual is the negative gradient of the loss, which is where the name comes from, and for any other loss the tree fits that gradient instead. In the demo below each tree can only draw a step, and a few hundred steps add up to a heating curve.</p>
      </Prose>
      <Wide>
        <Box icon="gauge" title="Gradient Boosting on Daily Demand" h={520}>
          <BoostDemo temp={DEMO.temp} demand={DEMO.demand} />
        </Box>
      </Wide>
      <Prose>
        <p>XGBoost adds two things to Friedman's recipe.<Fn n={8} k="b" /> It uses the second derivative of the loss as well as the first, so each tree takes a Newton step, and it charges for complexity inside the objective itself:</p>
      </Prose>
      <Prose><Eq>Obj = Σᵢ l(yᵢ, ŷᵢ) + Σₖ ( γT + ½ λ‖w‖² )</Eq></Prose>
      <Prose>
        <p>T is the number of leaves in a tree and w the values in them, so γ is a fee for every extra leaf and λ shrinks extreme leaf values. With g and h the first and second derivatives of the loss for each row, and G and H their sums over a leaf, the best value for a leaf and the gain from a split both have closed forms:</p>
      </Prose>
      <Prose><Eq>w* = − G / (H + λ)</Eq></Prose>
      <Prose><Eq>Gain = ½ [ G_L² / (H_L + λ) + G_R² / (H_R + λ) − (G_L + G_R)² / (H_L + H_R + λ) ] − γ</Eq></Prose>
      <Prose>
        <p>A split only happens if the gain is positive, so γ sets the minimum improvement a new branch has to earn. Every tree in the model, and so every half-hour in the forecast, comes out of that one formula applied again and again.</p>
      </Prose>

      <Section title="Where XGBoost and LightGBM part ways" />
      <Prose>
        <p>The two libraries share the maths and differ in how they grow a tree. XGBoost by default grows level by level, splitting every leaf at one depth before going deeper. LightGBM grows leaf-wise: at each step it splits whichever single leaf offers the biggest gain, wherever it sits.<Fn n={11} k="b" /></p>
      </Prose>
      <Wide>
        <Box icon="layers" title="Tree Growth">
          <TreeGrowth />
        </Box>
      </Wide>
      <Prose>
        <p>Leaf-wise growth reaches a lower loss for the same number of leaves, which is where much of the speed comes from. The price is a deep, narrow branch that can fit noise on a small dataset, so LightGBM users cap the depth or the minimum rows in a leaf. Add the histogram bins and the row sampling and you have a model that trains fast enough to be refit on half-hourly data at settlement scale.</p>
      </Prose>

      <Section title="What has to stay true" />
      <Prose>
        <p>That only works if two things stay true. The first is that tomorrow looks like something in the training data. A tree can't extrapolate: past the hottest day it has seen, every forecast lands in the same edge leaf, so a record heatwave or a new kind of load such as home batteries gets the answer for the nearest day the model already knows.</p>
        <p>The second is clean data. Meter migration to half-hourly settlement starts on 22 October 2025 and runs to May 2027,<Fn n={10} k="b" /> so the data under these models will be shifting for the next eighteen months. Gradient boosting is not a universal winner in energy either. At GEFCom2014 it took the wind and solar forecasting tracks, and the load track went to quantile regression and additive models.<Fn n={16} /></p>
      </Prose>

      <Section title="What I take from this" />
      <Prose>
        <p>Over nine years the average error has improved a little. The bigger change is consistency: the newer models are more correct, more often. The extreme days that used to turn up every year have gone, bank holidays are learned instead of remembered, and the model no longer has a good season and a bad one.</p>
        <p>For a supplier the money is made or lost on the bad days, so fewer bad days is the prize. MHHS is about to make the data a great deal bigger.</p>
        <p>SARIMA had a fifty-year run. I'd be surprised if the trees get half that.</p>
      </Prose>

      <Footnotes notes={NOTES} />
    </Article>
  );
}
