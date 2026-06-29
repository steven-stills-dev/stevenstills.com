# Design helper — stevenstills.com

The shared colour language for the site **and** for data artefacts (maps, charts,
dashboards). Refer to colours **by name**. Financial Times-inspired.

## Named palette

| Name | Hex | CSS variable | Role |
|------|-----|--------------|------|
| **times_coal** | `#333333` | `--times-coal` | Headers **and** body text |
| **times_red** | `#990f3d` | `--times-red` | Subtitles / kickers / labels · **chart primary** |
| **times_blue** | `#0f5499` | `--times-blue` | Page links · **chart secondary** |
| **times_paper** | `#fff1e5` | `--times-paper` | Page background |
| **times_sand** | `#f2dfce` | `--times-sand` | Containers / cards / secondary background |
| **times_grey** | `#66605c` | `--times-grey` | Muted / secondary text |
| **times_line** | `#e7d3c1` | `--times-line` | Hairlines / borders |

## How the site maps names → roles

These semantic tokens (in `assets/css/style.css`) point at the names above. Edit the
*named* colours in one place and everything updates.

```
--fg        → times_coal   (body text)
--heading   → times_coal   (headers / headlines)
--subtitle  → times_red    (kickers, section labels, the INSIGHT label)
--accent    → times_blue   (links)
--bg        → times_paper
--surface   → times_sand
--muted     → times_grey
--rule      → times_line
```

## Charts & maps (Leaflet, plots, etc.)

When we build data artefacts, pull from the same names so they look native to the site:

- **Primary series / key markers / "disrupted" state →** `times_red` `#990f3d`
- **Secondary series / context / links →** `times_blue` `#0f5499`
- **Axes, labels, text →** `times_coal` `#333333`
- **Gridlines / borders →** `times_line` `#e7d3c1`
- **Plot / map background →** `times_paper` `#fff1e5` (or `times_sand` for an inset panel)
- **Muted / inactive →** `times_grey` `#66605c`

For a categorical sequence beyond two series, extend in this order:
`times_red` → `times_blue` → `times_coal` → `times_grey` (then add tints/shades).
Keep **times_red** for the thing that matters most — it's the signal colour.

### Reading the colours from JS (so charts stay in sync)

```js
const css = getComputedStyle(document.documentElement);
const RED  = css.getPropertyValue('--times-red').trim();   // "#990f3d"
const BLUE = css.getPropertyValue('--times-blue').trim();  // "#0f5499"
```

## Accessibility note

`times_blue` on `times_paper` and `times_coal` on `times_paper` both clear WCAG AA for
body text. `times_red` on `times_paper` is fine for **bold labels/headings** but is
borderline for small body-size text — keep it for subtitles, not paragraphs.

## Design Tray

The temporary Design Tray (Ctrl+B) live-edits the semantic tokens and can export a
`:root{}` block. Storage key is versioned (`ss-design-tray-v2`); bump it in
`design-tray.js` whenever new defaults should override anyone's saved experiments.
