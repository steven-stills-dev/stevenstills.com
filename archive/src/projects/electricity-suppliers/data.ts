import { useEffect, useState } from "react";

export type Indicator = "peak_to_mean" | "overnight_share" | "midday_share" | "red_band_share" | "mean_mwh";
type BySeason<T> = Record<string, Record<string, T>>;
export interface SupplierData {
  suppliers: string[];
  profiles: BySeason<number[]>;
  indicators: BySeason<Record<Indicator, number>>;
  /** mean market index price by settlement period, £/MWh */
  prices: Record<string, number[]>;
  /** shape price against the average shape, £/MWh */
  vsAverage: BySeason<{ gbp_per_mwh: number; gbp_m: number }>;
  /** shape price against flat baseload, £/MWh and £m per season */
  premium: BySeason<{ gbp_per_mwh: number; gbp_m: number }>;
  /** imbalance cost against the market index over two years, £m */
  imbalance: Record<string, { gbp_m: number; gbp_per_mwh: number }>;
}

/** Sort key for "Sum-21" / "Win-21": summer before the winter that follows it. */
export const seasonKey = (s: string) => +s.slice(4) * 2 + (s.startsWith("Win") ? 1 : 0);

// Fuse volumes are negligible before Win-24, so those seasons are noise
const usable = (supplier: string, season: string) => supplier !== "Fuse Energy" || seasonKey(season) >= seasonKey("Win-24");

/** Keep usable seasons only, in date order. */
function clean<T>(by: BySeason<T>): BySeason<T> {
  return Object.fromEntries(Object.entries(by).map(([sup, seasons]) => [sup, Object.fromEntries(
    Object.keys(seasons).filter((s) => usable(sup, s)).sort((a, b) => seasonKey(a) - seasonKey(b)).map((s) => [s, seasons[s]]),
  )]));
}

let cache: Promise<SupplierData> | null = null;

/** Load both supplier files once, shared by every chart on the page. */
export function useSupplierData() {
  const [data, setData] = useState<SupplierData | null>(null);
  useEffect(() => {
    const get = (f: string) => fetch(`${import.meta.env.BASE_URL}data/electricity-suppliers/${f}`).then((r) => r.json());
    if (!cache) cache = Promise.all([get("supplier_profiles.json"), get("supplier_shape_indicators.json"), get("supplier_shape_value.json")]).then(([p, i, v]) => ({
      suppliers: [...p.suppliers].sort((a: string, b: string) => a.localeCompare(b)),
      profiles: clean(p.profiles),
      indicators: clean(i.indicators),
      prices: v.price_by_sp,
      vsAverage: clean(v.vs_average),
      premium: clean(v.premium),
      imbalance: v.imbalance,
    }));
    cache.then(setData).catch(() => { cache = null; });
  }, []);
  return data;
}

/** Mean with the highest and lowest value dropped; null when fewer than three values. */
export function trimmedMean(vals: number[]): number | null {
  if (vals.length < 3) return null;
  const s = [...vals].sort((a, b) => a - b).slice(1, -1);
  return s.reduce((a, b) => a + b, 0) / s.length;
}
