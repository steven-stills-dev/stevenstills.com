import { useState } from "react";
import Box from "../../components/Box";
import LineChart from "../../components/charts/LineChart";
import GroupedBars from "../../components/charts/GroupedBars";
import Histogram from "../../components/charts/Histogram";
import Slider from "../../components/charts/Slider";
import Timeline, { ceil7 } from "./Timeline";
import data from "./data.json";

const NIGHT = "var(--ste-night)", SECONDARY = "var(--ste-secondary)";
const HZ = Array.from({ length: 14 }, (_, i) => `${i + 1} d`);
const HZ_TICKS = [0, 3, 6, 9, 13].map((i) => ({ i, label: String(i + 1) }));

function Legend({ items }: { items: { name: string; color: string; dash?: boolean }[] }) {
  return (
    <div className="legend">
      {items.map((s) => <span key={s.name}><i style={s.dash ? { background: "none", border: `2px dashed ${s.color}` } : { background: s.color }} />{s.name}</span>)}
    </div>
  );
}

function Chips<K extends string>({ opts, on, set, label }: { opts: [K, string][]; on: K; set: (k: K) => void; label: string }) {
  return (
    <div className="la-chips" role="group" aria-label={label}>
      {opts.map(([k, name]) => (
        <button key={k} aria-pressed={on === k} className={"chip" + (on === k ? " on" : "")} onClick={() => set(k)}>{name}</button>
      ))}
    </div>
  );
}

/** What is known when: sliders for publication lag and horizon. */
export function KnownWhenFigure() {
  const [P, setP] = useState(data.facts.P_main);
  const [h, setH] = useState(1);
  const s = data.sweep.find((r) => r.P === P)!;
  return (
    <>
      <Box title="What Is Known at Issue Time" sub="days from issue" h={300}>
        <Timeline P={P} h={h} />
      </Box>
      <div className="la-controls">
        <Slider label="Publication lag" min={7} max={56} step={7} value={P} onChange={setP} unit="d" />
        <Slider label="Horizon" min={1} max={14} value={h} onChange={setH} unit="d" />
        <div className="la-readout">
          <span>Shortest safe lag <b>{ceil7(h + P)} days</b></span>
          <span>One floor for all horizons <b>{ceil7(14 + P)} days</b></span>
          <span>As-of error <b>{s.asof.toFixed(2)}%</b></span>
        </div>
      </div>
    </>
  );
}

/** Backtest against live WMAPE for each lag design; also the home preview. */
export function GapChart({ h }: { h?: number }) {
  return (
    <Box title="Backtest and Live Error by Lag Design" sub="WMAPE, %" h={h}>
      <GroupedBars groups={data.designs.map((d) => d.name)} unit="%" digits={2}
        series={[{ name: "Backtest", values: data.designs.map((d) => d.backtest), color: NIGHT },
          { name: "Live", values: data.designs.map((d) => d.live), color: SECONDARY }]} />
      <Legend items={[{ name: "Backtest", color: NIGHT }, { name: "Live", color: SECONDARY }]} />
    </Box>
  );
}

type HKey = "leaky" | "fixed" | "asof" | "none";
const H_OPTS: [HKey, string][] = [["leaky", "Leaky lags"], ["asof", "As-of lags"], ["fixed", "Leak-free lags"], ["none", "No lags"]];

export function HorizonChart() {
  const [k, setK] = useState<HKey>("leaky");
  const d = data.horizon[k];
  const yMax = Math.max(...data.horizon.leaky.live, ...data.horizon.leaky.hi, ...data.horizon.none.hi);
  return (
    <>
      <Box title="Error by Horizon" sub="WMAPE, %" h={360}>
        <LineChart labels={HZ} ticks={HZ_TICKS} unit="%" digits={2} yMax={yMax}
          band={{ top: d.hi, bottom: d.lo }}
          series={[{ name: "Live", values: d.live, color: SECONDARY }, { name: "Backtest", values: d.backtest, color: NIGHT, dash: "5 4" }]} />
        <Legend items={[{ name: "Live", color: SECONDARY }, { name: "Backtest", color: NIGHT, dash: true }]} />
      </Box>
      <Chips opts={H_OPTS} on={k} set={setK} label="Lag design" />
    </>
  );
}

export function ImportanceChart() {
  const groups = Object.keys(data.importance.leaky) as (keyof typeof data.importance.leaky)[];
  return (
    <Box title="Share of Split Gain by Feature Group" sub="%" h={340}>
      <GroupedBars groups={groups} unit="%" digits={1}
        series={[{ name: "Leaky lags", values: groups.map((g) => data.importance.leaky[g]), color: NIGHT },
          { name: "As-of lags", values: groups.map((g) => data.importance.asof[g]), color: SECONDARY }]} />
      <Legend items={[{ name: "Leaky lags", color: NIGHT }, { name: "As-of lags", color: SECONDARY }]} />
    </Box>
  );
}

type DKey = keyof typeof data.dist;
const D_OPTS: [DKey, string][] = [["leakyBacktest", "Leaky, backtest"], ["leakyLive", "Leaky, live"], ["asof", "As-of, live"]];

export function DistChart() {
  const [k, setK] = useState<DKey>("leakyBacktest");
  return (
    <>
      <Box title="Distribution of Daily Error" sub="forecasts" h={340}>
        <Histogram bins={data.dist[k]} unit="%" digits={0} xTicks={[-12, -6, 0, 6, 12]}
          label="Count of daily forecasts by percentage error, forecast minus actual, all horizons" />
      </Box>
      <Chips opts={D_OPTS} on={k} set={setK} label="Design and setting" />
    </>
  );
}

export function SweepChart() {
  const labels = data.sweep.map((r) => `${r.P} d`);
  const ticks = data.sweep.map((r, i) => ({ i, label: String(r.P) }));
  return (
    <Box title="Live Error by Publication Lag" sub="WMAPE, %" h={340}>
      <LineChart labels={labels} ticks={ticks} unit="%" digits={2}
        series={[{ name: "As-of lags", values: data.sweep.map((r) => r.asof), color: SECONDARY },
          { name: "Leaky lags", values: data.sweep.map((r) => r.leaky), color: NIGHT }]} />
      <Legend items={[{ name: "As-of lags", color: SECONDARY }, { name: "Leaky lags", color: NIGHT }]} />
    </Box>
  );
}
