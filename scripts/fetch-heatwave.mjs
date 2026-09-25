// Build public/data/heatwave/t850.json: the 850hPa temperature field over the
// UK and western Europe at 12:00 UTC on 26 June 2026, the UK's hottest day of
// the tracked summer.
//
//   node scripts/fetch-heatwave.mjs
//
// Samples Open-Meteo's historical forecast API on a regular lat/lon grid.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "public/data/heatwave/t850.json");
const DATE = "2026-06-26", HOUR = `${DATE}T12:00`;
const LAT0 = 34, LAT1 = 68, LON0 = -24, LON1 = 32, STEP = 1, BATCH = 100;

const pts = [];
for (let lat = LAT0; lat <= LAT1; lat += STEP) for (let lon = LON0; lon <= LON1; lon += STEP) pts.push([lat, lon]);
const nx = (LON1 - LON0) / STEP + 1, ny = (LAT1 - LAT0) / STEP + 1;
console.log(`${pts.length} grid points (${nx} x ${ny})`);

const flat = [];
for (let i = 0; i < pts.length; i += BATCH) {
  const chunk = pts.slice(i, i + BATCH);
  const url = "https://historical-forecast-api.open-meteo.com/v1/forecast?" + new URLSearchParams({
    latitude: chunk.map((p) => p[0]).join(","),
    longitude: chunk.map((p) => p[1]).join(","),
    start_date: DATE, end_date: DATE, hourly: "temperature_850hPa", timezone: "GMT",
  });
  let res;
  for (let tries = 0; ; tries++) {
    res = await fetch(url);
    if (res.ok || tries === 4) break;
    await new Promise((r) => setTimeout(r, 5000 * (tries + 1)));
  }
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
  const body = await res.json();
  for (const loc of Array.isArray(body) ? body : [body]) {
    const k = loc.hourly.time.indexOf(HOUR);
    flat.push(Math.round(loc.hourly.temperature_850hPa[k] * 10) / 10);
  }
  console.log(`  fetched ${Math.min(i + BATCH, pts.length)}/${pts.length}`);
  await new Promise((r) => setTimeout(r, 1500));
}

// rows run south to north, columns west to east
const values = [];
for (let r = 0; r < ny; r++) values.push(flat.slice(r * nx, (r + 1) * nx));

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({
  meta: {
    source: "Open-Meteo historical forecast API (historical-forecast-api.open-meteo.com), temperature_850hPa",
    licence: "CC BY 4.0",
    time: `${HOUR} UTC`,
    fetched: new Date().toISOString().slice(0, 10),
  },
  lat0: LAT0, lon0: LON0, step: STEP, nx, ny, values,
}));
const all = flat.filter((v) => v != null);
console.log(`min ${Math.min(...all)}  max ${Math.max(...all)}  nulls ${flat.length - all.length}`);
