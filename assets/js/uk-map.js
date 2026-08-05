/* =========================================================================
   UK MAP — a reusable, theme-coloured map of the United Kingdom.

   Draws the 12 ITL1 regions from uk-geo.js as an inline SVG, so every fill
   comes from the site's own colour tokens. Sea takes the darker container
   ground, land takes the page paper. Regions shade from a value map, places
   plot from latitude and longitude.

   Load uk-geo.js first, then call UKMap.render(host, options).

   Options:
     height          rendered height in pixels, default 520
     shetland        false frames the map without Shetland
     sea land        fills, default mist and paper
     coast border    line colours, default hairline
     internalBorders false hides the region divisions
     values          { regionKey: number }, shades the regions
     ramp domain     two colours and the range they span
     bands           [{ max, fill, label }], shades in steps instead
     noData          fill for regions with no value
     points          [{ lat, lon, label, anchor, dx, dy, fill }]
     regionLabels    true prints the region names
     legend          { title, format, items, note }

   Region keys: north-east north-west yorkshire east-midlands west-midlands
   east london south-east south-west wales scotland northern-ireland
   ========================================================================= */
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var RAD = Math.PI / 180;

  function cssVar(n, f) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    return v || f;
  }

  function el(name, attrs) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    return e;
  }

  /* ---- colour ---------------------------------------------------------- */

  // parse #rgb or #rrggbb to a channel triple
  function hex2rgb(h) {
    h = String(h).trim().replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }

  function rgb2hex(c) {
    return "#" + c.map(function (v) {
      return ("0" + Math.max(0, Math.min(255, Math.round(v))).toString(16)).slice(-2);
    }).join("");
  }

  // blend two hex colours, t running 0 to 1
  function mix(a, b, t) {
    var x = hex2rgb(a), y = hex2rgb(b);
    return rgb2hex([0, 1, 2].map(function (i) { return x[i] + (y[i] - x[i]) * t; }));
  }

  /* ---- projection ------------------------------------------------------ */

  // Convert WGS84 degrees to British National Grid metres. Uses the standard
  // OSGB Helmert shift: around 2 m across Great Britain, but roughly 110 m in
  // Northern Ireland, whose own grid this transform is not fitted to.
  function toBNG(lat, lon) {
    var a1 = 6378137, f1 = 1 / 298.257223563;
    var e1 = 2 * f1 - f1 * f1;
    var p = lat * RAD, l = lon * RAD;
    var v1 = a1 / Math.sqrt(1 - e1 * Math.sin(p) * Math.sin(p));
    var x = v1 * Math.cos(p) * Math.cos(l);
    var y = v1 * Math.cos(p) * Math.sin(l);
    var z = (1 - e1) * v1 * Math.sin(p);

    // shift the cartesian frame from WGS84 to OSGB36
    var s = 20.4894e-6;
    var rx = (-0.1502 / 3600) * RAD, ry = (-0.2470 / 3600) * RAD, rz = (-0.8421 / 3600) * RAD;
    var x2 = -446.448 + x * (1 + s) - rz * y + ry * z;
    var y2 = 125.157 + rz * x + y * (1 + s) - rx * z;
    var z2 = -542.060 - ry * x + rx * y + z * (1 + s);

    // back to geodetic on the Airy 1830 ellipsoid
    var a2 = 6377563.396, b2 = 6356256.909;
    var e2 = (a2 * a2 - b2 * b2) / (a2 * a2);
    var pr = Math.sqrt(x2 * x2 + y2 * y2);
    var p2 = Math.atan2(z2, pr * (1 - e2)), v2;
    for (var i = 0; i < 12; i++) {
      v2 = a2 / Math.sqrt(1 - e2 * Math.sin(p2) * Math.sin(p2));
      p2 = Math.atan2(z2 + e2 * v2 * Math.sin(p2), pr);
    }
    var l2 = Math.atan2(y2, x2);

    // transverse Mercator onto the national grid
    var f0 = 0.9996012717, p0 = 49 * RAD, l0 = -2 * RAD, E0 = 400000, N0 = -100000;
    var n = (a2 - b2) / (a2 + b2), n2 = n * n, n3 = n2 * n;
    var sp = Math.sin(p2), cp = Math.cos(p2), tp = Math.tan(p2), t2 = tp * tp;
    var v = a2 * f0 / Math.sqrt(1 - e2 * sp * sp);
    var r = a2 * f0 * (1 - e2) / Math.pow(1 - e2 * sp * sp, 1.5);
    var eta2 = v / r - 1;
    var dp = p2 - p0, ap = p2 + p0;
    var m = b2 * f0 * (
      (1 + n + 1.25 * n2 + 1.25 * n3) * dp
      - (3 * n + 3 * n2 + 2.625 * n3) * Math.sin(dp) * Math.cos(ap)
      + (1.875 * n2 + 1.875 * n3) * Math.sin(2 * dp) * Math.cos(2 * ap)
      - (35 / 24) * n3 * Math.sin(3 * dp) * Math.cos(3 * ap)
    );
    var I = m + N0;
    var II = (v / 2) * sp * cp;
    var III = (v / 24) * sp * Math.pow(cp, 3) * (5 - t2 + 9 * eta2);
    var IIIA = (v / 720) * sp * Math.pow(cp, 5) * (61 - 58 * t2 + t2 * t2);
    var IV = v * cp;
    var V = (v / 6) * Math.pow(cp, 3) * (v / r - t2);
    var VI = (v / 120) * Math.pow(cp, 5) * (5 - 18 * t2 + t2 * t2 + 14 * eta2 - 58 * t2 * eta2);
    var d = l2 - l0, d2 = d * d;
    return {
      e: E0 + IV * d + V * d2 * d + VI * d2 * d2 * d,
      n: I + II * d2 + III * d2 * d2 + IIIA * d2 * d2 * d2
    };
  }

  // place a latitude and longitude in SVG units, y flipped
  function project(lat, lon) {
    var g = window.UK_GEO;
    var b = toBNG(lat, lon);
    var m = g.metresPerUnit;
    return { x: (b.e - g.originE) / m, y: (g.originN - b.n) / m };
  }

  /* ---- scales ---------------------------------------------------------- */

  // pick the fill for one region from a continuous ramp or discrete bands
  function scaleFor(o) {
    if (o.bands) {
      return function (v) {
        if (v == null) return o.noData;
        for (var i = 0; i < o.bands.length; i++) {
          if (v <= o.bands[i].max) return o.bands[i].fill;
        }
        return o.bands[o.bands.length - 1].fill;
      };
    }
    // with no data every region takes the plain land fill
    if (!o.domain) return function () { return o.land; };
    var lo = o.domain[0], hi = o.domain[1];
    var span = hi - lo || 1;
    return function (v) {
      if (v == null) return o.noData;
      var t = Math.max(0, Math.min(1, (v - lo) / span));
      return mix(o.ramp[0], o.ramp[1], t);
    };
  }

  /* ---- render ---------------------------------------------------------- */

  function render(host, opts) {
    host = typeof host === "string" ? document.getElementById(host) : host;
    if (!host || !window.UK_GEO) return null;
    var geo = window.UK_GEO;
    var o = opts || {};

    var PAPER = cssVar("--paper", "#FCFCFA");
    var SAND = cssVar("--mist", "#F1F1EE");
    var LINE = cssVar("--hairline", "#E4E4E0");
    var COAL = cssVar("--graphite", "#16171A");
    var GREY = cssVar("--slate", "#6B6E76");
    var RED = cssVar("--vermilion", "#B4241A");

    var cfg = {
      shetland: o.shetland !== false,
      height: o.height || 520,
      sea: o.sea || SAND,
      land: o.land || PAPER,
      coast: o.coast || LINE,
      border: o.border || LINE,
      internalBorders: o.internalBorders,
      noData: o.noData || (o.land || PAPER),
      ramp: o.ramp || [PAPER, RED],
      bands: o.bands || null,
      values: o.values || null,
      domain: o.domain || null,
      points: o.points || [],
      regionLabels: o.regionLabels || false,
      legend: o.legend || null,
      title: o.title || "Map of the United Kingdom"
    };

    // derive the ramp domain from the values when none is given
    if (cfg.values && !cfg.domain && !cfg.bands) {
      var vs = [];
      for (var k in cfg.values) if (cfg.values[k] != null) vs.push(cfg.values[k]);
      cfg.domain = [Math.min.apply(null, vs), Math.max.apply(null, vs)];
    }
    var fillFor = scaleFor(cfg);

    // frame the geometry, leaving a right-hand column for the key
    var top = cfg.shetland ? 0 : geo.shetlandCut;
    var padT = 14, padB = 14;
    var vh = (geo.height - top) + padT + padB;

    // The map is tall, so height is what binds. This is map units per screen
    // pixel: text, strokes and dots scale by it to hold a steady size.
    var k = vh / cfg.height;
    var padL = 12 * k;
    var padR = cfg.legend ? 235 * k : 12 * k;
    var vx = -padL, vy = top - padT;
    var vw = geo.width + padL + padR;

    host.textContent = "";
    var svg = el("svg", {
      viewBox: vx + " " + vy + " " + vw + " " + vh,
      xmlns: NS, role: "img", "aria-label": cfg.title,
      preserveAspectRatio: "xMidYMid meet"
    });
    svg.style.display = "block";
    svg.style.width = "100%";
    svg.style.height = cfg.height + "px";
    svg.style.maxHeight = "72vh";

    // sea fills the whole frame, land sits on top
    svg.appendChild(el("rect", { x: vx, y: vy, width: vw, height: vh, fill: cfg.sea }));

    var land = el("g", {
      stroke: cfg.internalBorders === false ? "none" : cfg.border,
      "stroke-width": 0.7 * k, "stroke-linejoin": "round"
    });
    geo.regions.forEach(function (rg) {
      var v = cfg.values ? cfg.values[rg.key] : null;
      var path = el("path", {
        d: rg.d,
        fill: cfg.values ? fillFor(v == null ? null : v) : cfg.land,
        "data-region": rg.key
      });
      var t = el("title");
      t.textContent = cfg.values && v != null
        ? rg.name + ": " + (cfg.legend && cfg.legend.format ? cfg.legend.format(v) : v)
        : rg.name;
      path.appendChild(t);
      land.appendChild(path);
    });
    svg.appendChild(land);

    // a stronger line around the coast, drawn over the region borders
    var coast = el("g", {
      fill: "none", stroke: cfg.coast, "stroke-width": 1.0 * k, "stroke-linejoin": "round"
    });
    geo.regions.forEach(function (rg) { coast.appendChild(el("path", { d: rg.d })); });
    svg.appendChild(coast);

    if (cfg.regionLabels) {
      var lab = el("g", {
        "font-size": 12 * k, "font-family": "inherit", fill: GREY,
        "text-anchor": "middle", "pointer-events": "none",
        // a paper halo keeps names legible over any shading
        stroke: cfg.land, "stroke-width": 2.6 * k, "stroke-linejoin": "round",
        "paint-order": "stroke"
      });
      geo.regions.forEach(function (rg) {
        if (!cfg.shetland && rg.cy < top) return;
        var t = el("text", { x: rg.cx, y: rg.cy });
        t.textContent = rg.name;
        lab.appendChild(t);
      });
      svg.appendChild(lab);
    }

    // plotted places, dot plus label
    if (cfg.points.length) {
      var pts = el("g", { "font-size": 12 * k, "font-family": "inherit" });
      cfg.points.forEach(function (p) {
        var xy = (p.x != null && p.y != null) ? p : project(p.lat, p.lon);
        var r = (p.r || 3.6) * k;
        var c = el("circle", {
          cx: xy.x.toFixed(1), cy: xy.y.toFixed(1), r: r.toFixed(1),
          fill: p.fill || RED, stroke: p.stroke || PAPER,
          "stroke-width": (p.strokeWidth == null ? 1 : p.strokeWidth) * k
        });
        var t = el("title");
        t.textContent = p.label ? p.label : "";
        c.appendChild(t);
        pts.appendChild(c);
        if (p.label && p.showLabel !== false) {
          var left = p.anchor === "left";
          // dx and dy nudge a label clear of its neighbours
          var tx = el("text", {
            x: (xy.x + (left ? -(r + 4 * k) : r + 4 * k) + (p.dx || 0) * k).toFixed(1),
            y: (xy.y + 4 * k + (p.dy || 0) * k).toFixed(1),
            "text-anchor": left ? "end" : "start",
            fill: p.labelFill || COAL,
            stroke: p.labelHalo || cfg.land,
            "stroke-width": 2.6 * k,
            "stroke-linejoin": "round",
            "paint-order": "stroke"
          });
          tx.textContent = p.label;
          pts.appendChild(tx);
        }
      });
      svg.appendChild(pts);
    }

    if (cfg.legend) svg.appendChild(buildLegend(cfg, geo, vy, k, GREY, COAL, LINE));

    host.appendChild(svg);
    return svg;
  }

  // draw the key in the right-hand column, sized in pixels via k
  function buildLegend(cfg, geo, vy, k, GREY, COAL, LINE) {
    var g = el("g", { "font-family": "inherit" });
    var x = geo.width + 24 * k;
    var y = vy + 34 * k;
    var fmt = cfg.legend.format || function (v) { return String(v); };
    var sw = 16 * k, sh = 12 * k, gap = 24 * k, row = 21 * k;

    if (cfg.legend.title) {
      var h = el("text", { x: x, y: y, "font-size": 13 * k, "font-weight": 700, fill: COAL });
      h.textContent = cfg.legend.title;
      g.appendChild(h);
      y += 22 * k;
    }

    if (cfg.bands) {
      cfg.bands.forEach(function (b) {
        g.appendChild(el("rect", {
          x: x, y: y - 10 * k, width: sw, height: sh,
          fill: b.fill, stroke: LINE, "stroke-width": 0.6 * k
        }));
        var t = el("text", { x: x + gap, y: y, "font-size": 12.5 * k, fill: COAL });
        t.textContent = b.label;
        g.appendChild(t);
        y += row;
      });
    } else if (cfg.domain) {
      // a continuous bar, sampled in steps so no gradient def is needed
      var steps = 24, w = 150 * k, step = w / steps;
      for (var i = 0; i < steps; i++) {
        g.appendChild(el("rect", {
          x: x + i * step, y: y - 10 * k, width: step + 0.4 * k, height: sh,
          fill: mix(cfg.ramp[0], cfg.ramp[1], i / (steps - 1))
        }));
      }
      g.appendChild(el("rect", {
        x: x, y: y - 10 * k, width: w, height: sh,
        fill: "none", stroke: LINE, "stroke-width": 0.6 * k
      }));
      var lo = el("text", { x: x, y: y + 16 * k, "font-size": 12 * k, fill: GREY });
      lo.textContent = fmt(cfg.domain[0]);
      var hi = el("text", {
        x: x + w, y: y + 16 * k, "font-size": 12 * k, fill: GREY, "text-anchor": "end"
      });
      hi.textContent = fmt(cfg.domain[1]);
      g.appendChild(lo);
      g.appendChild(hi);
      y += 36 * k;
    }

    // extra key rows, for plotted places or anything else
    (cfg.legend.items || []).forEach(function (it) {
      y += 4 * k;
      if (it.dot) {
        g.appendChild(el("circle", {
          cx: x + 7 * k, cy: y - 4 * k, r: (it.r || 3.6) * k, fill: it.dot
        }));
      } else if (it.swatch) {
        g.appendChild(el("rect", {
          x: x, y: y - 10 * k, width: sw, height: sh,
          fill: it.swatch, stroke: LINE, "stroke-width": 0.6 * k
        }));
      }
      var t2 = el("text", { x: x + gap, y: y, "font-size": 12.5 * k, fill: COAL });
      t2.textContent = it.label;
      g.appendChild(t2);
      y += row;
    });

    // a wrapped note under the key
    if (cfg.legend.note) {
      y += 8 * k;
      wrap(cfg.legend.note, 30).forEach(function (line) {
        var t = el("text", { x: x, y: y, "font-size": 11.5 * k, fill: GREY });
        t.textContent = line;
        g.appendChild(t);
        y += 15 * k;
      });
    }
    return g;
  }

  // break a note into lines of roughly n characters
  function wrap(s, n) {
    var words = s.split(/\s+/), lines = [], cur = "";
    words.forEach(function (w) {
      if ((cur + " " + w).trim().length > n) { lines.push(cur); cur = w; }
      else cur = (cur + " " + w).trim();
    });
    if (cur) lines.push(cur);
    return lines;
  }

  window.UKMap = { render: render, project: project, toBNG: toBNG, mix: mix };
})();
