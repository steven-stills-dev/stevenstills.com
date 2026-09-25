import { useState, type MouseEvent } from "react";
import { fmt } from "../../lib/format";
import { useSize } from "../../lib/useSize";
import { axisTicks, tickDecimals, PAD_L, PAD_R } from "./geom";
import { ChartTip } from "./ChartTip";

const PTOP = 20;
const BW_MAX = 64;

/** Pill bars over a full-height track, sized to the container. */
export default function PillBars({
  items, digits = 0, hover = true, unit = "", axis = true, padL = PAD_L, padR = PAD_R, yScale = 1,
}: {
  items: { label: string; value: number }[];
  digits?: number; hover?: boolean; unit?: string;
  axis?: boolean; padL?: number; padR?: number; yScale?: number;
}) {
  const [ref, size] = useSize<HTMLDivElement>();
  const [hi, setHi] = useState<number | null>(null);
  const W = size.w, H = size.h, n = items.length;
  const raw = Math.max(...items.map((d) => d.value));
  const lx = axis ? padL : 0, rx = axis ? padR : 0, plotW = W - lx - rx;
  const base = H - 22;
  const ticks = axis ? axisTicks(raw * yScale, 4) : [];
  const top = axis ? ((ticks[ticks.length - 1] || 1) / yScale) : (raw * 1.14 || 1);
  const span = base - PTOP;
  const ydig = tickDecimals(ticks.length > 1 ? ticks[1] - ticks[0] : 1);
  // bars never grow past a pill width; a short series sits centred in the plot
  const gap = Math.min(12, plotW * 0.02), bw = n ? Math.min(BW_MAX, (plotW - gap * (n - 1)) / n) : 0;
  const x0 = lx + (plotW - (n * bw + gap * (n - 1))) / 2;
  const bh = (v: number) => (v / top) * span;
  const anchor = (i: number) => ({ x: x0 + i * (bw + gap) + bw / 2, y: base - bh(items[i].value) });
  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    if (!n) return;
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.floor((e.clientX - r.left - x0) / (bw + gap));
    setHi(Math.max(0, Math.min(n - 1, i)));
  };

  return (
    <div ref={ref} className="chart-fill">
      {W > 0 && H > 0 && n > 0 && (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none"
            onMouseMove={hover ? onMove : undefined} onMouseLeave={hover ? () => setHi(null) : undefined}
            style={{ display: "block", cursor: hover ? "crosshair" : undefined }}>
            {axis && <line x1={lx} y1={PTOP} x2={lx} y2={base} stroke="var(--hairline)" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
            {ticks.map((t, k) => {
              const ty = base - (t / (top * yScale)) * span;
              return (
                <g key={k}>
                  <line x1={lx - 3} y1={ty} x2={lx} y2={ty} stroke="var(--hairline)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                  <text x={lx - 6} y={ty + 3} textAnchor="end" fontSize="10" fill="var(--ste-dusk)">{fmt(t, ydig)}</text>
                </g>
              );
            })}
            {items.map((d, i) => {
              const x = x0 + i * (bw + gap), bhi = bh(d.value), y = base - bhi;
              return (
                <g key={i}>
                  <rect x={x} y={PTOP} width={bw} height={span} rx={bw / 2} fill="var(--track)" />
                  <rect x={x} y={y} width={bw} height={Math.max(bhi, 1)} rx={bw / 2} fill="var(--ste-secondary)" />
                  {hi === i && <rect x={x} y={y} width={bw} height={Math.max(bhi, 1)} rx={bw / 2} fill="none" stroke="var(--ste-night)" strokeWidth={1.6} />}
                  <text x={x + bw / 2} y={base + 13} textAnchor="middle" fontSize="10" fill="var(--ste-dusk)">{d.label}</text>
                </g>
              );
            })}
          </svg>
          {hover && hi != null && (
            <ChartTip {...anchor(hi)} cw={W} title={items[hi].label} value={`${fmt(items[hi].value, digits)}${unit ? " " + unit : ""}`} />
          )}
        </>
      )}
    </div>
  );
}
