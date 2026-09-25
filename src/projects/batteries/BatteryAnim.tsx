import { useEffect, useId, useState } from "react";
import { useSize } from "../../lib/useSize";
import { fmt } from "../../lib/format";
import { axisTicks, PAD_L, PAD_R } from "../../components/charts/geom";

/* Illustrative hourly price shape, £/MWh: overnight low, midday solar dip,
   dear evening peak. A marker sweeps the day; the battery fills through the
   cheap hours and drains into the dear ones. */
const P = [48, 45, 43, 42, 44, 52, 70, 95, 88, 72, 55, 42, 38, 40, 46, 60, 85, 120, 140, 135, 110, 82, 62, 52];
const N = P.length;
const CELLS = 12;
const SECONDS = 22;      // one full day per ~22s
const STATIC_T = 18;     // reduced-motion frame: evening discharge
const TICKS = [{ i: 0, label: "00:00" }, { i: 6, label: "06:00" }, { i: 12, label: "12:00" }, { i: 18, label: "18:00" }];

type Action = "charge" | "discharge" | "idle";

function quantile(arr: number[], q: number): number {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * (s.length - 1)))];
}
const lerp = (a: number, b: number, f: number) => a + (b - a) * f;

// charge in the cheapest periods, discharge in the dearest, idle between;
// state of charge is the running integral of those moves.
const HI = quantile(P, 0.62), LO = quantile(P, 0.38);
const SCHEDULE: Action[] = P.map((p) => (p >= HI ? "discharge" : p <= LO ? "charge" : "idle"));
const SOC: number[] = (() => {
  const raw: number[] = [];
  let acc = 0;
  for (const p of P) { acc += p >= HI ? -1 : p <= LO ? 1 : 0; raw.push(acc); }
  const rmin = Math.min(...raw), rmax = Math.max(...raw);
  return raw.map((r) => (rmax > rmin ? 0.15 + ((r - rmin) / (rmax - rmin)) * 0.65 : 0.5));
})();

/** A battery charging and discharging across one illustrative day. Sized to
 *  its container; renders a single static frame under prefers-reduced-motion. */
export default function BatteryAnim() {
  const [ref, size] = useSize<HTMLDivElement>();
  const gradId = useId();
  const [t, setT] = useState(STATIC_T);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    let t0: number | null = null;
    const loop = (ts: number) => {
      if (t0 === null) t0 = ts;
      setT((((ts - t0) / 1000) / SECONDS * N) % N);
      raf = requestAnimationFrame(loop);
    };
    const apply = () => {
      cancelAnimationFrame(raf);
      t0 = null;
      if (mq.matches) setT(STATIC_T);
      else raf = requestAnimationFrame(loop);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => { cancelAnimationFrame(raf); mq.removeEventListener("change", apply); };
  }, []);

  const W = size.w, H = size.h;
  const padL = PAD_L, padR = PAD_R;
  const plotW = W - padL - padR;
  const plotTop = 8, plotBot = Math.round(H * 0.56);
  const yt = axisTicks(Math.max(...P), 4);
  const top = yt[yt.length - 1] || 1;
  const X = (i: number) => padL + (i / (N - 1)) * plotW;
  const Y = (v: number) => plotBot - (v / top) * (plotBot - plotTop);
  const pw = plotW / (N - 1);

  // battery body below the plot
  const batTop = plotBot + 30, batBot = H - 6;
  const bh = Math.max(36, Math.min(64, batBot - batTop));
  const bw = Math.max(120, Math.min(plotW, 400));
  const bx = padL + (plotW - bw) / 2;
  const by = batTop + (batBot - batTop - bh) / 2;
  const gap = 4, inset = 8;
  const cw = (bw - inset * 2 - gap * (CELLS - 1)) / CELLS;
  const ch = bh - inset * 2;

  // frame state
  const i = Math.floor(t) % N, f = t - Math.floor(t), j = Math.min(i + 1, N - 1);
  const price = lerp(P[i], P[j], f), soc = lerp(SOC[i], SOC[j], f);
  const mx = X(Math.min(t, N - 1));
  const cont = soc * CELLS, full = Math.floor(cont), partial = cont - full;
  const priceD = P.map((p, k) => `${X(k).toFixed(1)},${Y(p).toFixed(1)}`).join(" ");

  return (
    <div ref={ref} className="bat-anim">
      {W > 0 && H > 0 && (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: "block" }}
          role="img" aria-label="A battery charging through cheap hours and discharging into the dear evening peak">
          {SCHEDULE.map((a, k) => a === "idle" ? null : (
            <rect key={k} x={X(k) - pw / 2} y={plotTop} width={pw} height={plotBot - plotTop}
              fill={a === "charge" ? "var(--ste-secondary)" : "var(--ste-night)"} fillOpacity={a === "charge" ? 0.22 : 0.08} />
          ))}
          <line x1={padL} y1={Y(top)} x2={padL} y2={Y(0)} stroke="var(--hairline)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          {yt.map((v, k) => (
            <g key={k}>
              <line x1={padL - 3} y1={Y(v)} x2={padL} y2={Y(v)} stroke="var(--hairline)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              <text x={padL - 6} y={Y(v) + 3} textAnchor="end" fontSize="10.5" fill="var(--ste-dusk)">{fmt(v)}</text>
            </g>
          ))}
          <polyline points={priceD} fill="none" stroke="var(--ste-night)" strokeWidth="1.8" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {TICKS.map((tk) => (
            <text key={tk.i} x={X(tk.i)} y={plotBot + 16} textAnchor="middle" fontSize="10.5" fill="var(--ste-dusk)">{tk.label}</text>
          ))}

          <line x1={mx} y1={plotTop} x2={mx} y2={plotBot} stroke="var(--ste-dusk)" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
          <circle cx={mx} cy={Y(price)} r={4.5} fill="var(--ste-secondary)" stroke="var(--ste-night)" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />

          {/* charge runs mint to green along the pack, so a fuller battery reads greener */}
          <defs>
            <linearGradient id={gradId} gradientUnits="userSpaceOnUse" x1={bx + inset} y1={0} x2={bx + bw - inset} y2={0}>
              <stop offset="0" style={{ stopColor: "var(--ste-secondary)" }} />
              <stop offset="1" style={{ stopColor: "var(--ste-tertiary)" }} />
            </linearGradient>
          </defs>
          <rect x={bx} y={by} width={bw} height={bh} rx={9} fill="none" stroke="var(--ste-night)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          <rect x={bx + bw} y={by + bh * 0.3} width={7} height={bh * 0.4} rx={2} fill="var(--ste-night)" />
          {Array.from({ length: CELLS }, (_, k) => {
            const cx = bx + inset + k * (cw + gap);
            const frac = k < full ? 1 : k === full ? partial : 0;
            const fh = frac > 0 ? Math.max(0.5, ch * frac) : 0;
            return (
              <g key={k}>
                <rect x={cx} y={by + inset} width={cw} height={ch} rx={3} fill="var(--track)" />
                {fh > 0 && <rect x={cx} y={by + inset + (ch - fh)} width={cw} height={fh} rx={3} fill={`url(#${gradId})`} />}
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
