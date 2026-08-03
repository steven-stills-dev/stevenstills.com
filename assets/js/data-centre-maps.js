/* =========================================================================
   DATA CENTRE MAPS — where the load is going, and where the wind already is.

   Map one plots the AI Growth Zones and the large announced campuses against
   the existing London and Thames Valley cluster. Sites sit at town level.

   Map two shades operational onshore wind capacity by region, straight from
   the DESNZ planning database. Offshore is excluded because that database
   files it as Offshore rather than to any land region.
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
  var COAL = tok("--times-coal", "#231F20");

  /* ---- one: existing clusters and announced campuses ------------------- */

  // planned sites carry published megawatts, existing ones carry the
  // cluster they sit in. Coordinates are town level.
  var SITES = [
    { lat: 55.142, lon: -1.520, label: "Cambois 720MW", fill: RED, r: 6, dy: -12 },
    { lat: 55.030, lon: -1.478, label: "Cobalt Park", fill: RED, r: 3.4, dy: 12 },
    { lat: 55.795, lon: -3.970, label: "Ravenscraig 500MW", fill: RED, r: 5.4, anchor: "left" },
    { lat: 51.655, lon: -1.230, label: "Culham 100MW", fill: RED, r: 4, anchor: "left", dy: -4 },
    { lat: 52.908, lon: -3.940, label: "Trawsfynydd", fill: RED, r: 3.4, anchor: "left" },
    { lat: 53.309, lon: -4.630, label: "Anglesey", fill: RED, r: 3.4, anchor: "left" },
    { lat: 51.504, lon: -3.580, label: "Bridgend", fill: RED, r: 3.4, anchor: "left" },
    { lat: 51.511, lon: -0.591, label: "Slough cluster", fill: COAL, r: 6.4, anchor: "left", dy: 20 },
    { lat: 51.507, lon: -0.020, label: "Docklands", fill: COAL, r: 4.6, dy: 4 }
  ];

  UKMap.render("dc-map", {
    height: 560,
    shetland: false,
    points: SITES,
    legend: {
      title: "Data centre sites",
      items: [
        { dot: RED, label: "Announced, planned" },
        { dot: COAL, label: "Existing cluster" }
      ],
      note: "Dot size follows published megawatts."
    },
    title: "UK AI Growth Zones and announced data centre campuses"
  });

  /* ---- two: where the onshore wind already is -------------------------- */

  // operational onshore wind, MW, DESNZ planning database Q1 2026
  var WIND = {
    "scotland": 9994, "wales": 1220, "northern-ireland": 1195,
    "yorkshire": 652, "north-east": 474, "north-west": 467, "east": 452,
    "east-midlands": 398, "south-west": 285, "south-east": 113,
    "london": 13, "west-midlands": 8
  };

  UKMap.render("wind-map", {
    height: 560,
    shetland: false,
    values: WIND,
    bands: [
      { max: 100, fill: PAPER, label: "Under 100 MW" },
      { max: 500, fill: UKMap.mix(PAPER, BLUE, 0.25), label: "100 to 500 MW" },
      { max: 1500, fill: UKMap.mix(PAPER, BLUE, 0.55), label: "500 to 1,500 MW" },
      { max: Infinity, fill: BLUE, label: "Over 1,500 MW" }
    ],
    legend: {
      title: "Onshore wind capacity",
      note: "Operational sites only."
    },
    title: "Operational onshore wind capacity by region"
  });
})();
