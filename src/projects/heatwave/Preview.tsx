import { useEffect, useState } from "react";
import type maplibregl from "maplibre-gl";
import { useMapLibre } from "../../components/maps/useMapLibre";
import { mix, token } from "../../lib/format";

interface Field { lat0: number; lon0: number; step: number; nx: number; ny: number; values: number[][] }

const STYLE = "https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json";
const BAND = 2;            // °C per colour band
const LO = 8, HI = 24;     // ramp ends, °C at 850hPa, fitted to the field in view
const W = 640;             // overlay canvas width, px

/** Cool to hot across the theme: night, secondary, tertiary, primary, alert. */
function palette(): string[] {
  return [
    token("--ste-night", "#29494F"), token("--ste-secondary", "#60D0B8"), token("--ste-tertiary", "#BAF084"),
    token("--ste-primary", "#E1FE73"), token("--ste-alert", "#FF646D"),
  ];
}

function colourAt(stops: string[], t: number): string {
  const x = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(Math.floor(x), stops.length - 2);
  return mix(stops[i], stops[i + 1], x - i);
}

const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const unMercY = (y: number) => (360 / Math.PI) * Math.atan(Math.exp(y)) - 90;

/** Draw the field as smooth-edged 2°C bands on a Mercator-spaced canvas. */
function render(f: Field): { url: string; coords: [[number, number], [number, number], [number, number], [number, number]] } {
  const lat1 = f.lat0 + (f.ny - 1) * f.step, lon1 = f.lon0 + (f.nx - 1) * f.step;
  const yTop = mercY(lat1), yBot = mercY(f.lat0);
  const H = Math.round((W * (yTop - yBot)) / (((lon1 - f.lon0) * Math.PI) / 180));
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d")!;
  const stops = palette();
  const bands = Array.from({ length: (HI - LO) / BAND + 1 }, (_, k) => colourAt(stops, k / ((HI - LO) / BAND)));
  for (let py = 0; py < H; py++) {
    const gy = (unMercY(yTop - ((py + 0.5) / H) * (yTop - yBot)) - f.lat0) / f.step;
    const r0 = Math.max(0, Math.min(f.ny - 2, Math.floor(gy))), ty = gy - r0;
    for (let px = 0; px < W; px++) {
      const gx = ((px + 0.5) / W) * (f.nx - 1);
      const c0 = Math.min(f.nx - 2, Math.floor(gx)), tx = gx - c0;
      const a = f.values[r0], b = f.values[r0 + 1];
      const v = (a[c0] * (1 - tx) + a[c0 + 1] * tx) * (1 - ty) + (b[c0] * (1 - tx) + b[c0 + 1] * tx) * ty;
      ctx.fillStyle = bands[Math.max(0, Math.min(bands.length - 1, Math.floor((v - LO) / BAND)))];
      ctx.fillRect(px, py, 1, 1);
    }
  }
  return { url: cv.toDataURL(), coords: [[f.lon0, lat1], [lon1, lat1], [lon1, f.lat0], [f.lon0, f.lat0]] };
}

/** Home preview: 850hPa temperature over the UK and western Europe on the UK's hottest day. */
export default function Preview() {
  const [field, setField] = useState<Field | null>(null);

  const paint = (map: maplibregl.Map) => {
    if (!field) return;
    const { url, coords } = render(field);
    const src = map.getSource("heat") as maplibregl.ImageSource | undefined;
    if (src) { src.updateImage({ url, coordinates: coords }); return; }
    map.addSource("heat", { type: "image", url, coordinates: coords });
    map.addLayer({ id: "heat", type: "raster", source: "heat", paint: { "raster-opacity": 0.8, "raster-fade-duration": 0 } }, "boundary_country_outline");
    // lift the sea over the heat, faintly, so the coastline reads through
    map.moveLayer("water", "boundary_country_outline");
    map.setPaintProperty("water", "fill-opacity", 0.6);
  };

  const { ref, mapRef } = useMapLibre({
    bounds: [[-11, 43], [17, 61]],
    style: STYLE,
    interactive: false,
    padding: 0,
    onLoad: paint,
    onDesign: paint,
  });

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/heatwave/t850.json`).then((r) => r.json() as Promise<Field>).then(setField).catch(() => {});
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (map?.isStyleLoaded()) paint(map);
  }, [field]);

  return <div className="mapwrap" ref={ref} />;
}
