// Write dist/about.html, a copy of dist/index.html with its own title, description, canonical and
// Open Graph tags, so link previews and crawlers see the page without running the app.
// GitHub Pages serves dist/<path>.html at /<path> with a 200.
import { readFileSync, writeFileSync } from "node:fs";

const SITE = "https://stevenstills.com";
const NAME = "Steven Stills";
const html = readFileSync("dist/index.html", "utf8");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const field = (src, key) => {
  const m = src.match(new RegExp(`\\b${key}:\\s*("(?:[^"\\\\]|\\\\.)*")`));
  if (!m) throw new Error(`no ${key}`);
  return JSON.parse(m[1].replace(/\\'/g, "'"));
};
// swap one tag's value, failing loudly if index.html no longer carries the tag
const swap = (page, re, value) => {
  if (!re.test(page)) throw new Error(`tag not found: ${re}`);
  return page.replace(re, (_, a, b) => a + value + b);
};

function render({ path, title, description, image, type, date }) {
  let page = html;
  page = swap(page, /(<title>)[^<]*(<\/title>)/, esc(`${title} · ${NAME}`));
  page = swap(page, /(<meta name="description" content=")[^"]*(")/, esc(description));
  page = swap(page, /(<link rel="canonical" href=")[^"]*(")/, `${SITE}/${path}`);
  page = swap(page, /(<meta property="og:type" content=")[^"]*(")/, type);
  page = swap(page, /(<meta property="og:title" content=")[^"]*(")/, esc(title));
  page = swap(page, /(<meta property="og:description" content=")[^"]*(")/, esc(description));
  page = swap(page, /(<meta property="og:url" content=")[^"]*(")/, `${SITE}/${path}`);
  page = swap(page, /(<meta property="og:image" content=")[^"]*(")/, `${SITE}${image}`);
  if (date) page = page.replace("</head>", `  <meta property="article:published_time" content="${date}" />\n  </head>`);
  writeFileSync(`dist/${path}.html`, page);
}

const home = html.match(/<meta property="og:image" content="https:\/\/stevenstills\.com([^"]*)"/)?.[1];
if (!home) throw new Error("index.html needs an og:image");
render({ path: "about", title: "About", type: "website", image: home,
  description: "I give you clean insights into your data, helping you understand your domain, de-risk your margin and open up new revenue options." });
console.log("prerendered /about");
