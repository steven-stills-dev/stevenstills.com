# stevenstills.com

Personal portfolio site for a data and statistics specialist in the energy
sector. Vite + React + TypeScript, deployed to GitHub Pages with a custom domain.

## Run locally

```bash
npm install
npm run dev
```

## Build and deploy

```bash
npm run build     # type-check, then build to dist/
```

Push to `main` and `.github/workflows/deploy.yml` builds and publishes `dist/`.
The workflow copies `index.html` to `404.html` so client-side routes resolve on
GitHub Pages. Repo settings: Pages source = GitHub Actions; custom domain from
`public/CNAME`.

## Structure

```
index.html                 app shell
src/main.tsx, App.tsx      entry and routes
src/styles.css             tokens and all styling
src/lib/                   Hormuz API client, helpers
src/components/            Nav, Layout, Box, Thumb, Article, AboutHero
src/components/charts/     AreaChart, LineChart, PillBars, ChartTip, geom
src/components/maps/       UKMap, HormuzMap, useMapLibre, uk-geo
src/pages/                 Home and About
public/img/                photos
archive/                   retired articles with their data, images and scripts; not built or deployed
public/CNAME               custom domain
```
