import { useEffect, useState } from "react";
import UKMap from "./UKMap";

export interface MapFrame { label: string; values: Record<string, number> }

/** UK regional map stepped through time: play/pause, a scrubber and a visible timestamp, on one
 *  fixed colour scale. With reduced motion (or in print) it shows `stills` evenly spaced frames instead. */
export default function AnimatedUKMap({ frames, domain, format, legendTitle, ms = 700, stills = 4 }: {
  frames: MapFrame[]; domain: [number, number]; format?: (v: number) => string; legendTitle: string; ms?: number; stills?: number;
}) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [reduced] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setI((k) => (k + 1) % frames.length), ms);
    return () => clearInterval(t);
  }, [playing, frames.length, ms]);
  if (!frames.length) return null;
  if (reduced) {
    const pick = Array.from({ length: stills }, (_, k) => frames[Math.round((k * (frames.length - 1)) / (stills - 1))]);
    return (
      <div className="amap-stills">
        {pick.map((f) => (
          <figure key={f.label}>
            <UKMap values={f.values} domain={domain} format={format} />
            <figcaption>{f.label}</figcaption>
          </figure>
        ))}
      </div>
    );
  }
  return (
    <div className="amap">
      <UKMap values={frames[i].values} domain={domain} format={format} legendTitle={legendTitle} />
      <div className="amap-bar">
        <button className="chip" onClick={() => setPlaying(!playing)} aria-label={playing ? "Pause" : "Play"}>{playing ? "Pause" : "Play"}</button>
        <input type="range" min={0} max={frames.length - 1} value={i} aria-label="Time"
          onChange={(e) => { setPlaying(false); setI(Number(e.target.value)); }} />
        <b aria-live="off">{frames[i].label}</b>
      </div>
    </div>
  );
}
