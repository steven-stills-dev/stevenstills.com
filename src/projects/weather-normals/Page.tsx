import { useState, type MouseEvent } from "react";
import { Article, Prose, Section, Wide, Fn, Footnotes, StatRow } from "../../components/Article";
import Box from "../../components/Box";
import LineChart from "../../components/charts/LineChart";
import { ChartTip } from "../../components/charts/ChartTip";
import { niceStep, tickDecimals, PAD_L, PAD_R } from "../../components/charts/geom";
import { fmt, MON } from "../../lib/format";
import { useSize } from "../../lib/useSize";
import { usePageMeta } from "../../lib/meta";
import D from "./data.json";

// Built by scripts/normals/build_normals.py from HadCET (daily, to 26 Sep 2026)
// and NESO historic demand (ND, 2022-2025). Normals are trailing means of Y-n..Y-1.
const SECONDARY = "var(--ste-secondary)";
const NIGHT = "var(--ste-night)";
const YEARS = D.years.map(String);
const DECADES = D.years.flatMap((y, i) => (y % 10 === 0 ? [{ i, label: String(y) }] : []));
const LAST = D.years.length - 1;

/** Tick values spanning lo..hi on a clean step. */
function span(lo: number, hi: number, target = 4) {
  const step = niceStep(hi - lo, target);
  const out: number[] = [];
  for (let v = Math.floor(lo / step) * step; v <= hi + step * 0.001; v += step) out.push(+v.toFixed(6));
  if (out[out.length - 1] < hi) out.push(out[out.length - 1] + step);
  return { ticks: out, dig: tickDecimals(step) };
}

/** CET annual mean against trailing 30- and 10-year normals; also the home preview. */
export function NormalsChart({ h }: { h?: number }) {
  return (
    <Box icon="activity" title="Central England Temperature" sub="°C" h={h}>
      <LineChart labels={YEARS} ticks={DECADES} unit="°C" digits={2} yMin={8} yMax={11.5}
        series={[
          { name: "Actual", values: D.actual, color: SECONDARY },
          { name: "30-year normal", values: D.n30, color: NIGHT, width: 2 },
          { name: "10-year normal", values: D.n10, color: NIGHT, width: 1.4, dash: "4 4" },
        ]} />
      <div className="legend">
        <span><i style={{ background: SECONDARY }} />Actual</span>
        <span><i style={{ background: NIGHT }} />30-year normal</span>
        <span><i style={{ background: "transparent", border: `1.5px dashed ${NIGHT}` }} />10-year normal</span>
      </div>
    </Box>
  );
}

const BIAS = D.years.map((y, i) => ({ y, v: +(D.actual[i] - D.n30[i]).toFixed(2) })).filter((d) => d.y >= 1991);

/** Diverging bars: each year's CET minus its trailing 30-year normal. */
function BiasBars() {
  const [ref, { w: W, h: H }] = useSize<HTMLDivElement>();
  const [hi, setHi] = useState<number | null>(null);
  const { ticks, dig } = span(-1.2, 1.2);
  const lo = ticks[0], top = ticks[ticks.length - 1];
  const Y = (v: number) => 12 + ((top - v) / (top - lo)) * (H - 38);
  const n = BIAS.length, plot = W - PAD_L - PAD_R, gap = 3, bw = (plot - gap * (n - 1)) / n;
  const X = (i: number) => PAD_L + i * (bw + gap);
  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setHi(Math.max(0, Math.min(n - 1, Math.floor((e.clientX - r.left - PAD_L) / (bw + gap)))));
  };
  return (
    <div ref={ref} className="chart-fill">
      {W > 0 && H > 0 && (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" onMouseMove={onMove} onMouseLeave={() => setHi(null)} style={{ display: "block", cursor: "crosshair" }}>
            {ticks.map((t) => (
              <text key={t} x={PAD_L - 6} y={Y(t) + 3} textAnchor="end" fontSize="10.5" fill="var(--ste-dusk)">{t > 0 ? "+" : ""}{fmt(t, dig)}</text>
            ))}
            <line x1={PAD_L} x2={W - PAD_R} y1={Y(0)} y2={Y(0)} stroke="var(--hairline)" />
            {BIAS.map((d, i) => (
              <rect key={d.y} x={X(i)} width={bw} y={Math.min(Y(0), Y(d.v))} height={Math.max(1, Math.abs(Y(d.v) - Y(0)))}
                rx={Math.min(bw / 2, 6)} fill={d.v >= 0 ? SECONDARY : NIGHT} stroke={hi === i ? NIGHT : "none"} strokeWidth={1.5} />
            ))}
            {BIAS.map((d, i) => (d.y % 5 === 0 ? (
              <text key={d.y} x={X(i) + bw / 2} y={H - 6} textAnchor="middle" fontSize="10.5" fill="var(--ste-dusk)">{d.y}</text>
            ) : null))}
          </svg>
          {hi != null && (
            <ChartTip x={X(hi) + bw / 2} y={Y(Math.max(0, BIAS[hi].v))} cw={W} title={String(BIAS[hi].y)} value={`${BIAS[hi].v > 0 ? "+" : ""}${fmt(BIAS[hi].v, 2)} °C`} />
          )}
        </>
      )}
    </div>
  );
}

/** Daily national demand against daily CET, with the fitted line. */
function DemandScatter() {
  const [ref, { w: W, h: H }] = useSize<HTMLDivElement>();
  const pts = D.scatter as [number, number][];
  const xs = span(Math.min(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[0])), 5);
  const ys = span(Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[1])));
  const x0 = xs.ticks[0], x1 = xs.ticks[xs.ticks.length - 1], y0 = ys.ticks[0], y1 = ys.ticks[ys.ticks.length - 1];
  const X = (v: number) => PAD_L + ((v - x0) / (x1 - x0)) * (W - PAD_L - PAD_R);
  const Y = (v: number) => 12 + ((y1 - v) / (y1 - y0)) * (H - 38);
  const f = (t: number) => D.fit.intercept + D.fit.slope * t;
  return (
    <div ref={ref} className="chart-fill">
      {W > 0 && H > 0 && (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ display: "block" }}>
          <line x1={PAD_L} x2={PAD_L} y1={Y(y1)} y2={Y(y0)} stroke="var(--hairline)" />
          {ys.ticks.map((t) => (
            <text key={t} x={PAD_L - 6} y={Y(t) + 3} textAnchor="end" fontSize="10.5" fill="var(--ste-dusk)">{fmt(t, ys.dig)}</text>
          ))}
          {xs.ticks.map((t) => (
            <text key={t} x={X(t)} y={H - 6} textAnchor="middle" fontSize="10.5" fill="var(--ste-dusk)">{fmt(t, xs.dig)}°C</text>
          ))}
          {pts.map(([t, g], i) => <circle key={i} cx={X(t)} cy={Y(g)} r={2.6} fill={SECONDARY} fillOpacity={0.55} />)}
          <line x1={X(x0)} y1={Y(f(x0))} x2={X(x1)} y2={Y(f(x1))} stroke={NIGHT} strokeWidth={2} />
        </svg>
      )}
    </div>
  );
}

// The years each normal averages, as used for a 2026 forecast.
const WINDOWS = [
  { name: "Met Office long-term baseline", from: 1961, to: 1990 },
  { name: "Met Office and WMO standard", from: 1991, to: 2020 },
  { name: "Trailing 30-year", from: 1996, to: 2025 },
  { name: "Trailing 10-year", from: 2016, to: 2025 },
  { name: "Gas seasonal normal", from: 2025, to: 2030, ahead: true },
];

/** Horizontal bars showing which years each normal covers. */
function WindowChart() {
  const [ref, { w: W }] = useSize<HTMLDivElement>();
  const LAB = Math.min(210, W * 0.38), A = 1955, B = 2035, row = 44, H = WINDOWS.length * row + 26;
  const X = (y: number) => LAB + ((y - A) / (B - A)) * (W - LAB - PAD_R);
  return (
    <div ref={ref} style={{ width: "100%" }}>
      {W > 0 && (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: "block" }}>
          {[1960, 1980, 2000, 2020].map((y) => (
            <g key={y}>
              <line x1={X(y)} x2={X(y)} y1={4} y2={H - 22} stroke="var(--hairline)" strokeDasharray="2 4" />
              <text x={X(y)} y={H - 6} textAnchor="middle" fontSize="10.5" fill="var(--ste-dusk)">{y}</text>
            </g>
          ))}
          {WINDOWS.map((w, i) => (
            <g key={w.name}>
              <text x={0} y={i * row + 26} fontSize="12" fill={NIGHT}>{w.name}</text>
              <rect x={X(w.from)} y={i * row + 12} width={X(w.to + 1) - X(w.from)} height={20} rx={10}
                fill={w.ahead ? SECONDARY : NIGHT} fillOpacity={w.ahead ? 1 : 0.85} />
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}

const HDD_TICKS = DECADES;

export default function WeatherNormals() {
  const lede = "Central England averaged 9.46°C over 1961 to 1990, 10.27°C over 1991 to 2020 and 10.97°C over the last five years. I look at what that drift does to a demand forecast built on a 30-year normal, what a degree is worth in gigawatts, and why the gas industry has already stopped looking back.";
  usePageMeta("Is the 30-year normal still normal?", lede);

  return (
    <Article kicker="Writing · forecasting & climate" title="Is the 30-year normal still normal?" lede={lede}>
      <Prose>
        <p>In January 2022 the Met Office changed what it means by normal. It retired 1961 to 1990 as the baseline for its routine climate reports and adopted 1991 to 2020, a period 0.8°C warmer across the UK.<Fn n={1} /> Three years later the Central England Temperature series, which runs back to 1659, recorded its warmest year: 11.23°C in 2025, already 0.96°C above the new normal.<Fn n={2} /><Fn n={3} /> Check every year since 1991 against the 30 years before it and 30 of the 35 came in warmer.<Fn n={2} k="b" /> This is the story of the number every energy forecast leans on past the fortnight, and how far behind it has fallen.</p>
        <p>Central England averaged 9.46°C from 1961 to 1990. From 1991 to 2020, 10.27°C. Over the last five years, 10.97°C.<Fn n={2} k="c" /> Each step moves the baseline, and every forecast priced on the older one expects a colder year than the one that arrives.</p>
        <p>For scale, I estimate the gap between a 30-year and a 10-year normal was worth about 1.75 TWh of national electricity demand in 2025, some 0.8% of the year.<Fn n={4} /> At Ofgem's new typical consumption figure of 2,500 kWh a year, that is the electricity of roughly 700,000 homes.<Fn n={5} /></p>
        <p>In this piece I look at what a weather normal is for, why a 30-year average lags a warming climate, what a degree is worth on the grid, and what the gas industry did about it in October 2025.</p>
      </Prose>

      <Section title="What a normal is for" />
      <Prose>
        <p>A demand forecast needs a temperature for every day it covers. For the next fortnight that comes from a weather forecast. Beyond it the skill runs out, and the forecaster falls back on climatology: the average temperature for that day of the year over a reference period. That average is the normal, and it sits under everything priced past the forecast horizon, from the hedge a supplier buys for next winter to the typical consumption figures Ofgem uses to turn the price cap into an annual bill.<Fn n={5} k="b" /></p>
        <p>The World Meteorological Organization sets the convention. A standard normal is 30 years long and should be updated every decade, and its May 2021 guidance named energy among the sectors that need current normals.<Fn n={6} /> Thirty years is long enough to average out a freak winter. The trouble is what else it averages in.</p>
      </Prose>

      <Section title="A 30-year average describes 2010" />
      <Prose>
        <p>The middle of a 30-year window sits fifteen years in the past. In a stable climate that costs nothing. In one warming at the pace of the last few decades, it means the normal describes the weather of around 2010, and every forecast built on it expects a colder year than the one it gets. The chart tracks each year's temperature against the normals a forecaster would have held at the time, the 30 and the 10 years before it.<Fn n={2} k="d" /></p>
      </Prose>

      <Wide>
        <NormalsChart h={440} />
      </Wide>

      <Prose>
        <p>The 30-year line falls behind from the late 1980s and never catches up. Across 1991 to 2025 the average miss against it was +0.46°C, against +0.18°C for a 10-year normal and +0.09°C for a 5-year one. The typical size of the miss falls too, from 0.57°C to 0.44°C to 0.39°C, so the shorter windows are both less biased and closer year by year.<Fn n={2} k="e" /></p>
      </Prose>

      <Wide>
        <StatRow stats={[
          { num: "30 of 35", label: "years warmer than their 30-year normal" },
          { num: "+0.46°C", label: "average miss, 1991 to 2025" },
          { num: "6 of 6", label: "years warmer so far this decade" },
        ]} />
      </Wide>

      <Wide>
        <Box icon="bars" title="Difference From 30-Year Normal" sub="°C" h={360}>
          <BiasBars />
        </Box>
      </Wide>

      <Prose>
        <p>The 2020s are six from six so far, with an average miss of +0.61°C.<Fn n={2} k="f" /> The bars that point down are the ones a trader remembers. 2010 came in 1.06°C below its normal, the biggest miss in the run, and it was a cold year for anyone hedged for a mild one.</p>
      </Prose>

      <Section title="The warming isn't spread evenly through winter" />
      <Prose>
        <p>Annual means hide where the heat landed, and for energy the months that count run from October to March. Comparing the last ten years with 1991 to 2020, February and December both came in about 1.0°C warmer, March and October about 0.5°C, and January not at all.<Fn n={2} k="g" /></p>
      </Prose>

      <Wide>
        <Box icon="activity" title="Monthly Normal" sub="°C" h={400}>
          <LineChart labels={MON} ticks={MON.map((m, i) => ({ i, label: m }))} unit="°C" digits={1}
            series={[
              { name: "2021 to 2025", values: D.months["2021-2025"], color: SECONDARY },
              { name: "1991 to 2020", values: D.months["1991-2020"], color: NIGHT, width: 2 },
              { name: "1961 to 1990", values: D.months["1961-1990"], color: NIGHT, width: 1.4, dash: "4 4" },
            ]} />
          <div className="legend">
            <span><i style={{ background: SECONDARY }} />2021 to 2025</span>
            <span><i style={{ background: NIGHT }} />1991 to 2020</span>
            <span><i style={{ background: "transparent", border: `1.5px dashed ${NIGHT}` }} />1961 to 1990</span>
          </div>
        </Box>
      </Wide>

      <Prose>
        <p>That unevenness is the awkward part for a forecaster. A flat annual offset would overcorrect January and undercorrect December, so if I were moving a normal I'd move it month by month.</p>
      </Prose>

      <Section title="What a degree is worth in gigawatts" />
      <Prose>
        <p>To put a size on the drift I need to know how hard demand responds to temperature. I took NESO's national demand for 2022 to 2025, averaged each weekday to a daily figure, kept the heating-season days below 15°C, left out Christmas, and drew a straight line through them against Central England Temperature.<Fn n={4} k="b" /></p>
      </Prose>

      <Wide>
        <Box icon="activity" title="Daily Demand Against Temperature" sub="GW" h={420}>
          <DemandScatter />
        </Box>
      </Wide>

      <Prose>
        <p>Each degree colder adds about 0.87 GW to demand across the day, and temperature on its own explains three-quarters of the day-to-day variation, an R² of 0.75 over 738 days.<Fn n={4} k="c" /> Heating degree days turn that into a yearly figure. For each day, count how far the temperature fell below 15.5°C, then add up the year. The 30-year normal going into 2025 expected 2,000 degree days, the 10-year normal 1,917, and 2025 delivered 1,809.<Fn n={2} k="h" /></p>
      </Prose>

      <Wide>
        <Box icon="activity" title="Heating Degree Days" sub="°C days" h={400}>
          <LineChart labels={YEARS} ticks={HDD_TICKS} digits={0} yMin={1600} yMax={2600}
            series={[
              { name: "Actual", values: D.hdd, color: SECONDARY },
              { name: "30-year normal", values: D.hdd30, color: NIGHT, width: 2 },
            ]} />
          <div className="legend">
            <span><i style={{ background: SECONDARY }} />Actual</span>
            <span><i style={{ background: NIGHT }} />30-year normal</span>
          </div>
        </Box>
      </Wide>

      <Prose>
        <p>Multiply the gap between the two normals by the slope and by 24 hours and the answer is 1.75 TWh, 0.76% of the 229 TWh of national demand in 2025. Against what 2025 actually delivered, the 30-year normal was 4.0 TWh too high.<Fn n={4} k="d" /> My model, so treat it accordingly: the slope comes from winter weekdays, national demand leaves out embedded solar and wind, and a straight line can't see heating switching off in mild weather. The order of magnitude is the point. Less than one per cent of a year's demand, bought forward at the wrong level, is the kind of error a supplier ends up selling back or carrying as imbalance.</p>
      </Prose>

      <Section title="The gas industry has already stopped looking back" />
      <Prose>
        <p>Gas settlement runs on a weather variable of its own, the Composite Weather Variable, and a seasonal normal version of it that Xoserve and the Demand Estimation Sub-Committee review every five years.<Fn n={7} /> The review that took effect on 1 October 2025 dropped the look-back entirely. The new seasonal normal is built from Met Office UKCP18 climate projections for gas years 2025/26 to 2029/30, averaged across those five years, so the baseline describes the period it will be used in.<Fn n={8} /></p>
      </Prose>

      <Wide>
        <Box icon="layers" title="Years Each Normal Covers">
          <WindowChart />
        </Box>
      </Wide>

      <Prose>
        <p>Xoserve's own summary is that most regions are "seeing a significant warming in the Seasonal Normal basis compared to current values", particularly in spring, which lowers the annual consumption estimates of domestic customers.<Fn n={7} k="b" /> Ofgem's typical consumption values moved the same way in May 2026, with medium gas falling from 11,500 to 9,500 kWh a year and medium electricity from 2,700 to 2,500 kWh from 1 July, and the gas figure still adjusted to seasonal normal weather.<Fn n={5} k="c" /></p>
        <p>Electricity has no single equivalent. Elexon's settlement profiles use the actual noon temperature, weighted across the day and the two before it, so settlement never needs a normal at all.<Fn n={9} /> NESO's winter planning works off an average cold spell, which a 2011 National Grid method simulates from thirty years of regional weather.<Fn n={10} /> In my experience the normal lives inside each supplier's and trader's own models, which is where the choice of window gets made.</p>
      </Prose>

      <Section title="What has to stay true" />
      <Prose>
        <p>A shorter normal only wins if two things hold. The first is that the warming keeps going the same way. The Met Office is plain about that: under its medium emissions pathway, a year like 2022 becomes an average year by 2060.<Fn n={11} /> The record so far agrees, with the 5-year normal the least biased of the three across 35 years.<Fn n={2} k="i" /></p>
        <p>The second is that the noise stays manageable, and this is where short windows bite. Five years is one hard winter away from being dragged around. 2010 averaged 8.94°C against a trailing 30-year normal of 10.0°C, and a 5-year normal built after it carried that winter into every forecast until 2015.<Fn n={2} k="j" /> The 2010s show it can happen for a whole decade: across those ten years the 30-year normal missed by only +0.20°C, and three of them came in colder.</p>
        <p>What rescues both conditions is the method gas has just adopted. The Met Office delivered an adjusted history with the long-term climate trend removed, alongside its projections, so a window can stay long enough to smooth out a 2010 while its level stays current.<Fn n={8} k="b" /></p>
      </Prose>

      <Section title="What I take from this" />
      <Prose>
        <p>A 30-year normal answers the question it was built for, which is what the climate has been. A forecaster needs to know what next winter will be, and over the last 35 years those two answers have drifted apart by about half a degree, in the same direction, 30 times out of 35.</p>
        <p>For electricity, where the normal is each firm's own call, I'd move off the plain 30-year average: a 10-year window as the floor, shifted month by month, and the trend-adjusted approach gas adopted in 2025 as the target. It took the gas industry two years with the Met Office to get there, from choosing a provider in September 2023 to going live in October 2025.<Fn n={8} k="c" /></p>
        <p>Normal, it turns out, is a moving target, and the 30-year average is still aiming at 2010.</p>
      </Prose>

      <Footnotes notes={[
        <>The Met Office adopted 1991 to 2020 as its normal for routine UK climate monitoring from January 2022, keeping 1961 to 1990 for tracking long-term change; the UK average temperature rose 0.8°C between the two periods. <a href="https://www.metoffice.gov.uk/about-us/news-and-media/media-centre/weather-and-climate-news/2021/9120-new-climate-normal" target="_blank" rel="noopener">Met Office, 15 December 2021</a>.</>,
        <>My calculations from the Met Office Hadley Centre Central England Temperature daily mean series, data to 26 September 2026. Annual means are the mean of daily values. A trailing normal for year Y is the mean of years Y-n to Y-1. Heating degree days sum max(0, 15.5°C minus daily mean). 2026 is partial and excluded from the counts. <a href="https://www.metoffice.gov.uk/hadobs/hadcet/data/download.html" target="_blank" rel="noopener">Met Office Hadley Centre, HadCET</a>; script in <code>scripts/normals/build_normals.py</code>.</>,
        <>2025 was the warmest year in the Central England Temperature series from 1659, and the UK's warmest since 1884. <a href="https://www.metoffice.gov.uk/about-us/news-and-media/media-centre/weather-and-climate-news/2026/2025-is-double-record-breaker-uks-warmest-and-sunniest-year-on-record" target="_blank" rel="noopener">Met Office, 2 January 2026</a>; CET 2025 of 11.23°C against 11.18°C in 2022 from <a href="https://www.carbonbrief.org/met-office-a-review-of-the-uks-climate-in-2025" target="_blank" rel="noopener">Carbon Brief, 30 January 2026</a>.</>,
        <>My estimate. NESO national demand (ND), 2022 to 2025, averaged to daily GW; weekdays with CET below 15°C, excluding 20 December to 3 January; ordinary least squares on daily CET gives -0.87 GW per °C, R² 0.75, 738 days. Energy gap: 0.873 GW/°C × (2,000.2 minus 1,916.7) degree days × 24 h = 1.75 TWh, against 2025 ND of 229.1 TWh. ND excludes embedded generation. <a href="https://www.neso.energy/data-portal/historic-demand-data" target="_blank" rel="noopener">NESO, Historic demand data</a>.</>,
        <>Ofgem decided on 27 May 2026 to cut typical domestic consumption values from 1 July 2026: medium gas from 11,500 to 9,500 kWh and medium single-rate electricity from 2,700 to 2,500 kWh, keeping the seasonal normal adjustment for gas. <a href="https://www.ofgem.gov.uk/sites/default/files/2026-05/Review%20of%20typical%20domestic%20consumption%20values%20decision.pdf" target="_blank" rel="noopener">Ofgem, TDCV decision</a>.</>,
        <>The WMO set 1991 to 2020 as the new standard reference period and said 30-year normals should be updated every decade, citing energy among the sectors that rely on them. <a href="https://wmo.int/media/news/updated-30-year-reference-period-reflects-changing-climate" target="_blank" rel="noopener">WMO, 5 May 2021</a>.</>,
        <>Xoserve and DESC review the gas industry's weather parameters every five years; the 2025 review, run with the Met Office to include climate change, applies from 1 October 2025 to 30 September 2030. <a href="https://www.xoserve.com/news/seasonal-normal-weather-review-2025/" target="_blank" rel="noopener">Xoserve, 11 June 2025</a>.</>,
        <>The new Seasonal Normal basis is "derived purely from the CCM projections" for gas years 2025/26 to 2029/30, averaged across the five years; the Met Office method also supplies an adjusted history from 1960/61 with long-term climate change removed. Met Office confirmed as provider September 2023. <a href="https://www.gasgovernance.co.uk/sites/default/files/related-files/2025-08/Seasonal%20Normal%20Review%202025%20%2814%20August%202025%29.pdf" target="_blank" rel="noopener">DESC, Seasonal Normal Review 2025, 14 August 2025</a>.</>,
        <>Settlement profile regressions use Noon Effective Temperature: 0.57 of the day's noon temperature, 0.28 of the day before and 0.15 of the day before that. <a href="https://bscdocs.elexon.co.uk/guidance-notes/load-profiles-and-their-use-in-electricity-settlement" target="_blank" rel="noopener">Elexon, Load Profiles and their use in Electricity Settlement, v5.0</a>.</>,
        <>Average cold spell simulations use weather "aggregated from regional weather stations collected for the last thirty years". <a href="https://www.neso.energy/document/62766/download" target="_blank" rel="noopener">National Grid, NETS SYS Appendix G, 2011</a>.</>,
        <>Under UKCP18 medium emissions, a year like 2022 would be an average year by 2060. <a href="https://www.metoffice.gov.uk/about-us/news-and-media/media-centre/weather-and-climate-news/2023/record-breaking-2022-indicative-of-future-uk-climate" target="_blank" rel="noopener">Met Office, 26 July 2023</a>.</>,
      ]} />
    </Article>
  );
}
