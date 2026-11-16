import { useState, type MouseEvent } from "react";
import { fmt } from "../../lib/format";
import { useSize } from "../../lib/useSize";
import { niceStep, tickDecimals, PAD_L, PAD_R } from "./geom";
import { ChartTip } from "./ChartTip";

export interface Pt { x: number; y: number; label?: string; hi?: boolean }
export interface FitPt { x: number; y: number; lo?: number; hi?: number }

const ticks = (lo: number, hi: number) => {
  const step = niceStep(hi - lo, 4), first = Math.floor(lo / step) * step;
  return Array.from({ length: Math.ceil((hi - first) / step) + 1 }, (_, i) => +(first + i * step).toFixed(10));
};

/** Scatter plot with an optional fitted line and confidence band, sized to the container.
 *  Points flagged `hi` are drawn in Night on top; the fit is drawn in Night. */
export default function Scatter({
  points, fit, xUnit = "", yUnit = "", xDigits = 0, yDigits = 0, xDomain, yDomain, r = 2.4, label,
}: {
  points: Pt[]; fit?: FitPt[]; xUnit?: string; yUnit?: string; xDigits?: number; yDigits?: number;
  xDomain?: [number, number]; yDomain?: [number, number]; r?: number; label?: string;
}) {
  const [ref, size] = useSize<HTMLDivElement>();
  const [hi, setHi] = useState<number | null>(null);
  const W = size.w, H = size.h;
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  const xt = ticks(...(xDomain ?? [Math.min(...xs), Math.max(...xs)] as [number, number]));
  const yt = ticks(...(yDomain ?? [Math.min(...ys), Math.max(...ys)] as [number, number]));
  const xa = xt[0], xb = xt[xt.length - 1], ya = yt[0], yb = yt[yt.length - 1];
  const X = (v: number) => PAD_L + ((v - xa) / (xb - xa || 1)) * (W - PAD_L - PAD_R);
  const Y = (v: number) => H - 26 - ((v - ya) / (yb - ya || 1)) * (H - 46);
  const xd = Math.max(xDigits, tickDecimals(xt[1] - xt[0])), yd = Math.max(yDigits, tickDecimals(yt[1] - yt[0]));
  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    const b = e.currentTarget.getBoundingClientRect(), mx = e.clientX - b.left, my = e.clientY - b.top;
    let best = -1, bd = 400;
    points.forEach((p, i) => { const d = (X(p.x) - mx) ** 2 + (Y(p.y) - my) ** 2; if (d < bd) { bd = d; best = i; } });
    setHi(best < 0 ? null : best);
  };
  const band = fit && fit[0]?.lo != null
    ? "M" + fit.map((f) => `${X(f.x).toFixed(1)},${Y(f.hi!).toFixed(1)}`).join(" L") + " L" + [...fit].reverse().map((f) => `${X(f.x).toFixed(1)},${Y(f.lo!).toFixed(1)}`).join(" L") + " Z"
    : "";
  const p = hi != null ? points[hi] : null;
  return (
    <div ref={ref} className="chart-fill">
      {W > 0 && H > 0 && points.length > 0 && (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" role="img" aria-label={label}
            onMouseMove={onMove} onMouseLeave={() => setHi(null)} style={{ display: "block" }}>
            <line x1={PAD_L} y1={Y(yb)} x2={PAD_L} y2={Y(ya)} stroke="var(--hairline)" />
            {yt.map((t) => <text key={t} x={PAD_L - 6} y={Y(t) + 3} textAnchor="end" fontSize="10.5" fill="var(--ste-dusk)">{fmt(t, yd)}</text>)}
            {xt.map((t) => <text key={t} x={X(t)} y={H - 6} textAnchor="middle" fontSize="10.5" fill="var(--ste-dusk)">{fmt(t, xd)}</text>)}
            {points.map((q, i) => !q.hi && <circle key={i} cx={X(q.x)} cy={Y(q.y)} r={r} fill="var(--ste-secondary)" fillOpacity="0.4" />)}
            {band && <path d={band} fill="var(--ste-night)" fillOpacity="0.14" />}
            {fit && <path d={fit.map((f, i) => `${i ? "L" : "M"}${X(f.x).toFixed(1)},${Y(f.y).toFixed(1)}`).join("")} fill="none" stroke="var(--ste-night)" strokeWidth="1.8" />}
            {points.map((q, i) => q.hi && <circle key={i} cx={X(q.x)} cy={Y(q.y)} r={r + 1} fill="var(--ste-night)" />)}
            {p && <circle cx={X(p.x)} cy={Y(p.y)} r={r + 2.5} fill="none" stroke="var(--ste-night)" strokeWidth="1.4" />}
          </svg>
          {p && <ChartTip x={X(p.x)} y={Y(p.y)} cw={W} title={p.label ?? ""}
            rows={[{ name: xUnit || "x", value: fmt(p.x, xd) }, { name: yUnit || "y", value: fmt(p.y, yd), color: "var(--ste-night)" }]} />}
        </>
      )}
    </div>
  );
}
