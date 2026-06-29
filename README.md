# stevenstills.com

Static personal portfolio site for a data & statistics specialist in the energy
sector. Companion to my CV. Hand-written HTML/CSS, no build step, hosted on GitHub
Pages with a custom domain (added later).

## What this is

A **static hub**. It has no backend of its own. Each featured project runs on its
own backend at its own subdomain (e.g. `hormuz.stevenstills.com`); this site links
to those, shows screenshots, and writes them up. Every project page leads with the
**business insight** the data reveals — not the tech.

## Structure

```
index.html          Projects landing page (the site's home)
about.html          About page
hormuz.html         Hormuz Tracker project write-up
assets/css/         Stylesheets
assets/js/          Scripts (only if/when needed)
assets/img/         Screenshots, headshot
.nojekyll           Tells GitHub Pages to serve files as-is (no Jekyll processing)
CLAUDE.md           Durable brand + working rules for this repo
```

## Preview locally

No build step. Either:

- **Open directly:** double-click `index.html` (or open it in a browser).
- **Tiny local server** (better for correct relative paths / fetch):
  ```bash
  python3 -m http.server 8000
  # then visit http://localhost:8000
  ```

Preview and iterate locally **before** buying the domain or pushing anything.

## Design Tray (temporary tool)

While iterating on the look, press **Ctrl+B** on any page to open a slide-in panel for
live-editing fonts, weights, spacing, sizes and colours. It saves to your browser
(localStorage), can **Copy CSS** / **Apply pasted CSS**, and has **Restore defaults**.

It's pure client-side JS — no backend. **Remove before go-live:** delete
`assets/js/design-tray.js` and the one commented `<script ... design-tray.js>` line in
each HTML page.

## Deploy notes (later)

1. Push the repo to GitHub.
2. Enable GitHub Pages (Settings → Pages) from the default branch.
3. When the domain is purchased, add a `CNAME` file at the repo root containing just
   the domain (e.g. `stevenstills.com`) and configure DNS. **Not added yet** — the
   domain isn't bought.

## Note

All content is public. Never commit secrets. Contact details are limited to a domain
email + LinkedIn (no phone number).
