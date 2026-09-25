/**
 * Choropleth of the twelve UK ITL1 regions, drawn as SVG and sized to its
 * container. Region ids are the slugs used in the geometry ("london",
 * "south-east", "scotland", ...). Fills derive from the primary accent: a
 * continuous ramp when `domain` is given, stepped bands when `bands` is given.
 * Hover shows the region name and formatted value.
 */
import { useRef, useState, type FocusEvent, type MouseEvent } from "react";
import { useSize } from "../../lib/useSize";
import { UK_GEO, project } from "./uk-geo";
import "./UKMap.css";

export interface UKMapBand { max: number; label: string }

export type UKMapTone = "primary" | "night";

export interface UKMapPoint {
  lat: number;
  lon: number;
  label: string;
  /** dot radius in screen pixels (default 3.6) */
  r?: number;
  /** side of the dot the label sits on (default right) */
  anchor?: "left" | "right";
  /** label nudge in screen pixels */
  dx?: number;
  dy?: number;
  /** dot colour: the accent (default) or Night */
  tone?: UKMapTone;
}

export interface UKMapProps {
  values: Record<string, number>;
  /** continuous scale: [min, max] mapped page-white -> primary */
  domain?: [number, number];
  /** stepped scale: ascending `max` thresholds, one label each */
  bands?: UKMapBand[];
  format?: (v: number) => string;
  legendTitle?: string;
  /** label for regions with no value (drawn in the muted surface colour) */
  noDataLabel?: string;
  /** draw the Shetland inset (default false) */
  shetland?: boolean;
  /** plotted places, dot plus label, placed from latitude and longitude */
  points?: UKMapPoint[];
  /** legend rows for the point tones */
  pointLegend?: { tone: UKMapTone; label: string }[];
}

interface Tip { id: string; title: string; value: string; x: number; y: number }

const PAD = 14;
const SIDE = 12;
const NO_DATA = "var(--ste-day)";
const TONE: Record<UKMapTone, string> = { primary: "var(--ste-secondary)", night: "var(--ste-night)" };

/** Blend the accent into page white at a percentage. */
const mix = (pct: number) => `color-mix(in srgb, var(--ste-secondary) ${pct}%, var(--ste-midday))`;

export default function UKMap({
  values, domain, bands, format, legendTitle, noDataLabel, shetland = false, points, pointLegend,
}: UKMapProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const [frame, size] = useSize<HTMLDivElement>();
  const [tip, setTip] = useState<Tip | null>(null);
  const fmt = format ?? ((v: number) => String(v));
  const nd = noDataLabel ?? "No data";

  // frame the geometry, cropping Shetland unless asked for
  const top = shetland ? 0 : UK_GEO.shetlandCut;
  const vx = -SIDE, vy = top - PAD;
  const vw = UK_GEO.width + 2 * SIDE, vh = UK_GEO.height - top + 2 * PAD;
  // map units per screen pixel: dots and labels scale by it to hold a steady size
  const pxPerUnit = size.w > 0 && size.h > 0 ? Math.min(size.w / vw, size.h / vh) : 560 / vh;
  const k = 1 / pxPerUnit;

  // scale: bands first, then the given domain, else the range of the values
  const vals = Object.values(values).filter((v) => v != null && isFinite(v));
  const range: [number, number] | null =
    bands ? null : domain ?? (vals.length ? [Math.min(...vals), Math.max(...vals)] : null);
  const nb = bands?.length ?? 0;
  const bandPct = (i: number) => (nb <= 1 ? 100 : Math.round((i / (nb - 1)) * 100));
  const fillFor = (v: number | undefined): string => {
    if (v == null) return NO_DATA;
    if (bands) {
      let i = bands.findIndex((b) => v <= b.max);
      if (i < 0) i = nb - 1;
      return mix(bandPct(i));
    }
    if (range) {
      const span = range[1] - range[0] || 1;
      const t = Math.max(0, Math.min(1, (v - range[0]) / span));
      return mix(Math.round(t * 100));
    }
    return NO_DATA;
  };

  // tooltip anchors, in pixels relative to the wrapper
  const at = (clientX: number, clientY: number) => {
    const r = wrap.current?.getBoundingClientRect();
    return r ? { x: clientX - r.left, y: clientY - r.top } : { x: 0, y: 0 };
  };
  const hover = (id: string, title: string, value: string) => (e: MouseEvent<SVGElement>) =>
    setTip({ id, title, value, ...at(e.clientX, e.clientY) });
  const focus = (id: string, title: string, value: string) => (e: FocusEvent<SVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ id, title, value, ...at(r.left + r.width / 2, r.top + r.height / 2) });
  };
  const hide = () => setTip(null);

  const cw = wrap.current?.clientWidth ?? 0;
  const tipLeft = tip ? (cw ? Math.max(56, Math.min(cw - 56, tip.x)) : tip.x) : 0;
  const active = tip ? UK_GEO.regions.find((rg) => rg.key === tip.id) : undefined;

  const showNoData = !!noDataLabel && UK_GEO.regions.some((rg) => values[rg.key] == null);
  const hasLegend = !!legendTitle || !!bands || !!range || showNoData || !!pointLegend?.length;
  const toneLabel = (tone: UKMapTone) => pointLegend?.find((l) => l.tone === tone)?.label ?? "Site";

  return (
    <div className="ukmap" ref={wrap}>
      <div className="ukmap-svg" ref={frame}>
        <svg
          viewBox={`${vx} ${vy} ${vw} ${vh}`}
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={legendTitle ? `Map of the United Kingdom: ${legendTitle}` : "Map of the United Kingdom"}
        >
          <g stroke="var(--ste-dusk)" strokeOpacity={0.5} strokeWidth={1} strokeLinejoin="round">
            {UK_GEO.regions.map((rg) => {
              const v = values[rg.key];
              const text = v == null ? nd : fmt(v);
              return (
                <path
                  key={rg.key}
                  d={rg.d}
                  fill={fillFor(v)}
                  vectorEffect="non-scaling-stroke"
                  tabIndex={0}
                  aria-label={`${rg.name}: ${text}`}
                  data-region={rg.key}
                  onMouseEnter={hover(rg.key, rg.name, text)}
                  onMouseMove={hover(rg.key, rg.name, text)}
                  onMouseLeave={hide}
                  onFocus={focus(rg.key, rg.name, text)}
                  onBlur={hide}
                />
              );
            })}
          </g>
          {active && (
            <path
              d={active.d}
              fill="none"
              stroke="var(--ste-night)"
              strokeWidth={1.5}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          )}
          {points && points.length > 0 && (
            <g fontSize={12 * k} fontFamily="inherit">
              {points.map((p, i) => {
                const xy = project(p.lat, p.lon);
                const r = (p.r ?? 3.6) * k;
                const tone = p.tone ?? "primary";
                const id = `pt-${i}`;
                const on = tip?.id === id;
                const left = p.anchor === "left";
                return (
                  <g key={id}>
                    <circle
                      cx={xy.x}
                      cy={xy.y}
                      r={r}
                      fill={TONE[tone]}
                      stroke={on ? "var(--ste-night)" : "var(--ste-midday)"}
                      strokeWidth={on ? 2 : 1}
                      vectorEffect="non-scaling-stroke"
                      tabIndex={0}
                      aria-label={p.label}
                      onMouseEnter={hover(id, toneLabel(tone), p.label)}
                      onMouseMove={hover(id, toneLabel(tone), p.label)}
                      onMouseLeave={hide}
                      onFocus={focus(id, toneLabel(tone), p.label)}
                      onBlur={hide}
                    />
                    <text
                      x={xy.x + (left ? -(r + 4 * k) : r + 4 * k) + (p.dx ?? 0) * k}
                      y={xy.y + 4 * k + (p.dy ?? 0) * k}
                      textAnchor={left ? "end" : "start"}
                      fill="var(--ste-night)"
                      stroke="var(--ste-midday)"
                      strokeWidth={2.6 * k}
                      strokeLinejoin="round"
                      paintOrder="stroke"
                      pointerEvents="none"
                    >
                      {p.label}
                    </text>
                  </g>
                );
              })}
            </g>
          )}
        </svg>
      </div>

      {tip && (
        <div className="charttip" style={{ left: tipLeft, top: tip.y }}>
          <span className="ct-t">{tip.title}</span>
          <span className="ct-v">{tip.value}</span>
        </div>
      )}

      {hasLegend && (
        <div className="legend ukmap-legend">
          {legendTitle && <span className="ukmap-legend-t">{legendTitle}</span>}
          {bands
            ? bands.map((b, i) => (
                <span key={b.label}><i style={{ background: mix(bandPct(i)) }} />{b.label}</span>
              ))
            : range && (
                <span className="ukmap-range">
                  <span>{fmt(range[0])}</span>
                  <i className="ukmap-grad" />
                  <span>{fmt(range[1])}</span>
                </span>
              )}
          {showNoData && <span><i style={{ background: NO_DATA }} />{noDataLabel}</span>}
          {pointLegend?.map((l) => (
            <span key={l.label}><i className="ukmap-dot" style={{ background: TONE[l.tone] }} />{l.label}</span>
          ))}
        </div>
      )}
    </div>
  );
}
