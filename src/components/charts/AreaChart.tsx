import { useState, type MouseEvent } from "react";
import { fmt } from "../../lib/format";
import { useSize } from "../../lib/useSize";
import { axisTicks, niceStep, tickDecimals, PAD_L, PAD_R } from "./geom";

/** Clean ticks spanning lo..hi; from zero when lo is 0. */
function ticksFrom(lo: number, hi: number): number[] {
  if (lo <= 0) return axisTicks(hi, 4);
  const step = niceStep(hi - lo, 4);
  const first = Math.floor(lo / step) * step;
  const n = Math.max(1, Math.ceil((hi - first) / step));
  return Array.from({ length: n + 1 }, (_, i) => first + i * step);
}
import { ChartTip } from "./ChartTip";

/** Minimalist area chart: primary gradient fill + Night line, sized to its
 *  container. Optional `compare` renders a second series as a muted Night line.
 *  `axis` draws a y-axis; `hover` + `labels` enable the tooltip. */
export default function AreaChart({
  points, compare, ticks = [], labels, hover = true, axis = true,
  color = "var(--ste-secondary)", unit = "", digits = 0,
  padL = PAD_L, padR = PAD_R, yScale = 1, yMin = 0,
}: {
  points: number[];
  compare?: number[];
  ticks?: { i: number; label: string }[];
  labels?: string[];
  hover?: boolean; axis?: boolean;
  color?: string; unit?: string; digits?: number;
  padL?: number; padR?: number; yScale?: number;
  /** axis baseline; defaults to zero */
  yMin?: number;
}) {
  const [ref, size] = useSize<HTMLDivElement>();
  const [hi, setHi] = useState<number | null>(null);
  const W = size.w, H = size.h, n = points.length;

  const raw = Math.max(...points, ...(compare ?? []));
  const dispTicks = axis ? ticksFrom(yMin * yScale, raw * yScale) : [];
  const bottom = axis ? dispTicks[0] / yScale : 0;
  const top = axis ? ((dispTicks[dispTicks.length - 1] || 1) / yScale) : (raw * 1.15 || 1);
  const X = (i: number) => padL + (i / (n - 1)) * (W - padL - padR);
  const Y = (v: number) => H - 26 - ((v - bottom) / (top - bottom || 1)) * (H - 46);
  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    if (n < 2) return;
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left) - padL) / (W - padL - padR) * (n - 1));
    setHi(Math.max(0, Math.min(n - 1, i)));
  };

  const gid = `ag-${color.replace(/[^a-z0-9]/gi, "")}`;
  const ydig = tickDecimals(dispTicks.length > 1 ? dispTicks[1] - dispTicks[0] : 1);
  const line = points.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
  const areaD = n > 1
    ? `M${X(0).toFixed(1)},${H - 26} L` + points.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" L") + ` L${X(n - 1).toFixed(1)},${H - 26} Z`
    : "";
  const mark = hover && hi != null ? { x: X(hi), y: Y(points[hi]) } : null;

  return (
    <div ref={ref} className="chart-fill">
      {W > 0 && H > 0 && n > 1 && (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none"
            onMouseMove={hover ? onMove : undefined} onMouseLeave={hover ? () => setHi(null) : undefined}
            style={{ display: "block", cursor: hover ? "crosshair" : undefined }}>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={color} stopOpacity="0.55" />
                <stop offset="1" stopColor={color} stopOpacity="0.03" />
              </linearGradient>
            </defs>
            {axis && <line x1={padL} y1={Y(top)} x2={padL} y2={Y(bottom)} stroke="var(--hairline)" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
            {dispTicks.map((td, k) => {
              const rv = td / yScale;
              return (
                <g key={k}>
                  <line x1={padL - 3} y1={Y(rv)} x2={padL} y2={Y(rv)} stroke="var(--hairline)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                  <text x={padL - 6} y={Y(rv) + 3} textAnchor="end" fontSize="10.5" fill="var(--ste-dusk)">{fmt(td, ydig)}</text>
                </g>
              );
            })}
            {compare && (
              <polyline points={compare.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ")}
                fill="none" stroke="var(--ste-night)" strokeWidth="1.6" strokeOpacity="0.45" vectorEffect="non-scaling-stroke" />
            )}
            <path d={areaD} fill={`url(#${gid})`} />
            <polyline points={line} fill="none" stroke="var(--ste-night)" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
            {mark && (
              <g>
                <line x1={mark.x} y1={6} x2={mark.x} y2={H - 22} stroke="var(--ste-dusk)" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
                <circle cx={mark.x} cy={mark.y} r={4} fill={color} stroke="var(--ste-night)" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
              </g>
            )}
            {!axis && <text x={X(0)} y={Y(points[0]) - 9} fontSize="12" fontWeight="600" fill="var(--ste-midnight)">{fmt(points[0], digits)}</text>}
            {!axis && <text x={X(n - 1)} y={Y(points[n - 1]) - 9} textAnchor="end" fontSize="12" fontWeight="600" fill="var(--ste-midnight)">{fmt(points[n - 1], digits)}</text>}
            {ticks.map((t) => (
              <text key={t.i} x={X(t.i)} y={H - 6} textAnchor="middle" fontSize="10.5" fill="var(--ste-dusk)">{t.label}</text>
            ))}
          </svg>
          {mark && labels && (
            <ChartTip x={mark.x} y={mark.y} cw={W} title={labels[hi!]} value={`${fmt(points[hi!], digits)}${unit ? " " + unit : ""}`} />
          )}
        </>
      )}
    </div>
  );
}
