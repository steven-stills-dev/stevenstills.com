# stevenstills.com

Personal portfolio site. Vite + React + TypeScript, static build deployed to
GitHub Pages at https://stevenstills.com. No backend of its own: the home map
reads the live Hormuz tracker API (`app-hormuz-live`, https://hormuz.stevenstills.com).

## Commands

```bash
npm install        # first time
npm run dev        # http://localhost:5173, proxies /hormuz-api to the live tracker
npm run build      # tsc --noEmit && vite build -> dist/
```

Push to `main` deploys via `.github/workflows/deploy.yml` (Pages source must be
set to GitHub Actions in the repo settings).

## Design system

Modelled on the Shuttle "Unsophisticated Investor" newsletter: clean white page,
one reading column, Poppins throughout, rounded 24px shapes, tone-tile thumbnails.

- **Tokens** live in `src/styles.css` `:root` and `src/lib/design.ts`. Never
  hard-code a hex in a component; read the variable in SVG/CSS, or
  `token("--ste-...", ...)` for canvases (maplibre) and re-read it on the
  `ste:design` window event.
- **Palette**: `--ste-primary` #E1FE73 lime (buttons, active nav, chips,
  highlights; the tray edits this one), `--ste-secondary` #60D0B8 mint (chart
  and map data marks), `--ste-tertiary` #BAF084 green (lime gradient end, third
  series), `--ste-midday` #FFFFFF page, `--ste-day` #F1F2F1 grey panels,
  `--ste-dusk` #6F8488 muted labels, `--ste-night` #29494F text and headings,
  `--ste-midnight` #183036 deep teal numerals and dark card gradient.
- **Panels** (`Box`): rounded 24px, `--panel` grey fill, no border, no shadow.
- **Typography**: Poppins by default; hierarchy by size and weight, never colour.
  Named roles in `design.ts` (`title, nav, headline, lede, header, caption,
  kpilabel, body`); every text surface reads its `--t-<role>-*` variables.
- **Thumbnails** (`Thumb`): 3:2 rounded tone tiles in four tones (lime
  gradient, deep teal, mint, grey) cycling by list position.
- **Charts**: `src/components/charts/`. Sized to the container (`useSize`),
  nice ticks (`geom.ts`), hover tooltip (`ChartTip`). Secondary vs Night for
  two-series comparisons, no multi-colour palettes, no gridlines, title in the
  panel header, unit on the axis, nothing else. Never bake annotations into
  the SVG.
- **Layout**: `.wrap` is 1880px for the header and footer. Home is one 59rem
  column: headline, lede, lime button, feature panel (switched by clicking
  the list, no auto-rotation), then "Projects" and "Writing" card lists. Articles use
  `Article` + `Prose` for text and `Wide` for figures and maps; both are 59rem
  so text and images share one width.
- **Brand mark**: "SS" initials circle in `Nav` and `public/img/initials.svg`
  (favicon), a placeholder until the logo arrives.
- **Design tray**: Ctrl+B+G or the corner button. Edits `:root` live and
  persists to localStorage. Bake tuned values back into `DEFAULT_CONFIG` and
  bump `STORAGE_KEY`.

## Adding a project

Projects are self-registering. Create `src/projects/<slug>/` with:

- `meta.ts` exporting `meta: ProjectMeta` (see `src/projects/types.ts`): slug,
  kind (`project` | `writing`), title, ISO date, one-sentence `line`, optional
  `live` URL, `page: lazy(() => import("./Page"))`, and
  `preview: lazy(() => import("./Preview"))`.
- `Page.tsx`: the full page, built from `Article`, `Prose`, `Wide`, `Section`,
  `Fn`, `Footnotes`, `StatRow` and `Box`. Call `usePageMeta`.
- `Preview.tsx`: what the home feature panel shows when the entry is clicked
  in the list. Use the page's main map (for maplibre, `useMapLibre({ bounds,
  interactive: false })`, no controls, no popups, one fetch); with no map, the
  page's core chart. Export that figure from the page as a component taking an
  optional `h`, so the page and the preview share one source; the preview
  renders it without `h` and it fills the panel.
- Page-scoped CSS in the same folder, class names prefixed with the slug.

`src/projects/registry.ts` discovers every `meta.ts`, sorts newest first,
generates the routes, and feeds the home page lists. Clicking a list entry
previews it in the feature panel with its title, line and buttons beneath.
Double-clicking the entry, clicking the preview or "Read the write-up" opens
the article.

Data: the site has no backend, so live data must come from CORS-enabled public
APIs (Environment Agency flood-monitoring, TfL Unified API, Carbon Intensity
API, DfT road traffic API all allow `*`; OpenSky and adsb.lol do not). Static
datasets go in `public/data/` with the fetch script that produced them in
`scripts/`.

## Content rules

Every project page leads with the business insight, not the tech. Footnotes
carry sources. Nothing conversational on a rendered page. Contact is domain
email plus LinkedIn only.

**Tone guide.** Before writing or editing any prose in this project (article
body, ledes, headings, the `line` in each `meta.ts`, `usePageMeta`
descriptions, About), run the `/markc` skill (`~/.claude/skills/markc/`). Its
`tone-guide.md` is the Unsophisticated Investor template, first person
singular, and the section 6 list of AI tells; `.claude/tone-guide.md` here is
a symlink to it and is gitignored. Lint the result with
`bash ~/.claude/skills/markc/check.sh <file>` and walk the guide's section 8
checklist before finishing.

## Working rules

- **Personal repo.** Every commit, push, PR and merge here uses the GitHub
  account `steven-stills-dev`, authored `steven-stills-dev
  <stevenprusinskistills@gmail.com>`. The So Energy work account never touches
  this repo. Pin it per command with `GH_TOKEN=$(gh auth token -u
  steven-stills-dev)` and check `git config user.email` first (global
  CLAUDE.md, section 0).
- Read `git show main:<page>.html` for the pre-redesign content when migrating.
- `npm run build` must pass (tsc strict) before any commit.
- No AI attribution in commits. Confirm every commit message with Steven first.
