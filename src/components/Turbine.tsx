// hub position in the 120 x 120 viewBox; the rotor is translated here so the blades spin about their own origin
const HUB_X = 60, HUB_Y = 42;
// one blade pointing up from the hub: straight leading edge, fuller trailing edge near the root, rounded tip
const BLADE = "M-1.6 -3 C-4.6 -11 -3.6 -26 -0.7 -38 Q0 -39.4 0.7 -38 C1.7 -26 2 -12 1.8 -3 Z";
const TOWER = `M${HUB_X - 1.2} ${HUB_Y} L${HUB_X - 2.8} 98 L${HUB_X + 2.8} 98 L${HUB_X + 1.2} ${HUB_Y} Z`;
// waterlines start one 16-unit wavelength left of the view, so a 16-unit drift loops without a seam
const wave = (y: number) => `M-16 ${y}` + " q4 -2.6 8 0 t8 0".repeat(9);
const GUSTS = ["M6 30 q12 -4 24 0 t22 -1", "M2 50 q14 4 26 0 t20 1", "M10 68 q10 -3 20 0 t18 0"];

/** Draw a wind turbine that spins up and keeps turning, on two drifting waterlines with gusts blowing in. */
export default function Turbine() {
  return (
    <svg className="turbine" viewBox="0 0 120 120" fill="none" strokeLinecap="round" aria-hidden="true">
      <defs>
        <linearGradient id="turbine-fade-g" x1="0" x2="1">
          <stop offset="0" stopColor="white" stopOpacity="0" />
          <stop offset="0.25" stopColor="white" />
          <stop offset="0.75" stopColor="white" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <mask id="turbine-fade" maskUnits="userSpaceOnUse" x="0" y="0" width="120" height="120">
          <rect width="120" height="120" fill="url(#turbine-fade-g)" />
        </mask>
      </defs>
      <g className="turbine-blade-s" strokeWidth={1.6} opacity={0.6}>
        {GUSTS.map((d) => <path key={d} d={d} pathLength={100} className="turbine-gust" />)}
      </g>
      <path d={TOWER} className="turbine-pole" />
      <g transform={`translate(${HUB_X} ${HUB_Y})`}>
        <g className="turbine-rotor turbine-blade">
          <path d={BLADE} />
          <path d={BLADE} transform="rotate(120)" />
          <path d={BLADE} transform="rotate(240)" />
        </g>
        <circle r={4.2} className="turbine-pole" />
      </g>
      <g className="turbine-pole-s" strokeWidth={2.6} mask="url(#turbine-fade)">
        <path d={wave(100)} className="turbine-wave" />
        <path d={wave(107)} className="turbine-wave turbine-wave-back" opacity={0.5} />
      </g>
    </svg>
  );
}
