import { useState } from "react";
import { Article, Prose, Section, Wide, Fn, Footnotes } from "../../components/Article";
import Box from "../../components/Box";
import AreaChart from "../../components/charts/AreaChart";
import LineChart from "../../components/charts/LineChart";
import HormuzMap from "../../components/maps/HormuzMap";
import { dlabel, MON } from "../../lib/format";
import { usePageMeta } from "../../lib/meta";
import data from "./data.json";
import "./hormuz.css";

/* Both series run daily from 1 Feb 2026 (index 0) to 16 Apr 2026 (index 74). */
const DAYS = 75;
const START = Date.UTC(2026, 1, 1);

/** System Average Price of gas ("SAP actual day"), p/kWh as published by the ONS from National Gas Transmission data (5 Nov 2026 edition). */
const SAP = [3.3955,3.1028,2.8423,2.8317,2.9212,3.0336,2.877,2.8932,2.8459,2.6904,2.6789,2.7115,2.6612,2.6756,2.6381,2.5539,2.5354,2.5855,2.7669,2.6659,2.5649,2.4871,2.5822,2.4846,2.4991,2.5134,2.614,2.8851,3.1029,3.4678,4.5306,4.4927,4.3405,4.5348,4.7677,5.2041,5.1262,4.0523,4.1209,4.315,4.3319,4.5031,4.3597,4.3166,4.2409,4.5783,5.1269,5.1308,4.7953,4.9384,4.8884,4.5683,4.43,4.5581,4.6529,4.6187,4.7248,4.6808,4.2318,4.1805,4.2659,4.3471,4.2993,4.2553,4.2257,4.3281,3.9704,3.8694,3.8142,3.9088,4.2603,4.1467,3.7549,3.6079,3.5848];
const KWH_PER_THERM = 29.3071;

/** Daily tanker transits through the Strait of Hormuz (IMF PortWatch, n_tanker). */
const TRANSITS = [19,41,33,20,36,34,40,32,33,39,49,32,54,53,42,35,40,54,63,55,53,69,65,49,59,45,37,36,5,1,1,0,1,0,1,0,1,1,0,0,0,0,2,0,1,0,0,2,0,0,2,1,2,0,0,1,2,3,2,1,0,2,3,4,0,2,0,5,0,3,3,4,3,4,1];

const ISO = Array.from({ length: DAYS }, (_, i) => new Date(START + i * 86_400_000).toISOString().slice(0, 10));
const LABELS = ISO.map(dlabel);
const TICKS = ISO.reduce<{ i: number; label: string }[]>((acc, d, i) => {
  const m = d.slice(5, 7);
  if (i === 0 || m !== ISO[i - 1].slice(5, 7)) acc.push({ i, label: MON[parseInt(m, 10) - 1] });
  return acc;
}, []);
const GAS = SAP.map((v) => v * KWH_PER_THERM);

/* Share of days with an absolute daily change in the System Average Price at or below each size (scripts/hormuz/build.py). */
const MOVE_LABELS = data.grid.map((g) => `Up to ${g.toFixed(1)} p/therm`);
const MOVE_TICKS = [{ i: 0, label: "0" }, { i: 20, label: "10" }, { i: 40, label: "20" }, { i: 60, label: "30 p/therm" }];
const NIGHT = "var(--ste-night)", SECONDARY = "var(--ste-secondary)";

export default function Hormuz() {
  const [view, setView] = useState<"live" | "app">("live");
  const lede = "In March 2026 daily tanker transits through the Strait of Hormuz fell to single figures, and on 13 April the UK wholesale gas contract for the month ahead rose about 10% in morning trading after the United States announced a blockade of Iranian ports. I built a live map of the tankers and LNG carriers in and around the strait, the attacks reported on shipping and the routes that avoid it, and I compare the tanker counts with the daily gas price.";
  usePageMeta("Tracking ships in the Strait of Hormuz", lede);

  return (
    <Article
      kicker="Project · energy markets · updated 16 Nov 2026"
      title="Tracking ships in the Strait of Hormuz"
      lede={lede}
    >
      <Prose>
        <div className="links-row hz-links">
          <a href="https://hormuz.stevenstills.com" target="_blank" rel="noopener">View live tracker</a>
        </div>
      </Prose>

      <Prose>
        <p>For the last 16 years my work has been statistical models of energy, and the charts and diagrams that explain what is going on inside them.</p>
        <p>From 27 February to 8 March 2026, Great Britain's daily gas price roughly doubled. The news said Iran had closed the Strait of Hormuz to shipping. A closure announced in a statement says little about what the ships are already doing, and the price data couldn't tell me either.</p>
        <p>I went looking at the ships themselves. Ships broadcast their identity and position, and some of those signals are published free of charge.</p>
        <p>So I built a tracker of my own. It started as a map of tankers and has grown since into a record of a waterway under attack: the strikes reported on ships, the pipelines that carry oil around the strait, the tankers that have sailed on to ports elsewhere and the places where GPS is being jammed.</p>
        <p>The gas price comes first, because that is where the strait showed up for UK buyers.</p>
      </Prose>

      <Section title="Why the strait mattered to UK gas buyers" />
      <Prose>
        <p>On 13 April 2026, the front-month UK wholesale gas contract (the contract for delivery in the following month) rose about 10% in morning trading, to around 120p a therm, after the United States announced a naval blockade of Iranian ports.<Fn n={1} /></p>
        <p>On 28 February 2026 the United States and Israel began strikes on Iran, and within days Iran declared the strait closed to shipping.<Fn n={2} /> I wanted a plain read on whether energy trade through the strait was flowing or under stress, measured from the ships and not from the statements.</p>
      </Prose>

      <Section title="How the gas price moved" />
      <Prose>
        <p>The System Average Price of gas is the average price of the gas traded each day on Great Britain's on-the-day market.<Fn n={3} /> It fell from 99.5p on 1 February to 76.6p on 27 February, and then roughly doubled in nine days, to 152.5p on 8 March.</p>
      </Prose>

      <Wide>
        <Box title="System Average Price of Gas" sub="p/therm" h={380}>
          <AreaChart points={GAS} labels={LABELS} ticks={TICKS} unit="p/therm" digits={1} yMin={60} />
        </Box>
      </Wide>

      <Prose>
        <p>It was 121.5p on 13 April. The rise of about 10% that day was in the front-month contract, which is a different price from the daily average.<Fn n={1} k="b" /> On 17 June, the day a US-Iran agreement to reopen the strait was signed, the System Average Price was 102.7p, and on 20 June Iran said it had closed the strait again.<Fn n={4} /></p>
        <p>The chart shows the share of days on which the System Average Price moved by no more than each amount, for the 26 days before 28 February and the 48 days from it. The median move (the middle one by size) rose only from 2.4p to 3.5p, but moves above 5p went from 3 days in 26 to 18 in 48.<Fn n={5} /></p>
      </Prose>

      <Wide>
        <Box title="Size of Daily Gas Price Moves" sub="% of days" h={380}>
          <LineChart labels={MOVE_LABELS} ticks={MOVE_TICKS} unit="%" digits={0} yMax={100} yTicks={[0, 25, 50, 75, 100]}
            series={[{ name: "From 28 February", values: data.after }, { name: "Before 28 February", values: data.before, color: NIGHT }]} />
          <div className="legend">
            <span><i style={{ background: SECONDARY }} />From 28 February</span>
            <span><i style={{ background: NIGHT }} />Before 28 February</span>
          </div>
        </Box>
      </Wide>

      <Prose>
        <p>One event gives one before and one after. The comparison shows large daily moves becoming about three times as common, and it cannot show the cause. The only 48-day windows since January 2018 with at least as large a share of moves above 5p ended in 2021, 2022 or 2023.<Fn n={5} k="b" /></p>
      </Prose>

      <Section title="What the tanker transit counts show" />
      <Prose>
        <p>IMF PortWatch counts the tankers passing through the strait each day from AIS data (the signal each ship broadcasts with its identity and location).<Fn n={6} /> The count ran at between 19 and 69 a day through February, fell to 5 on the first of March, and stayed at 5 or fewer for the seven weeks to mid-April. After rising to 12 on 18 April and 23 on 29 April, it was back between 0 and 4 a day in the second half of May.</p>
      </Prose>

      <Wide>
        <Box title="Daily Tanker Transits" sub="transits" h={380}>
          <AreaChart points={TRANSITS} labels={LABELS} ticks={TICKS} unit="transits" />
        </Box>
      </Wide>

      <Prose>
        <p>The tanker count fell from 36 on 28 February to 5 on the first of March, and the System Average Price rose from 76.6p on 27 February to 132.8p on 3 March. I can't show from two charts that the fall in traffic caused the rise in price, but the timing is what I would expect if the market was pricing the ships. By 13 April the tanker count had been at 5 a day or fewer for six weeks.</p>
        <p>I read any count built on AIS as approximate. Ships that switch off their transponders drop out of the data, and jamming can add crossings that never happened.<Fn n={7} /></p>
      </Prose>

      <Section title="Which tankers are in and around the strait" />
      <Prose>
        <p>The tracker reads AIS positions every 15 minutes and keeps three kinds of ship: LNG (liquefied natural gas) carriers, oil tankers, and chemical and other tankers, which start switched off so the oil and gas trade leads.<Fn n={8} /> Every other vessel type is dropped. Each layer can be switched on and off under Map layers, with its live count beside it.</p>
        <p>The bar across the top counts the vessels in the region, the carriers and tankers among them, the crossings of the strait in the last 24 hours and the pending crossings, meaning ships on course to cross within the next 24. Clicking either crossing count lists the ships and flies the map to the one you pick. A ring marks any ship that has crossed recently, and Ship finder goes straight to a vessel by name.</p>
        <p>AIS reports arrive in batches, so a tanker on a steady course is run forward from its last fix along a dashed line, and its popup says when that fix was. Clicking a ship draws its track and rings the port it says it is bound for. Ports with a tanker or carrier heading for them are drawn brighter than the rest of the atlas.</p>
        <p>The status under the title is my own signal. It compares the tankers and LNG carriers seen in the strait over the last 24 hours with the median of the previous 14 days, reading below 60% as disrupted and below 25% as interrupted. It also reads interrupted whenever no LNG carrier is in the strait or on course for it.</p>
      </Prose>

      <Wide>
        <Box title="Live Vessel Map" h={560}>
          {view === "live"
            ? <HormuzMap />
            : <div className="mapwrap"><img className="hz-shot" src="/img/hormuz-app.webp" alt="Hormuz Tracker app on a satellite basemap" /></div>}
        </Box>
        <div className="hz-chips" role="tablist" aria-label="Map style">
          {(["live", "app"] as const).map((v) => (
            <button key={v} role="tab" aria-selected={view === v} className={"chip" + (view === v ? " on" : "")} onClick={() => setView(v)}>{v === "live" ? "Live map" : "App view"}</button>
          ))}
        </div>
      </Wide>

      <Prose>
        <p>For a reader who watches energy markets, this view answers the first question after any headline about the strait: are tankers and LNG carriers still crossing, and in which direction.</p>
      </Prose>

      <Section title="Where the tankers go after they leave" />
      <Prose>
        <p>A tanker that clears the Gulf of Oman would normally drop off a regional map. The tracker keeps following tankers and LNG carriers for 45 days after they were last in the region, and picks up any that are bound for a port inside it, from the feed's worldwide directory.<Fn n={8} k="b" /> Those far-off fixes are older, renewed about every three days, so their dots are not projected forward and each popup gives the date and time of the last fix.</p>
        <p>This answers where the cargo that did get out is heading, and which ships are on their way back towards the strait.</p>
      </Prose>

      <Wide>
        <div className="photo photo-wide">
          <img src="/img/hormuz-departed.jpg" alt="The tracker zoomed out over the Arabian Sea in day mode, showing tanker trails leading away from the Gulf of Oman towards India and the open ocean, with a popup on a crude oil tanker bound for Fujairah giving its flag, speed and a last fix from 13 November." />
        </div>
      </Wide>

      <Section title="Where ships have been attacked" />
      <Prose>
        <p>Each diamond on the map marks a report to UKMTO (United Kingdom Maritime Trade Operations) that a ship was attacked, placed where the report puts it.<Fn n={9} /> The Incidents feed on the left lists the same reports, newest first, with UKMTO's own wording and a badge when the ship caught fire, was abandoned or sank.</p>
        <p>The Attacks slider under the replay controls sets how far back the map looks, from the last day to every report in the feed, and older reports fade so the newest stand out. Each report carries an apparent aggressor of Iran, USA or Other. UKMTO's reports do not name an attacker, so that label is a rule of thumb I apply to the place and wording of each report, set out in the footnote, and it should be read as nothing firmer.</p>
      </Prose>

      <Wide>
        <div className="photo photo-wide">
          <img src="/img/hormuz-incidents.jpg" alt="The tracker in day mode over the Strait of Hormuz with the Attacks slider set to all reports. Blue diamonds marking reported attacks cluster along the Musandam peninsula and the narrows, and the Incidents feed on the left shows two 16 November reports of tankers struck in the strait, each badged Apparent: Iran, Attack and Fire." />
        </div>
      </Wide>

      <Prose>
        <p>This answers where the risk to a ship is concentrated, and whether it is moving. Read with the replay, it also shows whether traffic carried on past the place of a report.</p>
      </Prose>

      <Section title="How oil can travel around the strait" />
      <Prose>
        <p>The Bypass routes layer draws the three pipelines that move crude without a tanker passing the narrows. The East-West pipeline runs from Abqaiq near the Gulf coast of Saudi Arabia to Yanbu on the Red Sea. The Abu Dhabi Crude Oil Pipeline runs from Habshan to Fujairah on the Gulf of Oman. SUMED carries crude from Ain Sukhna on the Red Sea to Sidi Kerir on the Mediterranean.<Fn n={10} /></p>
        <p>The finer lines behind the two Gulf trunks are the feeder pipelines that gather oil from the fields, and the dashed circles off Fujairah, Khor Fakkan and Sohar mark the anchorages where cargo has been passed from ship to ship. Clicking a pipeline shows the chain from field to ship.</p>
      </Prose>

      <Wide>
        <div className="photo photo-wide">
          <img src="/img/hormuz-bypass.jpg" alt="The tracker zoomed out over the Arabian Peninsula in day mode with the panels hidden. Dark lines trace the East-West pipeline from Abqaiq to Yanbu, the Abu Dhabi Crude Oil Pipeline from Habshan to Fujairah, and the SUMED pipeline from Ain Sukhna to Sidi Kerir in Egypt, with labelled oil fields, ports and tanker trails in the Gulf of Oman." />
        </div>
      </Wide>

      <Prose>
        <p>For scale, the US Energy Information Administration put oil flow through the strait at 20 million barrels a day in 2024, and estimated that about 2.6 million barrels a day of the Saudi and UAE pipeline capacity could be available to bypass it.<Fn n={10} k="b" /> The lines on the map show where that 2.6 million can go, and the difference between the two figures is the oil that has no other way out.</p>
      </Prose>

      <Section title="Where ship positions can't be trusted" />
      <Prose>
        <p>The GPS jamming layer, off by default, shades hexagons over the region by the share of aircraft that report they cannot bound their own position, a reading known as an integrity category of 0. Aircraft are the probe here, so the layer marks where GPS is being disrupted, and the effect on any one ship has to be inferred. Red dots mark the aircraft reporting the fault.<Fn n={11} /></p>
        <p>This answers when to doubt the map. A tanker that appears to jump across a red hexagon, or a crossing logged inside one, is worth a second look before it goes into anyone's count.</p>
      </Prose>

      <Section title="How the last three days played out" />
      <Prose>
        <p>The replay bar at the bottom takes the map back up to three days. Drag the slider to a moment, or press play to watch the ships move at 90 minutes a second, with faster speeds of 2, 5 and 10 times on the button beside it. Ships that left the area glide off the map, and an attack report appears at the moment the clock reaches it.</p>
        <p>Day, Night and Auto switch the map between daylight imagery and a darkened chart that keeps the ships bright. Auto changes at sunset over the map, and the Gulf time under the title shows the local clock at the strait.</p>
        <p>Replay answers what happened around an event, such as whether traffic paused after an attack or kept moving, which a single snapshot can't show.</p>
      </Prose>

      <Section title="What the full insights page adds" />
      <Prose>
        <p>Full insights opens a page of context behind the map. It mirrors the public dashboard at hormuzstraitmonitor.com: its closure status and a counter running from the date it gives, transits against the normal daily rate, cargo throughput, war-risk insurance, very large crude carrier (VLCC) spot rates and its estimate of trade at risk.<Fn n={12} /> Those figures are the monitor's, and I show them as published without checking them. The monitor's status can also differ from the one under my map title, because the two are worked out differently.</p>
        <p>Alongside them sit a Brent crude price chart for 2026, tallies of the UKMTO reports by type and outcome, the PortWatch daily transit chart from 1 January, and three feeds side by side: the UKMTO incidents, news headlines about the strait, and Donald Trump's Truth Social posts that mention Iran, Israel, ships or Hormuz. The News and &lsquo;Truths&rsquo; feeds are also tabs beside Incidents on the map.</p>
        <p>This page answers the question a trader asks after the map: what the disruption is doing to the price of oil and to shipping costs, and what the news and Donald Trump's posts are saying about it.</p>
      </Prose>

      <Section title="What the tracker can and cannot tell you" />
      <Prose>
        <p>I built the tracker because a statement about the strait said little about what the ships were doing. On that it gave a plain answer: tanker transits fell from dozens a day to 5 the day after the strikes began, and in the second half of May they were still between 0 and 4.<Fn n={6} k="b" /></p>
        <p>What it cannot tell me is why. The map shows where a ship is, or where its transponder says it is, and jamming and ships going dark both bend that picture.<Fn n={7} k="b" /> Who attacked a ship is a question UKMTO's reports leave open, and my apparent aggressor label stays a rule of thumb. The gas price comparison shows large moves becoming about three times as common after 28 February, and it cannot prove the ships caused them.</p>
        <p>If you watch the gas price, I would size day-to-day risk from the weeks after an event like this one, when 38% of days moved by more than 5p, and not from the month before, when 12% did. In the second half of May 2026 the System Average Price was still above 110p.<Fn n={3} k="b" /> When the next headline about the strait breaks, open the tracker before the price screen and look at the crossings in the last 24 hours, the newest diamonds near the narrows and whether the jamming hexagons have turned red over the shipping lanes. It is live at <a href="https://hormuz.stevenstills.com" target="_blank" rel="noopener">hormuz.stevenstills.com</a> and it refreshes every 15 minutes.</p>
      </Prose>

      <Footnotes notes={[
        <>The front-month (May) UK NBP gas contract rose about 10% in morning trading on 13 April 2026. Trading Economics reported a 10% rise to 120.7p per therm, <a href="https://tradingeconomics.com/commodity/uk-natural-gas/news/541273" target="_blank" rel="noopener">Trading Economics, 13 Apr 2026</a>, and a broker's market report put offers for the May contract at around 120p against a settlement of 109.69p on Friday 10 April, <a href="https://www.prestigebusiness.energy/marketreports/energy-market-update13april2026" target="_blank" rel="noopener">Prestige Business Solutions, 13 Apr 2026</a>. I have not found the contract's closing price for the day. On 12 April the talks between the United States and Iran ended without agreement and US Central Command said it would blockade all Iranian ports from 10:00 Eastern time (14:00 GMT) on 13 April. <a href="https://www.pbs.org/newshour/world/trump-says-u-s-navy-will-blockade-strait-of-hormuz-after-ceasefire-talks-end-without-agreement" target="_blank" rel="noopener">Associated Press via PBS NewsHour, 12 Apr 2026</a>.</>,
        <>The 2026 Iran-US confrontation over the strait. <a href="https://en.wikipedia.org/wiki/2026_Strait_of_Hormuz_crisis" target="_blank" rel="noopener">2026 Strait of Hormuz crisis, overview</a>; <a href="https://researchbriefings.files.parliament.uk/documents/CBP-10636/CBP-10636.pdf" target="_blank" rel="noopener">UK Parliament research briefing CBP-10636</a>.</>,
        <>Daily gas prices are the <a href="https://www.ons.gov.uk/economy/economicoutputandproductivity/output/datasets/systemaveragepricesapofgas" target="_blank" rel="noopener">System Average Price (SAP) of gas</a>, series "SAP actual day", the average price of gas traded on Great Britain's On-the-Day Commodity Market, published by the Office for National Statistics from National Gas Transmission data. Edition of 5 November 2026, covering January 2018 to November 2026, retrieved 11 November 2026; the chart shows 1 February to 16 April 2026. Published in pence per kilowatt hour and converted to pence per therm at 29.3071 kWh a therm.</>,
        <>A US-Iran agreement to reopen the strait was announced on 14 June 2026 and signed electronically on 17 June; on 20 June Iran said it had closed the strait again. <a href="https://worldoil.com/news/2026/6/14/u-s-iran-strike-deal-to-reopen-strait-of-hormuz-sending-oil-lower/" target="_blank" rel="noopener">World Oil, 14 Jun 2026</a>; <a href="https://gcaptain.com/trump-signs-interim-iran-deal-as-focus-shifts-to-hormuz/" target="_blank" rel="noopener">gCaptain (Bloomberg), 17 Jun 2026</a>; <a href="https://worldoil.com/news/2026/6/20/iran-closes-strait-of-hormuz-again-citing-lebanon-ceasefire-violations/" target="_blank" rel="noopener">World Oil, 20 Jun 2026</a>.</>,
        <>Daily moves are the change in the System Average Price (note 3) from one day to the next, in pence per therm: 26 changes from 2 to 27 February 2026 and 48 from 28 February to 16 April. The largest were a rise of 31.1p on 3 March and a fall of 31.5p on 10 March. The share of moves above 5p rose by 26 percentage points; resampling the days 10,000 times puts that rise between 7 and 44 points, and the ratio of the two medians between 1.0 and 3.7. Resampling treats the days as independent, which prices in a volatile spell are not, so the true ranges are wider. Of the 2,932 windows of 48 days in the same series between January 2018 and 27 February 2026, 18.5% had at least as large a share of moves above 5p, and every one of those windows ended in 2021, 2022 or 2023.</>,
        <>Daily tanker-transit counts are from <a href="https://portwatch.imf.org/" target="_blank" rel="noopener">IMF PortWatch</a>, "Daily Chokepoints Data" for the Strait of Hormuz (field <em>n_tanker</em>), built on AIS data from the UN Global Platform. Static snapshot, 1 February to 30 June 2026, retrieved 11 November 2026; the chart shows 1 February to 16 April 2026. AIS coverage in the region was degraded during the crisis by GPS jamming and vessels going dark, so the counts are approximate (note 7).</>,
        <>Windward, a maritime analytics firm, found that jamming added false crossings to its own AIS record of the strait: 393 of the 642 transits logged in August 2026 were false. That is a finding about Windward's record, and I have not found an equivalent check of the PortWatch counts. <a href="https://windward.ai/knowledge-base/gps-jamming-and-false-transits-in-the-strait-of-hormuz/" target="_blank" rel="noopener">Windward, GPS Jamming and False Transits in the Strait of Hormuz</a>.</>,
        <>Vessel positions are AIS reports from the key-free feed at <a href="https://hormuz.data-tracking.net" target="_blank" rel="noopener">data-tracking.net</a>, read every 15 minutes and kept for 72 hours. The tracker keeps LNG carriers, oil tankers (crude, oil products and bunkering tankers) and chemical and other tankers, and drops every other vessel type at intake. Tankers and LNG carriers last seen in the region within 45 days, or bound for a port inside it, are followed beyond it from the same feed's worldwide ship directory, read every six hours; a fix older than 14 days is dropped.</>,
        <>Incident reports are from <a href="https://www.ukmto.org/" target="_blank" rel="noopener">UKMTO, United Kingdom Maritime Trade Operations</a>, Crown copyright, Open Government Licence v3.0, read through <a href="https://hormuz.data-tracking.net" target="_blank" rel="noopener">data-tracking.net</a>. The map and the Incidents feed show only reports UKMTO classes as an attack. UKMTO's reports do not name an attacker. The tracker's apparent aggressor is my rule of thumb: a report whose text mentions military forces or disabling fire is marked USA, any other attack placed in the Strait of Hormuz, the Gulf of Oman or the Arabian (Persian) Gulf is marked Iran, and the rest, such as the Red Sea or the Gulf of Aden, are marked Other.</>,
        <>In 2024 oil flow through the Strait of Hormuz averaged 20 million barrels a day (b/d). Saudi Aramco's East-West pipeline from Abqaiq to Yanbu has a capacity of 5 million b/d, temporarily expanded to 7 million b/d in 2019, and the UAE's pipeline to the Fujairah export terminal 1.8 million b/d; the EIA estimates about 2.6 million b/d of the two countries' pipeline capacity could be available to bypass the strait. <a href="https://www.eia.gov/todayinenergy/detail.php?id=65504" target="_blank" rel="noopener">US Energy Information Administration, Today in Energy, 16 Jun 2025</a>. Pipeline and feeder paths are OpenStreetMap ways, <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">&copy; OpenStreetMap contributors</a>; the transfer anchorages enclose ship-to-ship transfers detected by <a href="https://hormuz.data-tracking.net/sts" target="_blank" rel="noopener">data-tracking.net STS Watch</a>; route details from <a href="https://en.wikipedia.org/wiki/East%E2%80%93West_Crude_Oil_Pipeline" target="_blank" rel="noopener">East-West Crude Oil Pipeline</a>, <a href="https://en.wikipedia.org/wiki/Habshan%E2%80%93Fujairah_oil_pipeline" target="_blank" rel="noopener">Habshan-Fujairah oil pipeline</a> and <a href="https://en.wikipedia.org/wiki/SUMED_pipeline" target="_blank" rel="noopener">SUMED pipeline</a>, Wikipedia.</>,
        <>Aircraft positions are ADS-B reports from the community feeds <a href="https://api.adsb.lol/docs" target="_blank" rel="noopener">adsb.lol</a> and <a href="https://github.com/adsbfi/opendata" target="_blank" rel="noopener">adsb.fi</a>, within 250 nautical miles of a point over the lower Gulf. Only airborne aircraft reporting their own integrity are used. An aircraft reporting an integrity category (NIC) of 0 cannot bound its own position, the symptom jamming and spoofing produce. Each hexagon is shaded by that share over the last few hours, and only hexagons with at least four readings are shaded.</>,
        <>The insights page mirrors the dashboard at <a href="https://hormuzstraitmonitor.com/" target="_blank" rel="noopener">hormuzstraitmonitor.com</a>, refreshed about every 15 minutes. Brent crude is the daily close from <a href="https://fred.stlouisfed.org/series/DCOILBRENTEU" target="_blank" rel="noopener">FRED, series DCOILBRENTEU</a>, with the monitor's live quote as the latest point. Daily strait transits are from IMF PortWatch (note 6). Headlines come from a <a href="https://news.google.com/search?q=Strait%20of%20Hormuz" target="_blank" rel="noopener">Google News</a> search for the Strait of Hormuz over the past seven days, with Reuters, Al Jazeera, the BBC, the Financial Times and Energy Live News listed first. Truth Social posts come from an independent <a href="https://github.com/stiles/trump-truth-social-archive" target="_blank" rel="noopener">public archive</a>, filtered to posts that mention Iran, Israel, boats, ships or Hormuz.</>,
      ]} />
    </Article>
  );
}
