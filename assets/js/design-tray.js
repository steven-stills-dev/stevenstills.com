/* =========================================================================
   DESIGN TRAY  —  TEMPORARY design-exploration tool. REMOVE BEFORE GO-LIVE.

   To remove entirely:
     1. Delete this file (assets/js/design-tray.js).
     2. Delete the <script ... design-tray.js> line from every HTML page.
   Nothing else references it. The site's own CSS variables live in style.css.

   What it does: slides in from the right (toggle with Ctrl+B) and lets you
   live-edit every typography + colour token. It writes ONLY to CSS custom
   properties on :root and lazy-loads Google Fonts. The tray's own styling is
   hardcoded and isolated, so changing the scheme never restyles the tray.

   Persistence: choices are saved to localStorage and re-applied on reload.
   Export: "Copy CSS" puts a :root{...} block on your clipboard.
   Import: paste a :root{...} block and hit "Apply pasted CSS".
   Reset:  "Restore defaults" reverts to style.css and clears saved state.
   ========================================================================= */
(function () {
  "use strict";

  var STORE_KEY = "ss-design-tray-v2";  /* bump to discard stale saved overrides */

  /* ---- Font catalogue: 2 UI-leading, 8 serif, 8 sans, 4 wildcard -------- */
  var FONTS = [
    // UI-leading
    { name: "Inter",            cat: "ui",    q: "Inter:wght@300..800",                              fb: "system-ui, sans-serif" },
    { name: "IBM Plex Sans",    cat: "ui",    q: "IBM+Plex+Sans:wght@300;400;500;600;700",           fb: "system-ui, sans-serif" },
    // Serif
    { name: "Fraunces",         cat: "serif", q: "Fraunces:opsz,wght@9..144,300..900",               fb: "Georgia, serif" },
    { name: "Newsreader",       cat: "serif", q: "Newsreader:opsz,wght@6..72,300..800",              fb: "Georgia, serif" },
    { name: "Source Serif 4",   cat: "serif", q: "Source+Serif+4:opsz,wght@8..60,300..800",          fb: "Georgia, serif" },
    { name: "Lora",             cat: "serif", q: "Lora:wght@400..700",                                fb: "Georgia, serif" },
    { name: "Playfair Display", cat: "serif", q: "Playfair+Display:wght@400..900",                   fb: "Georgia, serif" },
    { name: "Spectral",         cat: "serif", q: "Spectral:wght@300;400;500;600;700;800",            fb: "Georgia, serif" },
    { name: "Bitter",           cat: "serif", q: "Bitter:wght@300..800",                             fb: "Georgia, serif" },
    { name: "Crimson Pro",      cat: "serif", q: "Crimson+Pro:wght@300..700",                        fb: "Georgia, serif" },
    // Sans
    { name: "Work Sans",        cat: "sans",  q: "Work+Sans:wght@300..800",                          fb: "system-ui, sans-serif" },
    { name: "Manrope",          cat: "sans",  q: "Manrope:wght@300..800",                            fb: "system-ui, sans-serif" },
    { name: "DM Sans",          cat: "sans",  q: "DM+Sans:opsz,wght@9..40,300..800",                 fb: "system-ui, sans-serif" },
    { name: "Space Grotesk",    cat: "sans",  q: "Space+Grotesk:wght@300..700",                      fb: "system-ui, sans-serif" },
    { name: "Plus Jakarta Sans",cat: "sans",  q: "Plus+Jakarta+Sans:wght@300..800",                  fb: "system-ui, sans-serif" },
    { name: "Outfit",           cat: "sans",  q: "Outfit:wght@300..800",                             fb: "system-ui, sans-serif" },
    { name: "Sora",             cat: "sans",  q: "Sora:wght@300..800",                               fb: "system-ui, sans-serif" },
    { name: "Figtree",          cat: "sans",  q: "Figtree:wght@300..800",                            fb: "system-ui, sans-serif" },
    // Wildcard
    { name: "Unbounded",        cat: "wild",  q: "Unbounded:wght@300..800",                          fb: "sans-serif" },
    { name: "Syne",             cat: "wild",  q: "Syne:wght@400..800",                               fb: "sans-serif" },
    { name: "JetBrains Mono",   cat: "wild",  q: "JetBrains+Mono:wght@300..800",                     fb: "monospace" },
    { name: "Instrument Serif", cat: "wild",  q: "Instrument+Serif:ital@0;1",                        fb: "serif" }
  ];
  var FONT_BY_NAME = {};
  FONTS.forEach(function (f) { FONT_BY_NAME[f.name] = f; });
  var CAT_LABEL = { ui: "UI-leading", serif: "Serif", sans: "Sans-serif", wild: "Wildcard" };

  /* ---- Controlled tokens ------------------------------------------------ */
  var COLORS = [
    ["--bg", "Paper (bg)"], ["--surface", "Sand (cards)"], ["--fg", "Body — coal"],
    ["--heading", "Headers — coal"], ["--subtitle", "Subtitles — red"],
    ["--accent", "Links — blue"], ["--muted", "Muted text"],
    ["--accent-soft", "Accent tint"], ["--rule", "Rule / borders"]
  ];
  // [var, label, min, max, step, unit]
  var HEAD_RANGES = [
    ["--heading-weight", "Weight", 100, 900, 10, ""],
    ["--heading-tracking", "Letter-spacing", -0.05, 0.12, 0.005, "em"],
    ["--heading-scale", "Size scale", 0.7, 1.6, 0.02, ""],
    ["--heading-mt", "Margin top", 0, 1.5, 0.05, "em"],
    ["--heading-mb", "Margin bottom", 0, 1.5, 0.05, "em"]
  ];
  var BODY_RANGES = [
    ["--body-weight", "Weight", 100, 900, 10, ""],
    ["--body-tracking", "Letter-spacing", -0.03, 0.1, 0.005, "em"],
    ["--body-size", "Font size", 0.85, 1.4, 0.01, "rem"],
    ["--line-height", "Line height", 1.2, 2.1, 0.02, ""]
  ];
  var QUOTE_RANGES = [
    ["--quote-weight", "Weight", 100, 900, 10, ""],
    ["--quote-tracking", "Letter-spacing", -0.05, 0.12, 0.005, "em"],
    ["--quote-size", "Font size", 0.6, 1.6, 0.01, "rem"],
    ["--quote-line", "Line height", 1.0, 2.1, 0.02, ""]
  ];
  var ALL_VARS = []
    .concat(COLORS.map(function (c) { return c[0]; }))
    .concat(HEAD_RANGES.map(function (r) { return r[0]; }))
    .concat(BODY_RANGES.map(function (r) { return r[0]; }))
    .concat(QUOTE_RANGES.map(function (r) { return r[0]; }))
    .concat(["--font-heading", "--font-body", "--font-quote"]);

  var root = document.documentElement;
  var DEFAULTS = {};          // captured from style.css at load
  var DEFAULT_FONTS = { heading: "Fraunces", body: "Inter", quote: "Inter" };
  var FONT_VAR = { heading: "--font-heading", body: "--font-body", quote: "--font-quote" };
  var FONT_TARGETS = ["heading", "body", "quote"];
  var loadedFonts = {};       // q -> true

  function getVar(name) {
    return getComputedStyle(root).getPropertyValue(name).trim();
  }
  function setVar(name, value) { root.style.setProperty(name, value); }

  /* ---- Persistence ------------------------------------------------------ */
  function saveState() {
    var vars = {};
    ALL_VARS.forEach(function (v) {
      var inline = root.style.getPropertyValue(v).trim();
      if (inline) vars[v] = inline;
    });
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ vars: vars, fonts: state.fonts }));
    } catch (e) { /* private mode etc. — ignore */ }
  }
  function loadState() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  var state = { fonts: { heading: DEFAULT_FONTS.heading, body: DEFAULT_FONTS.body, quote: DEFAULT_FONTS.quote } };

  /* ---- Fonts ------------------------------------------------------------ */
  function loadFont(font) {
    if (!font || loadedFonts[font.q]) return;
    loadedFonts[font.q] = true;
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=" + font.q + "&display=swap";
    document.head.appendChild(link);
  }
  function applyFont(target, name) {
    var font = FONT_BY_NAME[name];
    if (!font) return;
    loadFont(font);
    setVar(FONT_VAR[target], '"' + name + '", ' + font.fb);
    state.fonts[target] = name;
  }
  function firstFamily(stack) {
    if (!stack) return null;
    var m = stack.match(/"([^"]+)"|'([^']+)'|^\s*([^,]+)/);
    if (!m) return null;
    return (m[1] || m[2] || m[3] || "").trim();
  }

  /* ===================================================================== */
  /*  UI                                                                   */
  /* ===================================================================== */
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "text") n.textContent = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { n.appendChild(c); });
    return n;
  }

  var refs = { colors: {}, ranges: {}, fonts: {} };

  function buildColorRow(varName, label) {
    var input = el("input", { type: "color" });
    input.value = normalizeHex(getVar(varName)) || "#000000";
    input.addEventListener("input", function () { setVar(varName, input.value); saveState(); });
    refs.colors[varName] = input;
    var row = el("label", { class: "dt-row" }, [el("span", { text: label }), input]);
    return row;
  }

  function buildRangeRow(cfg) {
    var varName = cfg[0], label = cfg[1], min = cfg[2], max = cfg[3], step = cfg[4], unit = cfg[5];
    var cur = parseFloat(getVar(varName));
    if (isNaN(cur)) cur = min;
    var out = el("span", { class: "dt-val", text: fmt(cur, unit) });
    var input = el("input", { type: "range", min: min, max: max, step: step });
    input.value = cur;
    input.addEventListener("input", function () {
      setVar(varName, input.value + unit);
      out.textContent = fmt(parseFloat(input.value), unit);
      saveState();
    });
    refs.ranges[varName] = { input: input, out: out, unit: unit };
    return el("label", { class: "dt-row dt-range" }, [
      el("span", { text: label }), out, input
    ]);
  }

  function buildFontSelect(target) {
    var sel = el("select", {});
    ["ui", "serif", "sans", "wild"].forEach(function (cat) {
      var og = el("optgroup", { label: CAT_LABEL[cat] });
      FONTS.filter(function (f) { return f.cat === cat; }).forEach(function (f) {
        og.appendChild(el("option", { value: f.name, text: f.name }));
      });
      sel.appendChild(og);
    });
    sel.value = state.fonts[target];
    sel.addEventListener("change", function () { applyFont(target, sel.value); saveState(); });
    refs.fonts[target] = sel;
    return el("label", { class: "dt-row" }, [el("span", { text: "Font" }), sel]);
  }

  function fmt(n, unit) {
    var s = (Math.round(n * 1000) / 1000).toString();
    return s + (unit || "");
  }
  function normalizeHex(v) {
    if (!v) return null;
    v = v.trim();
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) {
      if (v.length === 4) v = "#" + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
      return v.toLowerCase();
    }
    return null; // non-hex (rgb/named) — color input can't show it; leave as-is
  }

  function section(title, rows) {
    return el("section", { class: "dt-sec" },
      [el("h4", { text: title })].concat(rows));
  }

  function buildTray() {
    var style = el("style", {});
    style.textContent = TRAY_CSS;
    document.head.appendChild(style);

    var panel = el("aside", { id: "dtray", "aria-hidden": "true" });

    // Header
    var close = el("button", { class: "dt-x", title: "Close (Ctrl+B)", text: "×" });
    close.addEventListener("click", toggle);
    panel.appendChild(el("header", { class: "dt-head" }, [
      el("strong", { text: "Design Tray" }), close
    ]));

    var body = el("div", { class: "dt-body" });

    // Colours
    body.appendChild(section("Colour scheme",
      COLORS.map(function (c) { return buildColorRow(c[0], c[1]); })));

    // Headings
    body.appendChild(section("Headings",
      [buildFontSelect("heading")].concat(HEAD_RANGES.map(buildRangeRow))));

    // Body
    body.appendChild(section("Body text",
      [buildFontSelect("body")].concat(BODY_RANGES.map(buildRangeRow))));

    // Quotations
    body.appendChild(section("Quotations",
      [buildFontSelect("quote")].concat(QUOTE_RANGES.map(buildRangeRow))));

    // Export / Import
    var copyBtn = el("button", { class: "dt-btn", text: "Copy CSS" });
    var resetBtn = el("button", { class: "dt-btn dt-btn-warn", text: "Restore defaults" });
    var status = el("div", { class: "dt-status", text: "" });
    var ta = el("textarea", { class: "dt-ta", rows: "7", spellcheck: "false",
      placeholder: "Paste a :root{ ... } block here, then Apply" });
    var applyBtn = el("button", { class: "dt-btn", text: "Apply pasted CSS" });

    copyBtn.addEventListener("click", function () {
      var css = exportCSS();
      ta.value = css;
      copyToClipboard(css, status);
    });
    resetBtn.addEventListener("click", function () { restoreDefaults(); flash(status, "Restored defaults"); });
    applyBtn.addEventListener("click", function () {
      var n = importCSS(ta.value);
      flash(status, n ? ("Applied " + n + " value" + (n === 1 ? "" : "s")) : "No tokens found");
    });

    body.appendChild(section("Export / import", [
      el("div", { class: "dt-btnrow" }, [copyBtn, resetBtn]),
      ta, applyBtn, status
    ]));

    panel.appendChild(body);

    document.body.appendChild(panel);
    return panel;
  }

  function flash(node, msg) {
    node.textContent = msg;
    node.classList.add("on");
    setTimeout(function () { node.classList.remove("on"); }, 1600);
  }

  function copyToClipboard(text, status) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { flash(status, "Copied CSS to clipboard"); },
        function () { flash(status, "Copy failed — select & copy from box"); }
      );
    } else {
      flash(status, "Clipboard unavailable — copy from box");
    }
  }

  /* ---- Export / Import / Reset ------------------------------------------ */
  function exportCSS() {
    var qs = [];                                  // dedupe font queries across targets
    FONT_TARGETS.forEach(function (t) {
      var q = FONT_BY_NAME[state.fonts[t]].q;
      if (qs.indexOf(q) === -1) qs.push(q);
    });
    var link = "https://fonts.googleapis.com/css2?family=" + qs.join("&family=") + "&display=swap";
    var lines = ["/* Fonts — add to <head> if not already present:",
      '   <link rel="stylesheet" href="' + link + '"> */',
      ":root {"];
    ALL_VARS.forEach(function (v) {
      var val = root.style.getPropertyValue(v).trim() || getVar(v);
      lines.push("  " + v + ": " + val + ";");
    });
    lines.push("}");
    return lines.join("\n");
  }

  function importCSS(text) {
    if (!text) return 0;
    var re = /--([\w-]+)\s*:\s*([^;{}]+);?/g, m, count = 0, known = {};
    ALL_VARS.forEach(function (v) { known[v] = true; });
    while ((m = re.exec(text)) !== null) {
      var name = "--" + m[1], val = m[2].trim();
      if (!known[name]) continue;
      setVar(name, val);
      count++;
    }
    // re-detect fonts from applied vars + load them
    FONT_TARGETS.forEach(function (t) {
      var stack = root.style.getPropertyValue(FONT_VAR[t]);
      var fam = firstFamily(stack);
      if (fam && FONT_BY_NAME[fam]) { state.fonts[t] = fam; loadFont(FONT_BY_NAME[fam]); }
    });
    syncControls();
    saveState();
    return count;
  }

  function restoreDefaults() {
    ALL_VARS.forEach(function (v) { root.style.removeProperty(v); });
    state.fonts = { heading: DEFAULT_FONTS.heading, body: DEFAULT_FONTS.body, quote: DEFAULT_FONTS.quote };
    try { localStorage.removeItem(STORE_KEY); } catch (e) {}
    syncControls();
  }

  /* ---- Sync inputs from current values ---------------------------------- */
  function syncControls() {
    COLORS.forEach(function (c) {
      var hx = normalizeHex(getVar(c[0]));
      if (hx && refs.colors[c[0]]) refs.colors[c[0]].value = hx;
    });
    Object.keys(refs.ranges).forEach(function (v) {
      var r = refs.ranges[v], n = parseFloat(getVar(v));
      if (!isNaN(n)) { r.input.value = n; r.out.textContent = fmt(n, r.unit); }
    });
    FONT_TARGETS.forEach(function (t) {
      if (refs.fonts[t]) refs.fonts[t].value = state.fonts[t];
    });
  }

  /* ---- Toggle ----------------------------------------------------------- */
  var trayEl = null, open = false;
  function toggle() {
    open = !open;
    trayEl.classList.toggle("open", open);
    trayEl.setAttribute("aria-hidden", open ? "false" : "true");
  }

  /* ---- Init ------------------------------------------------------------- */
  function init() {
    // 1. capture true defaults from style.css
    ALL_VARS.forEach(function (v) { DEFAULTS[v] = getVar(v); });
    // 2. apply saved state (if any) before building UI
    var saved = loadState();
    if (saved) {
      if (saved.vars) Object.keys(saved.vars).forEach(function (v) { setVar(v, saved.vars[v]); });
      if (saved.fonts) {
        state.fonts.heading = saved.fonts.heading || DEFAULT_FONTS.heading;
        state.fonts.body = saved.fonts.body || DEFAULT_FONTS.body;
        state.fonts.quote = saved.fonts.quote || DEFAULT_FONTS.quote;
      }
      // ensure saved fonts are actually loaded
      FONT_TARGETS.forEach(function (t) { loadFont(FONT_BY_NAME[state.fonts[t]]); });
    }
    // 3. build the tray reflecting current values
    trayEl = buildTray();
    syncControls();
    // 4. keybinding: Ctrl+B
    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey &&
          (e.key === "b" || e.key === "B")) {
        e.preventDefault();
        toggle();
      }
    });
  }

  var TRAY_CSS =
  "#dtray{position:fixed;top:0;right:0;height:100vh;width:330px;max-width:90vw;" +
  "background:#15171c;color:#e8eaed;font:13px/1.4 -apple-system,system-ui,Segoe UI,Roboto,sans-serif;" +
  "letter-spacing:0;box-shadow:-12px 0 40px rgba(0,0,0,.35);transform:translateX(102%);" +
  "transition:transform .26s cubic-bezier(.4,0,.2,1);z-index:99999;display:flex;flex-direction:column;}" +
  "#dtray.open{transform:translateX(0);}" +
  "#dtray *{box-sizing:border-box;}" +
  "#dtray .dt-head{display:flex;align-items:center;justify-content:space-between;" +
  "padding:14px 16px;border-bottom:1px solid #2a2e37;flex:0 0 auto;}" +
  "#dtray .dt-head strong{font-size:14px;letter-spacing:.02em;}" +
  "#dtray .dt-x{background:none;border:none;color:#9aa0aa;font-size:22px;line-height:1;cursor:pointer;padding:0 4px;}" +
  "#dtray .dt-x:hover{color:#fff;}" +
  "#dtray .dt-body{overflow-y:auto;padding:6px 16px 16px;flex:1 1 auto;}" +
  "#dtray .dt-sec{padding:14px 0;border-bottom:1px solid #23262e;}" +
  "#dtray .dt-sec h4{margin:0 0 10px;font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#8b919c;}" +
  "#dtray .dt-row{display:flex;align-items:center;gap:10px;margin:8px 0;}" +
  "#dtray .dt-row>span:first-child{flex:0 0 92px;color:#c2c6cd;}" +
  "#dtray .dt-row.dt-range>span:first-child{flex:0 0 84px;}" +
  "#dtray input[type=color]{flex:1 1 auto;height:26px;padding:0;border:1px solid #353a44;border-radius:4px;background:#0e1014;cursor:pointer;}" +
  "#dtray input[type=range]{flex:1 1 auto;accent-color:#6aa3ff;cursor:pointer;}" +
  "#dtray select{flex:1 1 auto;background:#0e1014;color:#e8eaed;border:1px solid #353a44;border-radius:4px;padding:5px 6px;font:inherit;cursor:pointer;}" +
  "#dtray .dt-val{flex:0 0 56px;text-align:right;color:#8b919c;font-variant-numeric:tabular-nums;}" +
  "#dtray .dt-btnrow{display:flex;gap:8px;margin-bottom:10px;}" +
  "#dtray .dt-btn{flex:1 1 auto;background:#2563eb;color:#fff;border:none;border-radius:5px;padding:8px 10px;font:inherit;font-weight:600;cursor:pointer;}" +
  "#dtray .dt-btn:hover{background:#1d4ed8;}" +
  "#dtray .dt-btn-warn{background:#3a2020;color:#ffb4a8;}" +
  "#dtray .dt-btn-warn:hover{background:#4a2828;}" +
  "#dtray .dt-ta{width:100%;background:#0e1014;color:#cdd2da;border:1px solid #353a44;border-radius:5px;" +
  "padding:8px;font:12px/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;resize:vertical;margin-bottom:8px;}" +
  "#dtray .dt-status{min-height:16px;font-size:12px;color:#6ad08a;opacity:0;transition:opacity .2s;margin-top:6px;}" +
  "#dtray .dt-status.on{opacity:1;}";

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
