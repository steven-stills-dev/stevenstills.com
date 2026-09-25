import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { DESIGN_EVENT } from "../../lib/design";

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

/**
 * Create a maplibre map on a container ref with the site's basemap and
 * conventions (no rotate, compact attribution, resize tracking). `onLoad`
 * runs once the style is ready; `onDesign` runs on every design-tray change so
 * paint properties can re-read the tokens. `interactive: false` gives a static
 * preview with no controls.
 */
export function useMapLibre(opts: {
  bounds: [[number, number], [number, number]];
  style?: string;
  interactive?: boolean;
  padding?: number;
  onLoad?: (map: maplibregl.Map) => void;
  onDesign?: (map: maplibregl.Map) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const cb = useRef(opts);
  cb.current = opts;

  useEffect(() => {
    if (!ref.current) return;
    const { bounds, style = MAP_STYLE, interactive = true, padding = 24 } = cb.current;
    const map = new maplibregl.Map({
      container: ref.current,
      style,
      bounds,
      fitBoundsOptions: { padding },
      attributionControl: false,
      dragRotate: false,
      interactive,
    });
    mapRef.current = map;
    if (interactive) map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");
    // compact attribution, closed; pre-marking it compact stops maplibre
    // auto-opening it once the style's attributions arrive
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    map.getContainer().querySelector(".maplibregl-ctrl-attrib")?.classList.add("maplibregl-compact");
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(ref.current);
    map.on("load", () => cb.current.onLoad?.(map));
    const design = () => { if (map.isStyleLoaded()) cb.current.onDesign?.(map); };
    window.addEventListener(DESIGN_EVENT, design);
    return () => {
      window.removeEventListener(DESIGN_EVENT, design);
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return { ref, mapRef };
}
