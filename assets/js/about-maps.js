/* =========================================================================
   ABOUT MAP — farmland given to feeding livestock.

   One measure across all twelve regions: temporary grass, permanent pasture
   and sole right rough grazing over total area on agricultural holdings.
   Defra categorises all three as land used to feed livestock.
   England by region comes from the Defra June survey regional tables, the
   three nations from the UK country tables, both at June 2025.

   Red because this is the signal the section turns on.
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

  // London is not reported separately, so it carries the South East figure
  var GRASS = {
    "northern-ireland": 92.5,
    "wales": 85.0,
    "north-west": 82.5,
    "scotland": 79.5,
    "north-east": 67.9,
    "south-west": 64.5,
    "west-midlands": 51.7,
    "yorkshire": 47.6,
    "south-east": 41.6,
    "london": 41.6,
    "east-midlands": 30.8,
    "east": 17.2
  };

  UKMap.render("grass-map", {
    height: 540,
    shetland: false,
    values: GRASS,
    ramp: [PAPER, RED],
    domain: [0, 100],
    legend: {
      title: "Farmland feeding livestock",
      format: function (v) { return Math.round(v) + "%"; },
      note: "Across the UK the share is 64%."
    },
    title: "Farmland given to feeding livestock as a share of farmed land, June 2025"
  });
})();
