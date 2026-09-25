/**
 * Centralised design config: one accent colour plus typography variants.
 *
 * A single in-memory config drives CSS custom properties on :root. Every text
 * surface in styles.css reads `var(--t-<variant>-*)` with a hard-coded
 * fallback, and every accent surface reads `var(--ste-primary)`, so a tray edit
 * flows instantly to the whole site. Persisted to localStorage.
 */

export type TextCase = "none" | "uppercase" | "lowercase" | "capitalize";

export interface VariantCfg {
  /** CSS font-family stack, or "inherit" to follow the global body font. */
  font: string;
  /** rem */
  size: number;
  weight: number;
  /** em */
  tracking: number;
  textCase: TextCase;
}

export interface DesignConfig {
  /** The one accent colour. Charts, pins, active states, tints all derive from it. */
  primary: string;
  /** Global body font; every variant set to "inherit" follows this. */
  bodyFont: string;
  /** Global letter-spacing nudge on the body element (em). */
  wordSpacing: number;
  variants: Record<string, VariantCfg>;
}

export const FONT_FAMILIES: { name: string; stack: string }[] = [
  { name: "Global (body)", stack: "inherit" },
  { name: "Poppins", stack: "'Poppins', 'Helvetica Neue', Arial, system-ui, sans-serif" },
  { name: "Inter", stack: "'Inter', system-ui, sans-serif" },
  { name: "JetBrains Mono", stack: "'JetBrains Mono', ui-monospace, monospace" },
  { name: "System", stack: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif" },
];

const INHERIT = "inherit";

/** Ordered variant metadata: what each governs, for the tray UI. */
export const VARIANTS: { key: string; label: string; group: string; sample: string }[] = [
  { key: "title", label: "Site title", group: "Titles", sample: "Steven Stills" },
  { key: "nav", label: "Nav links", group: "Titles", sample: "Home" },
  { key: "headline", label: "Article headline", group: "Titles", sample: "The Summer the Strait Stood Still" },
  { key: "lede", label: "Lede", group: "Titles", sample: "A live map of ship traffic through the strait." },
  { key: "header", label: "Section headers", group: "Headers", sample: "Strait of Hormuz at a Glance" },
  { key: "caption", label: "Captions", group: "Headers", sample: "last 30 days" },
  { key: "kpilabel", label: "KPI label", group: "KPIs", sample: "SHIPS TRACKED" },
  { key: "body", label: "Body text", group: "Body", sample: "Follow every product through to settlement." },
];

export const CASES: { key: TextCase; label: string }[] = [
  { key: "none", label: "As typed" },
  { key: "uppercase", label: "UPPER" },
  { key: "lowercase", label: "lower" },
  { key: "capitalize", label: "Proper" },
];

export const DEFAULT_CONFIG: DesignConfig = {
  primary: "#E1FE73",
  bodyFont: "'Poppins', 'Helvetica Neue', Arial, system-ui, sans-serif",
  wordSpacing: 0,
  variants: {
    title:       { font: INHERIT, size: 1.25,   weight: 600, tracking: -0.01, textCase: "none" },
    nav:         { font: INHERIT, size: 0.875,  weight: 500, tracking: 0,     textCase: "none" },
    headline:    { font: INHERIT, size: 2.5,    weight: 600, tracking: -0.02, textCase: "none" },
    lede:        { font: INHERIT, size: 1.125,  weight: 400, tracking: 0,     textCase: "none" },
    header:      { font: INHERIT, size: 1.0,    weight: 600, tracking: 0,     textCase: "none" },
    caption:     { font: INHERIT, size: 0.8125, weight: 400, tracking: 0,     textCase: "none" },
    kpilabel:    { font: INHERIT, size: 0.8125, weight: 500, tracking: 0,     textCase: "none" },
    body:        { font: INHERIT, size: 1.0,    weight: 400, tracking: 0,     textCase: "none" },
  },
};

const STORAGE_KEY = "ste-design-config-v3";

/** Fired on window after every applyConfig, for canvases that cannot read CSS variables. */
export const DESIGN_EVENT = "ste:design";

export function loadConfig(): DesignConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_CONFIG);
    const parsed = JSON.parse(raw) as Partial<DesignConfig>;
    const variants = structuredClone(DEFAULT_CONFIG.variants);
    if (parsed.variants) {
      for (const k of Object.keys(variants)) {
        if (parsed.variants[k]) variants[k] = { ...variants[k], ...parsed.variants[k] };
      }
    }
    return { ...DEFAULT_CONFIG, ...parsed, variants };
  } catch {
    return structuredClone(DEFAULT_CONFIG);
  }
}

export function saveConfig(cfg: DesignConfig) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); } catch { /* ignore */ }
}

export function applyConfig(cfg: DesignConfig) {
  const s = document.documentElement.style;
  s.setProperty("--ste-primary", cfg.primary, "important");
  s.setProperty("--t-font-body", cfg.bodyFont, "important");
  s.setProperty("--t-word-spacing", `${cfg.wordSpacing}em`, "important");
  for (const [key, v] of Object.entries(cfg.variants)) {
    const p = `--t-${key}`;
    s.setProperty(`${p}-font`, v.font === "inherit" ? "var(--t-font-body)" : v.font, "important");
    s.setProperty(`${p}-size`, `${v.size}rem`, "important");
    s.setProperty(`${p}-weight`, String(v.weight), "important");
    s.setProperty(`${p}-tracking`, `${v.tracking}em`, "important");
    s.setProperty(`${p}-case`, v.textCase, "important");
  }
  window.dispatchEvent(new CustomEvent(DESIGN_EVENT, { detail: cfg }));
}
