/* =========================================================================
   HYDROPHOBIA MAPS — the heat map, the flood map and the rain map.

   Both use official data published by English region, the same nine regions
   the map draws, so nothing is interpolated. Scotland, Wales and Northern
   Ireland sit outside both remits and are drawn as not assessed.

   Alert levels are shown as steps of times_red rather than traffic lights,
   so the page keeps one hue. The label carries the official level.
   ========================================================================= */
(function () {
  "use strict";

  if (!window.UKMap) return;

  function tok(n, f) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    return v || f;
  }
  var PAPER = tok("--times-paper", "#FFF1E5");
  var RED = tok("--times-red", "#990F3D");
  var BLUE = tok("--times-blue", "#0F5499");
  var GREY = tok("--times-grey", "#66605C");
  // kept faint so the English regions carry the signal
  var UNASSESSED = UKMap.mix(PAPER, GREY, 0.1);

  /* ---- heat: UKHSA alert levels, 3 to 5 August 2026 -------------------- */

  // 0 no alert, 1 yellow, 2 amber
  var HEAT = {
    "london": 2, "south-east": 2, "east": 2, "east-midlands": 2,
    "west-midlands": 1, "yorkshire": 1, "north-west": 1, "south-west": 1,
    "north-east": 0
  };

  UKMap.render("heat-map", {
    height: 540,
    shetland: false,
    noData: UNASSESSED,
    values: HEAT,
    bands: [
      { max: 0, fill: PAPER, label: "No alert" },
      { max: 1, fill: UKMap.mix(PAPER, RED, 0.32), label: "Yellow alert" },
      { max: 2, fill: UKMap.mix(PAPER, RED, 0.66), label: "Amber alert" }
    ],
    legend: {
      title: "Heat-health alert",
      items: [{ swatch: UNASSESSED, label: "Not assessed" }]
    },
    title: "UKHSA heat-health alert level by English region, 3 to 5 August 2026"
  });

  /* ---- flood: surface water risk, NaFRA2 ------------------------------- */

  // properties in areas at high or medium surface water flood risk, as a
  // percentage of all properties in the region
  var FLOOD = {
    "london": 12.6, "east": 7.6, "north-west": 5.8, "north-east": 5.1,
    "east-midlands": 5.0, "west-midlands": 4.9, "south-east": 4.7,
    "south-west": 4.6, "yorkshire": 4.3
  };

  UKMap.render("flood-map", {
    height: 540,
    shetland: false,
    noData: UNASSESSED,
    values: FLOOD,
    domain: [0, 13],
    legend: {
      title: "Properties at risk",
      format: function (v) { return v + "%"; },
      items: [{ swatch: UNASSESSED, label: "Not assessed" }],
      note: "The England average is 6.3% of all properties."
    },
    title: "Properties at high or medium surface water flood risk by English region"
  });

  /* ---- rain: 14-day forecast, Open-Meteo ------------------------------- */

  // mean daily chance of rain over the 14 days from 2 August 2026, averaged
  // across three representative points per region. Blue, not red: this is
  // the relief line, not the risk line.
  var RAIN = {
    "north-west": 46, "north-east": 40, "yorkshire": 34, "west-midlands": 28,
    "south-west": 28, "east-midlands": 27, "east": 26, "london": 20,
    "south-east": 20
  };

  UKMap.render("rain-map", {
    height: 540,
    shetland: false,
    noData: UNASSESSED,
    values: RAIN,
    ramp: [PAPER, BLUE],
    domain: [0, 50],
    legend: {
      title: "Daily chance of rain",
      format: function (v) { return v + "%"; },
      items: [{ swatch: UNASSESSED, label: "Not shown" }],
      note: "The mean in England is 30% chance of rain across all regions."
    },
    title: "Mean daily chance of rain by English region, 2 to 15 August 2026"
  });
})();
