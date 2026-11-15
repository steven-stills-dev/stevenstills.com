import { useEffect, useState } from "react";

export const FONTS = [
  "Schibsted Grotesk", "Source Sans 3", "Libre Franklin", "Inter", "IBM Plex Sans",
  "Public Sans", "Atkinson Hyperlegible Next", "Lexend", "Noto Sans", "Open Sans",
  "Roboto Flex", "Work Sans", "Figtree", "Instrument Sans", "Hanken Grotesk",
];

const SLOTS = [
  { key: "titles", label: "Titles", cssVar: "--display" },
  { key: "headers", label: "Headers", cssVar: "--heading" },
  { key: "body", label: "Body", cssVar: "--sans" },
] as const;

type Key = (typeof SLOTS)[number]["key"];
type Settings = Record<Key, string>;

const STORE = "ste-design-tray";
const DEFAULTS: Settings = { titles: "Schibsted Grotesk", headers: "Schibsted Grotesk", body: "Source Sans 3" };
const STACK = "'Helvetica Neue', Arial, system-ui, sans-serif";

function load(): { open: boolean; settings: Settings } {
  const q = new URLSearchParams(location.search);
  let saved: Partial<Settings> & { open?: boolean } = {};
  try { saved = JSON.parse(localStorage.getItem(STORE) ?? "{}"); } catch { /* storage blocked */ }
  const settings = { ...DEFAULTS };
  for (const { key } of SLOTS) {
    const v = q.get(key) ?? saved[key];
    if (v && FONTS.includes(v)) settings[key] = v;
  }
  return { open: q.has("tray") || !!saved.open, settings };
}

/** Render a font picker for titles, headers and body, opened with ?tray in the URL. */
export default function DesignTray() {
  const [{ open, settings }, setState] = useState(load);
  const [copied, setCopied] = useState(false);
  const active = open || new URLSearchParams(location.search).has("titles");

  useEffect(() => {
    if (!active || document.getElementById("tray-fonts")) return;
    const link = document.createElement("link");
    link.id = "tray-fonts";
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?" +
      FONTS.map((f) => `family=${f.replace(/ /g, "+")}:wght@400;500;600;700`).join("&") + "&display=swap";
    document.head.appendChild(link);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    for (const { key, cssVar } of SLOTS) document.documentElement.style.setProperty(cssVar, `'${settings[key]}', ${STACK}`);
    try { localStorage.setItem(STORE, JSON.stringify({ ...settings, open })); } catch { /* storage blocked */ }
  }, [active, open, settings]);

  if (!open) return null;
  const json = JSON.stringify(settings, null, 2);

  return (
    <aside className="tray" aria-label="Design tray">
      <div className="tray-head">
        <span>Fonts</span>
        <button type="button" aria-label="Close design tray" onClick={() => setState({ open: false, settings })}>×</button>
      </div>
      {SLOTS.map(({ key, label }) => (
        <label key={key} className="tray-row">
          <span>{label}</span>
          <select value={settings[key]} onChange={(e) => { setCopied(false); setState({ open, settings: { ...settings, [key]: e.target.value } }); }}>
            {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
      ))}
      <pre className="tray-json">{json}</pre>
      <div className="tray-actions">
        <button type="button" className="btn btn-s" onClick={() => navigator.clipboard.writeText(json).then(() => setCopied(true))}>
          {copied ? "Copied" : "Copy JSON"}
        </button>
        <button type="button" className="btn btn-s ghost" onClick={() => setState({ open, settings: DEFAULTS })}>Reset</button>
      </div>
    </aside>
  );
}
