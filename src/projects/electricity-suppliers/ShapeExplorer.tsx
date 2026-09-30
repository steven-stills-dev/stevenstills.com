import type { ReactNode } from "react";
import Box from "../../components/Box";
import LineChart, { type Series } from "../../components/charts/LineChart";
import { useSize } from "../../lib/useSize";
import { ramp } from "../../components/charts/geom";
import { trimmedMean, useSupplierData } from "./data";

export const DEFAULT_SUPPLIER = "British Gas";
export const TIMES = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);
// every 3 hours, or every 6 when the panel is too narrow for eight labels
export const ticks = (every: number) => TIMES.flatMap((label, i) => (i % every ? [] : [{ i, label }]));
// fixed axis: every profile sits inside 0.4 to 1.8 (Fuse before Win-24 excluded)
const Y_TICKS = [0.4, 0.6, 0.8, 1, 1.2, 1.4, 1.6, 1.8];
export const TYPES = [{ key: "Sum", label: "Summer" }, { key: "Win", label: "Winter" }];

/** One line per season, earlier seasons on the brand ramp from lime (oldest) to mint, the latest in Night. */
export function seasonLines(seasons: string[], value: (s: string) => number[]): Series[] {
  return seasons.map((s, k) => {
    const last = k === seasons.length - 1;
    return {
      name: s, values: value(s),
      color: last ? "var(--ste-night)" : ramp(k, seasons.length - 1),
      width: last ? 2.4 : 1.8,
    };
  });
}

/** One season-type column; hands its width to the chart so ticks can thin out. */
export function Panel({ children: [cap, chart] }: { children: [ReactNode, (w: number) => ReactNode] }) {
  const [ref, size] = useSize<HTMLDivElement>();
  return <div className="es-panel" ref={ref}>{cap}{chart(size.w)}</div>;
}

/** Summer and winter daily demand shapes for one supplier, every season overlaid; also the home preview.
 *  With `onSupplier` it shows the supplier picker; `only` limits it to one season type. */
export default function ShapeExplorer({ supplier = DEFAULT_SUPPLIER, onSupplier, only }: {
  supplier?: string; onSupplier?: (s: string) => void; only?: "Sum" | "Win";
}) {
  const data = useSupplierData();
  const seasons = data?.profiles[supplier] ?? {};

  return (
    <Box icon="activity" title="Demand Shape by Supplier" sub="Ratio to daily mean" className={onSupplier ? "es-box" : "es-box es-fill"}>
      {onSupplier && data && (
        <select className="es-select" value={supplier} aria-label="Supplier" onChange={(e) => onSupplier(e.target.value)}>
          {data.suppliers.map((s) => <option key={s}>{s}</option>)}
        </select>
      )}
      {data ? (
        <div className={only ? "es-pair es-single" : "es-pair"}>
          {TYPES.filter((t) => !only || t.key === only).map((t) => {
            const list = Object.keys(seasons).filter((s) => s.startsWith(t.key));
            const latest = list[list.length - 1];
            // every supplier's profile for the same season, trimmed at each half hour
            const peers = data.suppliers.map((s) => data.profiles[s][latest]).filter(Boolean);
            const series: Series[] = [...seasonLines(list, (s) => seasons[s]), ...(latest ? [{
              name: "Average", color: "var(--ste-night)", dash: "5 4", width: 1.6,
              values: TIMES.map((_, i) => trimmedMean(peers.map((p) => p[i]))),
            }] : [])];
            return (
              <Panel key={t.key}>
                <div className="es-cap">
                  <span>{t.label}</span>
                  <span className="legend">
                    {list.length > 1 && <span><i className="es-ramp" />{list[0]}{list.length > 2 ? ` … ${list[list.length - 2]}` : ""}</span>}
                    {latest && <span><i style={{ background: "var(--ste-night)" }} />{latest}</span>}
                    {latest && <span><i className="es-dash" />Average</span>}
                  </span>
                </div>
                {(w) => <LineChart series={series} labels={TIMES} ticks={ticks(w < 380 ? 12 : 6)} digits={2} yTicks={Y_TICKS} />}
              </Panel>
            );
          })}
        </div>
      ) : <div className="loading">Loading…</div>}
    </Box>
  );
}
