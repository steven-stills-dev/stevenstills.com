import Box from "../../components/Box";
import LineChart from "../../components/charts/LineChart";
import { useSupplierData } from "./data";
import { Panel, TIMES, TYPES, seasonLines, ticks } from "./ShapeExplorer";

/** Mean wholesale price by half hour, every season overlaid, summer and winter side by side. */
export default function PriceShape() {
  const data = useSupplierData();
  const all = data ? Object.values(data.prices).flat() : [];

  return (
    <Box icon="activity" title="Wholesale Price by Half Hour" sub="£/MWh" className="es-box">
      {data ? (
        <div className="es-pair">
          {TYPES.map((t) => {
            const list = Object.keys(data.prices).filter((s) => s.startsWith(t.key));
            const latest = list[list.length - 1];
            return (
              <Panel key={t.key}>
                <div className="es-cap">
                  <span>{t.label}</span>
                  <span className="legend">
                    <span><i className="es-ramp" />{list[0]} … {list[list.length - 2]}</span>
                    <span><i style={{ background: "var(--ste-night)" }} />{latest}</span>
                  </span>
                </div>
                {(w) => <LineChart series={seasonLines(list, (s) => data.prices[s])} labels={TIMES} ticks={ticks(w < 380 ? 12 : 6)}
                  digits={0} unit="£/MWh" yMin={Math.min(...all)} yMax={Math.max(...all)} />}
              </Panel>
            );
          })}
        </div>
      ) : <div className="loading">Loading…</div>}
    </Box>
  );
}
