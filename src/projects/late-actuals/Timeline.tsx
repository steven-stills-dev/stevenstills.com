import { useSize } from "../../lib/useSize";

const SPAN0 = -84, SPAN1 = 14;
export const ceil7 = (x: number) => Math.ceil(x / 7) * 7;

/** What is published at issue time, and where each design's lags land, in days from the issue date. */
export default function Timeline({ P, h }: { P: number; h: number }) {
  const [ref, size] = useSize<HTMLDivElement>();
  const W = size.w, H = size.h;
  const padL = W < 500 ? 8 : 112, padR = 16;
  const X = (d: number) => padL + ((d - SPAN0) / (SPAN1 - SPAN0)) * (W - padL - padR);
  const k = ceil7(h + P);
  const rows = [
    { name: "Leaky lags", y: H * 0.42, lags: [h - 1, h - 7, h - 14] },
    { name: "As-of lags", y: H * 0.76, lags: [h - k, h - k - 7, h - k - 14] },
  ];
  const barY = H * 0.12, axisY = H - 18;
  const ticks = [-84, -70, -56, -42, -28, -14, 0, 14];
  return (
    <div ref={ref} className="chart-fill" role="img"
      aria-label={`Actuals are published up to ${P} days before the issue date. For a ${h}-day horizon the shortest safe same-weekday lag is ${k} days.`}>
      {W > 0 && H > 0 && (
        <svg width={W} height={H}>
          <rect x={X(SPAN0)} y={barY} width={X(-P) - X(SPAN0)} height={12} fill="var(--ste-primary)" />
          <rect x={X(-P)} y={barY} width={X(0) - X(-P)} height={12} fill="var(--track)" />
          <text x={X(-P) - 4} y={barY - 6} textAnchor="end" className="la-t">Published</text>
          <text x={X(-P) + 4} y={barY - 6} className="la-t">Not yet</text>
          <line x1={X(0)} x2={X(0)} y1={barY - 2} y2={axisY} stroke="var(--ste-dusk)" strokeDasharray="3 3" />
          <line x1={X(h)} x2={X(h)} y1={barY + 16} y2={axisY} stroke="var(--ste-secondary)" />
          {rows.map((r) => (
            <g key={r.name}>
              {W >= 500 && <text x={8} y={r.y + 4} className="la-t">{r.name}</text>}
              {W < 500 && <text x={X(SPAN0)} y={r.y - 30} className="la-t">{r.name}</text>}
              <line x1={X(SPAN0)} x2={X(SPAN1)} y1={r.y} y2={r.y} stroke="var(--hairline)" />
              {r.lags.map((d) => {
                const ok = d <= -P, x0 = X(h), x1 = X(d), lift = Math.min(34, Math.abs(x0 - x1) * 0.35);
                return (
                  <g key={d}>
                    <path d={`M${x0},${r.y} Q${(x0 + x1) / 2},${r.y - lift} ${x1},${r.y}`} fill="none"
                      stroke={ok ? "var(--ste-secondary)" : "var(--ste-night)"} strokeDasharray={ok ? undefined : "3 3"} />
                    <circle cx={x1} cy={r.y} r={5} fill={ok ? "var(--ste-secondary)" : "var(--ste-midday)"}
                      stroke={ok ? "var(--ste-secondary)" : "var(--ste-night)"} strokeWidth={1.5} />
                  </g>
                );
              })}
              <circle cx={X(h)} cy={r.y} r={5} fill="var(--ste-night)" />
            </g>
          ))}
          <line x1={X(SPAN0)} x2={X(SPAN1)} y1={axisY} y2={axisY} stroke="var(--hairline)" />
          {ticks.filter((t) => W >= 500 || t % 28 === 0 || t === 14).map((t) => (
            <text key={t} x={X(t)} y={axisY + 14} textAnchor="middle" className="la-t la-ax">{t > 0 ? `+${t}` : t === 0 ? "Issue" : `−${-t}`}</text>
          ))}
          <text x={X(h)} y={barY + 30} textAnchor={h > 9 ? "end" : "start"} dx={h > 9 ? -4 : 4} className="la-t">Target</text>
        </svg>
      )}
    </div>
  );
}
