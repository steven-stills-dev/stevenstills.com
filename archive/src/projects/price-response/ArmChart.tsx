import { useSize } from "../../lib/useSize";
import { fmt } from "../../lib/format";
import { PAD_R } from "../../components/charts/geom";

export type Arm = { name: string; est: number; lo: number; hi: number };

/** Point estimate with a horizontal interval for each row, on a shared fixed axis. */
export default function ArmChart({ arms, domain, step, unit, label }: {
  arms: Arm[]; domain: [number, number]; step: number; unit: string; label: string;
}) {
  const [ref, size] = useSize<HTMLDivElement>();
  const W = size.w, H = size.h, padL = Math.min(118, W * 0.3);
  const X = (v: number) => padL + ((v - domain[0]) / (domain[1] - domain[0])) * (W - padL - PAD_R);
  const rowH = (H - 30) / arms.length;
  const ticks: number[] = [];
  for (let v = domain[0]; v <= domain[1] + 1e-9; v += step) ticks.push(+v.toFixed(6));
  return (
    <div ref={ref} className="chart-fill">
      {W > 0 && H > 0 && (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" role="img" aria-label={label} style={{ display: "block" }}>
          {ticks.map((t) => <text key={t} x={X(t)} y={H - 6} textAnchor="middle" fontSize="10.5" fill="var(--ste-dusk)">{fmt(t, 0)}{unit}</text>)}
          {arms.map((a, i) => {
            const y = rowH * (i + 0.5);
            return (
              <g key={a.name}>
                <text x={0} y={y + 4} fontSize="12" fill="var(--ste-night)">{a.name}</text>
                <line x1={X(a.lo)} x2={X(a.hi)} y1={y} y2={y} stroke="var(--ste-secondary)" strokeWidth="3" strokeLinecap="round" />
                <circle cx={X(a.est)} cy={y} r={5} fill="var(--ste-secondary)">
                  <title>{`${a.name}: ${fmt(a.est, 1)}${unit} (${fmt(a.lo, 1)} to ${fmt(a.hi, 1)})`}</title>
                </circle>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
