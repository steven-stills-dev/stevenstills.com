import { useMemo, useState, type MouseEvent } from "react";
import { fmt } from "../../lib/format";
import { useSize } from "../../lib/useSize";
import { niceStep, tickDecimals, PAD_L, PAD_R } from "../../components/charts/geom";
import { ChartTip } from "../../components/charts/ChartTip";
import "./ml.css";

const MAX_TREES = 200;
const RATES = [0.05, 0.1, 0.3];
const GRID = 100;
const MIN_LEAF = 5;

interface Fit {
  grid: number[];          // temperatures the curve is evaluated at
  curves: number[][];      // curves[k] = ensemble prediction on grid after k trees
  rmse: number[];          // training RMSE after k trees
  resid: number[][];       // resid[k] = residuals tree k was fit to (k >= 1), in sorted order
  trees: number[][];       // trees[k] = tree k's own output on grid
}

/** Find the best squared-loss split of sorted x[lo, hi); return the split index or -1. */
function bestSplit(x: number[], r: number[], lo: number, hi: number): number {
  let S = 0;
  for (let i = lo; i < hi; i++) S += r[i];
  let sl = 0, best = -1, bestG = 1e-12;
  for (let i = lo + 1; i < hi; i++) {
    sl += r[i - 1];
    const nL = i - lo, nR = hi - i;
    if (x[i] === x[i - 1] || nL < MIN_LEAF || nR < MIN_LEAF) continue;
    const g = (sl * sl) / nL + ((S - sl) * (S - sl)) / nR - (S * S) / (hi - lo);
    if (g > bestG) { bestG = g; best = i; }
  }
  return best;
}

/** Fit a depth-2 regression tree; return sorted thresholds and leaf values. */
function fitTree(x: number[], r: number[]): { cuts: number[]; vals: number[] } {
  const n = x.length;
  const root = bestSplit(x, r, 0, n);
  const idx = root < 0 ? [0, n] : [0, bestSplit(x, r, 0, root), root, bestSplit(x, r, root, n), n].filter((v) => v >= 0);
  const vals: number[] = [];
  for (let k = 0; k < idx.length - 1; k++) {
    let s = 0;
    for (let i = idx[k]; i < idx[k + 1]; i++) s += r[i];
    vals.push(s / (idx[k + 1] - idx[k]));
  }
  const cuts = idx.slice(1, -1).map((i) => (x[i - 1] + x[i]) / 2);
  return { cuts, vals };
}

const leafOf = (cuts: number[], v: number) => { let k = 0; while (k < cuts.length && v >= cuts[k]) k++; return k; };

/** Run gradient boosting with squared loss on one feature, recording the curve after every tree. */
function boost(temp: number[], demand: number[], lr: number): Fit {
  const order = temp.map((_, i) => i).sort((a, b) => temp[a] - temp[b]);
  const x = order.map((i) => temp[i]), y = order.map((i) => demand[i]);
  const n = x.length;
  const lo = x[0], hi = x[n - 1];
  const grid = Array.from({ length: GRID }, (_, i) => lo + (i / (GRID - 1)) * (hi - lo));
  const mean = y.reduce((a, b) => a + b, 0) / n;
  const pred = y.map(() => mean);
  let curve = grid.map(() => mean);
  const rmseOf = () => Math.sqrt(y.reduce((a, v, i) => a + (v - pred[i]) ** 2, 0) / n);
  const fit: Fit = { grid, curves: [curve], rmse: [rmseOf()], resid: [[]], trees: [[]] };
  for (let t = 1; t <= MAX_TREES; t++) {
    const r = y.map((v, i) => v - pred[i]);
    const { cuts, vals } = fitTree(x, r);
    for (let i = 0; i < n; i++) pred[i] += lr * vals[leafOf(cuts, x[i])];
    const own = grid.map((g) => vals[leafOf(cuts, g)]);
    curve = curve.map((c, i) => c + lr * own[i]);
    fit.curves.push(curve);
    fit.rmse.push(rmseOf());
    fit.resid.push(r);
    fit.trees.push(own);
  }
  return fit;
}

/** Clean ticks spanning [lo, hi] on a 1/2/5 step. */
function rangeTicks(lo: number, hi: number, target = 4): number[] {
  const step = niceStep(hi - lo, target);
  const out: number[] = [];
  for (let v = Math.floor(lo / step) * step; v <= hi + step * 1e-9; v += step) out.push(+v.toFixed(6));
  if (out[out.length - 1] < hi) out.push(out[out.length - 1] + step);
  return out;
}

/** Interactive gradient boosting on temperature vs demand: slider for tree count, chips for learning rate. */
export default function BoostDemo({ temp, demand }: { temp: number[]; demand: number[] }) {
  const [trees, setTrees] = useState(1);
  const [lr, setLr] = useState(0.1);
  const [hi, setHi] = useState<number | null>(null);
  const [ref, size] = useSize<HTMLDivElement>();
  const fit = useMemo(() => boost(temp, demand, lr), [temp, demand, lr]);
  const sortedX = useMemo(() => [...temp].sort((a, b) => a - b), [temp]);

  const W = size.w, H = size.h;
  const splitY = H * 0.7;           // main panel above, residual panel below
  const xt = rangeTicks(Math.min(...temp), Math.max(...temp), 5);
  const yt = rangeTicks(Math.min(...demand), Math.max(...demand), 4);
  const curve = fit.curves[trees], resid = fit.resid[trees], own = fit.trees[trees];
  const rMax = Math.max(1e-6, ...resid.map(Math.abs));
  const rt = rangeTicks(-rMax, rMax, 2);
  const xdig = tickDecimals(xt[1] - xt[0]), ydig = tickDecimals(yt[1] - yt[0]), rdig = tickDecimals(rt[1] - rt[0]);
  const X = (v: number) => PAD_L + ((v - xt[0]) / (xt[xt.length - 1] - xt[0])) * (W - PAD_L - PAD_R);
  const Y = (v: number) => splitY - 14 - ((v - yt[0]) / (yt[yt.length - 1] - yt[0])) * (splitY - 22);
  const rTop = splitY + 10, rBot = H - 22;
  const RY = (v: number) => rBot - ((v - rt[0]) / (rt[rt.length - 1] - rt[0])) * (rBot - rTop);
  const step = (vals: number[], Yf: (v: number) => number) =>
    vals.map((v, i) => (i === 0 ? `M${X(fit.grid[0]).toFixed(1)},${Yf(v).toFixed(1)}`
      : `H${X((fit.grid[i - 1] + fit.grid[i]) / 2).toFixed(1)}V${Yf(v).toFixed(1)}`)).join("") + `H${X(fit.grid[GRID - 1]).toFixed(1)}`;
  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const v = xt[0] + ((e.clientX - r.left - PAD_L) / (W - PAD_L - PAD_R)) * (xt[xt.length - 1] - xt[0]);
    const i = Math.round(((v - fit.grid[0]) / (fit.grid[GRID - 1] - fit.grid[0])) * (GRID - 1));
    setHi(Math.max(0, Math.min(GRID - 1, i)));
  };
  const yAxis = (ticks: number[], Yf: (v: number) => number, dig: number) => (
    <>
      <line x1={PAD_L} y1={Yf(ticks[ticks.length - 1])} x2={PAD_L} y2={Yf(ticks[0])} stroke="var(--hairline)" strokeWidth="1" />
      {ticks.map((t, k) => (
        <g key={k}>
          <line x1={PAD_L - 3} y1={Yf(t)} x2={PAD_L} y2={Yf(t)} stroke="var(--hairline)" strokeWidth="1" />
          <text x={PAD_L - 6} y={Yf(t) + 3} textAnchor="end" fontSize="10.5" fill="var(--ste-dusk)">{fmt(t, dig)}</text>
        </g>
      ))}
    </>
  );

  return (
    <div className="ml-demo">
      <div className="ml-controls">
        <input type="range" min={1} max={MAX_TREES} value={trees} aria-label="Trees"
          onChange={(e) => setTrees(parseInt(e.target.value, 10))} />
        <span className="ml-stat">Trees: {trees}</span>
        <span className="ml-stat">RMSE: {fmt(fit.rmse[trees], 2)} GW</span>
        <span className="ml-chips">
          {RATES.map((r) => (
            <button key={r} className={"chip" + (r === lr ? " on" : "")} onClick={() => setLr(r)}>{r}</button>
          ))}
        </span>
      </div>
      <div ref={ref} className="chart-fill">
        {W > 0 && H > 0 && (
          <>
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" onMouseMove={onMove} onMouseLeave={() => setHi(null)}
              style={{ display: "block", cursor: "crosshair" }}>
              {yAxis(yt, Y, ydig)}
              {temp.map((t, i) => <circle key={i} cx={X(t)} cy={Y(demand[i])} r={3} fill="var(--ste-secondary)" fillOpacity="0.45" />)}
              <path d={step(curve, Y)} fill="none" stroke="var(--ste-night)" strokeWidth="2" strokeLinejoin="round" />
              {yAxis(rt, RY, rdig)}
              <line x1={PAD_L} y1={RY(0)} x2={W - PAD_R} y2={RY(0)} stroke="var(--hairline)" strokeWidth="1" />
              {resid.map((r, i) => <circle key={i} cx={X(sortedX[i])} cy={RY(r)} r={2.4} fill="var(--ste-secondary)" fillOpacity="0.45" />)}
              <path d={step(own, RY)} fill="none" stroke="var(--ste-night)" strokeWidth="1.6" strokeLinejoin="round" />
              {xt.map((t, k) => (
                <text key={k} x={X(t)} y={H - 6} textAnchor="middle" fontSize="10.5" fill="var(--ste-dusk)">{fmt(t, xdig)}{k === xt.length - 1 ? " °C" : ""}</text>
              ))}
              {hi != null && (
                <g>
                  <line x1={X(fit.grid[hi])} y1={6} x2={X(fit.grid[hi])} y2={rBot} stroke="var(--ste-dusk)" strokeWidth="1" strokeDasharray="3 3" />
                  <circle cx={X(fit.grid[hi])} cy={Y(curve[hi])} r={4} fill="var(--ste-primary)" stroke="var(--ste-night)" strokeWidth="1.2" />
                </g>
              )}
              <text x={10} y={Y((yt[0] + yt[yt.length - 1]) / 2)} transform={`rotate(-90 10 ${Y((yt[0] + yt[yt.length - 1]) / 2)})`}
                textAnchor="middle" fontSize="10.5" fill="var(--ste-dusk)">GW</text>
            </svg>
            {hi != null && (
              <ChartTip x={X(fit.grid[hi])} y={Y(curve[hi])} cw={W} title={`${fmt(fit.grid[hi], 1)} °C`}
                value={`${fmt(curve[hi], 1)} GW`} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
