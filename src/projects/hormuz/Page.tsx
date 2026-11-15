import { useState } from "react";
import { Article, Prose, Section, Wide, Fn, Footnotes } from "../../components/Article";
import Box from "../../components/Box";
import AreaChart from "../../components/charts/AreaChart";
import HormuzMap from "../../components/maps/HormuzMap";
import { dlabel, MON } from "../../lib/format";
import { usePageMeta } from "../../lib/meta";
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

export default function Hormuz() {
  const [view, setView] = useState<"live" | "app">("live");
  const lede = "In March 2026 daily tanker transits through the Strait of Hormuz fell to single figures, and on 13 April the UK wholesale gas contract for the month ahead rose about 10% in morning trading after the United States announced a blockade of Iranian ports. I built a live map of around 1,300 ships to see what the vessels were doing, and I compare the tanker counts with the daily gas price.";
  usePageMeta("Tracking ships in the Strait of Hormuz", lede);

  return (
    <Article
      kicker="Project · energy markets · updated 12 Nov 2026"
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
        <p>On 13 April 2026, the front-month UK wholesale gas contract (the contract for delivery in the following month) rose about 10% in morning trading, to around 120p a therm. Talks between the United States and Iran had ended without a deal over the weekend, and the United States had announced a naval blockade of Iranian ports, to begin that afternoon.<Fn n={1} /></p>
        <p>The blockade came out of a wider confrontation. On 28 February 2026 the United States and Israel began strikes on Iran, and within days Iran declared the strait closed to shipping.<Fn n={2} /> The United States had tied its own security to the Gulf's fuel routes long before 2026: under the Carter Doctrine of 1980, it said it would treat an outside attempt to control the Persian Gulf as an assault on its vital interests.<Fn n={3} /></p>
        <p>What made the price risk hard to judge, I think, is that an announcement of that kind describes what might happen to shipping and says little about what the ships are already doing. I wanted a plain read on whether energy trade through the strait was flowing or under stress, so that I could set a headline against the traffic.</p>
      </Prose>

      <Section title="The ship tracker I built" />
      <Prose>
        <p>I built a live tracker of around 1,300 ships across the Persian Gulf and Gulf of Oman. The tracker ingests AIS positions (AIS is the signal each ship broadcasts with its identity and location), classifies each ship by type, and watches the tanker and LNG (liquefied natural gas) segment specifically. From those positions the tracker derives one strait-status signal, which says whether energy trade is flowing or under stress. The map shows the live vessel positions, and the app view shows the tracker itself on a satellite basemap.</p>
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
        <p>The price chart shows the System Average Price of gas, the average price of the gas traded each day on Great Britain's on-the-day market, in pence a therm from the start of February to mid-April.<Fn n={4} /> The System Average Price fell through February, from 99.5p on 1 February to 76.6p on 27 February, and then roughly doubled in nine days, to 152.5p on 8 March, the highest day on the chart.</p>
      </Prose>

      <Wide>
        <Box title="System Average Price of Gas" sub="p/therm" h={380}>
          <AreaChart points={GAS} labels={LABELS} ticks={TICKS} unit="p/therm" digits={1} yMin={60} />
        </Box>
      </Wide>

      <Prose>
        <p>The System Average Price then fell back. It was 121.5p on 13 April and 105.1p on 16 April, the last day on the chart. The rise of about 10% on 13 April was in the front-month contract during the morning, which is a different price from the daily average.<Fn n={1} k="b" /> Beyond the chart, the same daily series stayed between 112p and 131p through the second half of May.<Fn n={4} k="b" /> On 17 June, the day a US-Iran agreement to reopen the strait was signed, three days after the agreement was announced, the System Average Price was 102.7p. On 20 June Iran said it had closed the strait again.<Fn n={5} /></p>
      </Prose>

      <Section title="What the tanker transit counts show" />
      <Prose>
        <p>The transit chart shows the number of tankers passing through the strait each day, as counted by IMF PortWatch from AIS data.<Fn n={6} /> Daily tanker transits ran at between 19 and 69 a day through February, fell to 5 on the first of March, and stayed at 5 or fewer on every day in the seven weeks that followed, to mid-April. Beyond the chart, the count was still between 0 and 4 a day in the second half of May, and between 1 and 21 a day from 21 to 30 June, after the agreement was signed. AIS coverage in the region was degraded by jamming and by ships going dark, so the counts are a lower bound.</p>
      </Prose>

      <Wide>
        <Box title="Daily Tanker Transits" sub="transits" h={380}>
          <AreaChart points={TRANSITS} labels={LABELS} ticks={TICKS} unit="transits" />
        </Box>
      </Wide>

      <Prose>
        <p>Set beside the price chart, the transit chart shows the tanker count falling from 36 on 28 February to 5 on the first of March. The System Average Price rose over the same days, from 76.6p on 27 February to 101.6p on 2 March, and reached 132.8p on 3 March. I can't show from two charts that the fall in traffic caused the rise in price, but the timing is what I would expect if the market was pricing the ships. By 13 April, the day the blockade of Iranian ports began, the tanker count had already been at 5 a day or fewer for six weeks, and the System Average Price was 31p below its 8 March peak.</p>
      </Prose>

      <Section title="What I would watch when a shipping route is at risk" />
      <Prose>
        <p>The transit chart is the part of this work I would keep. The next time news about a shipping route is followed by a jump in the gas price, I would look at the daily tanker count first, because the count shows what the ships are already doing. In 2026 the tanker count fell from 36 on 28 February to 5 on the first of March. The System Average Price rose from 76.6p on 27 February to its peak of 152.5p on 8 March, and it was 121.5p on 13 April, the day the front-month contract rose about 10% in morning trading.</p>
        <p>I would read any count built on AIS as a lower bound, since jamming and ships going dark take vessels out of the data. I also think a tracker like this is most useful in the weeks when the market is still deciding what the strait is worth. In the second half of May 2026 the System Average Price was still above 110p, against 76.6p on 27 February, and the agreement to reopen the strait was not signed until 17 June. Three days after the signing, Iran said it had closed the strait again.<Fn n={5} k="b" /></p>
      </Prose>

      <Footnotes notes={[
        <>The front-month (May) UK NBP gas contract rose about 10% in morning trading on 13 April 2026. Trading Economics reported a 10% rise to 120.7p per therm, <a href="https://tradingeconomics.com/commodity/uk-natural-gas/news/541273" target="_blank" rel="noopener">Trading Economics, 13 Apr 2026</a>, and a broker's market report put offers for the May contract at around 120p against a settlement of 109.69p on Friday 10 April, <a href="https://www.prestigebusiness.energy/marketreports/energy-market-update13april2026" target="_blank" rel="noopener">Prestige Business Solutions, 13 Apr 2026</a>. I have not found the contract's closing price for the day. On 12 April the talks between the United States and Iran ended without agreement and US Central Command said it would blockade all Iranian ports from 10:00 Eastern time (14:00 GMT) on 13 April. <a href="https://www.pbs.org/newshour/world/trump-says-u-s-navy-will-blockade-strait-of-hormuz-after-ceasefire-talks-end-without-agreement" target="_blank" rel="noopener">Associated Press via PBS NewsHour, 12 Apr 2026</a>.</>,
        <>The 2026 Iran-US confrontation over the strait. <a href="https://en.wikipedia.org/wiki/2026_Strait_of_Hormuz_crisis" target="_blank" rel="noopener">2026 Strait of Hormuz crisis, overview</a>; <a href="https://researchbriefings.files.parliament.uk/documents/CBP-10636/CBP-10636.pdf" target="_blank" rel="noopener">UK Parliament research briefing CBP-10636</a>.</>,
        <>US precedent for using force to keep Gulf fuel routes open: the <a href="https://en.wikipedia.org/wiki/Carter_Doctrine" target="_blank" rel="noopener">Carter Doctrine</a> (1980); the 1984-88 <a href="https://www.usni.org/magazines/naval-history/2025/june/tanker-war" target="_blank" rel="noopener">Tanker War</a>; and <a href="https://www.globalsecurity.org/military/ops/earnest_will.htm" target="_blank" rel="noopener">Operation Earnest Will</a> (1987-88), when the US Navy reflagged and escorted Kuwaiti tankers through the Gulf.</>,
        <>Daily gas prices are the <a href="https://www.ons.gov.uk/economy/economicoutputandproductivity/output/datasets/systemaveragepricesapofgas" target="_blank" rel="noopener">System Average Price (SAP) of gas</a>, series "SAP actual day", the average price of gas traded on Great Britain's On-the-Day Commodity Market, published by the Office for National Statistics from National Gas Transmission data. Edition of 5 November 2026, covering January 2018 to November 2026, retrieved 11 November 2026; the chart shows 1 February to 16 April 2026. Published in pence per kilowatt hour and converted to pence per therm at 29.3071 kWh a therm.</>,
        <>A US-Iran agreement to reopen the strait was announced on 14 June 2026 and signed electronically on 17 June; on 20 June Iran said it had closed the strait again. <a href="https://worldoil.com/news/2026/6/14/u-s-iran-strike-deal-to-reopen-strait-of-hormuz-sending-oil-lower/" target="_blank" rel="noopener">World Oil, 14 Jun 2026</a>; <a href="https://gcaptain.com/trump-signs-interim-iran-deal-as-focus-shifts-to-hormuz/" target="_blank" rel="noopener">gCaptain (Bloomberg), 17 Jun 2026</a>; <a href="https://worldoil.com/news/2026/6/20/iran-closes-strait-of-hormuz-again-citing-lebanon-ceasefire-violations/" target="_blank" rel="noopener">World Oil, 20 Jun 2026</a>.</>,
        <>Daily tanker-transit counts are from <a href="https://portwatch.imf.org/" target="_blank" rel="noopener">IMF PortWatch</a>, "Daily Chokepoints Data" for the Strait of Hormuz (field <em>n_tanker</em>), built on AIS data from the UN Global Platform. Static snapshot, 1 February to 30 June 2026, retrieved 11 November 2026; the chart shows 1 February to 16 April 2026. AIS coverage in the region was degraded during the crisis by GPS jamming and vessels going dark, so counts are a lower bound.</>,
      ]} />
    </Article>
  );
}
