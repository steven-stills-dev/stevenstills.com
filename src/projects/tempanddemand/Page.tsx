import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { Article, Prose, Section, Wide, Fn, Footnotes } from "../../components/Article";
import Box from "../../components/Box";
import PillBars from "../../components/charts/PillBars";
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
    <Box icon="activity" title="Distribution of Daily Temperature" sub="σ" h={h}>
      {data ? <BellCurve data={data} mode={mode} t={t} /> : <div className="loading">Loading…</div>}
      <div className="legend">
        {CATS.map((c, k) => <span key={c.name}><i className={k === 3 ? "bc-ring" : undefined} style={{ background: c.color }} />{c.name}</span>)}
        {data && <span><i className="bc-dash" />{data.years[0]}</span>}
      </div>
      {!preview && data && (
        <div className="bc-controls">
          <button type="button" className="bc-play" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
            {playing ? <Pause strokeWidth={2.4} /> : <Play strokeWidth={2.4} />}
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
    <Box icon="layers" title="Share of Days by Category" sub={`Daily ${mode}, %`}>
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
      <Box icon="bars" title="Month-by-Month Temperatures" sub="°C" h={400}>
        <MonthBars series={cols} unit="°C" digits={1} />
      </Box>
      <Box icon="layers" title="Month-by-Month Data" sub="°C">
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
    <Box icon="layers" title="Gas Demand Formulas">
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
  const title = "The forgotten problem in forecasting gas allocations";
  const lede = "I've been thinking about how hot this year has been. So far, 70% of days in 2026 have run warmer than normal, but Britain's gas system still plans for ‘normal’ conditions. I dug into it, and the fix turns out to be fairly simple for an increasingly extreme problem.";
  usePageMeta(title, "In 2015, 43% of days in Central England ran warmer than normal for their date, and so far in 2026 it is 70%. I look at why gas is the simple half of energy forecasting, and why the seasonal normal inside the industry's gas formula is falling out of step with the weather.");
  const data = useBell();
  const [mode, setMode] = useState<Mode>("mean");
  const [dayHover, setDayHover] = useState<DayHover>(null);

  return (
    <Article kicker="Writing · climate & energy" title={title} lede={lede}>
      <Wide>
        <BellFigure h={500} mode={mode} onMode={setMode} />
      </Wide>

      <Prose>
        <p>On 1 March 2018, with the Beast from the East blowing across the country, Britain's gas networks carried 3,893 GWh in a single day, the most of any day since 2015.<Fn n={1} /> Eight summers later the records are all heat. 26 June and 13 August 2026 were the second and third hottest days in a Central England record that starts in 1772, beaten only by 19 July 2022.<Fn n={2} /><Fn n={3} /> This is the story of how fast the weather is moving, and how slowly the gas industry's idea of normal moves with it.</p>
        <p>The chart shows every day since 2015, one year at a time, sorted by how far its temperature sat above or below the 1961 to 1990 average for that date. The dashed outline is 2015.<Fn n={4} /> In 2015, 43% of days ran warmer than normal. In 2020, 53%. In 2025, 60%. This year so far, 70%.<Fn n={3} k="b" /></p>
        <p>Each colour in the chart marks a band of days. A day counts as normal when its temperature lands in the middle third of what that date saw between 1961 and 1990. Warmer days fall into warm, very warm or extremely warm, depending on how many standard deviations (the typical swing for that date) they sit above its 1961 to 1990 average, and colder days mirror them. The table below gives the cut-offs, which come from James Hansen's 2012 paper on how people perceive a warming climate.<Fn n={5} /></p>
      </Prose>

      {data && <Wide><ShareTable data={data} mode={mode} /></Wide>}

      <Section title="Gas is the simple half" />
      <Prose>
        <p>Most people in energy will tell you gas is the easier forecast, and for most of the year I'd agree. As the days warm up, demand falls in something close to a straight line, about 146 GWh a day for every degree of daily mean temperature. It keeps falling until daytime highs pass about 22°C, where it bottoms out near 500 GWh a day, the gas for hot water, cooking and industry that no weather switches off.<Fn n={3} k="c" /></p>
      </Prose>
      {data && (
        <Wide>
          <Box icon="activity" title="Average Temperature by Day" sub="°C" h={400}>
            <YearLines lines={data.temp} years={data.years} unit="°C" digits={1} hover={dayHover} onHover={setDayHover} />
          </Box>
          <Box icon="activity" title="Gas Demand by Day" sub="GWh" h={400}>
            <YearLines lines={data.gas} years={data.years} unit="GWh" digits={0} hover={dayHover} onHover={setDayHover} />
          </Box>
        </Wide>
      )}
      <Prose>
        <p>Year by year, the networks carried between 1,410 and 1,490 GWh a day from 2015 to 2021. In 2022 that fell to 1,270 GWh, and it has stayed between 1,210 and 1,230 GWh since.<Fn n={1} k="b" /> Compare days of the same temperature and the drop is still there. At 4 to 6°C the networks took 2,240 GWh in 2015 to 2017 and 2,060 GWh in 2022 to 2025, and every 2°C band from 0 to 20°C fell by 8% to 14%.<Fn n={1} k="c" /></p>
      </Prose>
      {data && (
        <Wide>
          <Box icon="activity" title="Gas Demand Against Temperature" sub="GWh" h={440}>
            <YearScatter groups={data.scatter} years={data.years} xUnit="°C" yUnit="GWh" />
          </Box>
        </Wide>
      )}
      <Prose>
        <p>When Ofgem cut its typical household gas figure from 11,500 to 9,500 kWh a year in May 2026, it listed efficiency, "evolving patterns of energy use within the home", climate and "more recent behavioural responses to affordability pressures".<Fn n={6} /> Weather is only one of those. It is also the one the industry writes down in advance.</p>
      </Prose>

      <Section title="The formula runs on a normal" />
      <Prose>
        <p>Most of the gas on the local networks goes to homes and small businesses whose meters are read monthly at best, so the industry allocates each day's demand with a formula written into the Uniform Network Code. Each site's annual quantity is spread across the year by a load profile, then nudged by a weather correction: the gap between the day's composite weather variable, a blend of temperature and wind, and its seasonal normal.<Fn n={7} /></p>
      </Prose>
      <Wide>
        <FormulaPanel />
      </Wide>
      <Prose>
        <p>The seasonal normal turns up in three of the formula's four moving parts. The load profile is built from seasonal normal demand, and so is the adjustment factor, which divides by it. The weather correction then measures each day's weather against the seasonal normal weather.<Fn n={7} k="b" /> The Demand Estimation Sub-Committee resets that normal once every five years, "due to the time taken to perform the review and the need for stability". The last reset took effect on 1 October 2025, onto a warmer basis built from Met Office climate projections, and the next is due in 2030.<Fn n={8} /></p>
        <p>National Gas forecasts demand for the whole network the same way: seasonal normal demand, plus a weather sensitivity multiplied by the gap between the day's weather and the seasonal normal weather. NESO's Future Energy Scenarios point to that National Gas method for peak gas demand.<Fn n={9} /></p>
      </Prose>

      <Section title="The normal is already behind" />
      <Prose>
        <p>Public weather data shows how quickly a weather average falls behind. Taking a central, well-populated area as a sample, I looked at Birmingham's temperature history: 2021 to 2025 ran about 0.7°C warmer than 1991 to 2020, and warmer in 10 of 12 months. Over the last 12 months, 11 came in above the 1991 to 2020 average, July by 3.9°C.<Fn n={10} /></p>
      </Prose>
      {data && <Wide><NormalsFigures n={data.normals} /></Wide>}
      <Prose>
        <p>The gas industry's own figures show the same drift. National Gas publishes the national composite weather variable every day next to its seasonal normal, and that published normal has not changed, day for day, since October 2022. In each of the three gas years to September 2025, the actual weather variable came in warmer than the seasonal normal on about two days in three. So far this gas year, it has been 78% of days.<Fn n={11} /></p>
      </Prose>
      {data && (
        <Wide>
          <Box icon="bars" title="Days Warmer Than the Seasonal Normal" sub="%" h={340}>
            <PillBars items={data.cwv.filter((c) => c.name >= "2022").map((c) => ({ label: c.name, value: c.warmer }))} unit="%" />
          </Box>
        </Wide>
      )}
      <Prose>
        <p>DESC reached the same answer in its NDM Algorithm Review in June 2026. The seasonal normal "was approximately 0.25 degrees cooler than expected" across the five gas years to 2024/25, and "all Springs since 2022 have stood out as warmer than normal". The review still concluded the algorithm "remains fit for purpose".<Fn n={12} /></p>
      </Prose>
      {data && (
        <Wide>
          <Box icon="activity" title="Weather Against the Seasonal Normal" sub="°C" h={400}>
            <YearLines years={data.years} unit="°C" digits={1} ticks={GAS_TICKS} days={GAS_DAYS}
              lines={[
                { name: "Seasonal normal", values: data.cwvYears.normal, color: "var(--ste-night)", dash: "4 4" },
                ...data.cwvYears.years.map((y) => ({ name: y.name, values: y.values, color: yearColor(String(y.end), data.years) })),
              ]} />
          </Box>
        </Wide>
      )}
      <Prose>
        <p>The chart shows the same comparison on National Gas's national figures, one line for each gas year since October 2022 against the seasonal normal it publishes. Spring came in above the seasonal normal in every one of those years, by 0.4 to 1.4 degrees on average.<Fn n={11} k="b" /></p>
        <p>In 2024/25, the last full gas year, the networks carried 12.7% less gas than National Gas's seasonal normal forecast, about 64 TWh. By my estimate some 19 TWh of that was the weather running warmer than the normal, and the rest is homes using less.<Fn n={13} /> For scale, 19 TWh is a year's gas for about two million homes at Ofgem's typical 9,500 kWh, and about £620m of gas at the 96p a therm UK gas fetched in late May 2026.<Fn n={6} k="b" /><Fn n={14} /> A supplier that bought gas for 1% of the market against that seasonal normal would be holding about £6m of gas priced for weather that never came.</p>
      </Prose>
      {data && (
        <Wide>
          <Box icon="activity" title="Gas Demand Against the Seasonal Normal Forecast" sub="GWh" h={400}>
            <YearLines years={data.years} unit="GWh" digits={0} ticks={GAS_TICKS} days={GAS_DAYS}
              lines={[
                { name: "Seasonal normal forecast", values: data.sndYear.forecast, color: "var(--ste-night)", dash: "4 4" },
                { name: "Actual", values: data.sndYear.actual, color: "var(--ste-secondary)" },
              ]} />
          </Box>
        </Wide>
      )}
      <Prose>
        <p>The chart shows 2024/25 day by day. National Gas's seasonal normal forecast sat above what the local networks actually carried on 84% of days.<Fn n={13} k="b" /></p>
      </Prose>

      <Section title="What I take from this" />
      <Prose>
        <p>Electricity gets the attention, and fairly so. Solar, batteries and half-hourly settlement make it the harder problem. Gas is the one that looks solved. The physics is simple and the formula is public, so the risk sits in a single input that is reset once every five years.</p>
        <p>The fix is as simple as it seems: track the gap between actual and seasonal normal every month and trim the gas forecasts to match that demand ‘miss’. A solution that will save any gas supplier a lot of wasted cash forecasting gas inaccurately, though this only works if you have a decent meter read performance to support it and aren't beholden to the gas allocation algorithms in the first place. But the heat is coming either way, and five years is a long time to plan for a winter that feels like it's never coming back.</p>
      </Prose>

      <Footnotes notes={[
        <>My calculations from National Gas Transmission's NTS Energy Offtaken, LDZ Offtake Total. 2015 to 2019 is from Grant Wilson and Noah Godfrey's extract of National Grid's MIPI data on <a href="https://zenodo.org/records/4913872" target="_blank" rel="noopener">Zenodo</a> (CC BY-NC 4.0). 19 January 2020 to 26 September 2021 is from an archived portal export in the <a href="https://github.com/benmcwilliams/gas-demand" target="_blank" rel="noopener">gas-demand repository</a> on GitHub. From 27 September 2021 it is from the <a href="https://data.nationalgas.com/find-gas-data" target="_blank" rel="noopener">National Gas data portal</a>, which keeps five rolling years. 1 to 18 January 2020 is converted from the LDZ volumes in National Gas's <a href="https://www.nationalgas.com/our-businesses/operational-data/our-data" target="_blank" rel="noopener">Gas Winter Review and Consultation 2020</a> datasheet at 10.96 kWh per cubic metre. Periods use complete calendar years, and lines by date are smoothed over 31 days.</>,
        <>Met Office Hadley Centre Central England Temperature, HadCET v2.1.1.0, daily mean, maximum and minimum, representative of a roughly triangular area enclosed by Lancashire, London and Bristol, with a −0.2°C urban warming correction applied to mean temperatures since 1974. Data to 27 September 2026. <a href="https://www.metoffice.gov.uk/hadobs/hadcet/" target="_blank" rel="noopener">Met Office Hadley Centre, HadCET</a>.</>,
        <>My calculations from HadCET daily data for 1961 to 1990 and 2015 to 27 September 2026. Ranks use the daily mean, which runs from 1772. Each day's anomaly is its temperature minus a three-harmonic fit of the 1961 to 1990 average for its date, and σ is the 1961 to 1990 spread of those anomalies, smoothed over 31 days. Curves are kernel density estimates with a 0.3σ bandwidth. The demand slope is a straight-line fit of daily network demand on daily mean temperature for days below 14°C in 2022 to 2025 (R² 0.85), and the floor is average demand by daytime high. Script in <code>scripts/tempanddemand/build.py</code>.</>,
        <>"For the purposes of historical comparison and climate change monitoring, WMO still recommends the continuation of the 1961-1990 period for the computation and tracking global climate anomalies." <a href="https://wmo.int/media/news/updated-30-year-reference-period-reflects-changing-climate" target="_blank" rel="noopener">WMO, 5 May 2021</a>.</>,
        <>Hansen, J., Sato, M. and Ruedy, R. (2012), Perception of climate change, PNAS 109, E2415, which scored summers against 1951 to 1980. <a href="https://doi.org/10.1073/pnas.1205276109" target="_blank" rel="noopener">PNAS</a>. The animated form follows the global version at <a href="https://celsius.earth/motion/bell-curve" target="_blank" rel="noopener">celsius.earth</a>.</>,
        <>"Long-term trends in energy efficiency, evolving patterns of energy use within the home, climatic changes and more recent behavioural responses to affordability pressures have likely all contributed to sustained reductions in typical household demand." Medium gas use falls from 11,500 to 9,500 kWh a year. <a href="https://www.ofgem.gov.uk/sites/default/files/2026-05/Review%20of%20typical%20domestic%20consumption%20values%20decision.pdf" target="_blank" rel="noopener">Ofgem, Review of typical domestic consumption values: decision, 27 May 2026</a>.</>,
        <>"SPDt = ((AQ/365) x ALPt x (1 + (DAFt x WCFt)))" and "WCFt = CWVt – SNCWVt", where SNCWV "is the Seasonal Normal value of the Composite Weather Variable". The ALP is "the Seasonal Normal Demand of the End User Category for that Day as a proportion of the average Seasonal Normal Demand", and "DAF = WVCEt/SNDEt". <a href="https://www.gasgovernance.co.uk/sites/default/files/related-files/2023-10/Demand%20Estimation%20UNC%20Related%20Document%20v1.4.pdf" target="_blank" rel="noopener">Uniform Network Code, NDM Demand Estimation Methodology v1.4</a>, sections 2 to 3.5, reproducing <a href="https://www.gasgovernance.co.uk/sites/default/files/related-files/2024-10/10%20TPD%20Section%20H%20-%20Demand%20Estimation%20and%20Demand%20Forecasting.pdf" target="_blank" rel="noopener">UNC TPD Section H</a> H2.2.1 to H2.5.</>,
        <>"Reviews of the CWV formula and Seasonal Normal basis are normally only carried out by DESC every 5 years due to the time taken to perform the review and the need for stability." The 2019 review took effect on 1 October 2020 and the next basis on 1 October 2025, with "an overall reduction in SND from the 2020 to the 2025 definition, caused by a warmer SNCWV". <a href="https://www.gasgovernance.co.uk/sites/default/files/related-files/2025-07/3.0%20Seasonal%20Normal%20Review%20DESC_230725.pdf" target="_blank" rel="noopener">DESC, Seasonal Normal Review, 23 July 2025</a>; the new basis is built from Met Office climate projections for gas years 2025/26 to 2029/30, <a href="https://www.gasgovernance.co.uk/sites/default/files/related-files/2025-08/Seasonal%20Normal%20Review%202025%20%2814%20August%202025%29.pdf" target="_blank" rel="noopener">DESC, 14 August 2025</a>.</>,
        <>"Demandi = SNDi + Weather Sensitivityi * (CWVi –SNCWi) + ui", where "SNDi is the seasonal normal demand for day i". <a href="https://www.nationalgas.com/sites/default/files/documents/Gas%20Demand%20Forecasting%20Methodology%202020_v1.pdf" target="_blank" rel="noopener">National Gas, Gas Demand Forecasting Methodology, July 2020</a>, A2.4. "Peak gas demand is calculated for a 1-in-20 day, as described in the Gas Demand Forecasting Methodology published on the National Gas website." <a href="https://www.neso.energy/document/364701/download" target="_blank" rel="noopener">NESO, Future Energy Scenarios: Modelling Methods, July 2025</a>.</>,
        <>ECMWF ERA5 reanalysis, daily mean 2 m temperature at Birmingham (52.48°N, 1.89°W), 1991 to 23 September 2026, from the <a href="https://open-meteo.com/en/docs/historical-weather-api" target="_blank" rel="noopener">Open-Meteo historical weather API</a>. My calculations: normals are monthly means over 1991 to 2020, 2016 to 2025 and 2021 to 2025, the 0.7°C is the average of the twelve monthly gaps between 2021 to 2025 and 1991 to 2020, and the last 12 months run from 23 September 2025. Contains modified Copernicus Climate Change Service information.</>,
        <>My calculations from National Gas's daily Composite Weather Variable, Actual and Normal, on the <a href="https://data.nationalgas.com/find-gas-data" target="_blank" rel="noopener">National Gas data portal</a>, gas years October to September, 2025/26 to 28 September 2026. In the chart each gas year is smoothed over 31 days, and spring is March to May. The industry's CWV formula parameters were revised from 1 October 2025 while the published normal was not, so the latest year may not compare exactly like for like.</>,
        <>"The most frequent WCF was between +0.1 and +0.3 CWV degrees, with an average of 0.246 … This indicates that overall, the SNCWV was approximately 0.25 degrees cooler than expected." GB level, gas years 2020/21 to 2024/25. <a href="https://www.gasgovernance.co.uk/sites/default/files/related-files/2026-07/NDM%20Algorithm%20Review%202026%20-%20Approved_0.pdf" target="_blank" rel="noopener">DESC, NDM Algorithm Review 2026, v2.0, 30 June 2026</a>.</>,
        <>My estimate. Seasonal normal LDZ demand from National Gas's <a href="https://www.nationalgas.com/our-businesses/operational-data/our-data" target="_blank" rel="noopener">CWV and Seasonal Normal Demands, rolling 5 years (October 2025)</a> workbook against actual LDZ offtake. The weather share applies a fit of daily LDZ demand on the actual CWV (−154 GWh a day per degree below a CWV of 14, R² 0.96) to the gap between actual and seasonal normal CWV, capped at 14. In the chart both lines are smoothed over 7 days.</>,
        <>UK natural gas at 96p a therm in late May 2026. <a href="https://tradingeconomics.com/commodity/uk-natural-gas" target="_blank" rel="noopener">Trading Economics, UK natural gas</a>. 19 TWh is about 650 million therms.</>,
      ]} />
    </Article>
  );
}
