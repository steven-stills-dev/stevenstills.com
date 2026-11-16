import { useState, type MouseEvent } from "react";
import { fmt } from "../../lib/format";
import { useSize } from "../../lib/useSize";
import { axisTicks, tickDecimals, PAD_L, PAD_R } from "./geom";
import { ChartTip } from "./ChartTip";

export interface Bin { x0: number; x1: number; n: number }

/** Histogram of pre-binned values with an optional density curve (one y per bin,
 *  in the same units as `n`), sized to the container. `mark` draws one Night rule at an x value. */
export default function Histogram({
  bins, curve, unit = "", yUnit = "", digits = 0, yDigits = 0, xTicks, mark, label,
}: {
  bins: Bin[]; curve?: number[]; unit?: string; yUnit?: string; digits?: number; yDigits?: number;
  xTicks?: number[]; mark?: number; label?: string;
}) {
  const [ref, size] = useSize<HTMLDivElement>();
  const [hi, setHi] = useState<number | null>(null);
  const W = size.w, H = size.h, n = bins.length;
  const x0 = bins[0]?.x0 ?? 0, x1 = bins[n - 1]?.x1 ?? 1;
  const yt = axisTicks(Math.max(...bins.map((b) => b.n), ...(curve ?? [])), 4);
  const top = yt[yt.length - 1] || 1;
  const ydig = Math.max(yDigits, tickDecimals(yt[1] - yt[0]));
  const X = (v: number) => PAD_L + ((v - x0) / (x1 - x0 || 1)) * (W - PAD_L - PAD_R);
  const Y = (v: number) => H - 26 - (v / top) * (H - 46);
  const xt = xTicks ?? [x0, (x0 + x1) / 2, x1];
  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const v = x0 + ((e.clientX - r.left - PAD_L) / (W - PAD_L - PAD_R)) * (x1 - x0);
    const i = bins.findIndex((b) => v >= b.x0 && v < b.x1);
    setHi(i < 0 ? null : i);
  };
  const b = hi != null ? bins[hi] : null;
  return (
    <div ref={ref} className="chart-fill">
      {W > 0 && H > 0 && n > 0 && (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" role="img" aria-label={label}
            onMouseMove={onMove} onMouseLeave={() => setHi(null)} style={{ display: "block" }}>
            <line x1={PAD_L} y1={Y(top)} x2={PAD_L} y2={Y(0)} stroke="var(--hairline)" />
            {yt.map((t) => (
              <text key={t} x={PAD_L - 6} y={Y(t) + 3} textAnchor="end" fontSize="10.5" fill="var(--ste-dusk)">{fmt(t, ydig)}</text>
            ))}
            {bins.map((bn, i) => (
              <rect key={i} x={X(bn.x0) + 0.5} y={Y(bn.n)} width={Math.max(0, X(bn.x1) - X(bn.x0) - 1)} height={Y(0) - Y(bn.n)}
                fill="var(--ste-secondary)" fillOpacity={hi === i ? 1 : 0.55} />
            ))}
            {curve && (
              <path d={curve.map((v, i) => `${i ? "L" : "M"}${X((bins[i].x0 + bins[i].x1) / 2).toFixed(1)},${Y(v).toFixed(1)}`).join("")}
                fill="none" stroke="var(--ste-night)" strokeWidth="1.6" />
            )}
            {mark != null && <line x1={X(mark)} y1={Y(top)} x2={X(mark)} y2={Y(0)} stroke="var(--ste-night)" strokeDasharray="4 3" />}
            {xt.map((t) => (
              <text key={t} x={X(t)} y={H - 6} textAnchor="middle" fontSize="10.5" fill="var(--ste-dusk)">{fmt(t, digits)}</text>
            ))}
          </svg>
          {b && <ChartTip x={X((b.x0 + b.x1) / 2)} y={Y(b.n)} cw={W}
            title={`${fmt(b.x0, digits)} to ${fmt(b.x1, digits)}${unit ? " " + unit : ""}`} value={`${fmt(b.n, ydig)}${yUnit ? " " + yUnit : ""}`} />}
        </>
      )}
    </div>
  );
}
