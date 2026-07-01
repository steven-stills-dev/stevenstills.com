/* =========================================================================
   SUPPLIER CHART — day-ahead price vs imbalance price across a winter day.

   Monochrome (coal): day-ahead is the dashed line, imbalance the solid line,
   the evening spread is hatched, and a dotted reference marks flat baseload.
   The annotated point is the cited one — 20:30, day-ahead £139 vs imbalance
   £150, an £11/MWh spread. Adapted from kraken-dash BatterySupplier; shape is
   illustrative, levels from Elexon / day-ahead data (see page footnotes).
   ========================================================================= */
(function () {
  "use strict";

  var host = document.getElementById("supplier-chart");
  if (!host) return;

  function cssVar(n, f) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    return v || f;
  }
  var COAL = cssVar("--times-coal", "#333333");
  var GREY = cssVar("--times-grey", "#66605c");
  var LINE = cssVar("--times-line", "#e7d3c1");
  var BLUE = cssVar("--times-blue", "#0f5499"), RED = cssVar("--times-red", "#990f3d");

  var N = 48;                       // half-hours; k/2 = hour, 20:30 = index 41
  var BASELOAD = 63;

  // day-ahead shape from anchor points (hour, £/MWh), linearly interpolated
  var ANCH = [[0,46],[3,42],[6,48],[8,73],[10,57],[13,39],[15,47],[17,80],[19,121],[20.5,139],[22,84],[24,57]];
  function interp(h) {
    for (var a = 0; a < ANCH.length - 1; a++) {
      if (h >= ANCH[a][0] && h <= ANCH[a + 1][0]) {
        var f = (h - ANCH[a][0]) / (ANCH[a + 1][0] - ANCH[a][0]);
        return ANCH[a][1] + (ANCH[a + 1][1] - ANCH[a][1]) * f;
      }
    }
    return ANCH[ANCH.length - 1][1];
  }
  var DA = [], IMB = [];
  for (var k = 0; k < N; k++) {
    var h = k / 2;
    var da = interp(h);
    // deterministic imbalance: tracks day-ahead, a touch lower on average,
    // jagged, with a sharp short-system overshoot through the evening peak
    var wig = 8 * Math.sin(k * 1.27) + 5 * Math.sin(k * 0.53 + 1);
    var eve = (h >= 16.5 && h <= 22.5) ? 10 * Math.max(0, 1 - Math.abs(h - 20.5) / 2.2) : 0;
    DA.push(da);
    IMB.push(Math.max(-15, da - 5 + wig + eve * 1.6));
  }
  DA[41] = 139; IMB[41] = 150;       // the cited 20:30 anchor

  var W = 720, H = 300, X0 = 44, X1 = 702, Y0 = 26, Y1 = 212;
  var all = DA.concat(IMB), pmin = Math.min.apply(null, all) - 6, pmax = Math.max.apply(null, all) + 8;
  var span = pmax - pmin || 1;
  function PX(i) { return X0 + (i / (N - 1)) * (X1 - X0); }
  function PY(p) { return Y0 + (1 - (p - pmin) / span) * (Y1 - Y0); }
  function pts(arr) { return arr.map(function (p, i) { return PX(i).toFixed(1) + "," + PY(p).toFixed(1); }).join(" "); }

  var TICKS = [[0,"00:00"],[12,"06:00"],[24,"12:00"],[36,"18:00"],[47,"00:00"]];
  var YT = [0, 50, 100, 150];

  var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" ' +
    'aria-label="Day-ahead price versus imbalance price across a day, with the evening spread shaded">';
  // solid theme fill (red = the captured evening spread); no patterns

  // y gridlines + labels
  YT.forEach(function (t) {
    var yy = PY(t).toFixed(1);
    s += '<line x1="' + X0 + '" y1="' + yy + '" x2="' + X1 + '" y2="' + yy + '" stroke="' + LINE + '" stroke-width="1"/>';
    s += '<text x="' + (X0 - 7) + '" y="' + yy + '" text-anchor="end" dominant-baseline="middle" font-size="11" fill="' + GREY + '">' + t + '</text>';
  });

  // shaded evening spread (k = 33..46): imbalance forward, day-ahead back
  var poly = "";
  for (var a = 33; a <= 46; a++) poly += (a === 33 ? "M" : "L") + PX(a).toFixed(1) + "," + PY(IMB[a]).toFixed(1) + " ";
  for (var b = 46; b >= 33; b--) poly += "L" + PX(b).toFixed(1) + "," + PY(DA[b]).toFixed(1) + " ";
  poly += "Z";
  s += '<path d="' + poly + '" fill="' + RED + '" opacity="0.16" stroke="none"/>';

  // flat baseload reference (dotted)
  var by = PY(BASELOAD).toFixed(1);
  s += '<line x1="' + X0 + '" y1="' + by + '" x2="' + X1 + '" y2="' + by + '" stroke="' + COAL +
       '" stroke-width="1" stroke-dasharray="1 4" opacity="0.7"/>';
  s += '<text x="' + (X1 - 2) + '" y="' + (PY(BASELOAD) - 5).toFixed(1) + '" text-anchor="end" font-size="10.5" fill="' + GREY +
       '">baseload ≈ £' + BASELOAD + '</text>';

  // the two price lines: day-ahead dashed, imbalance solid
  s += '<polyline points="' + pts(DA) + '" fill="none" stroke="' + BLUE + '" stroke-width="1.8" stroke-dasharray="5 4"/>';
  s += '<polyline points="' + pts(IMB) + '" fill="none" stroke="' + RED + '" stroke-width="2.2" stroke-linejoin="round"/>';

  // x ticks
  TICKS.forEach(function (t) {
    s += '<text x="' + PX(t[0]).toFixed(1) + '" y="' + (H - 10) + '" text-anchor="middle" font-size="10.5" fill="' + GREY + '">' + t[1] + '</text>';
  });

  // 20:30 annotation
  var ax = PX(41);
  s += '<line x1="' + ax.toFixed(1) + '" y1="' + Y0 + '" x2="' + ax.toFixed(1) + '" y2="' + Y1 +
       '" stroke="' + COAL + '" stroke-width="1" stroke-dasharray="3 3" opacity="0.6"/>';
  s += '<circle cx="' + ax.toFixed(1) + '" cy="' + PY(139).toFixed(1) + '" r="3.6" fill="#fff1e5" stroke="' + BLUE + '" stroke-width="2"/>';
  s += '<circle cx="' + ax.toFixed(1) + '" cy="' + PY(150).toFixed(1) + '" r="3.6" fill="' + RED + '"/>';
  s += '<text x="' + (ax - 8).toFixed(1) + '" y="' + (PY(150) - 10).toFixed(1) + '" text-anchor="end" font-size="11" font-weight="700" fill="' + COAL +
       '">20:30 · £139 vs £150</text>';
  s += '<text x="' + (ax - 8).toFixed(1) + '" y="' + (PY(150) + 4).toFixed(1) + '" text-anchor="end" font-size="10.5" fill="' + GREY +
       '">spread £11/MWh</text>';

  // legend
  s += '<g transform="translate(' + (X0 + 6) + ',18)">' +
    '<line x1="0" y1="-3" x2="18" y2="-3" stroke="' + BLUE + '" stroke-width="1.8" stroke-dasharray="5 4"/>' +
    '<text x="22" y="0" font-size="10.5" fill="' + GREY + '">day-ahead</text>' +
    '<line x1="92" y1="-3" x2="110" y2="-3" stroke="' + RED + '" stroke-width="2.2"/>' +
    '<text x="114" y="0" font-size="10.5" fill="' + GREY + '">imbalance</text></g>';

  s += '</svg>';
  host.innerHTML = s;
})();
