# stevenstills.com

Personal portfolio site for a data and statistics specialist in the energy
sector. Vite + React + TypeScript, deployed to GitHub Pages with a custom domain.

Live projects run on their own backends at their own subdomains (for example
`hormuz.stevenstills.com`); this site links to them and writes them up. The home
page previews the newest project in its feature panel.

## Run locally

```bash
npm install
npm run dev
```

The dev server proxies `/hormuz-api` to the live tracker so the home map works
without CORS.

## Build and deploy

```bash
npm run build     # type-check, then build to dist/
```

Push to `main` and `.github/workflows/deploy.yml` builds and publishes `dist/`.
The workflow copies `index.html` to `404.html` so client-side routes resolve on
GitHub Pages. Repo settings: Pages source = GitHub Actions; custom domain from
`public/CNAME`.

## Design tray

Press Ctrl+B+G on any page to open the design tray: one primary colour and the
typography roles, edited live and saved to your browser. Copy JSON exports the
current values to bake into `src/lib/design.ts`.

## Structure

```
index.html                 app shell
src/main.tsx, App.tsx      entry and routes
src/styles.css             tokens and all styling
src/lib/                   design config, Hormuz API client, helpers
src/components/            Nav, Layout, Box, Thumb, Article, AboutHero, DesignTray
src/components/charts/     AreaChart, LineChart, PillBars, ChartTip, geom
src/components/maps/       UKMap, HormuzMap, useMapLibre, uk-geo
src/pages/                 Home and About
src/projects/<slug>/       one folder per project or article: meta, Page, Preview, CSS
public/data/               static datasets, built by the fetch scripts in scripts/
public/img/                photos and screenshots
public/CNAME               custom domain
```
