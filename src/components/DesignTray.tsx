import { useEffect, useState } from "react";
import { Palette, RotateCcw, X, Copy } from "lucide-react";
import {
  FONT_FAMILIES, VARIANTS, CASES, DEFAULT_CONFIG,
  loadConfig, saveConfig, applyConfig,
  type DesignConfig, type VariantCfg, type TextCase,
} from "../lib/design";

/**
 * Design control tray. Toggle with Ctrl+B+G (held together) or the corner
 * button. One colour (the primary accent) and the typography variants. Every
 * edit applies to :root CSS variables live and persists to localStorage.
 */
export default function DesignTray() {
  const [cfg, setCfg] = useState<DesignConfig>(() => loadConfig());
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>(VARIANTS[0].key);
  const [copied, setCopied] = useState(false);

  useEffect(() => { applyConfig(cfg); saveConfig(cfg); }, [cfg]);

  useEffect(() => {
    const held = new Set<string>();
    const chord = ["control", "b", "g"];
    const sync = (e: KeyboardEvent) => { e.ctrlKey ? held.add("control") : held.delete("control"); };
    const down = (e: KeyboardEvent) => {
      sync(e); held.add(e.key.toLowerCase());
      if (chord.every((c) => held.has(c))) { e.preventDefault(); setOpen((o) => !o); held.clear(); }
      if (e.key === "Escape") setOpen(false);
    };
    const up = (e: KeyboardEvent) => { sync(e); held.delete(e.key.toLowerCase()); };
    const blur = () => held.clear();
    window.addEventListener("keydown", down, true);
    window.addEventListener("keyup", up, true);
    window.addEventListener("blur", blur);
    return () => { window.removeEventListener("keydown", down, true); window.removeEventListener("keyup", up, true); window.removeEventListener("blur", blur); };
  }, []);

  const patchVariant = (key: string, patch: Partial<VariantCfg>) =>
    setCfg((c) => ({ ...c, variants: { ...c.variants, [key]: { ...c.variants[key], ...patch } } }));

  const copyJson = async () => {
    try { await navigator.clipboard.writeText(JSON.stringify(cfg, null, 2)); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch { /* ignore */ }
  };

  const v = cfg.variants[active];
  const meta = VARIANTS.find((m) => m.key === active)!;
  const groups = [...new Set(VARIANTS.map((m) => m.group))];
  const validHex = /^#[0-9a-f]{6}$/i.test(cfg.primary);

  return (
    <>
      <button className="dt-fab" title="Design (Ctrl+B+G)" onClick={() => setOpen((o) => !o)}>
        <Palette size={17} strokeWidth={2} />
      </button>

      {open && (
        <aside className="dt-tray">
          <div className="dt-head">
            <div className="dt-title"><Palette size={16} strokeWidth={2} /> Design</div>
            <button className="dt-icon" onClick={() => setOpen(false)}><X size={16} strokeWidth={2} /></button>
          </div>

          <div className="dt-sec">
            <div className="dt-sec-h">Colour</div>
            <div className="dt-field">
              <span>Primary</span>
              <input type="color" value={validHex ? cfg.primary : DEFAULT_CONFIG.primary}
                onChange={(e) => setCfg((c) => ({ ...c, primary: e.target.value.toUpperCase() }))} />
              <input className="dt-hex" value={cfg.primary} spellCheck={false}
                onChange={(e) => setCfg((c) => ({ ...c, primary: e.target.value }))} />
            </div>
          </div>

          <div className="dt-sec">
            <div className="dt-sec-h">Global</div>
            <div className="dt-field">
              <span>Body font</span>
              <select value={cfg.bodyFont} onChange={(e) => setCfg((c) => ({ ...c, bodyFont: e.target.value }))}>
                {FONT_FAMILIES.filter((f) => f.stack !== "inherit").map((f) => <option key={f.name} value={f.stack}>{f.name}</option>)}
                {!FONT_FAMILIES.some((f) => f.stack === cfg.bodyFont) && <option value={cfg.bodyFont}>Custom</option>}
              </select>
            </div>
            <Slider label="Word spacing" value={cfg.wordSpacing} min={-0.05} max={0.2} step={0.005} unit="em"
              onChange={(n) => setCfg((c) => ({ ...c, wordSpacing: n }))} />
          </div>

          <div className="dt-sec">
            <div className="dt-sec-h">Typography</div>
            {groups.map((g) => (
              <div className="dt-group" key={g}>
                <div className="dt-group-lbl">{g}</div>
                <div className="dt-chips">
                  {VARIANTS.filter((m) => m.group === g).map((m) => (
                    <button key={m.key} className={"dt-chip" + (m.key === active ? " on" : "")} onClick={() => setActive(m.key)}>{m.label}</button>
                  ))}
                </div>
              </div>
            ))}
            <div className="dt-sample" style={{
              fontFamily: v.font === "inherit" ? cfg.bodyFont : v.font,
              fontSize: `${Math.min(v.size, 2.2)}rem`, fontWeight: v.weight,
              letterSpacing: `${v.tracking}em`, textTransform: v.textCase,
            }}>{meta.sample}</div>
            <div className="dt-field">
              <span>Font</span>
              <select value={v.font} onChange={(e) => patchVariant(active, { font: e.target.value })}>
                {FONT_FAMILIES.map((f) => <option key={f.name} value={f.stack}>{f.name}</option>)}
              </select>
            </div>
            <Slider label="Size" value={v.size} min={0.6} max={4} step={0.0625} unit="rem" onChange={(n) => patchVariant(active, { size: n })} />
            <Slider label="Weight" value={v.weight} min={100} max={900} step={10} unit="" onChange={(n) => patchVariant(active, { weight: n })} />
            <Slider label="Tracking" value={v.tracking} min={-0.06} max={0.2} step={0.005} unit="em" onChange={(n) => patchVariant(active, { tracking: n })} />
            <div className="dt-field">
              <span>Case</span>
              <div className="dt-seg">
                {CASES.map((c) => (
                  <button key={c.key} className={v.textCase === c.key ? "on" : ""} onClick={() => patchVariant(active, { textCase: c.key as TextCase })}>{c.label}</button>
                ))}
              </div>
            </div>
          </div>

          <button className="dt-reset" onClick={copyJson}><Copy size={14} strokeWidth={2} /> {copied ? "Copied" : "Copy JSON"}</button>
          <button className="dt-reset" onClick={() => setCfg(structuredClone(DEFAULT_CONFIG))}><RotateCcw size={14} strokeWidth={2} /> Restore defaults</button>
        </aside>
      )}
    </>
  );
}

function Slider({ label, value, min, max, step, unit, onChange }: {
  label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (n: number) => void;
}) {
  const dp = step < 0.01 ? 3 : step < 0.1 ? 2 : step < 1 ? 1 : 0;
  return (
    <div className="dt-slider">
      <div className="dt-slider-top"><span>{label}</span><b>{value.toFixed(dp)}{unit}</b></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} />
    </div>
  );
}
