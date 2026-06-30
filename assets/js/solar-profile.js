/* =========================================================================
   SOLAR PROFILE — a clear summer day, solar generation against demand.

   Monochrome (coal). Solar is the solid line, demand the dashed line. The
   midday surplus (solar over demand) is line-hatched: the cheap-export glut.
   The evening gap (demand over solar) is dot-hatched: where stored energy is
   worth most. Illustrative daily profiles, the shape is the point.
   ========================================================================= */
(function () {
  "use strict";

  var host = document.getElementById("solar-profile");
  if (!host) return;

  function cssVar(n, f) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    return v || f;
  }
  var COAL = cssVar("--times-coal", "#333333");
  var GREY = cssVar("--times-grey", "#66605c");
  var LINE = cssVar("--times-line", "#e7d3c1");
  var BLUE = cssVar("--times-blue", "#0f5499"), RED = cssVar("--times-red", "#990f3d");

  // hourly profiles, 00:00 -> 24:00 (arbitrary MW). Summer solar hump peaks
  // midday; demand is low midday and peaks in the evening.
  var SOLAR  = [0,0,0,0,0,2,8,20,38,58,78,92,100,98,88,70,48,26,10,2,0,0,0,0,0];
  var DEMAND = [42,40,38,37,38,42,52,64,66,60,56,54,52,53,55,60,68,80,86,82,72,62,52,46,42];
  var N = SOLAR.length;

  var W = 720, H = 300, X0 = 44, X1 = 702, Y0 = 24, Y1 = 210;
  var pmax = Math.max(Math.max.apply(null, SOLAR), Math.max.apply(null, DEMAND)) * 1.1;
  function PX(i) { return X0 + (i / (N - 1)) * (X1 - X0); }
  function PY(v) { return Y0 + (1 - v / pmax) * (Y1 - Y0); }
  function poly(arr) { return arr.map(function (v, i) { return PX(i).toFixed(1) + "," + PY(v).toFixed(1); }).join(" "); }

  // a closed band between two series over an index range [a,b]
  function band(top, bot, a, b) {
    var d = "";
    for (var i = a; i <= b; i++) d += (i === a ? "M" : "L") + PX(i).toFixed(1) + "," + PY(top[i]).toFixed(1) + " ";
    for (var j = b; j >= a; j--) d += "L" + PX(j).toFixed(1) + "," + PY(bot[j]).toFixed(1) + " ";
    return d + "Z";
  }

  var TICKS = [[0,"00:00"],[6,"06:00"],[12,"12:00"],[18,"18:00"],[24,"24:00"]];
  var YT = [0, 25, 50, 75, 100];

  var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" ' +
    'aria-label="Summer solar generation overshooting demand at midday, with an evening demand peak">';
  // solid theme fills (blue = cheap charge window, red = dear discharge window)

  // y gridlines + labels
  YT.forEach(function (t) {
    var yy = PY(t).toFixed(1);
    s += '<line x1="' + X0 + '" y1="' + yy + '" x2="' + X1 + '" y2="' + yy + '" stroke="' + LINE + '" stroke-width="1"/>';
    s += '<text x="' + (X0 - 7) + '" y="' + yy + '" text-anchor="end" dominant-baseline="middle" font-size="11" fill="' + GREY + '">' + t + '</text>';
  });
  s += '<text x="' + X0 + '" y="14" font-size="11" fill="' + GREY + '">MW</text>';

  // midday surplus (solar over demand): blue = cheap charge window
  s += '<path d="' + band(SOLAR, DEMAND, 8, 15) + '" fill="' + BLUE + '" opacity="0.2" stroke="none"/>';
  // evening gap (demand over solar): red = dear discharge window
  s += '<path d="' + band(DEMAND, SOLAR, 16, 22) + '" fill="' + RED + '" opacity="0.2" stroke="none"/>';

  // lines: solar solid, demand dashed
  s += '<polyline points="' + poly(SOLAR) + '" fill="none" stroke="' + COAL + '" stroke-width="2.2" stroke-linejoin="round"/>';
  s += '<polyline points="' + poly(DEMAND) + '" fill="none" stroke="' + COAL + '" stroke-width="1.8" stroke-dasharray="5 4"/>';

  // x ticks
  TICKS.forEach(function (t) {
    s += '<text x="' + PX(t[0]).toFixed(1) + '" y="' + (H - 10) + '" text-anchor="middle" font-size="10.5" fill="' + GREY + '">' + t[1] + '</text>';
  });

  // annotations
  s += '<text x="' + PX(11).toFixed(1) + '" y="' + (PY(100) - 6).toFixed(1) + '" text-anchor="middle" font-size="11" font-weight="700" fill="' + BLUE + '">midday surplus</text>';
  s += '<text x="' + PX(11).toFixed(1) + '" y="' + (PY(100) + 8).toFixed(1) + '" text-anchor="middle" font-size="10.5" fill="' + GREY + '">price lowest</text>';
  s += '<text x="' + PX(18.5).toFixed(1) + '" y="' + (PY(86) - 8).toFixed(1) + '" text-anchor="middle" font-size="11" font-weight="700" fill="' + RED + '">evening peak</text>';

  // legend
  s += '<g transform="translate(' + (X1 - 196) + ',16)">' +
    '<line x1="0" y1="-3" x2="18" y2="-3" stroke="' + COAL + '" stroke-width="2.2"/>' +
    '<text x="22" y="0" font-size="10.5" fill="' + GREY + '">solar</text>' +
    '<line x1="74" y1="-3" x2="92" y2="-3" stroke="' + COAL + '" stroke-width="1.8" stroke-dasharray="5 4"/>' +
    '<text x="96" y="0" font-size="10.5" fill="' + GREY + '">demand</text></g>';

  s += '</svg>';
  host.innerHTML = s;
})();
