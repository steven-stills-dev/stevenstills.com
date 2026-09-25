import { useEffect } from "react";
import maplibregl from "maplibre-gl";
import { fetchShips, type Ship } from "../../lib/hormuz";
import { token } from "../../lib/format";
import { useMapLibre } from "./useMapLibre";

const GULF: [[number, number], [number, number]] = [[47.5, 22.8], [61.5, 30.4]];
const REFRESH_MS = 60_000;
/** Escape AIS text fields before they go into popup markup. */
const esc = (v: unknown) => String(v).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[c]!);

function fc(ships: Ship[]) {
  return {
    type: "FeatureCollection",
    features: ships.map((s) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [s.longitude, s.latitude] },
      properties: { name: s.name ?? "", category: s.ship_category ?? "", tier: s.tier, flag: s.flag ?? "", destination: s.destination ?? "", speed: s.speed ?? 0, zone: s.zone },
    })),
  } as GeoJSON.FeatureCollection;
}

/** Colour the ship layers from the current design tokens. */
function paint(map: maplibregl.Map) {
  if (!map.getLayer("ships-energy")) return;
  map.setPaintProperty("ships-energy", "circle-color", token("--ste-secondary", "#60D0B8"));
  map.setPaintProperty("ships-energy", "circle-stroke-color", token("--ste-midnight", "#183036"));
  map.setPaintProperty("ships-other", "circle-color", token("--ste-dusk", "#6F8488"));
}

/** Load the latest positions; on failure the last ones stay on the map. */
async function refresh(map: maplibregl.Map) {
  const src = map.getSource("ships") as maplibregl.GeoJSONSource | undefined;
  if (!src) return;
  try { src.setData(fc(await fetchShips())); } catch { /* leave the last positions on the map */ }
}

/** Live vessel map of the Strait of Hormuz. Tankers and LNG carriers carry the
 *  secondary accent; everything else is muted. Refreshes every minute and
 *  re-reads the tokens whenever the design tray changes them. */
export default function HormuzMap({ preview = false }: { preview?: boolean }) {
  const { ref, mapRef } = useMapLibre({
    bounds: GULF,
    interactive: !preview,
    onDesign: paint,
    onLoad: (map) => {
      map.addSource("ships", { type: "geojson", data: fc([]) });
      map.addLayer({
        id: "ships-other", type: "circle", source: "ships",
        filter: ["==", ["get", "tier"], "other"],
        paint: { "circle-radius": 2.2, "circle-opacity": 0.55 },
      });
      map.addLayer({
        id: "ships-energy", type: "circle", source: "ships",
        filter: ["!=", ["get", "tier"], "other"],
        paint: { "circle-radius": ["case", ["==", ["get", "tier"], "lng"], 6, 4.5], "circle-stroke-width": 1.2 },
      });
      paint(map);
      for (const id of preview ? [] : ["ships-energy", "ships-other"]) {
        map.on("mouseenter", id, () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", id, () => (map.getCanvas().style.cursor = ""));
        map.on("click", id, (e) => {
          const f = e.features?.[0]; if (!f) return;
          const p = f.properties as Record<string, string | number>;
          const el = document.createElement("div");
          el.className = "map-card";
          el.innerHTML =
            `<div class="n">${esc(p.name || "Unnamed vessel")}</div>` +
            `<div class="r"><span>Type</span><b>${esc(p.category || "–")}</b></div>` +
            `<div class="r"><span>Flag</span><b>${esc(p.flag || "–")}</b></div>` +
            `<div class="r"><span>Destination</span><b>${esc(p.destination || "–")}</b></div>` +
            `<div class="r"><span>Speed</span><b>${Number(p.speed).toFixed(1)} kn</b></div>`;
          new maplibregl.Popup({ closeButton: false, offset: 12, className: "map-popup", maxWidth: "260px" })
            .setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number]).setDOMContent(el).addTo(map);
        });
      }
      refresh(map);
    },
  });

  useEffect(() => {
    const timer = window.setInterval(() => { if (mapRef.current) refresh(mapRef.current); }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [mapRef]);

  return (
    <div className="mapwrap">
      <div ref={ref} style={{ width: "100%", height: "100%" }} />
      {!preview && <a className="map-link" href="https://hormuz.stevenstills.com" target="_blank" rel="noopener">Open the live tracker ↗</a>}
    </div>
  );
}
