import { useState } from "react";
import { fmt } from "../../lib/format";
import { useSize } from "../../lib/useSize";
import { ChartTip } from "./ChartTip";

/** Matrix heat map: rows down, columns across, sized to the container.
 *  Sequential by default (page white to cobalt). With `diverge`, values run from the alert red
 *  below `mid` through white to cobalt above it. The legend states the fixed scale ends. */
export default function Heatmap({
  rows, cols, values, unit = "", digits = 0, domain, diverge = false, mid = 0, colEvery = 1, rowW = 44, label,
}: {
  rows: string[]; cols: string[]; values: (number | null)[][]; unit?: string; digits?: number;
  domain?: [number, number]; diverge?: boolean; mid?: number; colEvery?: number; rowW?: number; label?: string;
}) {
  const [ref, size] = useSize<HTMLDivElement>();
  const [hi, setHi] = useState<{ r: number; c: number } | null>(null);
  const W = size.w, H = size.h;
  const flat = values.flat().filter((v): v is number => v != null);
  const [lo, top] = domain ?? [Math.min(...flat), Math.max(...flat)];
  const reach = Math.max(top - mid, mid - lo) || 1;
  const fill = (v: number | null) => {
    if (v == null) return "var(--ste-midday)";
    if (diverge) {
      const t = Math.max(-1, Math.min(1, (v - mid) / reach));
      return `color-mix(in srgb, ${t < 0 ? "var(--ste-alert)" : "var(--ste-secondary)"} ${Math.round(Math.abs(t) * 100)}%, var(--ste-midday))`;
    }
    return `color-mix(in srgb, var(--ste-secondary) ${Math.round(Math.max(0, Math.min(1, (v - lo) / (top - lo || 1))) * 100)}%, var(--ste-midday))`;
  };
  const cw = (W - rowW) / cols.length, ch = (H - 22) / rows.length;
  const v = hi ? values[hi.r][hi.c] : null;
  return (
    <>
      <div ref={ref} className="chart-fill">
        {W > 0 && H > 0 && (
          <>
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" role="img" aria-label={label} onMouseLeave={() => setHi(null)} style={{ display: "block" }}>
              {rows.map((rl, r) => (
                <g key={rl}>
                  <text x={rowW - 6} y={r * ch + ch / 2 + 3.5} textAnchor="end" fontSize="10.5" fill="var(--ste-dusk)">{rl}</text>
                  {cols.map((_, c) => (
                    <rect key={c} x={rowW + c * cw} y={r * ch} width={cw + 0.5} height={ch + 0.5} fill={fill(values[r][c])}
                      stroke={hi?.r === r && hi.c === c ? "var(--ste-night)" : "none"} onMouseEnter={() => setHi({ r, c })} />
                  ))}
                </g>
              ))}
              {cols.map((cl, c) => c % colEvery === 0 && (
                <text key={cl} x={rowW + c * cw + cw / 2} y={H - 6} textAnchor="middle" fontSize="10.5" fill="var(--ste-dusk)">{cl}</text>
              ))}
            </svg>
            {hi && v != null && <ChartTip x={rowW + hi.c * cw + cw / 2} y={hi.r * ch} cw={W} title={`${rows[hi.r]} · ${cols[hi.c]}`} value={`${fmt(v, digits)}${unit ? " " + unit : ""}`} />}
          </>
        )}
      </div>
      <div className="legend heat-legend">
        <span>{fmt(diverge ? mid - reach : lo, digits)}</span>
        <i style={{ background: diverge
          ? "linear-gradient(90deg, var(--ste-alert), var(--ste-midday), var(--ste-secondary))"
          : "linear-gradient(90deg, var(--ste-midday), var(--ste-secondary))" }} />
        <span>{fmt(diverge ? mid + reach : top, digits)}{unit ? " " + unit : ""}</span>
      </div>
    </>
  );
}
