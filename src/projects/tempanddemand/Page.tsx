import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { Article, Prose, Section, Wide, Fn, Footnotes } from "../../components/Article";
import Box from "../../components/Box";
import { MON, fmt } from "../../lib/format";
import { usePageMeta } from "../../lib/meta";
import BellCurve, { CATS, partial, useBell, type BellData, type Mode, type Normals } from "./BellCurve";
import { MonthBars, YearLines, YearScatter, type DayHover } from "./Charts";
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

/** Monthly normals chart and table, in the forecasting dashboard's colours: 30y Secondary, 10y Dusk, 5y lime, last 12 months Night. */
function NormalsFigures({ n }: { n: Normals }) {
  const cols = [
    { key: "n30", name: "30y", color: "var(--ste-secondary)", values: n.n30 },
    { key: "n10", name: "10y", color: "var(--ste-dusk)", values: n.n10 },
    { key: "n5", name: "5y", color: "var(--ste-primary)", values: n.n5 },
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

export default function BellCurvePage() {
  const title = "More than half of days in Central England now run warmer than normal";
  const lede = "In 1961 to 1990 a third of days in Central England ran warmer than normal for their date, and from 2022 to 2025 it was 59%. I look at how that spread of days has moved since 2015, where in the year the warmth landed, and what gas demand did over the same years.";
  usePageMeta(title, lede);
  const data = useBell();
  const [mode, setMode] = useState<Mode>("mean");
  const [dayHover, setDayHover] = useState<DayHover>(null);

  return (
    <Article kicker="Writing · climate & energy" title={title} lede={lede}>
      <Wide>
        <BellFigure h={500} mode={mode} onMode={setMode} />
      </Wide>

      <Prose>
        <p>Between January and 27 September 2026, seven days in ten in Central England ran warmer than normal for their date.<Fn n={1} /><Fn n={2} /> The chart shows how the distribution behind that figure has moved since 2015, as far back as I could find public daily gas figures: every day, a year at a time, each scored against the 1961 to 1990 average and spread for its date, with 2015 drawn as the dashed outline. I measure against 1961 to 1990 because the World Meteorological Organization still recommends it for tracking climate change, even after it moved the working normal to 1991 to 2020 in May 2021.<Fn n={3} /></p>
        <p>The score is in standard deviations (σ), the amount a date's temperature typically strayed from its average in those 30 years. Normal is anything within 0.43σ, the middle third of days in 1961 to 1990. Warm runs from there to 2σ, very warm to 3σ and extremely warm beyond it, and the cold bands mirror them. The bands are James Hansen's, from his 2012 paper on how people perceive a warming climate.<Fn n={4} /></p>
        <p>In 2015, 43% of days ran warmer than normal. In 2020, 53%. In 2025, 60%.<Fn n={2} k="b" /> For scale, days more than 2σ warm came about eight times a year in 1961 to 1990 and about 35 times a year from 2022 to 2025.</p>
      </Prose>

      {data && <Wide><ShareTable data={data} mode={mode} /></Wide>}

      <Prose>
        <p>The daily mean in this series is the average of the day's maximum and minimum, and both have moved. Against 1961 to 1990, daytime highs averaged 1.96°C warmer from 2022 to 2025 and overnight lows 1.36°C warmer, so the afternoons have done more of the moving.<Fn n={2} k="c" /></p>
      </Prose>

      <Section title="Where in the year the warmth landed" />
      {data && (
        <Wide>
          <Box icon="activity" title="Average Temperature by Day" sub="°C" h={400}>
            <YearLines lines={data.temp} years={data.years} unit="°C" digits={1} hover={dayHover} onHover={setDayHover} />
          </Box>
          <Box icon="activity" title="Gas Demand by Day" sub="mcm" h={400}>
            <YearLines lines={data.gas} years={data.years} unit="mcm" digits={0} hover={dayHover} onHover={setDayHover} />
          </Box>
        </Wide>
      )}
      <Prose>
        <p>Laid out by date, 2022 to 2025 ran warmer than 2015 to 2017 through spring, summer and autumn, by 0.7 to 0.9°C a season, while winter barely moved, 5.6°C against 5.7°C.<Fn n={2} k="d" /></p>
        <p>The gas carried into the local distribution zones, the regional networks that supply homes and small businesses, averaged 132 mcm (million cubic metres) a day over 2015 to 2017 and 112 mcm over 2022 to 2025, some 15% less.<Fn n={5} /> Winter demand fell 11% even though winters were barely warmer, and summer demand, which carries little space heating, fell 18%.<Fn n={5} k="b" /></p>
      </Prose>

      <Section title="Less gas at the same temperature" />
      {data && (
        <Wide>
          <Box icon="activity" title="Gas Demand Against Temperature" sub="mcm" h={440}>
            <YearScatter groups={data.scatter} years={data.years} xUnit="°C" yUnit="mcm" />
          </Box>
        </Wide>
      )}
      <Prose>
        <p>On days averaging 4 to 6°C, the networks took 205 mcm in 2015 to 2017 and 188 mcm in 2022 to 2025. The gap holds in every 2°C band from 0 to 20°C, at 8% to 15%, so most of the fall is not the weather.<Fn n={5} k="c" /></p>
        <p>The weather still plays a part. Heating degree days, the running total of how far each day falls below 15.5°C, dropped 8% between the two periods.<Fn n={2} k="e" /> When Ofgem cut its typical household gas figure from 11,500 to 9,500 kWh a year in May 2026, it put the fall down to efficiency, "evolving patterns of energy use within the home", climate and "more recent behavioural responses to affordability pressures".<Fn n={6} /></p>
      </Prose>

      <Section title="The normals have moved too" />
      {data && <Wide><NormalsFigures n={data.normals} /></Wide>}
      <Prose>
        <p>The same drift shows in the monthly normals a forecaster works from. Against the 1991 to 2020 normal, the 5-year normal runs warmer in 10 of 12 months, and 11 of the last 12 months came in above it, July by 3.9°C.<Fn n={7} /></p>
      </Prose>

      <Section title="What I take from this" />
      <Prose>
        <p>A record day like 19 July 2022, when Central England averaged 28.1°C across the day and night, makes the news.<Fn n={2} k="f" /> The distribution is the bigger change. Across 2022 to 2025 the whole year ran about 0.7σ warmer than 1961 to 1990, enough to take the days more than 2σ warm from about eight a year to about 35. The cold days haven't gone. There are fewer than half as many of them.</p>
      </Prose>

      <Footnotes notes={[
        <>Met Office Hadley Centre Central England Temperature, HadCET v2.1.1.0, daily mean, maximum and minimum, representative of a roughly triangular area enclosed by Lancashire, London and Bristol, with a −0.2°C urban warming correction applied to mean temperatures since 1974. Data to 27 September 2026. <a href="https://www.metoffice.gov.uk/hadobs/hadcet/" target="_blank" rel="noopener">Met Office Hadley Centre, HadCET</a>.</>,
        <>My calculations from HadCET daily data for 1961 to 1990 and 2015 to 27 September 2026. Each day's anomaly is its temperature minus a three-harmonic fit of the 1961 to 1990 average for its date, and σ is the 1961 to 1990 spread of those anomalies, smoothed over 31 days. Curves are kernel density estimates with a 0.3σ bandwidth. Periods use complete years, and lines by date are smoothed over 31 days. Winter is December to February, and heating degree days add up 15.5°C minus the daily mean on every day below it. The daily mean equals the average of maximum and minimum to within 0.3°C. Script in <code>scripts/tempanddemand/build.py</code>.</>,
        <>"For the purposes of historical comparison and climate change monitoring, WMO still recommends the continuation of the 1961-1990 period for the computation and tracking global climate anomalies." <a href="https://wmo.int/media/news/updated-30-year-reference-period-reflects-changing-climate" target="_blank" rel="noopener">WMO, 5 May 2021</a>.</>,
        <>Hansen, J., Sato, M. and Ruedy, R. (2012), Perception of climate change, PNAS 109, E2415, which scored summers against 1951 to 1980. <a href="https://doi.org/10.1073/pnas.1205276109" target="_blank" rel="noopener">PNAS</a>. The animated form follows the global version at <a href="https://celsius.earth/motion/bell-curve" target="_blank" rel="noopener">celsius.earth</a>.</>,
        <>My calculations from National Gas Transmission's NTS Volume Offtaken, LDZ Offtake Total, daily from 27 September 2021, from the <a href="https://data.nationalgas.com/find-gas-data" target="_blank" rel="noopener">National Gas data portal</a>, which keeps five rolling years. 2015 to 2017 is the sum of the 121 LDZ offtake sites in National Gas's <a href="https://www.nationalgas.com/our-businesses/operational-data/our-data" target="_blank" rel="noopener">Supply and Demand Data 2015-2017</a> workbook. Neither source has daily LDZ figures for 2018 to September 2021. Periods use complete calendar years, winter is December to February, summer is June to August, and lines by date are smoothed over 31 days.</>,
        <>"Long-term trends in energy efficiency, evolving patterns of energy use within the home, climatic changes and more recent behavioural responses to affordability pressures have likely all contributed to sustained reductions in typical household demand." Medium gas use falls from 11,500 to 9,500 kWh a year. <a href="https://www.ofgem.gov.uk/sites/default/files/2026-05/Review%20of%20typical%20domestic%20consumption%20values%20decision.pdf" target="_blank" rel="noopener">Ofgem, Review of typical domestic consumption values: decision, 27 May 2026</a>.</>,
        <>ECMWF ERA5 reanalysis, daily mean 2 m temperature at Birmingham (52.48°N, 1.89°W), 1991 to 23 September 2026, from the <a href="https://open-meteo.com/en/docs/historical-weather-api" target="_blank" rel="noopener">Open-Meteo historical weather API</a>. My calculations: normals are monthly means over 1991 to 2020, 2016 to 2025 and 2021 to 2025, and the last 12 months run from 23 September 2025. Contains modified Copernicus Climate Change Service information.</>,
      ]} />
    </Article>
  );
}
