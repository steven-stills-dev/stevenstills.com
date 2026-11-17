import { Article, Prose, Section, Wide, Fn, Footnotes } from "../../components/Article";
import Box from "../../components/Box";
import LineChart from "../../components/charts/LineChart";
import Histogram from "../../components/charts/Histogram";
import DataTable from "../../components/charts/DataTable";
import { fmt } from "../../lib/format";
import { usePageMeta } from "../../lib/meta";
import data from "./data.json";
import "./eclipse.css";

const NIGHT = "var(--ste-night)", SECONDARY = "var(--ste-secondary)", TERTIARY = "var(--ste-tertiary)", BAND = "var(--ste-primary)";
const f = data.facts;
const gw = (mw: number, d = 1) => fmt(Math.abs(mw) / 1000, d);
const ticks = (labels: string[]) => labels.map((l, i) => ({ i, label: l })).filter((t) => t.label.endsWith(":00"));
const scen = Object.fromEntries(data.scenarios.map((s) => [s.key, s]));
const leeds = data.cities.find((c) => c.name === "London")!;
const HOMES = Math.round((f.energy_mwh * 1000) / (2500 / 365) / 10000) * 10000;   // homes' daily use at 2,500 kWh a year
const TITLE = "What the solar eclipse did to the power grid";
const LEDE = `On 12 August the Moon covered about nine tenths of the Sun over Britain at dinner time. I measured what that took off solar power, whether everyone going outside to watch took anything off demand, and what both did to the forecast.`;
const ext = { target: "_blank", rel: "noopener" };

function Legend({ items }: { items: [string, string][] }) {
  return <div className="legend">{items.map(([n, c]) => <span key={n}><i style={{ background: c }} />{n}</span>)}</div>;
}

/** Britain's solar output through the eclipse against what it would have been; also the home preview. */
export function SolarChart({ h }: { h?: number }) {
  const s = data.solar;
  const fill = (a: (number | null)[]) => a.map((v, i) => v ?? s.actual[i]);
  return (
    <Box title="Solar Generation During the Eclipse" sub="GW" h={h}>
      <LineChart labels={s.hh} ticks={ticks(s.hh)} unit="GW" digits={2} yMin={0} yMax={12} yTicks={[0, 3, 6, 9, 12]}
        band={{ top: fill(s.hi), bottom: fill(s.lo), color: BAND }}
        series={[{ name: "12 August", values: s.actual, color: SECONDARY }, { name: "Without the eclipse", values: s.expected, color: NIGHT }]} />
      <Legend items={[["12 August", SECONDARY], ["Without the eclipse", NIGHT], ["95% range", BAND]]} />
    </Box>
  );
}

function CloseUp() {
  const s = data.solar, a = s.hh.indexOf("18:00"), b = s.hh.indexOf("20:30") + 1;
  const cut = <T,>(x: T[]) => x.slice(a, b);
  return (
    <Box title="The Eclipse Half Hours" sub="GW" h={360}>
      <LineChart labels={cut(s.hh)} ticks={cut(s.hh).map((label, i) => ({ i, label }))} unit="GW" digits={2} yMin={0} yMax={4.5} yTicks={[0, 1, 2, 3, 4]}
        band={{ top: cut(s.hi) as number[], bottom: cut(s.lo) as number[], color: BAND }}
        series={[{ name: "12 August", values: cut(s.actual), color: SECONDARY }, { name: "Without the eclipse", values: cut(s.expected), color: NIGHT },
          { name: "Geometry alone", values: cut(s.geometry), color: TERTIARY, dash: "4 4" }]} />
      <Legend items={[["12 August", SECONDARY], ["Without the eclipse", NIGHT], ["Geometry alone", TERTIARY], ["95% range", BAND]]} />
    </Box>
  );
}

function DemandChart() {
  const d = data.demand, a = d.hh.indexOf("16:00");
  const cut = <T,>(x: T[]) => x.slice(a);
  const fill = (x: (number | null)[]) => cut(x).map((v, i) => v ?? cut(d.actual)[i]);
  return (
    <Box title="Underlying Demand on the Evening of the Eclipse" sub="GW" h={380}>
      <LineChart labels={cut(d.hh)} ticks={ticks(cut(d.hh))} unit="GW" digits={1} yMin={26} yMax={36} yTicks={[26, 28, 30, 32, 34, 36]}
        band={{ top: fill(d.hi), bottom: fill(d.lo), color: BAND }}
        series={[{ name: "12 August", values: cut(d.actual), color: SECONDARY }, { name: "Expected", values: cut(d.expected), color: NIGHT }]} />
      <Legend items={[["12 August", SECONDARY], ["Expected", NIGHT], ["95% range", BAND]]} />
    </Box>
  );
}

function ForecastChart() {
  const c = data.forecast;
  return (
    <Box title="Day-ahead Demand Forecast Against Outturn" sub="GW" h={360}>
      <LineChart labels={c.hh} ticks={ticks(c.hh)} unit="GW" digits={1} yMin={24} yMax={32} yTicks={[24, 26, 28, 30, 32]}
        series={[{ name: "Outturn", values: c.outturn, color: SECONDARY }, { name: "Day-ahead forecast", values: c.elexon, color: NIGHT }]} />
      <Legend items={[["Outturn", SECONDARY], ["Day-ahead forecast", NIGHT]]} />
    </Box>
  );
}

function FadeChart() {
  const c = data.curve;
  return (
    <Box title="Solar Lost by Share of the Sun Covered" sub="GW" h={380}>
      <LineChart labels={c.obs.map((o) => `${o}% covered`)} ticks={c.obs.map((o, i) => ({ i, label: String(o) })).filter((t) => Number(t.label) % 20 === 0)}
        unit="GW" digits={1} yMin={0} yMax={16} yTicks={[0, 4, 8, 12, 16]}
        series={[{ name: "13:00 in June, clear", values: c.jun_midday_clear, color: NIGHT }, { name: "13:00 in June, typical", values: c.jun_midday_typical, color: TERTIARY },
          { name: "19:10 in mid August", values: c.aug_evening, color: SECONDARY }]} />
      <Legend items={[["13:00 in June, clear", NIGHT], ["13:00 in June, typical", TERTIARY], ["19:10 in mid August", SECONDARY]]} />
    </Box>
  );
}

function CityTable() {
  return (
    <Box title="The Eclipse by City">
      <DataTable caption="Local times of the 12 August 2026 eclipse, the share of the Sun covered at maximum and the Sun's height above the horizon"
        columns={[{ key: "name", label: "City" }, { key: "start", label: "Start" }, { key: "max", label: "Maximum" }, { key: "end", label: "End" },
          { key: "obscuration", label: "Sun covered", unit: "%", digits: 1, tint: true }, { key: "altitude", label: "Sun's height", unit: "°", digits: 0 }]}
        rows={data.cities} />
    </Box>
  );
}

function ScenarioTable() {
  return (
    <Box title="Eclipses, Simulated">
      <DataTable caption={`Peak loss of solar generation across ${fmt(f.draws)} simulated skies for each eclipse, at 2026 solar capacity`}
        columns={[{ key: "label", label: "Eclipse" }, { key: "max", label: "Maximum in London" }, { key: "obs", label: "Sun covered", unit: "%", digits: 1 },
          { key: "lo", label: "5th percentile", unit: "GW", digits: 1 }, { key: "mid", label: "Median", unit: "GW", digits: 1, tint: true },
          { key: "hi", label: "95th percentile", unit: "GW", digits: 1 }, { key: "notice", label: "Beats a typical forecast miss" }]}
        rows={data.scenarios.map((s) => ({ label: s.label, max: s.max, obs: s.obs_london, lo: s.peak_gw[0], mid: s.peak_gw[2], hi: s.peak_gw[4], notice: `${fmt(s.p_notice * 100)}%` }))} />
    </Box>
  );
}

export default function Eclipse() {
  usePageMeta(TITLE, LEDE);
  return (
    <Article kicker="Did it affect the grid · Part 2" title={TITLE} lede={LEDE}>
      <Prose>
        <p>At ten past seven on the evening of Wednesday 12 August, the Moon slid across about nine tenths of the Sun. It was the best eclipse Britain has had since 1999, and I watched it.<Fn n={1} /></p>
        <p>I'd love to say I had deep thoughts about the cosmos. All I could think about while it happened was what it was doing to my short-term forecast accuracy.</p>
        <p>That is less odd than it sounds. Britain has more than {Math.floor(f.capacity_gw)} gigawatts (GW) of working solar panels, and the system operator has to estimate what most of them are doing. When they stop generating, the homes and offices underneath draw from the grid instead, so on my side of the fence a loss of solar looks like demand going up.<Fn n={2} /> An eclipse is a forecast error that comes with a timetable.</p>
        <p>There was a second question I couldn't shake. If millions of people walk outside at dinner time to stare at the sky, do they stop using electricity while they are out there? Let's take a look.</p>
      </Prose>

      <Wide>
        <div className="eclipse-pics">
          <div className="photo"><img src="/img/eclipse-hull.jpg" alt="A thin crescent Sun seen through cloud over Kingston upon Hull at the maximum of the eclipse" /></div>
          <div className="photo"><img src="/img/eclipse-roundhay.jpg" alt="Hundreds of people on camping chairs and picnic blankets on dry grass in Roundhay Park, Leeds, gathered for the eclipse" /></div>
        </div>
        <p className="eclipse-credit">Images: Hullian111, CC BY-SA 4.0; Stephen Craven, CC BY-SA 2.0, both via Wikimedia Commons</p>
      </Wide>

      <Section title="The Moon covered nine tenths of the Sun at dinner time" />
      <Prose>
        <p>In London the eclipse began at {leeds.start}, peaked at {leeds.max} with {fmt(leeds.obscuration, 1)}% of the Sun's disc covered, and was over by {leeds.end}.<Fn n={3} /> The Sun was only {fmt(leeds.altitude, 0)} degrees above the horizon at the peak, which matters a great deal for what follows.</p>
      </Prose>
      <Wide><CityTable /></Wide>
      <Prose>
        <p>The weather played along for most of the country. The Met Office said on the day that most of England and Wales could expect clear skies, with thicker cloud over Northern Ireland and much of Scotland.<Fn n={4} /> It was also hot: the forecast was for 33 to 35°C in parts of central England and Wales, in the middle of a heatwave.<Fn n={4} k="b" /></p>
        <p>And people did go out. The Flamsteed Astronomy Society estimated at least 1,500 at the Royal Observatory in Greenwich. In Edinburgh the crowd packed the top of Calton Hill under hazy cloud, and the observatory there ran out of eclipse glasses at about 18:00.<Fn n={5} /></p>
      </Prose>

      <Section title="Eclipses have moved demand before" />
      <Prose>
        <p>My second question has a history. On 11 August 1999, when Britain had almost no solar panels, National Grid watched demand in England and Wales fall by about 2,200 megawatts (MW) as people went outside, and then jump by 3,000 MW when they came back in.<Fn n={6} /></p>
        <p>In March 2015 the planners assumed people would do 40% of that again. The morning was overcast, most people never saw the eclipse, and the outdoor effect came in at about 10%. What did turn up was about 1,300 MW of extra demand from lights going on in the gloom.<Fn n={6} k="b" /></p>
        <p>So going outside is real, and it depends on the sky. This time the forecasts were all about the panels. Modo Energy reckoned a clear evening could cost 2.2 GW of solar at the peak, and noted that the system operator's demand forecast had about 1.1 GW added for the eclipse.<Fn n={7} /> NESO issued a margin notice for the evening, a formal request for more spare generation, and withdrew it by early afternoon.<Fn n={7} k="b" /></p>
      </Prose>

      <Section title={`Solar fell to ${fmt(f.solar_min_mw)} MW`} />
      <Wide><SolarChart h={380} /></Wide>
      <Prose>
        <p>Sheffield Solar estimates the country's solar output every half hour from a sample of real systems.<Fn n={2} k="b" /> In the half hour from 18:00 it was {fmt(f.solar_before_mw)} MW. In the half hour from 19:00, with the eclipse at its deepest, it was {fmt(f.solar_min_mw)} MW. Then it came back up to {fmt(f.solar_after_mw)} MW before the real sunset finished the job.</p>
        <p>The harder part is what solar would have done without the Moon in the way. For that I built a model from {f.solar_days} comparable summer evenings, which predicts each evening half hour from the same day's afternoon. I tested it on years it had not seen, and {fmt(f.solar_cover * 100)}% of the real values fell inside its 95% range.<Fn n={8} /></p>
      </Prose>
      <Wide><CloseUp /></Wide>
      <Prose>
        <p>Without the eclipse the model expects {fmt(f.expected_mw)} MW at 19:00. So the Moon took {fmt(f.loss_mw)} MW, give or take about 300, which was {f.loss_pct}% of what was there. Across the two hours it comes to {fmt(f.energy_mwh / 1000, 1)} gigawatt hours (GWh), about what {fmt(HOMES)} typical homes use in a day.<Fn n={9} /></p>
        <p>That is well short of Modo's forecast for a clear evening, which was an average of 1.8 GW for that half hour and 2.2 GW at the deepest point. The reason is the {fmt(leeds.altitude, 0)} degrees. By 19:00 in mid August the Sun is so low that the panels are down to their last gigawatt and a half anyway. The Moon took nearly all of it, and there wasn't much to take.</p>
        <p>The dashed line is what plain geometry predicts: work out how much of the Sun's disc is covered in each region, minute by minute, and cut the solar by the same share. It says {fmt(f.geo_energy_mwh / 1000, 1)} GWh against my measured {fmt(f.energy_mwh / 1000, 1)}. Nothing cleverer is needed, and the system operator's own chart of the evening shows much the same gap.<Fn n={10} /></p>
      </Prose>

      <Section title="Demand ran about a gigawatt low while the eclipse was on" />
      <Prose>
        <p>Now the people. I added the solar estimate, and the system operator's estimate for small wind farms, back on to national demand to get the electricity the country was really using, and built a second model for that from {f.demand_days} summer weekdays, with temperature in it because of the heat.<Fn n={11} /></p>
      </Prose>
      <Wide><DemandChart /></Wide>
      <Prose>
        <p>From 17:00 to 18:00 demand averaged {fmt(f.gap_before_mw)} MW above what the model expected. Then it dropped away. It was {fmt(-f.gap_max_mw)} MW low at {f.gap_max_time}, averaged {fmt(-f.gap_mean_mw)} MW low across 18:00 to 20:00, and from 20:30 it averaged within {fmt(f.gap_after_mw)} MW again. The dip opens when the eclipse starts and closes when it ends, and only about {fmt(f.gap_contrast_p * f.demand_days)} of the {f.demand_days} other evenings shows a dip that size against the half hours either side. The size is much less certain than the timing: the honest range runs from almost nothing to {gw(f.gap_mean_lo)} GW.</p>
        <p>I checked the obvious excuse first. It was {fmt(f.evening_temp_c, 1)}°C that evening, hotter than {fmt(f.evening_temp_rank * 100)}% of the evenings in my sample. But on the {f.hot_days} other evenings at 25°C or more the model was out by {fmt(-f.hot_days_gap_mean_mw)} MW on average, so heat on its own doesn't do this.</p>
        <p>So did everyone go outside and stop using energy? Something took about a gigawatt off, and I'd love to give it all to the crowd in Roundhay Park. I can't, because two other things were pulling the same way in the same two hours. Octopus Energy ran a session from 18:00 to 20:00 that paid customers in free electricity for using less, with a competition for photos of what they did outside instead.<Fn n={12} /> And NESO told its own forum a week later that the eclipse's effect on demand had been muted, in part by the response to its flexibility service and the margin notice.<Fn n={10} k="b" /> The data can't split a gigawatt three ways. My best answer is that some of it was people going outside, some of those people were being paid to, and I can't tell you the shares.</p>
      </Prose>

      <Section title="The forecast was nearly two gigawatts too high" />
      <Wide><ForecastChart /></Wide>
      <Prose>
        <p>This is the bit I was thinking about on the night. I can't show you my own forecasts, so here is the published one. The day-ahead forecast was {fmt(-f.fc_elexon_1900_mw)} MW too high at {f.fc_elexon_worst_time}, against that forecast's usual miss this summer of {fmt(f.fc_elexon_1900_usual_mae)} MW at that time of evening. Only {fmt(f.fc_elexon_1900_share_bigger * 100)}% of this summer's weekdays had a bigger miss in that half hour.<Fn n={13} /></p>
        <p>The forecast had the eclipse in it and still went the wrong way. It had demand going up, because the panels would drop out. The panels did drop out, by about what geometry said. And demand came in lower anyway, for reasons I can't separate: people outdoors, a paid turn-down and the response to the margin notice. To be fair to the Moon, the forecast was 600 to 900 MW high in the hour before, and 1.7 GW high in the half hour the eclipse began, when hardly any of the Sun was covered. A good share of the miss was there already.</p>
        <p>The imbalance price touched £{fmt(f.price_max)} a megawatt hour in the half hour from {f.price_max_time}, about double the half hours either side.<Fn n={13} k="b" /> I can't show the eclipse did that, so I'll just leave it there looking suspicious.</p>
      </Prose>

      <Section title="On an August evening the Sun has to fade by about a third before a forecaster notices" />
      <Prose>
        <p>How much does the Sun have to fade to make an impact? It depends when. On the evening of 12 August, the Moon needed to cover {f.fade_detect_event_pct}% of the Sun before the loss stood out from what my model gets wrong on an ordinary evening, and {f.fade_notice_event_pct}% before it beat the {fmt(f.aug_mae_mw)} MW that a day-ahead forecast has missed by at that hour over the last three Augusts.<Fn n={14} /></p>
      </Prose>
      <Wide><FadeChart /></Wide>
      <Prose>
        <p>At 13:00 in June it is a different animal. On a clear day there are {fmt(f.jun_clear_mw / 1000, 1)} GW of solar running, and covering {fmt(f.fade_notice_jun_clear_pct, 1)}% of the Sun is enough to beat a typical forecast miss. I'd guess a thin cloud does more than that. Britain got a 91% eclipse close to the time of day when it could do the least.</p>
      </Prose>

      <Section title={`The same eclipse replayed ${fmt(f.draws)} times`} />
      <Prose>
        <p>I got one evening, and one evening is a sample of one. So I replayed the eclipse {fmt(f.draws)} times, each under the sky of one of {scen.actual.days} real evenings from recent summers, and did the same for a handful of the eclipses still to come.<Fn n={15} /></p>
      </Prose>
      <Wide><ScenarioTable /></Wide>
      <Wide>
        <Box title="Peak Solar Loss, 12 August 2026 Replayed" sub="% of simulated skies" h={340}>
          <Histogram bins={scen.actual.hist.map((b) => ({ ...b, n: (b.n / f.draws) * 100 }))} unit="GW" yUnit="%" digits={1} yDigits={0} mark={f.loss_mw / 1000} xTicks={[0, 0.5, 1, 1.5, 2, 2.5]} />
        </Box>
      </Wide>
      <Prose>
        <p>The line on the chart marks the {gw(f.loss_mw, 2)} GW of the real evening. The median sky gives {fmt(scen.actual.peak_gw[2], 2)} GW, so this was a clearer evening than most. Move the same eclipse to lunchtime in June and the median loss is {fmt(scen.june.peak_gw[2], 1)} GW, which is about three times the pickup of 1999.</p>
        <p>The one to put in the diary is Monday 2 August 2027. It covers only {fmt(scen["2027"].obs_london, 0)}% of the Sun in London, but it peaks at {scen["2027"].max} with the panels wide awake, and the median loss is {fmt(scen["2027"].peak_gw[2], 1)} GW. That is nearly twice what the big one managed last month.</p>
      </Prose>

      <Section title="The surprise was on the demand side" />
      <Prose>
        <p>Did it affect my demand forecasts? On the evidence of the published one, yes. The Sun did about what the geometry said it would, to within the width of my error bars, and anybody with a protractor could have forecast it. The gigawatt nobody could have forecast was on the demand side: people in a park, people being paid to leave the oven off, and whatever the margin notice shook loose.</p>
        <p>The Moon had another go on 28 August, when it slipped into the Earth's shadow just before dawn.<Fn n={16} /> I'm pleased to report that one took nothing off solar output at all, on account of it being dark.</p>
        <p>So I spent the best eclipse in 27 years thinking about forecast accuracy, and the forecast did have a bad evening. Short-term profile drift and the weather can have my attention back. If you're planning to watch the 2027 one, go outside and enjoy it. I'll be the one stood next to you working out what you've just done to the half hour.</p>
      </Prose>

      <Footnotes notes={[
        <>Royal Astronomical Society, <a href="https://ras.ac.uk/news-and-press/news/solar-eclipse-pictures-uk-and-europe-treated-best-show-27-years" {...ext}>pictures of the eclipse, "the best show in 27 years"</a>, August 2026.</>,
        <>Sheffield Solar, <a href="https://www.solar.sheffield.ac.uk/pvlive/" {...ext}>PV_Live</a>, national half-hourly estimate of solar generation, scaled up from a sample of metered systems to an effective capacity of {fmt(f.capacity_gw, 1)} GW in August 2026, which allows for panels ageing. National demand as published is net of this generation, which is why a loss of solar appears as a rise in demand.</>,
        <>The times, the share of the Sun's disc covered and the Sun's height are my own calculation from the positions of the Sun and Moon. They agree to within a minute with timeanddate, <a href="https://www.timeanddate.com/eclipse/in/uk/leeds?iso=20260812" {...ext}>12 August 2026 partial solar eclipse in Leeds</a> and its other city pages, and to within 0.1 of a percentage point with BBC Sky at Night Magazine, <a href="https://www.skyatnightmagazine.com/news/best-places-uk-ireland-to-see-august-2026-solar-eclipse" {...ext}>Best places in the UK and Ireland to see the August 2026 solar eclipse</a>, 7 August 2026.</>,
        <>Met Office, <a href="https://www.metoffice.gov.uk/blog/2026/deep-dive-heatwave-peaks-eclipse-viewing-and-the-continuing-search-for-rain" {...ext}>Deep dive: heatwave peaks, eclipse viewing and the continuing search for rain</a>, 12 August 2026. These are forecasts made that morning.</>,
        <>Flamsteed Astronomy Society, <a href="https://www.flamsteed.info/post/hairbrushes-colanders-and-a-91-eclipse-partial-solar-eclipse-at-the-royal-observatory-greenwich" {...ext}>report from the Royal Observatory Greenwich</a>, August 2026. PA Media via the Irish News, <a href="https://www.irishnews.com/news/uk/scots-contend-with-clouds-to-catch-glimpse-of-rare-solar-eclipse-4G4E5T2APZLV7NCLGXG2WMFWCA/" {...ext}>Scots contend with clouds to catch glimpse of rare solar eclipse</a>, 12 August 2026.</>,
        <>1999: a National Grid spokeswoman quoted in PV Tech, <a href="https://www.pv-tech.org/uk_firms_allay_fears_of_2015_solar_eclipse_power_cuts" {...ext}>UK firms allay fears of 2015 solar eclipse power cuts</a>, 2014. A later ENTSO-E brief puts the 1999 fall at 3 GW. 2015: ENTSO-E and SolarPower Europe, <a href="https://eepublicdownloads.entsoe.eu/clean-documents/Publications/ENTSO-E%20general%20publications/entsoe_spe_pp_solar_eclipse_2015_web.pdf" {...ext}>brief on the March 2015 solar eclipse</a>, 15 July 2015.</>,
        <>Ed Andrews, Modo Energy, <a href="https://modoenergy.com/research/en/gb-solar-eclipse-august-2026-ramp-down-record-demand-forecast" {...ext}>research note on the eclipse</a>, 11 August 2026. Margin notice: PA Media via LBC, <a href="https://www.lbc.co.uk/article/96a7c0b5597c45829c1729237588a5d5-5Hjdfxj_2/" {...ext}>12 August 2026</a>.</>,
        <>The model regresses each half hour from 18:00 to 20:30 on the same day's output from 15:00 to 17:30, across {f.solar_days} days within three weeks of 12 August in earlier summers and this one, scaled by effective capacity. The range is a 95% prediction interval, checked by predicting each year from the others.</>,
        <>Ofgem's typical household uses 2,500 kWh of electricity a year from 1 July 2026: Energy UK, <a href="https://www.energy-uk.org.uk/publications/energy-uk-explains-typical-domestic-consumption-values-2/" {...ext}>Typical Domestic Consumption Values</a>. That is 6.8 kWh a day. The energy lost is {fmt(f.energy_mwh / 1000, 1)} GWh with a 95% range of {fmt(f.energy_lo / 1000, 1)} to {fmt(f.energy_hi / 1000, 1)} GWh.</>,
        <>NESO, <a href="https://www.neso.energy/document/385841/download" {...ext}>Operational Transparency Forum slides</a>, 19 August 2026, slides 17 and 18. The geometry is the overlap of two discs with no allowance for the Sun being dimmer at its edge, the same method National Grid used in 2015. Measured loss over the geometric prediction is {fmt(f.response_ratio, 2)}, with a 95% range of {fmt(f.response_lo, 2)} to {fmt(f.response_hi, 2)}.</>,
        <>Underlying demand is national demand from NESO's <a href="https://www.neso.energy/data-portal/historic-demand-data" {...ext}>Historic Demand Data</a> plus the PV_Live estimate and NESO's estimate of embedded wind. The model uses the same day's afternoon demand and the evening temperature from <a href="https://open-meteo.com/" {...ext}>Open-Meteo</a>, across {f.demand_days} summer weekdays in 2025 and 2026. Predicting each month from the others, {fmt(f.demand_cover * 100, 1)}% of real values fell inside the 95% range. The average gap from 18:00 to 20:00 has a 95% range of {fmt(-f.gap_mean_hi)} to {fmt(-f.gap_mean_lo)} MW below expected.</>,
        <>Octopus Energy, <a href="https://octopus.energy/press/more-news-press-releases/brits-can-earn-free-electricity-and-win-pound12-000-by-using-less-electricity-during-wednesday-s-historic-solar-eclipse/" {...ext}>press release on its eclipse session</a>, August 2026. The press release puts the membership of its rewards scheme at more than 2 million. I have no figure for how much demand the session moved.</>,
        <>Elexon, <a href="https://bmrs.elexon.co.uk/api-documentation/endpoint/forecast/demand/day-ahead/history" {...ext}>day-ahead national demand forecast</a> published at 11:48 UTC on 11 August, against the initial demand outturn, compared with the same half hour on {f.fc_days} summer weekdays. System sell price from Elexon's <a href="https://bmrs.elexon.co.uk/api-documentation/endpoint/balancing/settlement/system-prices" {...ext}>settlement system prices</a>.</>,
        <>The thresholds compare the solar a given share of cover would remove with the 95th percentile error of my no-eclipse model, and with the mean absolute error at that hour of the day-ahead demand forecast in NESO's data for that month in 2024 to 2026. That is an earlier version of the forecast than the one in the chart above, which is why the two usual misses differ. The June figures assume 2026 capacity.</>,
        <>Each draw takes the clearness of a real evening or day from the PV_Live record, applies the eclipse's geometry and adds the scatter between geometry and measurement found on 12 August. Future eclipses use 2026 solar capacity and forecast errors from 2024 to September 2026, so they understate what more panels will do. Times and cover for London are my own calculation, checked against <a href="https://www.timeanddate.com/eclipse/in/uk/london" {...ext}>timeanddate</a> where it lists the eclipse.</>,
        <>timeanddate, <a href="https://www.timeanddate.com/eclipse/in/uk/london?iso=20260828" {...ext}>28 August 2026 partial lunar eclipse in London</a>: maximum at 05:12, with sunrise at 06:06.</>,
      ]} />
    </Article>
  );
}
