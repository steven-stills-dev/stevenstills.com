export const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function fmt(n: number | null | undefined, d = 0): string {
  if (n == null || isNaN(n)) return "–";
  return n.toLocaleString("en-GB", { minimumFractionDigits: d, maximumFractionDigits: d });
}

/** ISO date "2026-08-21" -> "21 Aug" */
export function dlabel(iso: string): string {
  return `${parseInt(iso.slice(8, 10), 10)} ${MON[parseInt(iso.slice(5, 7), 10) - 1]}`;
}

/** Read a design token off :root, for canvases (maplibre) that cannot use CSS variables. */
export function token(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function rgb(h: string): [number, number, number] {
  const s = h.replace("#", "");
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}
function hex(r: [number, number, number]): string {
  return "#" + r.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();
}

/** n colours interpolated a -> b */
export function ramp(a: string, b: string, n: number): string[] {
  if (n <= 1) return [a];
  const [ar, ag, ab] = rgb(a);
  const [br, bg, bb] = rgb(b);
  return Array.from({ length: n }, (_, k) => {
    const t = k / (n - 1);
    return hex([ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t]);
  });
}

/** Mix two hex colours: t=0 gives a, t=1 gives b. */
export function mix(a: string, b: string, t: number): string {
  return ramp(a, b, 101)[Math.round(Math.max(0, Math.min(1, t)) * 100)];
}
