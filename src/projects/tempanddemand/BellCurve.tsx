import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { useSize } from "../../lib/useSize";
import { fmt, MON } from "../../lib/format";
import { ChartTip } from "../../components/charts/ChartTip";

export type Mode = "mean" | "max" | "min";

interface ModeData {
  /** per year shown: kernel density of daily σ scores on the grid, ×1000 */
  kde: number[][];
  /** per year shown: % of days in each category */
  share: number[][];
  /** per year shown: mean difference from 1961–1990, °C */
  shift: number[];
}

/** One year's smoothed values by day of year; null where there is no data. */
export interface Line { name: string; values: (number | null)[] }

/** Monthly normals and the last 365 days by month, °C, as on the forecasting dashboard. */
export interface Normals {
  n30: number[]; n10: number[]; n5: number[]; last12: (number | null)[];
  /** gaps to the 30-year normal, from unrounded values */
  d10: number[]; d5: number[]; d12: (number | null)[];
  windows: { n30: string; n10: string; n5: string };
  last12From: string; last: string;
}

export interface BellData {
  last: string;
  years: number[];
  grid: { z0: number; dz: number; n: number };
  modes: Record<Mode, ModeData>;
  /** daily mean temperature by year, °C */
  temp: Line[];
  /** LDZ offtake by year, mcm, for the years with public daily data */
  gas: Line[];
  /** days with both series, by year: [°C, mcm, day of year] */
  scatter: { name: string; points: [number, number, number][] }[];
  normals: Normals;
}

export const CATS = [
  { name: "Extremely cold", range: "below −3σ", lo: -Infinity, hi: -3 },
  { name: "Very cold", range: "−3 to −2σ", lo: -3, hi: -2 },
  { name: "Cold", range: "−2 to −0.43σ", lo: -2, hi: -0.43 },
  { name: "Normal", range: "±0.43σ", lo: -0.43, hi: 0.43 },
  { name: "Warm", range: "0.43 to 2σ", lo: 0.43, hi: 2 },
  { name: "Very warm", range: "2 to 3σ", lo: 2, hi: 3 },
  { name: "Extremely warm", range: "above +3σ", lo: 3, hi: Infinity },
].map((c, k) => ({ ...c, color: `var(--bc-cat-${k})` }));

let cache: Promise<BellData> | null = null;

/** Load the page dataset once and share it between the page and the home preview. */
export function useBell() {
  const [data, setData] = useState<BellData | null>(null);
  useEffect(() => {
    if (!cache) cache = fetch("/data/tempanddemand/bell.json").then((r) => r.json());
    let live = true;
    cache.then((d) => live && setData(d));
    return () => { live = false; };
  }, []);
  return data;
}

/** "2026-09-27" -> "to 27 Sep", or null when the year is complete. */
export function partial(last: string) {
  if (last.endsWith("-12-31")) return null;
  return `to ${parseInt(last.slice(8, 10), 10)} ${MON[parseInt(last.slice(5, 7), 10) - 1]}`;
}

const PAD = 14, TOP = 12, BOT = 26;

/** One year's distribution of daily σ scores, a solid band per category, over the
 *  first year's outline. `t` is a fractional year index, so frames blend. */
export default function BellCurve({ data, mode, t }: { data: BellData; mode: Mode; t: number }) {
  const [ref, { w: W, h: H }] = useSize<HTMLDivElement>();
  const [hx, setHx] = useState<number | null>(null);
  const m = data.modes[mode];
  const { z0, dz, n } = data.grid;
  const last = data.years.length - 1;
  const yMax = useMemo(() => Math.max(...m.kde.flat()) * 1.04, [m]);

  const i = Math.min(Math.floor(t), last), f = t - i, j = Math.min(i + 1, last);
  const dens = m.kde[i].map((v, g) => v + (m.kde[j][g] - v) * f);
  const yi = Math.round(t);
  const zMax = Math.round((z0 + dz * (n - 1)) * 1e6) / 1e6;
  const X = (z: number) => PAD + ((z - z0) / (zMax - z0)) * (W - PAD * 2);
  const Y = (v: number) => H - BOT - (v / yMax) * (H - BOT - TOP);
  const at = (z: number) => {
    const g = Math.max(0, Math.min(n - 1, (z - z0) / dz));
    const a = Math.floor(g), b = Math.min(a + 1, n - 1);
    return dens[a] + (dens[b] - dens[a]) * (g - a);
  };
  const line = (arr: number[]) => arr.map((v, g) => `${X(z0 + g * dz).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
  const band = (lo: number, hi: number) => {
    const a = Math.max(lo, z0), b = Math.min(hi, zMax);
    const pts = [a];
    for (let g = 0; g < n; g++) { const z = z0 + g * dz; if (z > a + 1e-9 && z < b - 1e-9) pts.push(z); }
    pts.push(b);
    return `M${X(a).toFixed(1)},${Y(0).toFixed(1)} ` + pts.map((z) => `L${X(z).toFixed(1)},${Y(at(z)).toFixed(1)}`).join(" ") + ` L${X(b).toFixed(1)},${Y(0).toFixed(1)} Z`;
  };
  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setHx(Math.max(z0, Math.min(zMax, z0 + ((e.clientX - r.left - PAD) / (W - PAD * 2)) * (zMax - z0))));
  };
  const hk = hx == null ? -1 : CATS.findIndex((c) => hx >= c.lo && hx < c.hi);
  const ticks = Array.from({ length: Math.floor(zMax) - Math.ceil(z0) + 1 }, (_, k) => Math.ceil(z0) + k);
  const tail = yi === last ? partial(data.last) : null;

  return (
    <div ref={ref} className="chart-fill">
      {W > 0 && H > 0 && (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" onMouseMove={onMove} onMouseLeave={() => setHx(null)}
            style={{ display: "block", cursor: "crosshair" }} role="img"
            aria-label={`Distribution of daily temperatures in Central England in ${data.years[yi]}, against ${data.years[0]}`}>
            {CATS.map((c, k) => <path key={c.name} d={band(c.lo, c.hi)} fill={c.color} opacity={hk === -1 || hk === k ? 1 : 0.6} />)}
            <polyline points={line(m.kde[0])} fill="none" stroke="var(--ste-dusk)" strokeWidth="1.5" strokeDasharray="4 4" />
            <polyline points={line(dens)} fill="none" stroke="var(--ste-night)" strokeWidth="2" strokeLinejoin="round" />
            <line x1={PAD} x2={W - PAD} y1={Y(0)} y2={Y(0)} stroke="var(--hairline)" />
            {hx != null && <line x1={X(hx)} x2={X(hx)} y1={Y(at(hx))} y2={Y(0)} stroke="var(--ste-night)" strokeWidth="1" strokeDasharray="3 3" />}
            {ticks.map((z) => (
              <text key={z} x={X(z)} y={H - 7} textAnchor="middle" fontSize="10.5" fill="var(--ste-dusk)">
                {z === 0 ? "0" : `${z > 0 ? "+" : "−"}${Math.abs(z)}σ`}
              </text>
            ))}
          </svg>
          <div className="bc-year" aria-hidden="true">
            {data.years[yi]}
            {tail && <small>{tail}</small>}
          </div>
          {hk >= 0 && hx != null && (
            <ChartTip x={X(hx)} y={Y(at(hx))} cw={W} title={`${data.years[yi]} · ${CATS[hk].name}`}
              value={`${fmt(m.share[yi][hk], 1)}% of days`} />
          )}
        </>
      )}
    </div>
  );
}
