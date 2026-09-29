import Box from "../../components/Box";
import LineChart from "../../components/charts/LineChart";
import { ramp } from "../../components/charts/geom";
import { trimmedMean, useSupplierData, type Indicator } from "./data";

const TYPES = [{ key: "Sum", label: "Summer" }, { key: "Win", label: "Winter" }];

/** One indicator by year for every supplier on the brand ramp, summer and winter side by side, with the
 *  average of all suppliers bar the highest and lowest in each season. */
export default function IndicatorChart({ indicator, title }: { indicator: Indicator; title: string }) {
  const data = useSupplierData();
  const share = indicator.endsWith("_share");
  const scale = share ? 100 : 1;
  const value = (s: string, season: string) => {
    const v = data?.indicators[s]?.[season];
    return v ? v[indicator] * scale : null;
  };
  // one y range across both panels so summer and winter compare directly
  const all = data ? data.suppliers.flatMap((s) => Object.keys(data.indicators[s]).map((k) => value(s, k)!)) : [];

  return (
    <Box icon="activity" title={title} sub={share ? "%" : "Ratio to daily mean"} className="es-box">
      {data ? (
        <>
          <div className="es-pair">
            {TYPES.map((t) => {
              const seasons = [...new Set(data.suppliers.flatMap((s) => Object.keys(data.indicators[s])))]
                .filter((k) => k.startsWith(t.key)).sort((a, b) => +a.slice(4) - +b.slice(4));
              return (
                <div className="es-panel" key={t.key}>
                  <div className="es-cap"><span>{t.label}</span></div>
                  <LineChart labels={seasons} digits={share ? 1 : 2} unit={share ? "%" : ""}
                    ticks={seasons.map((k, i) => ({ i, label: String(2000 + +k.slice(4)) }))}
                    yMin={Math.min(...all)} yMax={Math.max(...all)}
                    series={[
                      ...data.suppliers.map((s, k) => ({ name: s, color: ramp(k, data.suppliers.length), width: 1.6, values: seasons.map((k) => value(s, k)) })),
                      { name: "Average", color: "var(--ste-night)", dash: "5 4", width: 2.2,
                        values: seasons.map((k) => trimmedMean(data.suppliers.map((s) => value(s, k)).filter((v): v is number => v != null))) },
                    ]} />
                </div>
              );
            })}
          </div>
          <div className="legend">
            <span><i className="es-ramp" />Suppliers</span>
            <span><i className="es-dash" />Average</span>
          </div>
        </>
      ) : <div className="loading">Loading…</div>}
    </Box>
  );
}
