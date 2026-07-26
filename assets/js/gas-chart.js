/* =========================================================================
   GAS CHART — inline SVG of UK wholesale gas through the 2026 Hormuz crisis.

   Renders into #gas-chart on load. Pure vanilla, no build step. Shares the
   transit chart's x-axis (1 Feb -> 16 Apr 2026, daily) so the two stack and
   the price move lines up with the tanker collapse below.

   Plots the FIXED August-2026 NBP contract, not rolling front month, so the
   product does not change under the series. The red dashed marker sits
   on 1 Mar (day 28), where tanker transits collapse in the chart below; the
   series ends on the 149p peak day (16 Apr). Daily line
   is an INDICATIVE RECONSTRUCTION shaped by the reported levels in the page
   footnotes (notes 3 and 4), not a verified daily market series.
   ========================================================================= */
(function () {
  "use strict";

  /* ---- indicative Aug-26 contract anchors, pence/therm ------------------
     [day index from 1 Feb, level]. Calm ~94 while tankers flow; grinds up
     from day 28 (1 Mar) when transits collapse; explodes from 27 Mar
     (day 54); the 13 Apr "indefinitely" session (day 71) kicks it again;
     peaks at 149 on 16 Apr (day 74), where the series ends.                */
  var KEYFRAMES = [
    [0, 94], [10, 93], [20, 94], [27, 95],
    [28, 97], [34, 101], [41, 105], [48, 108], [53, 110],
    [54, 115], [58, 124], [63, 132], [67, 136], [70, 138],
    [71, 144], [74, 149]
  ];
  var DAYS = 75;                      // 1 Feb (0) -> 16 Apr (74)
  var SPIKE_IDX = 28;                 // 1 Mar 2026, tanker transits collapse
  var PEAK_IDX = 74;                  // 16 Apr peak, ~149p
  var MONTHS = [[0, "Feb"], [28, "Mar"], [59, "Apr"]];
  var Y_TICKS = [80, 100, 120, 140, 160];
  var Y_MIN = 80, Y_MAX = 160;

  /* expand the anchors into a daily series */
  function dailySeries() {
    var out = [], k = 0;
    for (var i = 0; i < DAYS; i++) {
      while (k < KEYFRAMES.length - 2 && i > KEYFRAMES[k + 1][0]) k++;
      var a = KEYFRAMES[k], b = KEYFRAMES[k + 1];
      var t = (b[0] === a[0]) ? 0 : (i - a[0]) / (b[0] - a[0]);
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      out.push(a[1] + (b[1] - a[1]) * t);
    }
    return out;
  }

  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  /* ---- build the chart SVG as a string ---------------------------------- */
  function chartSVG() {
    // sand card: green data line, warm gridlines, rust = the signal
    var GREEN = cssVar("--green", "#1F6B52");
    var MUTED = cssVar("--muted", "#6E6659");
    var GRID  = cssVar("--rule",  "#E2D7C3");
    var SIG   = cssVar("--rust",  "#B4441F");
    var COAL = GREEN, LINE = GRID, GREY = MUTED, RED = SIG, ROSE = SIG;

    // geometry mirrors transit-chart.js so the two x-axes align
    var W = 560, H = 280, padL = 34, padR = 12, padT = 22, padB = 34;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var slot = plotW / DAYS;
    var data = dailySeries();

    function x(i) { return padL + i * slot + slot / 2; }
    function y(v) { return padT + plotH * (1 - (v - Y_MIN) / (Y_MAX - Y_MIN)); }
    var base = padT + plotH;

    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" ' +
      'aria-label="UK NBP August 2026 gas contract, pence per therm, February to mid-April 2026, ' +
      'climbing from the day tanker transits stop, breaking out on 27 March and peaking near 149">';

    // y gridlines + labels
    Y_TICKS.forEach(function (t) {
      var yy = y(t).toFixed(1);
      s += '<line x1="' + padL + '" y1="' + yy + '" x2="' + (W - padR) + '" y2="' + yy +
           '" stroke="' + LINE + '" stroke-width="1"/>';
      s += '<text x="' + (padL - 7) + '" y="' + yy + '" text-anchor="end" ' +
           'dominant-baseline="middle" font-size="11" fill="' + GREY + '">' + t + '</text>';
    });

    // red signal marker on 1 Mar, aligned with the transit chart below
    var sx = x(SPIKE_IDX).toFixed(1);
    s += '<line x1="' + sx + '" y1="' + padT + '" x2="' + sx + '" y2="' + base +
         '" stroke="' + ROSE + '" stroke-width="1.5" stroke-dasharray="3 3"/>';

    // the daily price line
    var d = data.map(function (v, i) {
      return (i ? "L" : "M") + x(i).toFixed(1) + "," + y(v).toFixed(1);
    }).join(" ");
    s += '<path d="' + d + '" fill="none" stroke="' + COAL + '" stroke-width="2" ' +
         'stroke-linejoin="round" stroke-linecap="round"/>';

    // peak gets the red signal: marker + value label (end-anchored, peak sits at the right edge)
    var px = x(PEAK_IDX), py = y(data[PEAK_IDX]);
    s += '<circle cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="4" fill="' + RED + '"/>';
    s += '<text x="' + (px + 2).toFixed(1) + '" y="' + (py - 11).toFixed(1) +
         '" text-anchor="end" font-size="12.5" font-weight="700" fill="' +
         RED + '">~149p</text>';

    // x month labels (positions match the transit chart)
    MONTHS.forEach(function (m) {
      s += '<text x="' + x(m[0]).toFixed(1) + '" y="' + (H - 12) +
           '" text-anchor="start" font-size="11" fill="' + GREY + '">' + m[1] + '</text>';
    });

    s += '</svg>';
    return s;
  }

  /* ---- render into the page on load ------------------------------------- */
  function render() {
    var host = document.getElementById("gas-chart");
    if (host) host.innerHTML = chartSVG();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
})();
