import { useState } from "react";
import "./ml.css";

const STEPS = 6;
// Loss reduction available at each potential leaf, keyed by path from the root (L/R).
// Chosen so leaf-wise growth chases one deep branch while level-wise fills each depth.
const GAIN: Record<string, number> = {
  "": 100, L: 40, R: 7, LL: 8, LR: 30, LRL: 6, LRR: 22, LRRL: 18, LRRR: 5, LRRLL: 9, LRRLR: 3,
};
const gain = (p: string) => GAIN[p] ?? 1;

/** Return the order in which leaves are split, one per step. */
function growth(mode: "level" | "leaf"): string[] {
  let leaves = [""];
  const order: string[] = [];
  for (let s = 0; s < STEPS; s++) {
    const pick = mode === "level"
      ? leaves.reduce((a, b) => (b.length < a.length ? b : a))          // shallowest first, left to right
      : leaves.reduce((a, b) => (gain(b) > gain(a) ? b : a));           // biggest loss reduction
    order.push(pick);
    leaves = leaves.flatMap((l) => (l === pick ? [l + "L", l + "R"] : [l]));
  }
  return order;
}

const VW = 300, VH = 290, TOP = 20, DY = 42, NODE = 12;

/** Lay out a tree: leaves take consecutive x slots in order, parents sit over their children. */
function layout(splits: Set<string>) {
  const pos = new Map<string, { x: number; d: number }>();
  let slot = 0;
  const walk = (p: string): number => {
    const x = splits.has(p) ? (walk(p + "L") + walk(p + "R")) / 2 : slot++;
    pos.set(p, { x, d: p.length });
    return x;
  };
  walk("");
  const scale = (VW - 40) / Math.max(1, slot - 1);
  return new Map([...pos].map(([p, v]) => [p, { x: 20 + v.x * scale, y: TOP + v.d * DY }]));
}

function Tree({ order, step }: { order: string[]; step: number }) {
  const splits = new Set(order.slice(0, step));
  const newest = order[step - 1];
  const pos = layout(splits);
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`}>
      {[...pos].filter(([p]) => p !== "").map(([p, c]) => {
        const a = pos.get(p.slice(0, -1))!, ym = (a.y + c.y) / 2;
        return <path key={"e" + p} d={`M${a.x},${a.y + NODE / 2}C${a.x},${ym} ${c.x},${ym} ${c.x},${c.y - NODE / 2}`}
          fill="none" stroke="var(--ste-night)" strokeWidth="1.4" />;
      })}
      {[...pos].map(([p, c]) => splits.has(p)
        ? <rect key={p} x={c.x - NODE} y={c.y - NODE / 2 - 2} width={NODE * 2} height={NODE + 4} rx={7}
            fill={p === newest ? "var(--ste-primary)" : "var(--ste-midday)"} stroke="var(--ste-night)" strokeWidth="1.4" />
        : <circle key={p} cx={c.x} cy={c.y} r={NODE / 2} fill="var(--ste-secondary)" />)}
    </svg>
  );
}

/** Side-by-side comparison of level-wise and leaf-wise tree growth, one split per step. */
export default function TreeGrowth() {
  const [step, setStep] = useState(1);
  const level = growth("level"), leaf = growth("leaf");
  return (
    <div className="ml-diagram">
      <div className="ml-controls">
        <input type="range" min={1} max={STEPS} value={step} aria-label="Splits"
          onChange={(e) => setStep(parseInt(e.target.value, 10))} />
        <span className="ml-stat">Splits: {step}</span>
        <button className="chip on" onClick={() => setStep(step >= STEPS ? 1 : step + 1)}>{step >= STEPS ? "Reset" : "Step"}</button>
      </div>
      <div className="ml-trees">
        <div><Tree order={level} step={step} /><div className="ml-tree-label">Level-wise</div></div>
        <div><Tree order={leaf} step={step} /><div className="ml-tree-label">Leaf-wise</div></div>
      </div>
    </div>
  );
}
