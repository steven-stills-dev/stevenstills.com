import { useState, type MouseEvent } from "react";
import { fmt } from "../../lib/format";
import { useSize } from "../../lib/useSize";
import { axisTicks, tickDecimals, PAD_L, PAD_R } from "./geom";
import { ChartTip } from "./ChartTip";

export interface Series {
  name: string;
  values: number[];
  /** CSS colour; defaults to the primary accent for the first series and Night for the rest. */
  color?: string;
  width?: number;
  dash?: string;
}

/** Multi-series line chart with an optional P10–P90 band, sized to the container.
 *  Two-series comparisons read as primary vs Night; the band takes the primary tint. */
export default function LineChart({
  series, labels, ticks = [], band, unit = "", digits = 1, hover = true,
  padL = PAD_L, padR = PAD_R, yMax, yTarget = 4,
}: {
  series: Series[];
  labels: string[];
  ticks?: { i: number; label: string }[];
  band?: { top: number[]; bottom: number[]; color?: string };
  unit?: string; digits?: number; hover?: boolean;
  padL?: number; padR?: number; yMax?: number; yTarget?: number;
}) {
  const [ref, size] = useSize<HTMLDivElement>();
  const [hi, setHi] = useState<number | null>(null);
  const W = size.w, H = size.h;
  const n = labels.length;
  const raw = yMax ?? Math.max(...series.flatMap((s) => s.values), ...(band?.top ?? []));
  const yt = axisTicks(raw, yTarget);
  const top = yt[yt.length - 1] || 1;
  const ydig = tickDecimals(yt.length > 1 ? yt[1] - yt[0] : 1);
  const X = (i: number) => padL + (i / (n - 1)) * (W - padL - padR);
  const Y = (v: number) => H - 26 - (v / top) * (H - 46);
  const poly = (arr: number[]) => arr.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    if (n < 2) return;
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left) - padL) / (W - padL - padR) * (n - 1));
    setHi(Math.max(0, Math.min(n - 1, i)));
  };
  const colorOf = (s: Series, k: number) => s.color ?? (k === 0 ? "var(--ste-secondary)" : "var(--ste-night)");
  const bandD = band
    ? "M" + band.top.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" L") +
      " L" + [...band.bottom].reverse().map((v, j) => `${X(n - 1 - j).toFixed(1)},${Y(v).toFixed(1)}`).join(" L") + " Z"
    : "";

  return (
    <div ref={ref} className="chart-fill">
      {W > 0 && H > 0 && n > 1 && (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none"
            onMouseMove={hover ? onMove : undefined} onMouseLeave={hover ? () => setHi(null) : undefined}
            style={{ display: "block", cursor: hover ? "crosshair" : undefined }}>
            <line x1={padL} y1={Y(top)} x2={padL} y2={Y(0)} stroke="var(--hairline)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            {yt.map((t, k) => (
              <g key={k}>
                <line x1={padL - 3} y1={Y(t)} x2={padL} y2={Y(t)} stroke="var(--hairline)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                <text x={padL - 6} y={Y(t) + 3} textAnchor="end" fontSize="10.5" fill="var(--ste-dusk)">{fmt(t, ydig)}</text>
              </g>
            ))}
            {band && <path d={bandD} fill={band.color ?? "var(--ste-secondary)"} fillOpacity="0.22" />}
            {series.map((s, k) => (
              <polyline key={s.name} points={poly(s.values)} fill="none" stroke={colorOf(s, k)}
                strokeWidth={s.width ?? (k === 0 ? 2.2 : 1.6)} strokeDasharray={s.dash} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            ))}
            {hover && hi != null && (
              <g>
                <line x1={X(hi)} y1={6} x2={X(hi)} y2={H - 22} stroke="var(--ste-dusk)" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
                {series.filter((s) => s.values[hi] != null).map((s, k) => (
                  <circle key={s.name} cx={X(hi)} cy={Y(s.values[hi])} r={4} fill={colorOf(s, k)} stroke="var(--ste-night)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
                ))}
              </g>
            )}
            {ticks.map((t) => (
              <text key={t.i} x={X(t.i)} y={H - 6} textAnchor="middle" fontSize="10.5" fill="var(--ste-dusk)">{t.label}</text>
            ))}
          </svg>
          {hover && hi != null && series.some((s) => s.values[hi] != null) && (
            <ChartTip x={X(hi)} y={Y(Math.max(...series.filter((s) => s.values[hi] != null).map((s) => s.values[hi])))} cw={W} title={labels[hi]}
              rows={series.filter((s) => s.values[hi] != null).map((s, k) => ({ name: s.name, value: `${fmt(s.values[hi], digits)}${unit ? " " + unit : ""}`, color: colorOf(s, k) }))} />
          )}
        </>
      )}
    </div>
  );
}
