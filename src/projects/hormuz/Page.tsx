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
  const lede = "In March 2026 daily tanker transits through the Strait of Hormuz fell to single figures, and on 13 April the UK wholesale gas contract for the month ahead rose about 10% in morning trading after the United States announced a blockade of Iranian ports. I built a live map of around 1,300 ships to see what the vessels were doing, and I compare the tanker counts with the daily gas price.";
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

      <Section title="Why the strait mattered to UK gas buyers" />
      <Prose>
        <p>On 13 April 2026, the front-month UK wholesale gas contract (the contract for delivery in the following month) rose about 10% in morning trading, to around 120p a therm, after the United States announced a naval blockade of Iranian ports.<Fn n={1} /></p>
        <p>On 28 February 2026 the United States and Israel began strikes on Iran, and within days Iran declared the strait closed to shipping.<Fn n={2} /></p>
        <p>An announcement of that kind says little about what the ships are already doing, so I wanted a plain read on whether energy trade through the strait was flowing or under stress.</p>
      </Prose>

      <Section title="The ship tracker I built" />
      <Prose>
        <p>I built a live tracker of around 1,300 ships across the Persian Gulf and Gulf of Oman. It reads AIS positions (the signal each ship broadcasts with its identity and location), classifies each ship by type, watches the tanker and LNG (liquefied natural gas) segment, and derives one strait-status signal from those positions.</p>
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
        <p>One event gives one before and one after. The comparison shows large daily moves becoming about three times as common. It cannot show the cause. The only 48-day windows since January 2018 with at least as large a share of moves above 5p ended in 2021, 2022 or 2023.<Fn n={5} k="b" /></p>
      </Prose>

      <Section title="What the tanker transit counts show" />
      <Prose>
        <p>IMF PortWatch counts the tankers passing through the strait each day from AIS data.<Fn n={6} /> The count ran at between 19 and 69 a day through February, fell to 5 on the first of March, and stayed at 5 or fewer for the seven weeks to mid-April. After rising to 12 on 18 April and 23 on 29 April, it was back between 0 and 4 a day in the second half of May.</p>
      </Prose>

      <Wide>
        <Box title="Daily Tanker Transits" sub="transits" h={380}>
          <AreaChart points={TRANSITS} labels={LABELS} ticks={TICKS} unit="transits" />
        </Box>
      </Wide>

      <Prose>
        <p>The tanker count fell from 36 on 28 February to 5 on the first of March, and the System Average Price rose from 76.6p on 27 February to 132.8p on 3 March. I can't show from two charts that the fall in traffic caused the rise in price, but the timing is what I would expect if the market was pricing the ships. By 13 April the tanker count had been at 5 a day or fewer for six weeks.</p>
      </Prose>

      <Section title="What I would watch when a shipping route is at risk" />
      <Prose>
        <p>The next time news about a shipping route is followed by a jump in the gas price, I would look at the daily tanker count first, because it shows what the ships are already doing. I would read any count built on AIS as approximate, since ships that go dark drop out of the data and jamming can add crossings that never happened.<Fn n={7} /> I would size day-to-day price risk from the weeks after the event, when 38% of days moved by more than 5p, and not from the month before, when 12% did. I think a tracker like this is most useful while the market is still deciding what the strait is worth: in the second half of May 2026 the System Average Price was still above 110p.<Fn n={3} k="b" /></p>
      </Prose>

      <Footnotes notes={[
        <>The front-month (May) UK NBP gas contract rose about 10% in morning trading on 13 April 2026. Trading Economics reported a 10% rise to 120.7p per therm, <a href="https://tradingeconomics.com/commodity/uk-natural-gas/news/541273" target="_blank" rel="noopener">Trading Economics, 13 Apr 2026</a>, and a broker's market report put offers for the May contract at around 120p against a settlement of 109.69p on Friday 10 April, <a href="https://www.prestigebusiness.energy/marketreports/energy-market-update13april2026" target="_blank" rel="noopener">Prestige Business Solutions, 13 Apr 2026</a>. I have not found the contract's closing price for the day. On 12 April the talks between the United States and Iran ended without agreement and US Central Command said it would blockade all Iranian ports from 10:00 Eastern time (14:00 GMT) on 13 April. <a href="https://www.pbs.org/newshour/world/trump-says-u-s-navy-will-blockade-strait-of-hormuz-after-ceasefire-talks-end-without-agreement" target="_blank" rel="noopener">Associated Press via PBS NewsHour, 12 Apr 2026</a>.</>,
        <>The 2026 Iran-US confrontation over the strait. <a href="https://en.wikipedia.org/wiki/2026_Strait_of_Hormuz_crisis" target="_blank" rel="noopener">2026 Strait of Hormuz crisis, overview</a>; <a href="https://researchbriefings.files.parliament.uk/documents/CBP-10636/CBP-10636.pdf" target="_blank" rel="noopener">UK Parliament research briefing CBP-10636</a>.</>,
        <>Daily gas prices are the <a href="https://www.ons.gov.uk/economy/economicoutputandproductivity/output/datasets/systemaveragepricesapofgas" target="_blank" rel="noopener">System Average Price (SAP) of gas</a>, series "SAP actual day", the average price of gas traded on Great Britain's On-the-Day Commodity Market, published by the Office for National Statistics from National Gas Transmission data. Edition of 5 November 2026, covering January 2018 to November 2026, retrieved 11 November 2026; the chart shows 1 February to 16 April 2026. Published in pence per kilowatt hour and converted to pence per therm at 29.3071 kWh a therm.</>,
        <>A US-Iran agreement to reopen the strait was announced on 14 June 2026 and signed electronically on 17 June; on 20 June Iran said it had closed the strait again. <a href="https://worldoil.com/news/2026/6/14/u-s-iran-strike-deal-to-reopen-strait-of-hormuz-sending-oil-lower/" target="_blank" rel="noopener">World Oil, 14 Jun 2026</a>; <a href="https://gcaptain.com/trump-signs-interim-iran-deal-as-focus-shifts-to-hormuz/" target="_blank" rel="noopener">gCaptain (Bloomberg), 17 Jun 2026</a>; <a href="https://worldoil.com/news/2026/6/20/iran-closes-strait-of-hormuz-again-citing-lebanon-ceasefire-violations/" target="_blank" rel="noopener">World Oil, 20 Jun 2026</a>.</>,
        <>Daily moves are the change in the System Average Price (note 3) from one day to the next, in pence per therm: 26 changes from 2 to 27 February 2026 and 48 from 28 February to 16 April. The largest were a rise of 31.1p on 3 March and a fall of 31.5p on 10 March. The share of moves above 5p rose by 26 percentage points; resampling the days 10,000 times puts that rise between 7 and 44 points, and the ratio of the two medians between 1.0 and 3.7. Resampling treats the days as independent, which prices in a volatile spell are not, so the true ranges are wider. Of the 2,932 windows of 48 days in the same series between January 2018 and 27 February 2026, 18.5% had at least as large a share of moves above 5p, and every one of those windows ended in 2021, 2022 or 2023.</>,
        <>Daily tanker-transit counts are from <a href="https://portwatch.imf.org/" target="_blank" rel="noopener">IMF PortWatch</a>, "Daily Chokepoints Data" for the Strait of Hormuz (field <em>n_tanker</em>), built on AIS data from the UN Global Platform. Static snapshot, 1 February to 30 June 2026, retrieved 11 November 2026; the chart shows 1 February to 16 April 2026. AIS coverage in the region was degraded during the crisis by GPS jamming and vessels going dark, so the counts are approximate (note 7).</>,
        <>Windward, a maritime analytics firm, found that jamming added false crossings to its own AIS record of the strait: 393 of the 642 transits logged in August 2026 were false. That is a finding about Windward's record, and I have not found an equivalent check of the PortWatch counts. <a href="https://windward.ai/knowledge-base/gps-jamming-and-false-transits-in-the-strait-of-hormuz/" target="_blank" rel="noopener">Windward, GPS Jamming and False Transits in the Strait of Hormuz</a>.</>,
      ]} />
    </Article>
  );
}
