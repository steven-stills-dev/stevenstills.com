/* =========================================================================
   GAS CHART — inline SVG of UK wholesale gas through the 2026 Hormuz crisis.

   Renders into #gas-chart on load (no drawer; the story is now inline on the
   Hormuz page). Pure vanilla, no build step. Chart colours are read from the
   site's CSS custom properties so it stays in sync with the palette:
   times_red = the signal (the price spike), times_coal = line/axes,
   times_blue = context dots, times_line = gridlines, times_grey = labels.
   ========================================================================= */
(function () {
  "use strict";

  /* ---- UK NBP front-month wholesale gas, pence/therm ---------------------
     Reported levels at key dates, Apr-Jun 2026 (selected points, not a daily
     series). Sources are in the page footnotes. The late-April peak is the
     highlighted spike: the Strait-of-Hormuz closure scare.                  */
  var SERIES = [
    { label: "early Apr", v: 110 },
    { label: "13 Apr",    v: 122.5 },
    { label: "late Apr",  v: 151, hi: true },
    { label: "late May",  v: 96 },
    { label: "late Jun",  v: 100 }
  ];
  var Y_TICKS = [80, 100, 120, 140, 160];
  var Y_MIN = 80, Y_MAX = 160;

  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  /* ---- build the chart SVG as a string ---------------------------------- */
  function chartSVG() {
    var RED  = cssVar("--times-red",  "#990f3d");
    var COAL = cssVar("--times-coal", "#333333");
    var BLUE = cssVar("--times-blue", "#0f5499");
    var LINE = cssVar("--times-line", "#e7d3c1");
    var GREY = cssVar("--times-grey", "#66605c");

    var W = 560, H = 280, padL = 46, padR = 18, padT = 26, padB = 38;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var n = SERIES.length;

    function x(i) { return padL + (n === 1 ? 0 : plotW * i / (n - 1)); }
    function y(v) { return padT + plotH * (1 - (v - Y_MIN) / (Y_MAX - Y_MIN)); }

    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" ' +
      'aria-label="UK wholesale gas price, pence per therm, April to June 2026, ' +
      'peaking near 151 during the Strait of Hormuz closure scare">';

    // y gridlines + labels
    Y_TICKS.forEach(function (t) {
      var yy = y(t).toFixed(1);
      s += '<line x1="' + padL + '" y1="' + yy + '" x2="' + (W - padR) + '" y2="' + yy +
           '" stroke="' + LINE + '" stroke-width="1"/>';
      s += '<text x="' + (padL - 8) + '" y="' + yy + '" text-anchor="end" ' +
           'dominant-baseline="middle" font-size="11" fill="' + GREY + '">' + t + '</text>';
    });

    // the price line
    var d = SERIES.map(function (p, i) {
      return (i ? "L" : "M") + x(i).toFixed(1) + "," + y(p.v).toFixed(1);
    }).join(" ");
    s += '<path d="' + d + '" fill="none" stroke="' + COAL + '" stroke-width="2.2" ' +
         'stroke-linejoin="round" stroke-linecap="round"/>';

    // points + x labels; peak gets the red signal treatment
    SERIES.forEach(function (p, i) {
      var px = x(i), py = y(p.v);
      if (p.hi) {
        // dashed drop line + bold red marker + value label for the spike
        s += '<line x1="' + px.toFixed(1) + '" y1="' + py.toFixed(1) + '" x2="' +
             px.toFixed(1) + '" y2="' + (padT + plotH) + '" stroke="' + RED +
             '" stroke-width="1" stroke-dasharray="3 3" opacity="0.7"/>';
        s += '<circle cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) +
             '" r="5" fill="' + RED + '"/>';
        s += '<text x="' + px.toFixed(1) + '" y="' + (py - 12).toFixed(1) +
             '" text-anchor="middle" font-size="12.5" font-weight="700" fill="' +
             RED + '">~151p</text>';
      } else {
        s += '<circle cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) +
             '" r="3.4" fill="' + BLUE + '"/>';
      }
      s += '<text x="' + px.toFixed(1) + '" y="' + (H - 14) +
           '" text-anchor="middle" font-size="11" fill="' + GREY + '">' + p.label + '</text>';
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
