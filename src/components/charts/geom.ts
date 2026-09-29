// Shared plot geometry. Charts reserve the same left gutter for the y-axis and
// the same right inset, so stacked charts align on x.
export const PAD_L = 46;
export const PAD_R = 14;

/** Round a value up to a clean axis maximum (1/2/2.5/5/10 × 10^n). */
export function niceMax(v: number): number {
  if (!isFinite(v) || v <= 0) return 1;
  const base = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / base;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nf * base;
}

/** A clean tick step (1/2/5 × 10^n) that splits `range` into ~`target` intervals. */
export function niceStep(range: number, target = 4): number {
  if (!isFinite(range) || range <= 0) return 1;
  const rough = range / target;
  const base = Math.pow(10, Math.floor(Math.log10(rough)));
  const f = rough / base;
  const nf = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10;
  return nf * base;
}

/** Round tick values from 0 up to at least `max`, on a clean 1/2/5 step. */
export function axisTicks(max: number, target = 4): number[] {
  if (!isFinite(max) || max <= 0) return [0, 1];
  const step = niceStep(max, target);
  const n = Math.ceil(max / step);
  return Array.from({ length: n + 1 }, (_, i) => i * step);
}

/** Decimal places needed to render a tick step cleanly. */
export function tickDecimals(step: number): number {
  if (step >= 1) return 0;
  if (step >= 0.1) return 1;
  return 2;
}

/** Clean ticks spanning lo..hi; from zero when lo is 0. */
export function ticksFrom(lo: number, hi: number): number[] {
  if (lo <= 0) return axisTicks(hi, 4);
  const step = niceStep(hi - lo, 4);
  const first = Math.floor(lo / step) * step;
  const n = Math.max(1, Math.ceil((hi - first) / step));
  return Array.from({ length: n + 1 }, (_, i) => first + i * step);
}

/** Brand ramp for ordered or categorical lines: lime at k = 0 through to mint at k = n - 1.
 *  Night is kept for the highlighted line (latest, average) drawn alongside. */
export function ramp(k: number, n: number): string {
  const p = n > 1 ? Math.round((k / (n - 1)) * 100) : 100;
  return `color-mix(in srgb, var(--ste-secondary) ${p}%, var(--ste-primary))`;
}
