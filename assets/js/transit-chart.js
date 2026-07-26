/* =========================================================================
   TRANSIT CHART — daily tanker transits through the Strait of Hormuz.

   Companion to the gas-price chart: it shows WHY the price moved. Tanker
   traffic collapsed from ~50/day in February to near zero from 1 March; the
   red dashed marker sits on 1 March 2026, the collapse day, and the
   series ends 16 April, the 149p peak day, matching the gas chart above.

   Data: IMF PortWatch "Daily Chokepoints Data" (AIS via the UN Global
   Platform), Strait of Hormuz, n_tanker; snapshot covers 1 Feb - 21 Jun 2026,
   trimmed here to 16 Apr — see the page footnotes. Bars use brand black;
   the marker uses rose kiss.
   ========================================================================= */
(function () {
  "use strict";

  /* daily tanker transits, 1 Feb 2026 (index 0) -> 16 Apr 2026 (index 74) */
  var DATA = [37,55,45,43,46,50,48,49,41,59,46,55,64,58,50,60,43,52,62,54,54,72,62,55,58,53,53,44,7,2,2,0,1,0,2,1,6,1,1,3,3,1,5,0,1,0,1,3,0,0,2,1,1,0,0,0,2,12,2,0,2,4,2,7,1,3,0,4,1,5,3,4,3,4,3];
  var SPIKE_IDX = 28;                 // 1 Mar 2026, transits collapse
  var MONTHS = [[0,"Feb"],[28,"Mar"],[59,"Apr"]];
  var Y_MAX = 75, Y_TICKS = [0, 25, 50, 75];
  var BAR = "#1F6B52", SPIKE = "#B4441F";   // green data bars, rust = the signal

  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function chartSVG() {
    // sand card: warm gridlines, muted labels
    var LINE = cssVar("--rule",  "#E2D7C3");
    var GREY = cssVar("--muted", "#6E6659");

    var W = 560, H = 280, padL = 34, padR = 12, padT = 22, padB = 34;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var n = DATA.length, slot = plotW / n, barW = Math.max(1.6, slot - 1);

    function x(i) { return padL + i * slot + (slot - barW) / 2; }
    function y(v) { return padT + plotH * (1 - v / Y_MAX); }
    var base = padT + plotH;

    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" ' +
      'aria-label="Daily tanker transits through the Strait of Hormuz, February to mid-April 2026, ' +
      'collapsing from about 50 a day to near zero; 1 March highlighted">';

    // y gridlines + labels
    Y_TICKS.forEach(function (t) {
      var yy = y(t).toFixed(1);
      s += '<line x1="' + padL + '" y1="' + yy + '" x2="' + (W - padR) + '" y2="' + yy +
           '" stroke="' + LINE + '" stroke-width="1"/>';
      s += '<text x="' + (padL - 7) + '" y="' + yy + '" text-anchor="end" ' +
           'dominant-baseline="middle" font-size="11" fill="' + GREY + '">' + t + '</text>';
    });

    // dashed marker + label on the collapse day
    var sx = (x(SPIKE_IDX) + barW / 2).toFixed(1);
    s += '<line x1="' + sx + '" y1="' + padT + '" x2="' + sx + '" y2="' + base +
         '" stroke="' + SPIKE + '" stroke-width="1.5" stroke-dasharray="3 3"/>';
    s += '<text x="' + sx + '" y="' + (padT - 8) + '" text-anchor="middle" font-size="11.5" ' +
         'font-weight="700" fill="' + SPIKE + '">1 Mar · transits collapse</text>';

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
