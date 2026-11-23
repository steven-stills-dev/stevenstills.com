# stevenstills.com

Personal site. Vite + React + TypeScript, static build deployed to GitHub Pages
at https://stevenstills.com. No backend.

The site is being rebuilt (November 2026) around daily bitesize facts and
images in a dashboard-style layout. Long articles are no longer part of it.

## Brand mantra

Steven's own words (22 November 2026). Every page, fact, label and design
choice on this site serves them. Do not reword them.

> Finding the right insights to build confidence in your data.

> I use my unique experience in front and back end development, in an
> AI-accelerated world, to bring design and engineering expertise together and
> build simple, digestible insights.

**Creed:** in a world that can make a million words, use ten to get straight
to the point. He gets there with an extensive design background and cloud
engineering expertise. In practice: the shortest copy that carries the point,
one idea per tile or page, and cut anything a reader does not need.

## Commands

```bash
npm install        # first time
npm run dev        # http://localhost:5173
npm run build      # tsc --noEmit && vite build -> dist/
```

Push to `main` deploys via `.github/workflows/deploy.yml` (Pages source must be
set to GitHub Actions in the repo settings).

## Home (the whole site, rebuilt 23 November 2026)

One page, a dashboard of panels: `src/pages/Home.tsx` and `src/pages/dash.css`.
`/about` and `/sample` redirect to it. `/brand` shows the colours.

- **Nav rail** (left; a bottom bar on phones): Home, Insights, Archive, About,
  then email and LinkedIn. One marker slides to the section in view.
- **Panels**: hero (name, headline, lede, the two buttons) beside the portrait;
  the insight grid, with the newest insight as the one Digital Blue featured
  panel; Archive (date and question); About (his three paragraphs and the
  buttons, so the page ends on how to reach him).
- **Sheet**: clicking any insight opens it in a `<dialog>` that grows from the
  panel clicked (`?i=<slug>`), with the figure, his one or two sentences and
  the source. Arrow keys and the two buttons step between insights.
- **Data**: `src/insights.ts`; figures draw with `src/components/Figure.tsx`.
  `scripts/seasonal-normal/build.py [MM-DD]` writes
  `src/data/seasonal-normal-MM-DD.json` (ERA5 hourly normals by decade).
- **Motion** follows the `ux-motion` skill: staggered entrance once, a pointer
  tilt and lift on insight panels, a squash on press, origin-aware sheet that
  closes faster than it opens, the figure drawing itself in the sheet, and
  everything reduced to fades under `prefers-reduced-motion`.
- **One corner radius**: every element uses `--r` (24px, set on `.dash`).
  Steven asked for uniform corners on 23 November 2026; never add a second
  radius.
- The colour tokens (`--b-*`) and easing curves live in `src/styles.css`.
  The "Design system" section below describes the older ink-on-white pages
  and the archived articles' components, not this page.

### Hard rules for cards and colour (Steven, 23 November 2026)

He has raised both more than once. Check every change against them before
showing it.

- **A card shows only the question Steven answers or the insight he gives**,
  in his words, with its figure. No headline number, no caption, no label,
  no summary line, no invented title. If his wording for a card does not
  exist yet, ask him for it; do not draft one. `Insight` in `src/insights.ts`
  has no field for extra text on purpose: do not add one.
- **Colour is a hierarchy, not a set.** Parchment (every panel, on a page tinted with Dust Grey) and Ink Black
  (text, the nav rail, the one solid button) do most of the work. Digital Blue is the single accent: the
  one featured panel, and the one mark to look at in a figure. Vibrant Coral is minor: for the warm line of a
  temperature figure. Never give cards, sections or series a colour each, and
  never rotate through the palette. `/brand` shows the proportions.

## Archive

`archive/` holds the retired articles and everything that only they used. It
mirrors the repo root (`archive/src/projects`, `archive/public/data`,
`archive/public/img`, `archive/scripts`), sits outside `src/` and `public/`, and
so is neither type-checked, bundled nor deployed. Do not import from it and do
not edit it unless Steven asks. To restore an article, move its folders back to
the same paths under the root and re-add the route.

## Design system

Ink on white, in the manner of a research publication: sans-serif type
throughout, flat grey figure panels, 6px corners, one cobalt accent that
belongs to the data.

- **Tokens** live in `src/styles.css` `:root`. Never hard-code a hex in a
  component; read the variable in SVG/CSS, or `token("--ste-...", ...)` for
  canvases (maplibre).
- **Palette**: `--ste-secondary` #2447F9 cobalt (the accent: links, the
  selected row, chart and map data marks), `--ste-primary` #D6DEFF pale cobalt
  (highlights, ramp start), `--ste-tertiary` #8C9EFF mid cobalt (third series),
  `--ste-midday` #FFFFFF page, `--ste-day` #F4F3F0 grey panels, `--ste-dusk`
  #5E6779 muted labels, `--ste-night` #1B2233 body text, `--ste-midnight`
  #0A0E1A headlines and buttons, `--ste-alert` #E5484D stress
  marking only.
- **Typography**: three tokens, `--display` (headlines, the wordmark),
  `--heading` (section headings, stat numerals) and `--sans` (body, ledes,
  everything else). Defaults are Schibsted Grotesk at weight 600 for display
  and heading, Source Sans 3 for body. Sentence case, tabular figures.
- **Design tray** (`DesignTray`): open any page with `?tray` to try 15 Google
  sans fonts per token and copy the choice as JSON. Fonts listed in `FONTS`;
  the defaults also live in `index.html`'s font link and `styles.css`.
- **Buttons** (`.btn`, `.links-row a`): Midnight fill with white text, `.ghost`
  for the secondary action. Chips are 32px hairline controls, Midnight when on.
- **Panels** (`Box`): `--panel` grey fill, 6px radius, no border, no shadow, a
  plain title row with the unit on the right.
- **Masthead** (`Nav`): wordmark, links and "Get in touch" over a
  hairline rule.
- **Footer**: full-width Day grey band, email, LinkedIn and copyright at 0.875rem.
- **Charts**: `src/components/charts/`. Sized to the container (`useSize`),
  nice ticks (`geom.ts`), hover tooltip (`ChartTip`). Secondary vs Night for
  two-series comparisons, no multi-colour palettes, no gridlines, title in the
  panel header, unit on the axis, nothing else. Never bake annotations into
  the SVG.
- **Layout**: `.wrap` is 90rem with 48px gutters. Home and About share
  `.split`: text on a 42rem measure beside the portrait, centred in the
  viewport; below 900px it stacks. One `.headline` and one `.lede` size for
  both pages.
- **Brand mark**: wordmark in `Nav`; `public/img/initials.svg` (favicon)
  is a placeholder until the logo arrives.

## Data

The site has no backend, so live data must come from CORS-enabled public
APIs (Environment Agency flood-monitoring, TfL Unified API, Carbon Intensity
API, DfT road traffic API all allow `*`; OpenSky and adsb.lol do not). Static
datasets go in `public/data/` with the fetch script that produced them in
`scripts/`.

## Content rules

Nothing conversational on a rendered page. Contact is email plus LinkedIn only.

**Fact-check every claim.** Things compared must be the same kind of quantity
in the same unit (never price in £/MWh against demand in MWh, MW against MWh,
or a share against an absolute). Every number matches the page's data and its
source, causation is only claimed where it is shown, and dates and totals
add up. Cut a claim that cannot be repaired from the evidence.

## Working rules

- **Personal repo.** Every commit, push, PR and merge here uses the GitHub
  account `steven-stills-dev`, authored `steven-stills-dev
  <stevenprusinskistills@gmail.com>`. The So Energy work account never touches
  this repo. Pin it per command with `GH_TOKEN=$(gh auth token -u
  steven-stills-dev)` and check `git config user.email` first (global
  CLAUDE.md, section 0).
- `npm run build` must pass (tsc strict) before any commit.
- No AI attribution in commits. Confirm every commit message with Steven first.
