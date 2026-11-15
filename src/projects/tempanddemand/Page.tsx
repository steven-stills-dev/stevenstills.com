import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { Article, Prose, Section, Wide, Fn, Footnotes } from "../../components/Article";
import Box from "../../components/Box";
import Bars from "../../components/charts/Bars";
import { MON, fmt } from "../../lib/format";
import { usePageMeta } from "../../lib/meta";
import { ramp } from "../../components/charts/geom";
import BellCurve, { CATS, partial, useBell, type BellData, type Mode, type Normals } from "./BellCurve";
import { GAS_DAYS, GAS_TICKS, MonthBars, YearLines, YearScatter, yearColor, type DayHover } from "./Charts";
import "./bell-curve.css";

const RATE = 1;  // years per second
const HOLD = 3;  // seconds on the latest year before the preview loops
const MODES: { key: Mode; label: string }[] = [
  { key: "mean", label: "Mean" }, { key: "max", label: "Max" }, { key: "min", label: "Min" },
];

/** Animated distribution of daily temperature, 1878 to date; also the home preview. */
export function BellFigure({ h, preview = false, mode = "mean", onMode }: {
  h?: number; preview?: boolean; mode?: Mode; onMode?: (m: Mode) => void;
}) {
  const data = useBell();
  const n = data?.years.length ?? 0;
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const tRef = useRef(0);
  const seek = (v: number) => { tRef.current = v; setT(v); };

  useEffect(() => {
    if (!n) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    seek(still ? n - 1 : 0);
    setPlaying(!still);
  }, [n]);

  useEffect(() => {
    if (!playing || !n) return;
    let raf = 0, prev: number | null = null, hold = 0;
    const step = (ts: number) => {
      const dt = prev == null ? 0 : (ts - prev) / 1000;
      prev = ts;
      if (tRef.current >= n - 1) {
        if (!preview) { setPlaying(false); return; }
        hold += dt;
        if (hold >= HOLD) { hold = 0; seek(0); }
      } else seek(Math.min(n - 1, tRef.current + dt * RATE));
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, n, preview]);

  const toggle = () => {
    if (!playing && tRef.current >= n - 1) seek(0);
    setPlaying(!playing);
  };

  return (
    <Box title="Distribution of Daily Temperature" sub="σ" h={h}>
      {data ? <BellCurve data={data} mode={mode} t={t} /> : <div className="loading">Loading…</div>}
      <div className="legend">
        {CATS.map((c, k) => <span key={c.name}><i className={k === 3 ? "bc-ring" : undefined} style={{ background: c.color }} />{c.name}</span>)}
        {data && <span><i className="bc-dash" />{data.years[0]}</span>}
      </div>
      {!preview && data && (
        <div className="bc-controls">
          <button type="button" className="bc-play" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
            {playing ? <Pause strokeWidth={1.5} /> : <Play strokeWidth={1.5} />}
          </button>
          <input type="range" min={0} max={n - 1} step={1} value={Math.round(t)} aria-label="Year"
            onChange={(e) => { setPlaying(false); seek(+e.target.value); }} />
          {onMode && (
            <div className="bc-modes" role="group" aria-label="Daily temperature">
              {MODES.map((m) => (
                <button key={m.key} type="button" className={"chip" + (mode === m.key ? " on" : "")}
                  aria-pressed={mode === m.key} onClick={() => onMode(m.key)}>{m.label}</button>
              ))}
            </div>
          )}
        </div>
      )}
    </Box>
  );
}

/** Share of days in each category for every year shown, for the selected series. */
function ShareTable({ data, mode }: { data: BellData; mode: Mode }) {
  const m = data.modes[mode];
  const tail = partial(data.last);
  const rows = data.years.map((y, i) => ({
    label: i === data.years.length - 1 && tail ? `${y} ${tail}` : String(y), share: m.share[i], shift: m.shift[i],
  }));
  return (
    <Box title="Share of Days by Category" sub={`Daily ${mode}, %`}>
      <div className="bc-table-wrap">
        <table className="bc-table">
          <thead>
            <tr>
              <th>Year</th>
              {CATS.map((c, k) => (
                <th key={c.name}><i className={k === 3 ? "bc-ring" : undefined} style={{ background: c.color }} />{c.name}<span>{c.range}</span></th>
              ))}
              <th>Change<span>°C on 1961–1990</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td>{r.label}</td>
                {r.share.map((v, k) => <td key={k}>{fmt(v, 1)}</td>)}
                <td>{r.shift > 0 ? "+" : ""}{fmt(r.shift, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Box>
  );
}

/** Monthly normals chart and table: 30y, 10y and 5y on the brand ramp, last 12 months in Night. */
function NormalsFigures({ n }: { n: Normals }) {
  const cols = [
    { key: "n30", name: "30y", color: ramp(0, 3), values: n.n30 },
    { key: "n10", name: "10y", color: ramp(1, 3), values: n.n10 },
    { key: "n5", name: "5y", color: ramp(2, 3), values: n.n5 },
    { key: "last12", name: "Last 12 months", color: "var(--ste-night)", values: n.last12 },
  ];
  const signed = (v: number | null) => (v == null ? "–" : `${v > 0 ? "+" : ""}${fmt(v, 1)}`);
  return (
    <>
      <Box title="Month-by-Month Temperatures" sub="°C" h={400}>
        <MonthBars series={cols} unit="°C" digits={1} />
      </Box>
      <Box title="Month-by-Month Data" sub="°C">
        <div className="bc-table-wrap">
          <table className="bc-table">
            <thead>
              <tr>
                <th>Month</th><th>30y</th><th>10y</th><th>5y</th><th>12m</th><th>Δ10y</th><th>Δ5y</th><th>Δ12m</th>
              </tr>
            </thead>
            <tbody>
              {MON.map((mon, m) => (
                <tr key={mon}>
                  <td>{mon}</td>
                  {cols.map((c) => <td key={c.key}>{fmt(c.values[m], 1)}</td>)}
                  <td>{signed(n.d10[m])}</td><td>{signed(n.d5[m])}</td><td>{signed(n.d12[m])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Box>
    </>
  );
}

/** The settlement and national forecasting formulas, with every seasonal normal term picked out. */
function FormulaPanel() {
  return (
    <Box title="Gas Demand Formulas">
      <div className="bc-eq">
        <span className="bc-eq-h">Settlement</span>
        <p><var>SPD</var> = (<var>AQ</var> ÷ 365) × <var>ALP</var> × (1 + <var>DAF</var> × <var>WCF</var>)</p>
        <p><var>ALP</var> = <mark>SND</mark> ÷ average <mark>SND</mark></p>
        <p><var>DAF</var> = weather coefficient ÷ <mark>SND</mark></p>
        <p><var>WCF</var> = <var>CWV</var> − <mark>SNCWV</mark></p>
        <span className="bc-eq-h">National forecast</span>
        <p><var>Demand</var> = <mark>SND</mark> + weather sensitivity × (<var>CWV</var> − <mark>SNCWV</mark>)</p>
      </div>
      <div className="bc-key">
        <span><b>SPD</b>a meter point's gas for the day</span>
        <span><b>AQ</b>its annual quantity</span>
        <span><b>ALP</b>annual load profile</span>
        <span><b>DAF</b>daily adjustment factor</span>
        <span><b>WCF</b>weather correction factor</span>
        <span><b>CWV</b>composite weather variable, temperature and wind</span>
        <span><b>SND</b>seasonal normal demand</span>
        <span><b>SNCWV</b>seasonal normal CWV</span>
      </div>
    </Box>
  );
}

export default function BellCurvePage() {
  const title = "Seasonal normal weather in gas demand allocation";
  const lede = "Britain's gas industry allocates and forecasts demand against a seasonal normal, the weather the industry treats as typical for each day of the year, and resets that normal once every five years. I look at how far temperatures and gas demand have moved since 2015, how the published seasonal normal compares with the weather since October 2022, and what the difference between the two was worth in gas in 2024/25.";
  usePageMeta(title, "Britain's gas industry allocates and forecasts demand against a seasonal normal that is reset once every five years. I look at temperature and gas demand since 2015, compare the published seasonal normal with the weather since October 2022, and estimate what the difference was worth in the 2024/25 gas year.");
  const data = useBell();
  const [mode, setMode] = useState<Mode>("mean");
  const [dayHover, setDayHover] = useState<DayHover>(null);

  return (
    <Article kicker="Writing · climate & energy · updated 12 Nov 2026" title={title} lede={lede}>
      <Prose>
        <p>Most of the gas on Britain's local networks goes to homes and small businesses whose meters are read monthly at best. The industry therefore allocates each day's demand to those meters with a formula written into the Uniform Network Code, the gas industry's rulebook, and the formula depends on the seasonal normal: the weather, and the demand that goes with that weather, which the industry treats as typical for each day of the year.<Fn n={1} /></p>
        <p>The seasonal normal is slow to change. The Demand Estimation Sub-Committee (DESC) resets it once every five years,<Fn n={2} /> so between resets the formula measures each day against a fixed view of typical weather. A supplier that buys gas against a forecast built on the seasonal normal carries the difference: when the weather runs warmer than the seasonal normal, the supplier holds gas bought for demand that does not arrive.</p>
        <p>I started looking at the seasonal normal because of how warm 2026 has been. I wanted to know how far the weather has moved from the seasonal normal the industry publishes, and what that difference is worth in gas.</p>
      </Prose>

      <Section title="Where the seasonal normal sits in the allocation formula" />
      <Prose>
        <p>The allocation formula takes each site's annual quantity of gas and spreads it across the year with a load profile. The formula then adjusts each day's share with a weather correction: the gap between the day's composite weather variable, a blend of temperature and wind, and the seasonal normal value of that variable.<Fn n={1} k="b" /></p>
      </Prose>
      <Wide>
        <FormulaPanel />
      </Wide>
      <Prose>
        <p>The seasonal normal turns up in three of the formula's four moving parts. The load profile is built from seasonal normal demand. The daily adjustment factor is built from seasonal normal demand too, because the factor divides by it. The weather correction then measures each day's composite weather variable against the seasonal normal for that variable.<Fn n={1} k="c" /></p>
        <p>DESC resets the seasonal normal once every five years, "due to the time taken to perform the review and the need for stability". The last reset took effect on 1 October 2025, onto a warmer basis built from Met Office climate projections, and the next is due in 2030.<Fn n={2} k="b" /></p>
        <p>National Gas forecasts demand for the whole network the same way: seasonal normal demand, plus a weather sensitivity multiplied by the gap between the day's weather and the seasonal normal weather. The Future Energy Scenarios published by NESO (the National Energy System Operator) point to that National Gas method for peak gas demand.<Fn n={3} /></p>
      </Prose>

      <Section title="How far daily temperatures have moved since 2015" />
      <Prose>
        <p>I started with temperature, using the Met Office's Central England series, which gives a daily mean, maximum and minimum.<Fn n={4} /> Two days in 2026 rank near the top of that series: 26 June and 13 August 2026 were the second and third hottest days since 2015, behind 19 July 2022.<Fn n={5} /></p>
      </Prose>
      <Wide>
        <BellFigure h={500} mode={mode} onMode={setMode} />
      </Wide>
      <Prose>
        <p>The chart shows every day since 2015, one year at a time, sorted by how far the day's temperature sat above or below the 1961 to 1990 average for that date.<Fn n={6} /> The dashed outline marks 2015. In 2015, 42% of days ran warmer than normal. The share was 53% in 2020 and 60% in 2025, and so far in 2026 it is 70%.<Fn n={5} k="b" /> The share of days warmer than normal does not rise in every year, and the table below gives each year in full.</p>
        <p>Each colour in the chart marks a band of days. A day counts as normal when its temperature lands in the middle third of what that date saw between 1961 and 1990. Warmer days fall into warm, very warm or extremely warm, depending on how many standard deviations (the typical swing for that date) they sit above the 1961 to 1990 average for that date, and colder days mirror them. The cut-offs come from James Hansen's 2012 paper on how people perceive a warming climate.<Fn n={7} /> The table below gives the cut-offs and the share of days in each band for every year.</p>
      </Prose>

      {data && <Wide><ShareTable data={data} mode={mode} /></Wide>}

      <Section title="How gas demand responds to temperature" />
      <Prose>
        <p>Most people in energy will tell you gas is an easier forecast than electricity, which solar, batteries and half-hourly settlement make the harder problem, and for most of the year I'd agree. As the days warm up, gas demand falls in something close to a straight line, about 146 GWh a day for every degree of daily mean temperature. Demand keeps falling until daytime highs pass about 22°C, where it levels off near 500 GWh a day, the gas for hot water, cooking and industry that no weather switches off.<Fn n={5} k="c" /></p>
        <p>The largest single day in the data was 1 March 2018, with the Beast from the East blowing across the country, when Britain's local gas networks carried 3,893 GWh.<Fn n={8} /> The two charts below show average temperature and gas demand for each day of the year, with one line for each year since 2015.</p>
      </Prose>
      {data && (
        <Wide>
          <Box title="Average Temperature by Day" sub="°C" h={400}>
            <YearLines lines={data.temp} years={data.years} unit="°C" digits={1} hover={dayHover} onHover={setDayHover} />
          </Box>
          <Box title="Gas Demand by Day" sub="GWh" h={400}>
            <YearLines lines={data.gas} years={data.years} unit="GWh" digits={0} hover={dayHover} onHover={setDayHover} />
          </Box>
        </Wide>
      )}
      <Prose>
        <p>Year by year, the networks carried an average of between 1,410 and 1,490 GWh a day from 2015 to 2021. In 2022 the average fell to 1,270 GWh a day, and it has stayed between 1,210 and 1,230 GWh a day in each full year since.<Fn n={8} k="b" /> The drop is still there when I compare days of the same temperature. On days with a mean temperature of 4 to 6°C the networks took an average of 2,240 GWh a day in 2015 to 2017 and 2,060 GWh a day in 2022 to 2025, and the average for every 2°C band from 0 to 20°C fell by 8% to 14%.<Fn n={8} k="c" /> The scatter below shows each day's gas demand against that day's temperature, coloured by year.</p>
      </Prose>
      {data && (
        <Wide>
          <Box title="Gas Demand Against Temperature" sub="GWh" h={440}>
            <YearScatter groups={data.scatter} years={data.years} xUnit="°C" yUnit="GWh" />
          </Box>
        </Wide>
      )}
      <Prose>
        <p>When Ofgem decided in May 2026 to cut its typical household gas figure from 11,500 to 9,500 kWh a year, it listed efficiency, "evolving patterns of energy use within the home", climate and "more recent behavioural responses to affordability pressures".<Fn n={9} /> Climate is one of those four factors, and it is the one the industry writes down in advance, as the seasonal normal.</p>
      </Prose>

      <Section title="The seasonal normal against recent weather" />
      <Prose>
        <p>I wanted to see how quickly a weather average falls behind the recent weather, so I took Birmingham, a central, well-populated area, as a sample and looked at its temperature history. The years 2021 to 2025 ran about 0.7°C warmer than 1991 to 2020, and warmer in 10 of 12 months. Over the last 12 months, 11 came in above the 1991 to 2020 average, July by 3.9°C.<Fn n={10} /> The chart and table below show Birmingham's average temperature for each month over 30 years, 10 years, 5 years and the last 12 months.</p>
      </Prose>
      {data && <Wide><NormalsFigures n={data.normals} /></Wide>}
      <Prose>
        <p>The gas industry's own figures also show the weather running warmer than its seasonal normal. National Gas publishes the national composite weather variable every day next to its own seasonal normal for that variable. That published normal last changed in October 2022 and did not change when DESC's new basis took effect on 1 October 2025. In each of the three gas years to September 2025 (a gas year runs from October to September), the actual composite weather variable came in warmer than the seasonal normal on about two days in three. In the 2025/26 gas year so far, the share has been 78% of days.<Fn n={11} /> I'm less sure of the latest figure, because the industry revised the formula behind the composite weather variable from 1 October 2025 and the published seasonal normal did not change with it. The bar chart below shows the share of days in each gas year on which the composite weather variable was warmer than the published seasonal normal.</p>
      </Prose>
      {data && (
        <Wide>
          <Box title="Days Warmer Than the Seasonal Normal" sub="%" h={340}>
            <Bars items={data.cwv.filter((c) => c.name >= "2022").map((c) => ({ label: c.name, value: c.warmer }))} unit="%" />
          </Box>
        </Wide>
      )}
      <Prose>
        <p>DESC's own review points the same way. In its NDM Algorithm Review in June 2026, DESC reported that the seasonal normal "was approximately 0.25 degrees cooler than expected" across the five gas years to 2024/25, and that "all Springs since 2022 have stood out as warmer than normal". The review concluded that the algorithm "remains fit for purpose".<Fn n={12} /></p>
      </Prose>
      {data && (
        <Wide>
          <Box title="Weather Against the Seasonal Normal" sub="°C" h={400}>
            <YearLines years={data.years} unit="°C" digits={1} ticks={GAS_TICKS} days={GAS_DAYS}
              lines={[
                { name: "Seasonal normal", values: data.cwvYears.normal, color: "var(--ste-night)", dash: "4 4" },
                ...data.cwvYears.years.map((y) => ({ name: y.name, values: y.values, color: yearColor(String(y.end), data.years) })),
              ]} />
          </Box>
        </Wide>
      )}
      <Prose>
        <p>The chart above shows the same comparison day by day on National Gas's national figures, with one line for each gas year since October 2022 against the seasonal normal that National Gas publishes. Spring, March to May, came in above the seasonal normal in every one of those gas years, by 0.4 to 1.4 degrees on average.<Fn n={11} k="b" /></p>
      </Prose>

      <Section title="What the gap was worth in the 2024/25 gas year" />
      <Prose>
        <p>In 2024/25, the last full gas year, the local networks carried 12.7% less gas than National Gas's seasonal normal forecast, a shortfall of about 64 TWh. National Gas defines the local network figure in its forecast as metered demand plus the gas the networks lose, so I treat the forecast and the gas the networks carried as the same quantity.<Fn n={13} /> By my estimate some 19 TWh of the shortfall came from the weather running warmer than the seasonal normal. The other 45 TWh is demand running below the seasonal normal forecast in the same weather, and I found a shortfall of that second kind in every gas year I checked: between 32 and 45 TWh in each of the four gas years from 2021/22 to 2024/25. So I read the 45 TWh as the level of the forecast sitting too high, which a weather correction would not remove. For scale, 19 TWh is a year's gas for about two million homes at Ofgem's typical 9,500 kWh, and about £630m at 97p a therm, the average of the daily System Average Price of gas over the 2024/25 gas year.<Fn n={9} k="b" /><Fn n={14} /> A supplier that bought gas for 1% of the market against that seasonal normal would be holding about £6m of gas bought for weather that did not arrive.</p>
        <p>The chart below shows the 2024/25 gas year day by day. National Gas's seasonal normal forecast sat above the gas the local networks carried on 84% of days.<Fn n={13} k="b" /></p>
      </Prose>
      {data && (
        <Wide>
          <Box title="Gas Demand Against the Seasonal Normal Forecast" sub="GWh" h={400}>
            <YearLines years={data.years} unit="GWh" digits={0} ticks={GAS_TICKS} days={GAS_DAYS}
              lines={[
                { name: "Seasonal normal forecast", values: data.sndYear.forecast, color: "var(--ste-night)", dash: "4 4" },
                { name: "Actual", values: data.sndYear.actual, color: "var(--ste-secondary)" },
              ]} />
          </Box>
        </Wide>
      )}

      <Section title="Tracking the gap between weather and the seasonal normal" />
      <Prose>
        <p>Gas demand follows temperature closely and the allocation formula is public, so one risk in a gas forecast that I can measure is the seasonal normal, which DESC resets once every five years. In each of the three gas years to September 2025 the weather came in warmer than the seasonal normal National Gas publishes on about two days in three, and by my estimate that difference accounted for some 19 TWh of the 64 TWh shortfall against the seasonal normal forecast in 2024/25. The other 45 TWh was demand below the forecast in the same weather, at a size I found in every gas year from 2021/22, so I would correct that part separately, as an error in the level of the forecast.</p>
        <p>The correction I would make is fairly simple. I would track the gap between the actual weather and the seasonal normal every month, and trim the gas forecast by the demand that the gap explains. I would look at spring first, because spring came in above the seasonal normal in every gas year since October 2022. The correction only works for a supplier with decent meter read performance to support it, and for one that is not beholden to the gas allocation algorithms in the first place.</p>
      </Prose>

      <Footnotes notes={[
        <>"SPDt = ((AQ/365) x ALPt x (1 + (DAFt x WCFt)))" and "WCFt = CWVt – SNCWVt", where SNCWV "is the Seasonal Normal value of the Composite Weather Variable". The ALP is "the Seasonal Normal Demand of the End User Category for that Day as a proportion of the average Seasonal Normal Demand", and "DAF = WVCEt/SNDEt". <a href="https://www.gasgovernance.co.uk/sites/default/files/related-files/2023-10/Demand%20Estimation%20UNC%20Related%20Document%20v1.4.pdf" target="_blank" rel="noopener">Uniform Network Code, NDM Demand Estimation Methodology v1.4</a>, sections 2 to 3.5, reproducing <a href="https://www.gasgovernance.co.uk/sites/default/files/related-files/2024-10/10%20TPD%20Section%20H%20-%20Demand%20Estimation%20and%20Demand%20Forecasting.pdf" target="_blank" rel="noopener">UNC TPD Section H</a> H2.2.1 to H2.5.</>,
        <>"Reviews of the CWV formula and Seasonal Normal basis are normally only carried out by DESC every 5 years due to the time taken to perform the review and the need for stability." The 2019 review took effect on 1 October 2020 and the next basis on 1 October 2025, and DESC wrote on 14 August 2025 that "SNCWV profiles have generally increased across all months to account for the latest view of climate". <a href="https://www.gasgovernance.co.uk/sites/default/files/related-files/2025-07/3.0%20Seasonal%20Normal%20Review%20DESC_230725.pdf" target="_blank" rel="noopener">DESC, Seasonal Normal Review, 23 July 2025</a>; the new basis is built from Met Office climate projections for gas years 2025/26 to 2029/30, <a href="https://www.gasgovernance.co.uk/sites/default/files/related-files/2025-08/Seasonal%20Normal%20Review%202025%20%2814%20August%202025%29.pdf" target="_blank" rel="noopener">DESC, 14 August 2025</a>.</>,
        <>"Demandi = SNDi + Weather Sensitivityi * (CWVi –SNCWi) + ui", where "SNDi is the seasonal normal demand for day i". <a href="https://www.nationalgas.com/sites/default/files/documents/Gas%20Demand%20Forecasting%20Methodology%202020_v1.pdf" target="_blank" rel="noopener">National Gas, Gas Demand Forecasting Methodology, July 2020</a>, A2.4. "Peak gas demand is calculated for a 1-in-20 day, as described in the Gas Demand Forecasting Methodology published on the National Gas website." <a href="https://www.neso.energy/document/364701/download" target="_blank" rel="noopener">NESO, Future Energy Scenarios: Modelling Methods, July 2025</a>.</>,
        <>Met Office Hadley Centre Central England Temperature, HadCET v2.1.1.0, daily mean, maximum and minimum, representative of a roughly triangular area enclosed by Lancashire, London and Bristol, with a −0.2°C urban warming correction applied to mean temperatures since 1974. Data to 27 September 2026. <a href="https://www.metoffice.gov.uk/hadobs/hadcet/" target="_blank" rel="noopener">Met Office Hadley Centre, HadCET</a>.</>,
        <>My calculations from HadCET daily data for 1961 to 1990 and 2015 to 27 September 2026. Ranks use the daily mean: 28.1°C on 19 July 2022, 26.5°C on 26 June 2026 and 25.8°C on 13 August 2026, which are also the three highest values in the full daily series. Each day's anomaly is its temperature minus a three-harmonic fit of the 1961 to 1990 average for its date, and σ is the 1961 to 1990 spread of those anomalies, smoothed over 31 days. Curves are kernel density estimates with a 0.3σ bandwidth. The demand slope is a straight-line fit of daily network demand on daily mean temperature for days below 14°C in 2022 to 2025 (R² 0.85), and the floor is average demand by daytime high. Script in <code>scripts/tempanddemand/build.py</code>.</>,
        <>"For the purposes of historical comparison and climate change monitoring, WMO still recommends the continuation of the 1961-1990 period for the computation and tracking global climate anomalies." <a href="https://wmo.int/media/news/updated-30-year-reference-period-reflects-changing-climate" target="_blank" rel="noopener">WMO, 5 May 2021</a>.</>,
        <>Hansen, J., Sato, M. and Ruedy, R. (2012), Perception of climate change, PNAS 109, E2415, which scored summers against 1951 to 1980. <a href="https://doi.org/10.1073/pnas.1205276109" target="_blank" rel="noopener">PNAS</a>. The animated form follows the global version at <a href="https://celsius.earth/motion/bell-curve" target="_blank" rel="noopener">celsius.earth</a>.</>,
        <>My calculations from National Gas Transmission's NTS Energy Offtaken, LDZ Offtake Total. 2015 to 2019 is from Grant Wilson and Noah Godfrey's extract of National Grid's MIPI data on <a href="https://zenodo.org/records/4913872" target="_blank" rel="noopener">Zenodo</a> (CC BY-NC 4.0). 19 January 2020 to 26 September 2021 is from an archived portal export in the <a href="https://github.com/benmcwilliams/gas-demand" target="_blank" rel="noopener">gas-demand repository</a> on GitHub. From 27 September 2021 it is from the <a href="https://data.nationalgas.com/find-gas-data" target="_blank" rel="noopener">National Gas data portal</a>, which keeps five rolling years. 1 to 18 January 2020 is converted from the LDZ volumes in National Gas's <a href="https://www.nationalgas.com/our-businesses/operational-data/our-data" target="_blank" rel="noopener">Gas Winter Review and Consultation 2020</a> datasheet at 10.96 kWh per cubic metre. Periods use complete calendar years, and lines by date are smoothed over 31 days.</>,
        <>"Long-term trends in energy efficiency, evolving patterns of energy use within the home, climatic changes and more recent behavioural responses to affordability pressures have likely all contributed to sustained reductions in typical household demand." Medium gas use falls from 11,500 to 9,500 kWh a year. <a href="https://www.ofgem.gov.uk/sites/default/files/2026-05/Review%20of%20typical%20domestic%20consumption%20values%20decision.pdf" target="_blank" rel="noopener">Ofgem, Review of typical domestic consumption values: decision, 27 May 2026</a>.</>,
        <>ECMWF ERA5 reanalysis, daily mean 2 m temperature at Birmingham (52.48°N, 1.89°W), 1991 to 24 September 2026, from the <a href="https://open-meteo.com/en/docs/historical-weather-api" target="_blank" rel="noopener">Open-Meteo historical weather API</a>. My calculations: normals are monthly means over 1991 to 2020, 2016 to 2025 and 2021 to 2025, the 0.7°C is the average of the twelve monthly gaps between 2021 to 2025 and 1991 to 2020, and the last 12 months run from 24 September 2025. Contains modified Copernicus Climate Change Service information.</>,
        <>My calculations from National Gas's daily Composite Weather Variable, Actual and Normal, on the <a href="https://data.nationalgas.com/find-gas-data" target="_blank" rel="noopener">National Gas data portal</a>, gas years October to September, 2025/26 to 27 September 2026. In the chart each gas year is smoothed over 31 days, and spring is March to May. The industry's CWV formula parameters were revised from 1 October 2025 while the published normal was not, so the latest year may not compare exactly like for like.</>,
        <>"The most frequent WCF was between +0.1 and +0.3 CWV degrees, with an average of 0.246 … This indicates that overall, the SNCWV was approximately 0.25 degrees cooler than expected." GB level, gas years 2020/21 to 2024/25. <a href="https://www.gasgovernance.co.uk/sites/default/files/related-files/2026-07/NDM%20Algorithm%20Review%202026%20-%20Approved_0.pdf" target="_blank" rel="noopener">DESC, NDM Algorithm Review 2026, v2.0, 30 June 2026</a>.</>,
        <>My estimate. Seasonal normal LDZ demand from National Gas's <a href="https://www.nationalgas.com/our-businesses/operational-data/our-data" target="_blank" rel="noopener">CWV and Seasonal Normal Demands, rolling 5 years (October 2025)</a> workbook against actual LDZ offtake. The workbook defines LDZ as "Total of NDM and daily metered (DM) demand plus shrinkage in the distribution networks" and says the 2024/25 forecasts "were produced in June 2024". The weather share applies a fit of daily LDZ demand on the actual CWV (−154 GWh a day per degree below a CWV of 14, R² 0.96, on days from October 2021) to the gap between actual and seasonal normal CWV, capped at 14, on the 349 days of 2024/25 that have both CWV values. By the same method the shortfall and its weather share were 59 and 15 TWh in 2021/22, 59 and 18 TWh in 2022/23, and 58 and 26 TWh in 2023/24. In the chart both lines are smoothed over 7 days.</>,
        <>The System Average Price of gas averaged 3.32p/kWh, about 97p a therm, over the 365 days from 1 October 2024 to 30 September 2025. My calculation from the <a href="https://www.ons.gov.uk/economy/economicoutputandproductivity/output/datasets/systemaveragepricesapofgas" target="_blank" rel="noopener">ONS System Average Price (SAP) of gas dataset</a>, edition of 5 November 2026, which republishes National Gas Transmission data. 19 TWh is about 650 million therms.</>,
      ]} />
    </Article>
  );
}
