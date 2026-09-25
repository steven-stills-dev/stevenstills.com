// Synthetic daily temperature vs demand: a heating V with a shallow cooling arm.
function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

const r = rng(7);
const temp: number[] = [];
const demand: number[] = [];
for (let i = 0; i < 150; i++) {
  const t = -3 + r() * 27;
  const noise = (r() + r() + r() - 1.5) * 1.4;
  temp.push(+t.toFixed(2));
  demand.push(+(24 + 0.65 * Math.max(0, 15.5 - t) + 0.35 * Math.max(0, t - 19) + noise).toFixed(2));
}

export const DEMO = { temp, demand };
