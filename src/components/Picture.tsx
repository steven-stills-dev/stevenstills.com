import type { Insight } from "../insights";

const W = 312, H = 230;
const lines = (x: Insight) => (x.figure.kind === "lines" ? x.figure : null);
const bars = (x: Insight) => (x.figure.kind === "bars" ? x.figure : null);

/** One thermometer per series, filled to that series' mean, the last one marked. */
function Thermometers({ x }: { x: Insight }) {
  const means = lines(x)!.series.map((s) => { const v = s.values.filter((n): n is number => n != null); return v.reduce((a, b) => a + b, 0) / v.length; });
  const lo = Math.floor(Math.min(...means)) - 2, hi = Math.ceil(Math.max(...means)) + 1, step = W / means.length, top = 24, bot = 176;
  return (
    <>
      {means.map((v, i) => {
        const cx = step * (i + 0.5), y = bot - ((v - lo) / (hi - lo)) * (bot - top), cls = i === means.length - 1 ? "mark" : "soft";
        return (
          <g key={i}>
            <path className="hair" d={`M${cx - 8} ${bot + 6} V${top} a8 8 0 0 1 16 0 V${bot + 6} a13 13 0 1 1 -16 0Z`} />
            <circle className={cls} cx={cx} cy={bot + 17} r={9} />
            <rect className={cls} x={cx - 4} y={y} width={8} height={bot + 12 - y} rx={4} />
          </g>
        );
      })}
    </>
  );
}

// illustrative vessel positions, not live AIS: x, y, heading in degrees
const VESSELS = [[40, 120, 80], [78, 112, 75], [112, 98, 60], [150, 74, 55], [206, 70, 130], [236, 104, 140], [262, 150, 150], [286, 188, 320], [66, 150, 255]];

/** The Strait of Hormuz: both coasts, the choke point, vessels as heading arrows and one incident. */
function Strait() {
  return (
    <>
      <path className="land" d="M0 0 H312 V128 C292 112 268 92 246 70 C226 50 204 36 178 36 C150 36 128 50 96 54 C60 58 28 50 0 56 Z" />
      <ellipse className="land" cx={96} cy={78} rx={38} ry={6} transform="rotate(-9 96 78)" />
      <path className="land" d="M0 230 V196 C56 190 112 168 146 132 C158 118 170 94 186 92 C198 92 200 114 204 140 C208 176 216 206 224 230 Z" />
      <path className="alert-line" d="M186 92 L181 36" />
      {VESSELS.map(([vx, vy, h], i) => <path key={i} className="mark" d="M0 -7 L5 6 L0 3 L-5 6 Z" transform={`translate(${vx} ${vy}) rotate(${h})`} />)}
      <circle className="alert" cx={170} cy={62} r={5} />
      <circle className="alert-line" cx={170} cy={62} r={11} />
    </>
  );
}

/** The sun covered by the moon, so the crescent left showing is the share of output that remained. */
function Eclipse({ x }: { x: Insight }) {
  const f = lines(x)!, v = f.series[0].values as number[], share = v[f.x.indexOf("19:00")] / v[f.x.indexOf("18:00")];
  const r = 78, lens = (d: number) => 2 * r * r * Math.acos(d / (2 * r)) - (d / 2) * Math.sqrt(4 * r * r - d * d);
  let a = 0, b = 2 * r, d = r;
  // bisect the distance between the two centres until the uncovered area matches the share
  for (let i = 0; i < 40; i++) { d = (a + b) / 2; if (Math.PI * r * r - lens(d) < share * Math.PI * r * r) a = d; else b = d; }
  return (
    <>
      <circle className="mark" cx={156} cy={115} r={r} />
      <circle className="moon" cx={156 - d * 0.707} cy={115 + d * 0.707} r={r} />
    </>
  );
}

/** One series on a ruled x and y axis with tick marks, the latest point marked. */
function AxisLine({ x }: { x: Insight }) {
  const v = lines(x)!.series[0].values as number[], l = 22, r = 300, t = 14, b = 208, lo = 0.8, hi = 1.05;
  const px = (i: number) => l + (i / (v.length - 1)) * (r - l), py = (n: number) => b - ((n - lo) / (hi - lo)) * (b - t);
  const ticks = [0.8, 0.85, 0.9, 0.95, 1, 1.05].map((n) => `M${l - 6} ${py(n)} H${l}`).join("") + v.map((_, i) => (i % 12 ? "" : `M${px(i)} ${b} V${b + 6}`)).join("");
  return (
    <>
      <path className="hair" d={`M${l} ${t} V${b} H${r} ${ticks}`} />
      <path className="line main" pathLength={1} fill="none" d={v.map((n, i) => `${i ? "L" : "M"}${px(i).toFixed(1)} ${py(n).toFixed(1)}`).join("")} />
      <circle className="mark" cx={px(v.length - 1)} cy={py(v[v.length - 1])} r={6} />
    </>
  );
}

/** A target with one shot per measure, each as far from the centre as its error is large. */
function Target({ x }: { x: Insight }) {
  const f = bars(x)!, k = 40, angles = [-35, 205, 75, 310];
  return (
    <>
      {[1, 2, 3, 4, 5].map((p) => <circle key={p} className="hair" cx={156} cy={115} r={(k * p) / 2} />)}
      <path className="hair" d="M150 115 h12 M156 109 v12" />
      {f.items.map((d, i) => { const a = (angles[i % 4] * Math.PI) / 180; return <circle key={d.label} className={i === f.mark ? "mark" : "solid"} cx={156 + k * d.value * Math.cos(a)} cy={115 + k * d.value * Math.sin(a)} r={8} />; })}
    </>
  );
}

/** Coin stacks, one coin per ten units, alternately topped by a moon and a sun. */
function Coins({ x }: { x: Insight }) {
  const f = bars(x)!, base = 222, xs = [26, 86, 182, 242];
  return (
    <>
      {f.items.map((d, i) => {
        const n = Math.round(d.value / 10), cx = xs[i] + 22, gy = base - 13 * n - 20;
        return (
          <g key={d.label}>
            {Array.from({ length: n }, (_, c) => <rect key={c} className={i === f.mark ? "mark" : "soft"} x={xs[i]} y={base - 13 * (c + 1) + 3} width={44} height={10} rx={5} />)}
            {i % 2 === 0
              ? <path className="solid" d={`M${cx + 5} ${gy - 10} a10 10 0 1 0 5 15 a8 8 0 0 1 -5 -15Z`} />
              : <><circle className="solid" cx={cx} cy={gy} r={6} /><path className="ray" d={Array.from({ length: 8 }, (_, r) => { const t = (r * Math.PI) / 4; return `M${cx + 10 * Math.cos(t)} ${gy + 10 * Math.sin(t)} L${cx + 14 * Math.cos(t)} ${gy + 14 * Math.sin(t)}`; }).join("")} /></>}
          </g>
        );
      })}
    </>
  );
}

const PICTURES: Record<string, (p: { x: Insight }) => JSX.Element> = {
  "seasonal-normal-by-decade": Thermometers,
  "summer-normal-by-decade": Thermometers,
  "hormuz-tanker-transits": Strait,
  "eclipse-solar-output": Eclipse,
  "group-correction-factor": AxisLine,
  "forecast-error-by-grain": Target,
  "summer-night-prices": Coins,
};

/** The infographic for an insight's card, drawn from the insight's own figure data; null when it has none. */
export default function Picture({ x }: { x: Insight }) {
  const P = PICTURES[x.slug];
  return P ? <svg className="pic" viewBox={`0 0 ${W} ${H}`} aria-hidden="true"><P x={x} /></svg> : null;
}

export const hasPicture = (x: Insight) => x.slug in PICTURES;
