import { useState, type MouseEvent } from "react";
import { fmt, MON } from "../../lib/format";
import { useSize } from "../../lib/useSize";
import { axisTicks, niceStep, ramp, tickDecimals, PAD_L, PAD_R } from "../../components/charts/geom";
import { ChartTip } from "../../components/charts/ChartTip";

const TOP = 20, BOT = 26;

/** "1 Jan" .. "31 Dec" for a 365-day year. */
export const DAYS = Array.from({ length: 365 }, (_, d) => {
  const x = new Date(Date.UTC(2001, 0, 1 + d));
  return `${x.getUTCDate()} ${MON[x.getUTCMonth()]}`;
});
const MONTH_TICKS = MON.flatMap((label, m) => (m % 2 ? [] : [{ i: Math.round((Date.UTC(2001, m, 1) - Date.UTC(2001, 0, 1)) / 864e5), label }]));

/** "1 Oct" .. "30 Sep" for a 365-day gas year, and its ticks every other month from October. */
export const GAS_DAYS = Array.from({ length: 365 }, (_, d) => {
  const x = new Date(Date.UTC(2001, 9, 1 + d));
  return `${x.getUTCDate()} ${MON[x.getUTCMonth()]}`;
});
export const GAS_TICKS = [9, 11, 1, 3, 5, 7].map((m) => ({
  i: Math.round((Date.UTC(m >= 9 ? 2001 : 2002, m, 1) - Date.UTC(2001, 9, 1)) / 864e5), label: MON[m],
}));

/** A year's colour: the brand ramp from lime (first year) to mint, and Night for the latest. */
export const yearColor = (year: string, years: number[]) => {
  const k = years.indexOf(+year);
  return k === years.length - 1 ? "var(--ste-night)" : ramp(k, years.length - 1);
};

/** Y ticks from zero with their decimals. */
function yAxis(max: number) {
  const t = axisTicks(max, 4);
  return { t, top: t[t.length - 1] || 1, dig: tickDecimals(t.length > 1 ? t[1] - t[0] : 1) };
}

/** Day and year under the cursor; shared so stacked charts follow each other. */
export type DayHover = { i: number; year: string } | null;

/** One line per year across the calendar, gaps left open; hover picks out the nearest year.
 *  Pass `hover` and `onHover` to share the hovered day and year with another chart. A line's own
 *  `color` and `dash` override the year ramp; `ticks` and `days` swap the calendar for a gas year. */
export function YearLines({ lines, years, unit, digits, hover, onHover, ticks = MONTH_TICKS, days = DAYS }: {
  lines: { name: string; values: (number | null)[]; color?: string; dash?: string }[]; years: number[]; unit: string; digits: number;
  hover?: DayHover; onHover?: (h: DayHover) => void; ticks?: { i: number; label: string }[]; days?: string[];
}) {
  const [ref, { w: W, h: H }] = useSize<HTMLDivElement>();
  const [own, setOwn] = useState<DayHover>(null);
  const h = onHover ? hover ?? null : own;
  const set = onHover ?? setOwn;
  const { t, top, dig } = yAxis(Math.max(...lines.flatMap((l) => l.values.filter((v): v is number => v != null))));
  const X = (i: number) => PAD_L + (i / 364) * (W - PAD_L - PAD_R);
  const Y = (v: number) => H - BOT - (v / top) * (H - BOT - TOP);
  const path = (vals: (number | null)[]) => vals.reduce<string>((d, v, i) =>
    v == null ? d : d + `${i && vals[i - 1] != null ? "L" : "M"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`, "");
  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.max(0, Math.min(364, Math.round(((e.clientX - r.left - PAD_L) / (W - PAD_L - PAD_R)) * 364)));
    const py = e.clientY - r.top;
    let k = -1, best = Infinity;
    lines.forEach((l, j) => {
      const v = l.values[i];
      if (v != null && Math.abs(Y(v) - py) < best) { best = Math.abs(Y(v) - py); k = j; }
    });
    set(k >= 0 ? { i, year: lines[k].name } : null);
  };
  const hl = h ? lines.find((l) => l.name === h.year) : undefined;
  const col = (l: { name: string; color?: string }) => l.color ?? yearColor(l.name, years);
  const hv = h && hl ? hl.values[h.i] : null;

  return (
    <>
      <div ref={ref} className="chart-fill">
        {W > 0 && H > 0 && (
          <>
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" onMouseMove={onMove} onMouseLeave={() => set(null)}
              style={{ display: "block", cursor: "crosshair" }}>
              <line x1={PAD_L} x2={PAD_L} y1={Y(top)} y2={Y(0)} stroke="var(--hairline)" />
              {t.map((v) => (
                <text key={v} x={PAD_L - 6} y={Y(v) + 3} textAnchor="end" fontSize="10.5" fill="var(--ste-dusk)">{fmt(v, dig)}</text>
              ))}
              {ticks.map((m) => (
                <text key={m.i} x={X(m.i)} y={H - 6} textAnchor="middle" fontSize="10.5" fill="var(--ste-dusk)">{m.label}</text>
              ))}
              {h && <line x1={X(h.i)} x2={X(h.i)} y1={Y(top)} y2={Y(0)} stroke="var(--ste-dusk)" strokeDasharray="3 3" />}
              {lines.map((l) => (
                <path key={l.name} d={path(l.values)} fill="none" stroke={col(l)} strokeLinejoin="round" strokeDasharray={l.dash}
                  strokeWidth={h?.year === l.name ? 2.6 : 1.6} opacity={h && h.year !== l.name ? 0.25 : 1} />
              ))}
              {h && hv != null && hl && (
                <circle cx={X(h.i)} cy={Y(hv)} r={4} fill={col(hl)} stroke="var(--ste-night)" strokeWidth={1.2} />
              )}
            </svg>
            {h && hv != null && (
              <ChartTip x={X(h.i)} y={Y(hv)} cw={W} title={`${h.year} · ${days[h.i]}`} value={`${fmt(hv, digits)} ${unit}`} />
            )}
          </>
        )}
      </div>
      <div className="legend">
        {lines.map((l) => (
          <span key={l.name}><i style={l.dash ? { background: "none", border: `1.5px dashed ${col(l)}` } : { background: col(l) }} />{l.name}</span>
        ))}
      </div>
    </>
  );
}

/** Clean ticks spanning lo..hi, negatives allowed. */
function span(lo: number, hi: number, target = 5) {
  const step = niceStep(hi - lo, target);
  const out: number[] = [];
  for (let v = Math.floor(lo / step) * step; v <= hi + step * 1e-6; v += step) out.push(+v.toFixed(6));
  if (out[out.length - 1] < hi) out.push(out[out.length - 1] + step);
  return { t: out, dig: tickDecimals(step) };
}

/** Daily points of y against x, coloured by year; hover picks the nearest day and brings its year forward. */
export function YearScatter({ groups, years, xUnit, yUnit, xDigits = 1, yDigits = 0 }: {
  groups: { name: string; points: [number, number, number][] }[]; years: number[];
  xUnit: string; yUnit: string; xDigits?: number; yDigits?: number;
}) {
  const [ref, { w: W, h: H }] = useSize<HTMLDivElement>();
  const [hi, setHi] = useState<{ g: number; p: number } | null>(null);
  const all = groups.flatMap((g) => g.points);
  const xs = span(Math.min(...all.map((p) => p[0])), Math.max(...all.map((p) => p[0])));
  const ys = yAxis(Math.max(...all.map((p) => p[1])));
  const x0 = xs.t[0], x1 = xs.t[xs.t.length - 1];
  const X = (v: number) => PAD_L + ((v - x0) / (x1 - x0)) * (W - PAD_L - PAD_R);
  const Y = (v: number) => H - BOT - (v / ys.top) * (H - BOT - TOP);
  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    let best = 24 * 24, hit: { g: number; p: number } | null = null;
    groups.forEach((g, gi) => g.points.forEach((p, pi) => {
      const d = (X(p[0]) - mx) ** 2 + (Y(p[1]) - my) ** 2;
      if (d < best) { best = d; hit = { g: gi, p: pi }; }
    }));
    setHi(hit);
  };
  const hp = hi ? groups[hi.g].points[hi.p] : null;

  return (
    <>
      <div ref={ref} className="chart-fill">
        {W > 0 && H > 0 && (
          <>
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" onMouseMove={onMove} onMouseLeave={() => setHi(null)}
              style={{ display: "block", cursor: "crosshair" }}>
              <line x1={PAD_L} x2={PAD_L} y1={Y(ys.top)} y2={Y(0)} stroke="var(--hairline)" />
              <line x1={PAD_L} x2={W - PAD_R} y1={Y(0)} y2={Y(0)} stroke="var(--hairline)" />
              {ys.t.map((v) => (
                <text key={v} x={PAD_L - 6} y={Y(v) + 3} textAnchor="end" fontSize="10.5" fill="var(--ste-dusk)">{fmt(v, ys.dig)}</text>
              ))}
              {xs.t.map((v) => (
                <text key={v} x={X(v)} y={H - 6} textAnchor="middle" fontSize="10.5" fill="var(--ste-dusk)">{fmt(v, xs.dig)}{xUnit}</text>
              ))}
              {groups.map((g, gi) => (
                <g key={g.name} fill={yearColor(g.name, years)} opacity={hi && hi.g !== gi ? 0.12 : 0.6}>
                  {g.points.map((p, pi) => <circle key={pi} cx={X(p[0])} cy={Y(p[1])} r={2.4} />)}
                </g>
              ))}
              {hp && hi && (
                <circle cx={X(hp[0])} cy={Y(hp[1])} r={5} fill={yearColor(groups[hi.g].name, years)} stroke="var(--ste-night)" strokeWidth={1.4} />
              )}
            </svg>
            {hp && hi && (
              <ChartTip x={X(hp[0])} y={Y(hp[1])} cw={W} title={`${DAYS[hp[2]]} ${groups[hi.g].name}`}
                rows={[
                  { name: "Temperature", value: `${fmt(hp[0], xDigits)} ${xUnit}`, color: yearColor(groups[hi.g].name, years) },
                  { name: "Gas demand", value: `${fmt(hp[1], yDigits)} ${yUnit}`, color: yearColor(groups[hi.g].name, years) },
                ]} />
            )}
          </>
        )}
      </div>
      <div className="legend">
        {groups.map((g) => <span key={g.name}><i style={{ background: yearColor(g.name, years) }} />{g.name}</span>)}
      </div>
    </>
  );
}

/** Grouped bars by month, one bar per series, rounded tops; hover shows the month's values. */
export function MonthBars({ series, unit, digits }: {
  series: { name: string; color: string; values: (number | null)[] }[]; unit: string; digits: number;
}) {
  const [ref, { w: W, h: H }] = useSize<HTMLDivElement>();
  const [hi, setHi] = useState<number | null>(null);
  const { t, top, dig } = yAxis(Math.max(...series.flatMap((s) => s.values.filter((v): v is number => v != null))));
  const slot = (W - PAD_L - PAD_R) / 12, gap = 2, bw = Math.max(2, Math.min(12, (slot * 0.72 - gap * (series.length - 1)) / series.length));
  const x0 = (m: number) => PAD_L + m * slot + (slot - (bw * series.length + gap * (series.length - 1))) / 2;
  const Y = (v: number) => H - BOT - (v / top) * (H - BOT - TOP);
  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setHi(Math.max(0, Math.min(11, Math.floor((e.clientX - r.left - PAD_L) / slot))));
  };
  const peak = (m: number) => Math.max(...series.map((s) => s.values[m] ?? 0));

  return (
    <>
      <div ref={ref} className="chart-fill">
        {W > 0 && H > 0 && (
          <>
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" onMouseMove={onMove} onMouseLeave={() => setHi(null)}
              style={{ display: "block", cursor: "crosshair" }}>
              <line x1={PAD_L} x2={PAD_L} y1={Y(top)} y2={Y(0)} stroke="var(--hairline)" />
              {t.map((v) => (
                <text key={v} x={PAD_L - 6} y={Y(v) + 3} textAnchor="end" fontSize="10.5" fill="var(--ste-dusk)">{fmt(v, dig)}</text>
              ))}
              {hi != null && <rect x={PAD_L + hi * slot} y={TOP} width={slot} height={Y(0) - TOP} rx={8} fill="var(--band)" />}
              {MON.map((label, m) => (
                <g key={label}>
                  {series.map((s, k) => {
                    const v = s.values[m];
                    return v == null ? null : (
                      <rect key={s.name} x={x0(m) + k * (bw + gap)} y={Y(Math.max(v, 0))} width={bw}
                        height={Math.max(1, Y(0) - Y(Math.max(v, 0)))} rx={Math.min(3, bw / 2)} fill={s.color} />
                    );
                  })}
                  <text x={PAD_L + (m + 0.5) * slot} y={H - 6} textAnchor="middle" fontSize="10.5" fill="var(--ste-dusk)">{label}</text>
                </g>
              ))}
              <line x1={PAD_L} x2={W - PAD_R} y1={Y(0)} y2={Y(0)} stroke="var(--hairline)" />
            </svg>
            {hi != null && (
              <ChartTip x={PAD_L + (hi + 0.5) * slot} y={Y(peak(hi))} cw={W} title={MON[hi]}
                rows={series.map((s) => ({ name: s.name, value: `${fmt(s.values[hi], digits)} ${unit}`, color: s.color }))} />
            )}
          </>
        )}
      </div>
      <div className="legend">
        {series.map((s) => <span key={s.name}><i style={{ background: s.color }} />{s.name}</span>)}
      </div>
    </>
  );
}
