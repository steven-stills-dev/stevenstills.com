import { useEffect } from "react";
import { Link } from "react-router-dom";
import { token } from "../lib/format";
import { usePageMeta } from "../lib/meta";
import "./dash.css";

// `share` is each colour's rough share of any screen: the first two carry the page, the accent marks one thing, the last two are small.
const COLOURS = [
  { name: "Paper", v: "--b-paper", rank: "Primary", role: "Every panel, and the nav rail", on: "--b-ink", share: 64 },
  { name: "Mist", v: "--b-mist", rank: "Ground", role: "Tints the page behind the panels", on: "--b-ink", share: 20 },
  { name: "Ink", v: "--b-ink", rank: "Ink", role: "All text, the lines that carry a figure, the one solid button and the marker on the nav rail", on: "--b-paper", share: 8 },
  { name: "Cobalt", v: "--b-cobalt", rank: "Accent", role: "The one featured panel, and the usable mark in a figure", on: "--b-paper", share: 8 },
];
const PAIRS: [string, string, string][] = [
  ["Ink", "Paper", "All text on a panel"], ["Paper", "Ink", "The solid button and the marker on the nav rail"], ["Paper", "Cobalt", "The featured panel"],
  ["Cobalt", "Paper", "The usable mark in a figure"],
];

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
/** WCAG contrast ratio between two hex colours. */
const contrast = (a: string, b: string) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

/** The brand colours, the pairs they may be used in, and the type. */
export default function Brand() {
  usePageMeta("Brand");
  useEffect(() => { document.documentElement.classList.add("dash-on"); return () => document.documentElement.classList.remove("dash-on"); }, []);
  const hex = Object.fromEntries(COLOURS.map((c) => [c.name, token(c.v, "#000000").toUpperCase()]));
  return (
    <div className="dash plain">
      <main className="brand">
        <header className="d-top">
          <Link to="/" className="name" translate="no">Steven Stills</Link>
          <Link to="/#insights">Insights</Link>
        </header>
        <div className="panel"><h1 className="d-h">Brand colours and type</h1></div>
        <section className="panel" aria-labelledby="b-c">
          <h2 id="b-c" className="panel-h">Colours, in the proportion they are used</h2>
          <div className="shares" role="img" aria-label={COLOURS.map((c) => `${c.name} ${c.share}%`).join(", ")}>
            {COLOURS.map((c) => <i key={c.name} style={{ flexGrow: c.share, background: `var(${c.v})` }} />)}
          </div>
          <div className="swatches">
            {COLOURS.map((c) => (
              <div key={c.name} className="swatch" style={{ background: `var(${c.v})`, color: `var(${c.on})` }}>
                <b>{c.name}</b><span>{c.rank} · {c.share}% · {hex[c.name]}</span><span>{c.role}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="panel" aria-labelledby="b-p">
          <h2 id="b-p" className="panel-h">Approved pairs</h2>
          <div className="pairs-wrap"><table className="pairs">
            <thead><tr><th scope="col">Pair</th><th scope="col">Use</th><th scope="col">Contrast</th><th scope="col">Passes for</th></tr></thead>
            <tbody>
              {PAIRS.map(([fg, bg, use]) => {
                const r = contrast(hex[fg], hex[bg]);
                return (
                  <tr key={fg + bg}>
                    <td>{r >= 4.5
                      ? <span className="chip" style={{ color: hex[fg], background: hex[bg] }}>{fg} on {bg}</span>
                      : <span className="chip" style={{ color: hex[bg === "Ink" ? "Paper" : "Ink"], background: hex[bg] }}><i style={{ background: hex[fg] }} />{fg} on {bg}</span>}</td>
                    <td>{use}</td><td>{r.toFixed(1)}:1</td><td>{r >= 4.5 ? "All text" : r >= 3 ? "Large text and graphics" : "Decoration only"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        </section>
        <section className="panel" aria-labelledby="b-t">
          <h2 id="b-t" className="panel-h">Type</h2>
          <p className="d-h">Schibsted Grotesk 600 for headlines and numbers</p>
          <p className="d-lede" style={{ marginTop: 16 }}>Source Sans 3 for everything else: one or two sentences per insight, sentence case, tabular figures.</p>
        </section>
      </main>
    </div>
  );
}
