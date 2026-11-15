import { useState, type MouseEvent } from "react";
import { fmt } from "../../lib/format";
import { useSize } from "../../lib/useSize";
import { ticksSigned, tickDecimals, PAD_L, PAD_R } from "./geom";
import { ChartTip } from "./ChartTip";

const PTOP = 12;

/** Stacked bars that grow up for positive and down for negative values, one colour per series. */
export default function StackedBars({
  labels, ticks, series, unit = "", digits = 1, padL = PAD_L, padR = PAD_R,
}: {
  labels: string[];
  ticks: { i: number; label: string }[];
  series: { name: string; values: number[]; color: string }[];
  unit?: string; digits?: number; padL?: number; padR?: number;
}) {
  const [ref, size] = useSize<HTMLDivElement>();
  const [hi, setHi] = useState<number | null>(null);
  const W = size.w, H = size.h, n = labels.length;
  const pos = labels.map((_, i) => series.reduce((a, s) => a + Math.max(0, s.values[i]), 0));
  const neg = labels.map((_, i) => series.reduce((a, s) => a + Math.min(0, s.values[i]), 0));
  const yt = ticksSigned(Math.min(0, ...neg), Math.max(0, ...pos));
  const top = yt[yt.length - 1], bot = yt[0];
  const ydig = tickDecimals(yt.length > 1 ? yt[1] - yt[0] : 1);
  const base = H - 22;
  const Y = (v: number) => base - ((v - bot) / (top - bot || 1)) * (base - PTOP);
  const slot = n ? (W - padL - padR) / n : 0, bw = slot * 0.72;
  const X = (i: number) => padL + i * slot + (slot - bw) / 2;
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
            <line x1={padL} y1={Y(0)} x2={W - padR} y2={Y(0)} stroke="var(--hairline)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            {labels.map((_, i) => {
              let up = 0, dn = 0;
              return (
                <g key={i} opacity={hi == null || hi === i ? 1 : 0.55}>
                  {series.map((s) => {
                    const v = s.values[i];
                    const from = v >= 0 ? up : dn, to = from + v;
                    if (v >= 0) up = to; else dn = to;
                    return <rect key={s.name} x={X(i)} y={Math.min(Y(from), Y(to))} width={bw} height={Math.abs(Y(to) - Y(from))} fill={s.color} />;
                  })}
                </g>
              );
            })}
            {ticks.map((t) => (
              <text key={t.i} x={X(t.i) + bw / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--ste-dusk)">{t.label}</text>
            ))}
          </svg>
          {hi != null && (
            <ChartTip x={X(hi) + bw / 2} y={Y(Math.max(0, pos[hi]))} cw={W} title={labels[hi]}
              rows={series.map((s) => ({ name: s.name, value: `${fmt(s.values[hi], digits)}${unit ? " " + unit : ""}`, color: s.color }))} />
          )}
        </>
      )}
    </div>
  );
}
