import type { Figure as Fig } from "../insights";
import { niceStep, tickDecimals } from "./charts/geom";

const num = (v: number, d: number) => new Intl.NumberFormat("en-GB", { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);

/** Line or bar figure. `bare` drops the axes for a tile. Lines carry pathLength 1 so the stylesheet can draw them in. */
export default function Figure({ fig, bare }: { fig: Fig; bare?: boolean }) {
  const W = 312, H = bare ? 230 : 190;
  const labelled = !bare && fig.kind === "lines" && fig.series.some((s) => s.tone);
  const pl = bare ? 4 : 40, pr = labelled ? 40 : 8, pt = bare ? 8 : 24, pb = bare ? 4 : 24;
  const vals = fig.kind === "bars" ? fig.items.map((d) => d.value) : fig.series.flatMap((s) => s.values.filter((v): v is number => v != null));
  const zero = fig.kind === "bars" || fig.zero;
  const step = niceStep((zero ? Math.max(...vals) : Math.max(...vals) - Math.min(...vals)) || 1, 3);
  const lo = zero ? 0 : Math.floor(Math.min(...vals) / step) * step;
  const hi = Math.max(Math.ceil(Math.max(...vals) / step) * step, lo + step);
  const y = (v: number) => pt + (1 - (v - lo) / (hi - lo)) * (H - pt - pb);
  const ticks = Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => lo + i * step);
  const axis = !bare && (
    <g className="ax">
      {ticks.map((t) => <text key={t} x={pl - 6} y={y(t)} textAnchor="end" dominantBaseline="middle">{num(t, tickDecimals(step))}</text>)}
      <text x={0} y={8}>{fig.unit}</text>
    </g>
  );
  if (fig.kind === "bars") {
    const bw = (W - pl - pr) / fig.items.length;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {axis && <g className="ax">{ticks.filter((t) => t > 0).map((t) => <text key={t} x={pl - 6} y={y(t)} textAnchor="end" dominantBaseline="middle">{num(t, tickDecimals(step))}</text>)}<text x={0} y={8}>{fig.unit}</text></g>}
        {fig.items.map((d, i) => (
          <g key={d.label}>
            <rect x={pl + i * bw + bw * 0.14} y={y(d.value)} width={bw * 0.72} height={y(0) - y(d.value)} rx={3} className={i === fig.mark ? "mark" : "rest"} />
            {!bare && <text className="ax" x={pl + i * bw + bw / 2} y={H - 6} textAnchor="middle">{d.label}</text>}
          </g>
        ))}
      </svg>
    );
  }
  const n = fig.x.length;
  const x = (i: number) => pl + (i / Math.max(n - 1, 1)) * (W - pl - pr);
  const path = (v: (number | null)[]) => v.map((p, i) => (p == null ? "" : `${i === 0 || v[i - 1] == null ? "M" : "L"}${x(i).toFixed(1)} ${y(p).toFixed(1)}`)).join("");
  const labels = [0, Math.round((n - 1) / 2), n - 1];
  // quiet lines first, so the ones that carry the story draw on top
  const order = [...fig.series].sort((a, b) => Number(!!a.tone) - Number(!!b.tone));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      {axis}
      {!bare && <g className="ax">{labels.map((i, j) => <text key={i} x={x(i)} y={H - 6} textAnchor={j === 0 ? "start" : j === 2 ? "end" : "middle"}>{fig.x[i]}</text>)}</g>}
      {order.map((s) => (
        <path key={s.name} d={path(s.values)} fill="none" pathLength={1} className={`line ${fig.series.length > 1 ? s.tone ?? "quiet" : "main"}`} />
      ))}
      {labelled && (
        <g className="ax">
          {fig.series.filter((s) => s.tone).map((s) => <text key={s.name} x={W - pr + 6} y={y(s.values[n - 1] ?? lo)} dominantBaseline="middle" className={`lab ${s.tone}`}>{s.name}</text>)}
        </g>
      )}
    </svg>
  );
}
