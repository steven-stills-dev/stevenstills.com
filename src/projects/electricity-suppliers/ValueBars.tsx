import { useState } from "react";
import Box from "../../components/Box";
import { ChartTip } from "../../components/charts/ChartTip";
import { niceStep, tickDecimals } from "../../components/charts/geom";
import { fmt } from "../../lib/format";
import { useSize } from "../../lib/useSize";
import { useSupplierData } from "./data";

const ROW = 30, LABEL = 118, TOP = 8, AXIS = 22;
const SEASONS = [
  { season: "Sum-25", label: "Sum-25", color: "var(--ste-secondary)" },
  { season: "Win-25", label: "Win-25", color: "var(--ste-night)" },
];
const YEAR = ["Sum-25", "Win-25"];

type Bar = { label: string; color: string };
type Row = { name: string; values: number[] };

/** Horizontal bars, two per row, diverging from zero, with a hover tooltip. */
function PairBars({ title, unit, bars, rows }: { title: string; unit: string; bars: Bar[]; rows: Row[] | null }) {
  const [ref, { w: W }] = useSize<HTMLDivElement>();
  const [hi, setHi] = useState<number | null>(null);
  const list = rows ?? [];
  const vals = list.flatMap((r) => r.values);
  const step = niceStep(Math.max(Math.max(0, ...vals) - Math.min(0, ...vals), 0.1), 4);
  // a sliver below zero (Octopus imbalance) should not add a whole negative tick
  const lo = Math.floor(Math.min(0, ...vals) / step + 0.05) * step, top = Math.ceil(Math.max(0, ...vals) / step) * step;
  const ticks = Array.from({ length: Math.round((top - lo) / step) + 1 }, (_, i) => lo + i * step);
  const H = TOP + list.length * ROW + AXIS;
  const X = (v: number) => LABEL + ((v - lo) / (top - lo || 1)) * (W - LABEL - 14);
  const dig = tickDecimals(step);

  return (
    <Box icon="bars" title={title} sub={unit} className="es-box">
      <div ref={ref} className="es-bars" style={{ height: rows ? H : undefined }} onMouseLeave={() => setHi(null)}>
        {rows ? (
          <>
            {W > 0 && (
              <svg width={W} height={H} style={{ display: "block" }}>
                {ticks.map((t) => (
                  <text key={t} x={X(t)} y={H - 6} textAnchor="middle" fontSize="10.5" fill="var(--ste-dusk)">{fmt(t, dig)}</text>
                ))}
                <line x1={X(0)} x2={X(0)} y1={TOP} y2={H - AXIS} stroke="var(--hairline)" />
                {list.map((r, i) => (
                  <g key={r.name} onMouseEnter={() => setHi(i)}>
                    <rect x={0} y={TOP + i * ROW} width={W} height={ROW} fill="transparent" />
                    <text x={LABEL - 10} y={TOP + i * ROW + ROW / 2 + 4} textAnchor="end" fontSize="12" fill="var(--ste-night)">{r.name}</text>
                    {bars.map((b, k) => (
                      <rect key={b.label} x={Math.min(X(0), X(r.values[k]))} y={TOP + i * ROW + 5 + k * 10} width={Math.abs(X(r.values[k]) - X(0))}
                        height={9} rx={4.5} fill={b.color} opacity={hi == null || hi === i ? 1 : 0.35} />
                    ))}
                  </g>
                ))}
              </svg>
            )}
            {hi != null && W > 0 && (
              <ChartTip x={X(0)} y={TOP + hi * ROW} cw={W} title={list[hi].name}
                rows={bars.map((b, k) => ({ name: b.label, value: `£${fmt(list[hi].values[k], 2)}/MWh`, color: b.color }))} />
            )}
          </>
        ) : <div className="loading">Loading…</div>}
      </div>
      {rows && (
        <div className="legend">
          {bars.map((b) => <span key={b.label}><i style={{ background: b.color }} />{b.label}</span>)}
        </div>
      )}
    </Box>
  );
}

/** Each supplier's shape priced against the average supplier shape, one bar per season. */
export default function ValueBars() {
  const data = useSupplierData();
  const rows = data ? data.suppliers.map((s) => ({ name: s, values: SEASONS.map((b) => data.vsAverage[s][b.season]?.gbp_per_mwh ?? 0) }))
    .sort((a, b) => a.values[1] - b.values[1]) : null;
  return <PairBars title="Shape Cost Against the Average" unit="£/MWh" bars={SEASONS} rows={rows} />;
}

/** Each supplier's shape cost against baseload over the last full year beside its imbalance cost, per MWh. */
export function ShapeImbalanceBars() {
  const data = useSupplierData();
  const shape = (s: string) => {
    const p = YEAR.map((y) => data!.premium[s][y]).filter((v) => v && v.gbp_per_mwh);
    const mwh = p.reduce((a, v) => a + v.gbp_m / v.gbp_per_mwh, 0);
    return mwh ? p.reduce((a, v) => a + v.gbp_m, 0) / mwh : 0;
  };
  const rows = data ? data.suppliers.map((s) => ({ name: s, values: [shape(s), data.imbalance[s].gbp_per_mwh] }))
    .sort((a, b) => b.values[0] - a.values[0]) : null;
  return <PairBars title="Shape and Imbalance Cost by Supplier" unit="£/MWh"
    bars={[{ label: "Shape", color: "var(--ste-secondary)" }, { label: "Imbalance", color: "var(--ste-night)" }]} rows={rows} />;
}
