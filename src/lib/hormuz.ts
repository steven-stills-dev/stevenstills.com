/**
 * Client for the live Hormuz tracker API (app-hormuz-live). Read-only, no auth.
 * Dev goes through the Vite proxy; production calls the subdomain directly.
 */
const BASE = import.meta.env.DEV ? "/hormuz-api" : "https://hormuz.stevenstills.com/api";

export type Tier = "lng" | "tanker" | "other";
export type Zone = "strait" | "persian_gulf" | "gulf_of_oman";

export interface Ship {
  mmsi: string;
  name: string | null;
  ship_category: string | null;
  tier: Tier;
  flag: string | null;
  destination: string | null;
  latitude: number;
  longitude: number;
  zone: Zone;
  speed: number | null;
  course: number | null;
  source_ts: string;
}

/** Fetch the latest position of every tracked ship. */
export async function fetchShips(): Promise<Ship[]> {
  const r = await fetch(`${BASE}/ships`, { cache: "no-store" });
  if (!r.ok) throw new Error(`/ships: ${r.status}`);
  return (await r.json()).data as Ship[];
}
