/* =========================================================================
   TRANSIT CHART — daily tanker transits through the Strait of Hormuz.

   Companion to the gas-price chart: it shows WHY the price moved. Tanker
   traffic collapsed from ~50/day in February to near zero through March-April;
   the red column marks 13 April 2026, the day UK gas jumped 11.7%.

   Data: IMF PortWatch "Daily Chokepoints Data" (AIS via the UN Global
   Platform), Strait of Hormuz, n_tanker, 1 Feb - 21 Jun 2026. Static snapshot
   retrieved 29 Jun 2026 — see the page footnotes. Bars use #424141; the spike
   day uses the brand red #990f3d.
   ========================================================================= */
(function () {
  "use strict";

  /* daily tanker transits, 1 Feb 2026 (index 0) -> 21 Jun 2026 (index 140) */
  var DATA = [37,55,45,43,46,50,48,49,41,59,46,55,64,58,50,60,43,52,62,54,54,72,62,55,58,53,53,44,7,2,2,0,1,0,2,1,6,1,1,3,3,1,5,0,1,0,1,3,0,0,2,1,1,0,0,0,2,12,2,0,2,4,2,7,1,3,0,4,1,5,3,4,3,4,3,4,16,2,4,1,2,0,2,1,1,1,3,3,3,2,2,1,0,0,0,1,0,1,2,3,3,4,4,2,2,0,1,4,4,2,0,4,2,2,0,2,0,1,0,2,1,4,3,1,1,1,1,1,2,0,2,1,0,0,1,4,1,7,7,9,0];
  var SPIKE_IDX = 71;                 // 13 Apr 2026
  var MONTHS = [[0,"Feb"],[28,"Mar"],[59,"Apr"],[89,"May"],[120,"Jun"]];
  var Y_MAX = 75, Y_TICKS = [0, 25, 50, 75];
  var BAR = "#424141", SPIKE = "#990f3d";

  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function chartSVG() {
    var LINE = cssVar("--times-line", "#e7d3c1");
    var GREY = cssVar("--times-grey", "#66605c");

    var W = 560, H = 280, padL = 34, padR = 12, padT = 22, padB = 34;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var n = DATA.length, slot = plotW / n, barW = Math.max(1.6, slot - 1);

    function x(i) { return padL + i * slot + (slot - barW) / 2; }
    function y(v) { return padT + plotH * (1 - v / Y_MAX); }
    var base = padT + plotH;

    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" ' +
      'aria-label="Daily tanker transits through the Strait of Hormuz, February to June 2026, ' +
      'collapsing from about 50 a day to near zero; 13 April highlighted">';

    // y gridlines + labels
    Y_TICKS.forEach(function (t) {
      var yy = y(t).toFixed(1);
      s += '<line x1="' + padL + '" y1="' + yy + '" x2="' + (W - padR) + '" y2="' + yy +
           '" stroke="' + LINE + '" stroke-width="1"/>';
      s += '<text x="' + (padL - 7) + '" y="' + yy + '" text-anchor="end" ' +
           'dominant-baseline="middle" font-size="11" fill="' + GREY + '">' + t + '</text>';
    });

    // dashed marker + label on the spike day
    var sx = (x(SPIKE_IDX) + barW / 2).toFixed(1);
    s += '<line x1="' + sx + '" y1="' + padT + '" x2="' + sx + '" y2="' + base +
         '" stroke="' + SPIKE + '" stroke-width="1" stroke-dasharray="3 3" opacity="0.65"/>';
    s += '<text x="' + sx + '" y="' + (padT - 8) + '" text-anchor="middle" font-size="11.5" ' +
         'font-weight="700" fill="' + SPIKE + '">13 Apr · gas +11.7%</text>';

    // bars
    DATA.forEach(function (v, i) {
      var bx = x(i).toFixed(2), by = y(v).toFixed(2), bh = (base - y(v)).toFixed(2);
      s += '<rect x="' + bx + '" y="' + by + '" width="' + barW.toFixed(2) + '" height="' + bh +
           '" fill="' + (i === SPIKE_IDX ? SPIKE : BAR) + '"/>';
    });

    // x month labels
    MONTHS.forEach(function (m) {
      s += '<text x="' + (x(m[0]) + barW / 2).toFixed(1) + '" y="' + (H - 12) +
           '" text-anchor="start" font-size="11" fill="' + GREY + '">' + m[1] + '</text>';
    });

    s += '</svg>';
    return s;
  }

  function render() {
    var host = document.getElementById("transit-chart");
    if (host) host.innerHTML = chartSVG();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
})();
