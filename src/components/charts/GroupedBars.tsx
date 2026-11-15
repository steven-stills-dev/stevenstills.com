import { useState, type MouseEvent } from "react";
import { fmt } from "../../lib/format";
import { useSize } from "../../lib/useSize";
import { ticksSigned, tickDecimals, PAD_L, PAD_R } from "./geom";
import { ChartTip } from "./ChartTip";

const PTOP = 20;
const BW_MAX = 40;

/** Grouped bars, positive or negative, one colour per series, sized to the container. */
export default function GroupedBars({
  groups, series, unit = "", digits = 1, padL = PAD_L, padR = PAD_R,
}: {
  groups: string[];
  series: { name: string; values: number[]; color: string }[];
  unit?: string; digits?: number; padL?: number; padR?: number;
}) {
  const [ref, size] = useSize<HTMLDivElement>();
  const [hi, setHi] = useState<number | null>(null);
  const W = size.w, H = size.h, n = groups.length, m = series.length;
  const all = series.flatMap((s) => s.values);
  const yt = ticksSigned(Math.min(0, ...all), Math.max(0, ...all));
  const top = yt[yt.length - 1], bot = yt[0];
  const ydig = tickDecimals(yt.length > 1 ? yt[1] - yt[0] : 1);
  const base = H - 22;
  const Y = (v: number) => base - ((v - bot) / (top - bot || 1)) * (base - PTOP);
  const plotW = W - padL - padR, slot = n ? plotW / n : 0;
  const bw = Math.min(BW_MAX, (slot * 0.7) / (m || 1));
  const gx = (i: number) => padL + i * slot + (slot - bw * m) / 2;
  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    if (!n) return;
    const r = e.currentTarget.getBoundingClientRect();
    setHi(Math.max(0, Math.min(n - 1, Math.floor((e.clientX - r.left - padL) / slot))));
  };

  return (
    <div ref={ref} className="chart-fill">
      {W > 0 && H > 0 && n > 0 && (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none"
            onMouseMove={onMove} onMouseLeave={() => setHi(null)} style={{ display: "block", cursor: "crosshair" }}>
            <line x1={padL} y1={Y(top)} x2={padL} y2={Y(bot)} stroke="var(--hairline)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            {yt.map((t, k) => (
              <g key={k}>
                <line x1={padL - 3} y1={Y(t)} x2={padL} y2={Y(t)} stroke="var(--hairline)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                <text x={padL - 6} y={Y(t) + 3} textAnchor="end" fontSize="10.5" fill="var(--ste-dusk)">{fmt(t, ydig)}</text>
              </g>
            ))}
            {bot < 0 && <line x1={padL} y1={Y(0)} x2={W - padR} y2={Y(0)} stroke="var(--hairline)" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
            {groups.map((g, i) => (
              <g key={g}>
                {series.map((s, k) => {
                  const v = s.values[i], y = Math.min(Y(v), Y(0)), h = Math.max(Math.abs(Y(v) - Y(0)), 1);
                  return <rect key={s.name} x={gx(i) + k * bw} y={y} width={bw - 2} height={h} rx={2} fill={s.color}
                    stroke={hi === i ? "var(--ste-night)" : "none"} strokeWidth={1.2} />;
                })}
                <text x={padL + (i + 0.5) * slot} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--ste-dusk)">{g}</text>
              </g>
            ))}
          </svg>
          {hi != null && (
            <ChartTip x={padL + (hi + 0.5) * slot} y={Y(Math.max(0, ...series.map((s) => s.values[hi])))} cw={W} title={groups[hi]}
              rows={series.map((s) => ({ name: s.name, value: `${fmt(s.values[hi], digits)}${unit ? " " + unit : ""}`, color: s.color }))} />
          )}
        </>
      )}
    </div>
  );
}
