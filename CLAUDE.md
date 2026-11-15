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

Ink on white, in the manner of a research publication: a serif display face over
a plain sans, flat grey figure panels, 6px corners, one cobalt accent that
belongs to the data.

- **Tokens** live in `src/styles.css` `:root`. Never hard-code a hex in a
  component; read the variable in SVG/CSS, or `token("--ste-...", ...)` for
  canvases (maplibre).
- **Palette**: `--ste-secondary` #2447F9 cobalt (the accent: links, the
  selected row, chart and map data marks), `--ste-primary` #D6DEFF pale cobalt
  (highlights, ramp start), `--ste-tertiary` #8C9EFF mid cobalt (third series),
  `--ste-midday` #FFFFFF page, `--ste-day` #F4F3F0 grey panels, `--ste-dusk`
  #5E6779 muted labels, `--ste-night` #1B2233 body text, `--ste-midnight`
  #0A0E1A headlines, buttons and the footer band, `--ste-alert` #E5484D stress
  marking only.
- **Typography**: Newsreader (`--serif`) at weight 400 for headlines, ledes,
  section headings, stat numerals and the wordmark; IBM Plex Sans (`--sans`)
  for everything else. Weights 400 to 600, sentence case, tabular figures.
- **Buttons** (`.btn`, `.links-row a`): Midnight fill with white text, `.ghost`
  for the secondary action. Chips are 32px hairline controls, Midnight when on.
- **Panels** (`Box`): `--panel` grey fill, 6px radius, no border, no shadow, a
  plain title row with the unit on the right.
- **Masthead** (`Nav`): serif wordmark, links and "Get in touch" over a
  hairline rule.
- **Footer**: full-width Midnight band with the email set large in the serif.
- **Charts**: `src/components/charts/`. Sized to the container (`useSize`),
  nice ticks (`geom.ts`), hover tooltip (`ChartTip`). Secondary vs Night for
  two-series comparisons, no multi-colour palettes, no gridlines, title in the
  panel header, unit on the axis, nothing else. Never bake annotations into
  the SVG.
- **Layout**: `.wrap` is 90rem with 48px gutters. Home is a two-column grid:
  headline, lede, button and the "Projects" and "Writing" index rows on the
  left, the selected entry's preview on a sticky stage on the right (switched
  by clicking a row, no auto-rotation; below 900px it stacks and a tap opens
  the entry). Articles are a 60rem column with one left edge: headline, `Prose`
  and `Wide` figures both at the full 60rem.
- **Brand mark**: serif wordmark in `Nav`; `public/img/initials.svg` (favicon)
  is a placeholder until the logo arrives.

## Adding a project

Projects are self-registering. Create `src/projects/<slug>/` with:

- `meta.ts` exporting `meta: ProjectMeta` (see `src/projects/types.ts`): slug,
  kind (`project` | `writing`), title, ISO date, one-sentence `line`, optional
  `live` URL, optional `pinned: true` (lists it under "Highlights" at the top
  of the home index instead of in the main list), `page: lazy(() => import("./Page"))`, and
  `preview: lazy(() => import("./Preview"))`.
- `Page.tsx`: the full page, built from `Article`, `Prose`, `Wide`, `Section`,
  `Fn`, `Footnotes`, `StatRow` and `Box`. Call `usePageMeta`.
- `Preview.tsx`: what the home stage shows when the entry is clicked
  in the index. Use the page's main map (for maplibre, `useMapLibre({ bounds,
  interactive: false })`, no controls, no popups, one fetch); with no map, the
  page's core chart. Export that figure from the page as a component taking an
  optional `h`, so the page and the preview share one source; the preview
  renders it without `h` and it fills the panel.
- Page-scoped CSS in the same folder, class names prefixed with the slug.

`src/projects/registry.ts` discovers every `meta.ts`, sorts newest first,
generates the routes, and feeds the home page index. Clicking an index row
previews it on the stage with its title, line and buttons beneath.
Double-clicking the entry, clicking the preview or "Read the write-up" opens
the article.

Data: the site has no backend, so live data must come from CORS-enabled public
APIs (Environment Agency flood-monitoring, TfL Unified API, Carbon Intensity
API, DfT road traffic API all allow `*`; OpenSky and adsb.lol do not). Static
datasets go in `public/data/` with the fetch script that produced them in
`scripts/`.

## Content rules

Titles are plain descriptive phrases in sentence case that say what the piece
is about ("Tracking ships in the Strait of Hormuz"): no questions, no two-part
titles, no drama. Every article opens with a clear description of the problem,
moves on to the working out, and closes with a short summary the reader can
act on. The voice is first person and reflective, personal but expert: what I
found and what I think, with the evidence, in place of flat verdicts. Footnotes
carry sources. Nothing conversational on a rendered page. Contact is email
plus LinkedIn only.

**Fact-check every claim.** Things compared must be the same kind of quantity
in the same unit (never price in £/MWh against demand in MWh, MW against MWh,
or a share against an absolute). Every number matches the page's data and its
footnote, causation is only claimed where it is shown, and dates and totals
add up. Cut a claim that cannot be repaired from the evidence.

**Tone guide.** Before writing or editing any prose in this project (article
body, ledes, headings, the `line` in each `meta.ts`, `usePageMeta`
descriptions, About), run the `/markc` skill (`~/.claude/skills/markc/`) for
its prose rules and its section 6 list of AI tells; `.claude/tone-guide.md`
here is a symlink to its `tone-guide.md` and is gitignored. The structure
above replaces the guide's sections 2 and 8 (cold open, numbers ladder,
claim-or-question titles, "What I take from this"). Lint the result with
`bash ~/.claude/skills/markc/check.sh <file>`.

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
