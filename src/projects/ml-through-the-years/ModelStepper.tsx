import { useState } from "react";
import "./ml.css";

const MODELS = ["SARIMA", "LSTM", "Gradient boosting"] as const;
type Model = (typeof MODELS)[number];

const VW = 640, VH = 260;
const LABEL = { fontSize: 12, fill: "var(--ste-dusk)", textAnchor: "middle" as const };
const STROKE = { stroke: "var(--ste-night)", strokeWidth: 1.5 };

/** Horizontal S-curve between two points. */
const curve = (x1: number, y1: number, x2: number, y2: number) => {
  const xm = (x1 + x2) / 2;
  return `M${x1},${y1}C${xm},${y1} ${xm},${y2} ${x2},${y2}`;
};

/** A half-hourly demand shape (two peaks) as a polyline inside a box. */
function Profile({ x, y, w, h, shift = 0 }: { x: number; y: number; w: number; h: number; shift?: number }) {
  const pts = Array.from({ length: 24 }, (_, i) => {
    const t = i / 23;
    const v = 0.35 + 0.3 * Math.exp(-(((t - 0.33) / 0.1) ** 2)) + 0.45 * Math.exp(-(((t - 0.75) / 0.1) ** 2)) + shift;
    return `${(x + 8 + t * (w - 16)).toFixed(1)},${(y + h - 6 - v * (h - 12) * 0.9).toFixed(1)}`;
  }).join(" ");
  return <polyline points={pts} fill="none" stroke="var(--ste-secondary)" strokeWidth="2" strokeLinejoin="round" />;
}

function Card({ x, y, w, h, label, fill = "var(--ste-midday)", shift }: {
  x: number; y: number; w: number; h: number; label?: string; fill?: string; shift?: number;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={10} fill={fill} {...STROKE} />
      {shift != null && <Profile x={x} y={y} w={w} h={h} shift={shift} />}
      {label && <text x={x + w / 2} y={y + h + 16} {...LABEL}>{label}</text>}
    </g>
  );
}

function Sarima() {
  const lags = [{ y: 30, l: "Last week", s: -0.05 }, { y: 105, l: "Two days ago", s: 0 }, { y: 180, l: "Temperature", s: 0.04 }];
  return (
    <>
      {lags.map((g) => <path key={g.l} d={curve(170, g.y + 25, 318, 130)} fill="none" {...STROKE} />)}
      <path d={curve(362, 130, 450, 130)} fill="none" {...STROKE} />
      {lags.map((g) => <Card key={g.l} x={40} y={g.y} w={130} h={50} label={g.l} shift={g.s} />)}
      <circle cx={340} cy={130} r={22} fill="var(--ste-primary)" {...STROKE} />
      <text x={340} y={136} fontSize={18} textAnchor="middle" fill="var(--ste-night)">Σ</text>
      <Card x={450} y={95} w={150} h={70} label="Tomorrow" shift={0.02} />
    </>
  );
}

function Lstm() {
  const xs = [40, 170, 300, 430];
  const w = 100, top = 60, h = 110;
  return (
    <>
      <path d={`M20,${top + 25}H${xs[3] + w + 20}`} fill="none" {...STROKE} strokeWidth={2.5} />
      <path d={`M20,${top + 85}H${xs[3] + w}`} fill="none" {...STROKE} />
      <path d={curve(xs[3] + w, top + 85, 590, 115)} fill="none" {...STROKE} />
      {xs.map((x, k) => (
        <g key={x}>
          <path d={`M${x + w / 2},${top + h + 30}V${top + h}`} fill="none" {...STROKE} />
          <circle cx={x + w / 2} cy={top + h + 34} r={5} fill="var(--ste-secondary)" />
          <rect x={x} y={top} width={w} height={h} rx={14} fill="var(--ste-midday)" {...STROKE} />
          {[0.25, 0.5, 0.75].map((f) => (
            <circle key={f} cx={x + f * w} cy={top + 25} r={8}
              fill={k === xs.length - 1 ? "var(--ste-primary)" : "var(--ste-midday)"} {...STROKE} />
          ))}
        </g>
      ))}
      <text x={20} y={top + 14} {...LABEL} textAnchor="start">Memory</text>
      <text x={(xs[0] + xs[3] + w) / 2} y={top + h + 58} {...LABEL}>Input</text>
      <circle cx={600} cy={115} r={9} fill="var(--ste-primary)" {...STROKE} />
      <text x={600} y={140} {...LABEL}>Forecast</text>
    </>
  );
}

function Boosting() {
  const trees = [{ x: 150, hit: 0 }, { x: 290, hit: 2 }, { x: 430, hit: 1 }];
  const leafX = (cx: number) => [cx - 40, cx, cx + 40];
  return (
    <>
      {trees.map((t) => <path key={"in" + t.x} d={curve(100, 130, t.x - 40, 50)} fill="none" {...STROKE} />)}
      <Card x={20} y={105} w={80} h={50} label="Features" />
      {trees.map((t, k) => {
        const lx = leafX(t.x);
        return (
          <g key={t.x}>
            <path d={`M${t.x - 40},50H${t.x}V60`} fill="none" {...STROKE} />
            {[[t.x, 76, lx[0], 150], [t.x, 76, t.x + 20, 110], [t.x + 20, 124, lx[1], 150], [t.x + 20, 124, lx[2], 150]].map(([x1, y1, x2, y2], j) => (
              <path key={j} d={`M${x1},${y1}C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}`} fill="none" {...STROKE} />
            ))}
            <rect x={t.x - 14} y={60} width={28} height={16} rx={7} fill="var(--ste-midday)" {...STROKE} />
            <rect x={t.x + 6} y={110} width={28} height={14} rx={7} fill="var(--ste-midday)" {...STROKE} />
            {lx.map((x, j) => (
              <circle key={j} cx={x} cy={156} r={6} fill={j === t.hit ? "var(--ste-primary)" : "var(--ste-secondary)"}
                stroke={j === t.hit ? "var(--ste-night)" : "none"} strokeWidth={1.5} />
            ))}
            <path d={`M${lx[t.hit]},162V205Q${lx[t.hit]},215 ${lx[t.hit] + 10},215H540`} fill="none" {...STROKE} />
            <text x={t.x} y={32} {...LABEL}>{`Tree ${k + 1}`}</text>
          </g>
        );
      })}
      <circle cx={560} cy={215} r={20} fill="var(--ste-primary)" {...STROKE} />
      <text x={560} y={221} fontSize={18} textAnchor="middle" fill="var(--ste-night)">+</text>
      <text x={560} y={252} {...LABEL}>Forecast</text>
    </>
  );
}

/** Chip switcher across three schematics of how each model builds a half-hourly forecast. */
export default function ModelStepper() {
  const [model, setModel] = useState<Model>("SARIMA");
  return (
    <div className="ml-diagram">
      <div className="ml-controls">
        {MODELS.map((m) => (
          <button key={m} className={"chip" + (m === model ? " on" : "")} onClick={() => setModel(m)}>{m}</button>
        ))}
      </div>
      <svg viewBox={`0 0 ${VW} ${VH}`} role="img" aria-label={model}>
        {model === "SARIMA" ? <Sarima /> : model === "LSTM" ? <Lstm /> : <Boosting />}
      </svg>
    </div>
  );
}
