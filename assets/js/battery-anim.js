/* =========================================================================
   BATTERY ANIMATION — "what a battery does", rendered entirely in coal.

   A marker sweeps an illustrative day of half-hourly prices. The battery fills
   (cells fill, coal solid) through the cheap hours and drains into the dear
   evening peak. Monochrome only: line-hatch marks charge half-hours, dot-hatch
   marks discharge half-hours, a dotted marker tracks the price. Adapted from
   the kraken-dash BatteryFlow animation (colour stripped to brand coal).
   Honours prefers-reduced-motion by rendering a single static frame.
   ========================================================================= */
(function () {
  "use strict";

  /* illustrative hourly price shape, £/MWh: overnight low, midday solar dip,
     dear evening peak. Shape is the teaching point, not a specific day. */
  var P = [48,45,43,42,44,52,70,95,88,72,55,42,38,40,46,60,85,120,140,135,110,82,62,52];
  var LABELS = P.map(function (_, h) { return (h < 10 ? "0" + h : h) + ":00"; });
  var N = P.length, CELLS = 12;

  function cssVar(n, f) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    return v || f;
  }
  function lerp(a, b, f) { return a + (b - a) * f; }
  function quantile(arr, q) {
    var s = arr.slice().sort(function (a, b) { return a - b; });
    return s[Math.min(s.length - 1, Math.floor(q * (s.length - 1)))];
  }

  // charge in the cheapest periods, discharge in the dearest, idle between;
  // state of charge is the running integral of those moves (as in battery.py).
  var HI = quantile(P, 0.62), LO = quantile(P, 0.38);
  var SCHEDULE = P.map(function (p) { return p >= HI ? "discharge" : p <= LO ? "charge" : "idle"; });
  var rate = P.map(function (p) { return p >= HI ? -1 : p <= LO ? 1 : 0; });
  var raw = [], acc = 0;
  rate.forEach(function (r) { acc += r; raw.push(acc); });
  var rmin = Math.min.apply(null, raw), rmax = Math.max.apply(null, raw);
  var SOC = raw.map(function (r) { return rmax > rmin ? 0.15 + (r - rmin) / (rmax - rmin) * 0.65 : 0.5; });

  var W = 720, H = 320, X0 = 42, X1 = 700, TY0 = 22, TY1 = 150;
  var pmin = Math.min.apply(null, P), pmax = Math.max.apply(null, P), span = pmax - pmin || 1;
  function PX(k) { return X0 + (k / (N - 1)) * (X1 - X0); }
  function PY(p) { return TY0 + (1 - (p - pmin) / span) * (TY1 - TY0); }
  var pw = (X1 - X0) / N;

  var host = document.getElementById("battery-anim");
  if (!host) return;

  var COAL = cssVar("--times-coal", "#333333");
  var GREY = cssVar("--times-grey", "#66605c");
  var LINE = cssVar("--times-line", "#e7d3c1");

  // static scaffold (defs, gridlines, period shading, price line, axis) built once
  function scaffold() {
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" ' +
      'aria-label="A battery charging through cheap hours and discharging into the dear evening peak">';
    s += '<defs>' +
      '<pattern id="bh-line" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
        '<line x1="0" y1="0" x2="0" y2="6" stroke="' + COAL + '" stroke-width="1" opacity="0.35"/></pattern>' +
      '<pattern id="bh-dot" width="6" height="6" patternUnits="userSpaceOnUse">' +
        '<circle cx="1.5" cy="1.5" r="1" fill="' + COAL + '" opacity="0.4"/></pattern>' +
      '</defs>';
    // period shading: line-hatch = charge, dot-hatch = discharge
    SCHEDULE.forEach(function (a, k) {
      if (a === "idle") return;
      s += '<rect x="' + (PX(k) - pw / 2).toFixed(1) + '" y="' + TY0 + '" width="' + pw.toFixed(1) +
           '" height="' + (TY1 - TY0) + '" fill="url(#' + (a === "charge" ? "bh-line" : "bh-dot") + ')"/>';
    });
    // baseline + price line
    s += '<line x1="' + X0 + '" y1="' + TY1 + '" x2="' + X1 + '" y2="' + TY1 + '" stroke="' + LINE + '" stroke-width="1"/>';
    var d = P.map(function (p, k) { return (k ? "L" : "M") + PX(k).toFixed(1) + "," + PY(p).toFixed(1); }).join(" ");
    s += '<path d="' + d + '" fill="none" stroke="' + COAL + '" stroke-width="2" stroke-linejoin="round"/>';
    s += '<text x="' + X0 + '" y="14" font-size="11" fill="' + GREY + '">£/MWh</text>';
    // legend for the two hatches
    s += '<g transform="translate(' + (X1 - 196) + ',8)">' +
      '<rect x="0" y="-6" width="14" height="10" fill="url(#bh-line)" stroke="' + LINE + '"/>' +
      '<text x="18" y="3" font-size="10.5" fill="' + GREY + '">charge (cheap)</text>' +
      '<rect x="104" y="-6" width="14" height="10" fill="url(#bh-dot)" stroke="' + LINE + '"/>' +
      '<text x="122" y="3" font-size="10.5" fill="' + GREY + '">discharge (dear)</text></g>';
    s += '<g id="bh-dynamic"></g></svg>';
    return s;
  }

  host.innerHTML = scaffold();
  var dyn = host.querySelector("#bh-dynamic");
  var BASE = TY1; // battery sits below the chart

  // dynamic layer for a given continuous time t in [0, N)
  function frame(t) {
    var i = Math.floor(t) % N, f = t - Math.floor(t), j = Math.min(i + 1, N - 1);
    var price = lerp(P[i], P[j], f), soc = lerp(SOC[i], SOC[j], f), action = SCHEDULE[i];
    var mx = PX(Math.min(t, N - 1));
    var cont = soc * CELLS, full = Math.floor(cont), partial = cont - full;
    var glyph = action === "charge" ? "▲ charging — power is cheap"
              : action === "discharge" ? "▼ discharging — power is dear" : "— holding";

    var s = "";
    // sweeping dotted marker + dot on the price line
    s += '<line x1="' + mx.toFixed(1) + '" y1="' + TY0 + '" x2="' + mx.toFixed(1) + '" y2="' + TY1 +
         '" stroke="' + COAL + '" stroke-width="1" stroke-dasharray="3 3" opacity="0.6"/>';
    s += '<circle cx="' + mx.toFixed(1) + '" cy="' + PY(price).toFixed(1) + '" r="4.5" fill="#fff1e5" stroke="' + COAL + '" stroke-width="2"/>';

    // battery body
    s += '<g transform="translate(42,196)">';
    s += '<rect x="0" y="0" width="250" height="64" rx="9" fill="none" stroke="' + COAL + '" stroke-width="2"/>';
    s += '<rect x="250" y="20" width="8" height="24" rx="2" fill="' + COAL + '"/>';
    for (var k = 0; k < CELLS; k++) {
      var cx = 8 + k * 19.8;
      s += '<rect x="' + cx + '" y="8" width="16" height="48" rx="3" fill="none" stroke="' + LINE + '"/>';
      if (k <= full) {
        var frac = k < full ? 1 : partial, h = Math.max(0.5, 48 * frac);
        s += '<rect x="' + cx + '" y="' + (8 + (48 - h)).toFixed(1) + '" width="16" height="' + h.toFixed(1) +
             '" rx="3" fill="' + COAL + '"/>';
      }
    }
    s += '</g>';

    // readout
    s += '<g transform="translate(320,212)">';
    s += '<text x="0" y="0" font-family="' + cssVar("--font-heading", "Georgia") + '" font-size="26" font-weight="600" fill="' + COAL + '">£' +
         price.toFixed(0) + '<tspan font-size="13" fill="' + GREY + '"> /MWh</tspan></text>';
    s += '<text x="0" y="24" font-size="13.5" font-weight="600" fill="' + COAL + '">' + glyph + '</text>';
    s += '<text x="0" y="46" font-size="12" fill="' + GREY + '">' + LABELS[i] + ' · state of charge ' + (soc * 100).toFixed(0) + '%</text>';
    s += '</g>';
    dyn.innerHTML = s;
  }

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) { frame(18); return; }   // static frame: evening discharge

  var t0 = null, SECONDS = 22;          // one full day per ~22s
  function loop(ts) {
    if (t0 === null) t0 = ts;
    var t = (((ts - t0) / 1000) / SECONDS * N) % N;
    frame(t);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
