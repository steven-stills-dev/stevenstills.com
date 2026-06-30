/* =========================================================================
   GAS CHART — inline SVG of UK wholesale gas through the 2026 Hormuz crisis.

   Renders into #gas-chart on load. Pure vanilla, no build step. Shares the
   transit chart's x-axis (1 Feb -> 21 Jun 2026, daily) so the two stack and
   the price spike lines up with the tanker collapse below.

   Daily line is an INDICATIVE RECONSTRUCTION: a path interpolated through the
   reported levels in the page footnotes (notes 3 and 4), not a verified daily
   market series. Colours come from the site CSS variables: times_red = the
   signal, times_coal = line/axes, times_line = gridlines, times_grey = labels.
   ========================================================================= */
(function () {
  "use strict";

  /* ---- reported anchor levels, pence/therm ------------------------------
     [day index from 1 Feb, level]. Feb floor ~96 (late May 96p was the
     "lowest since February"); early Apr 110; the 13 Apr session +11.7% to
     122.5; late-Apr peak ~151; back to ~96 by late May; June reopening eases
     it further. The daily line interpolates between these.                  */
  var KEYFRAMES = [
    [0, 97], [14, 95], [27, 96], [33, 98], [40, 102], [50, 106],
    [59, 108], [62, 110], [70, 109.7], [71, 122.5], [75, 132], [79, 145],
    [82, 151], [86, 147], [92, 138], [100, 122], [108, 108], [115, 99],
    [118, 96], [124, 95], [132, 94], [136, 91], [140, 90]
  ];
  var DAYS = 141;                     // 1 Feb (0) -> 21 Jun (140)
  var SPIKE_IDX = 71;                 // 13 Apr 2026, the +11.7% session
  var PEAK_IDX = 82;                  // late-Apr peak, ~151p
  var MONTHS = [[0, "Feb"], [28, "Mar"], [59, "Apr"], [89, "May"], [120, "Jun"]];
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
    var RED  = cssVar("--times-red",  "#990f3d");
    var COAL = cssVar("--times-coal", "#333333");
    var LINE = cssVar("--times-line", "#e7d3c1");
    var GREY = cssVar("--times-grey", "#66605c");

    // geometry mirrors transit-chart.js so the two x-axes align
    var W = 560, H = 280, padL = 34, padR = 12, padT = 22, padB = 34;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var slot = plotW / DAYS;
    var data = dailySeries();

    function x(i) { return padL + i * slot + slot / 2; }
    function y(v) { return padT + plotH * (1 - (v - Y_MIN) / (Y_MAX - Y_MIN)); }
    var base = padT + plotH;

    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" ' +
      'aria-label="UK wholesale gas price, pence per therm, February to June 2026, ' +
      'flat near 96 then spiking past 150 during the Strait of Hormuz closure scare">';

    // y gridlines + labels
    Y_TICKS.forEach(function (t) {
      var yy = y(t).toFixed(1);
      s += '<line x1="' + padL + '" y1="' + yy + '" x2="' + (W - padR) + '" y2="' + yy +
           '" stroke="' + LINE + '" stroke-width="1"/>';
      s += '<text x="' + (padL - 7) + '" y="' + yy + '" text-anchor="end" ' +
           'dominant-baseline="middle" font-size="11" fill="' + GREY + '">' + t + '</text>';
    });

    // dashed red marker on 13 Apr, aligned with the transit chart below
    var sx = x(SPIKE_IDX).toFixed(1);
    s += '<line x1="' + sx + '" y1="' + padT + '" x2="' + sx + '" y2="' + base +
         '" stroke="' + RED + '" stroke-width="1" stroke-dasharray="3 3" opacity="0.65"/>';

    // the daily price line
    var d = data.map(function (v, i) {
      return (i ? "L" : "M") + x(i).toFixed(1) + "," + y(v).toFixed(1);
    }).join(" ");
    s += '<path d="' + d + '" fill="none" stroke="' + COAL + '" stroke-width="2" ' +
         'stroke-linejoin="round" stroke-linecap="round"/>';

    // peak gets the red signal: marker + value label
    var px = x(PEAK_IDX), py = y(data[PEAK_IDX]);
    s += '<circle cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="4" fill="' + RED + '"/>';
    s += '<text x="' + px.toFixed(1) + '" y="' + (py - 11).toFixed(1) +
         '" text-anchor="middle" font-size="12.5" font-weight="700" fill="' +
         RED + '">~151p</text>';

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
