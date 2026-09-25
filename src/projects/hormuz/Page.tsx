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

/** NBP August-2026 contract anchors, [day index, p/therm], expanded to a daily series. */
const KEYFRAMES: [number, number][] = [
  [0, 94], [10, 93], [20, 94], [27, 95],
  [28, 97], [34, 101], [41, 105], [48, 108], [53, 110],
  [54, 115], [58, 124], [63, 132], [67, 136], [70, 138],
  [71, 144], [74, 149],
];

/** Daily tanker transits through the Strait of Hormuz (IMF PortWatch, n_tanker). */
const TRANSITS = [37,55,45,43,46,50,48,49,41,59,46,55,64,58,50,60,43,52,62,54,54,72,62,55,58,53,53,44,7,2,2,0,1,0,2,1,6,1,1,3,3,1,5,0,1,0,1,3,0,0,2,1,1,0,0,0,2,12,2,0,2,4,2,7,1,3,0,4,1,5,3,4,3,4,3];

/** Expand the price anchors into one value per day. */
function dailySeries(): number[] {
  const out: number[] = [];
  let k = 0;
  for (let i = 0; i < DAYS; i++) {
    while (k < KEYFRAMES.length - 2 && i > KEYFRAMES[k + 1][0]) k++;
    const a = KEYFRAMES[k], b = KEYFRAMES[k + 1];
    let t = b[0] === a[0] ? 0 : (i - a[0]) / (b[0] - a[0]);
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    out.push(a[1] + (b[1] - a[1]) * t);
  }
  return out;
}

const ISO = Array.from({ length: DAYS }, (_, i) => new Date(START + i * 86_400_000).toISOString().slice(0, 10));
const LABELS = ISO.map(dlabel);
const TICKS = ISO.reduce<{ i: number; label: string }[]>((acc, d, i) => {
  const m = d.slice(5, 7);
  if (i === 0 || m !== ISO[i - 1].slice(5, 7)) acc.push({ i, label: MON[parseInt(m, 10) - 1] });
  return acc;
}, []);
const GAS = dailySeries();

export default function Hormuz() {
  const [view, setView] = useState<"live" | "app">("live");
  const lede = "Daily tanker transits through the Strait of Hormuz fell from between forty and seventy to single figures in March 2026, and front-month UK gas peaked near 151p a therm before falling back toward 96p by late May. I look at how the market priced the strait, the live map of around 1,300 ships I built to watch it, and the one chart I'd keep.";
  usePageMeta("Hormuz Tracker", lede);

  return (
    <Article
      kicker="Project · energy markets"
      title="Hormuz Tracker"
      lede={lede}
    >
      <Prose>
        <div className="links-row hz-links">
          <a href="https://hormuz.stevenstills.com" target="_blank" rel="noopener">View live tracker</a>
        </div>
      </Prose>

      <Wide>
        <Box icon="map" title="Live Vessel Map" h={560}>
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

      <Section title="The summer the strait stood still" />
      <Prose>
        <p>On 13 April 2026, UK wholesale gas jumped 11.7% in a single session, to 122.5p a therm, after a formal warning that the Strait of Hormuz could close indefinitely. Front-month gas went on to peak near 151p.<Fn n={1} /> For a stretch of that spring, the price a British supplier paid for gas could swing on whether a single cargo cleared the strait, and the threat of closure alone was enough to move it.</p>
        <p>Behind the price was a confrontation. Through the spring and summer of 2026, Iran and the United States slid into open conflict, an escalation many analysts struggled to tie to any clear war aim.<Fn n={2} /> With no obvious path to a decisive victory, the strait became the pivot of the whole thing, and the United States fell back on an old argument about keeping the world's fuel routes open.<Fn n={3} /></p>
        <p>Then the market learned to live with it. As the conflict settled into a grind and the risk was priced in, that sensitivity faded. By late May prices had fallen back toward 96p, the lowest since February, and the June reopening eased them further.<Fn n={4} /> The strait stayed a focal point for political argument long after it stopped moving the market.</p>
      </Prose>

      <Wide>
        <Box icon="activity" title="NBP August 2026 Contract" sub="p/therm" h={380}>
          <AreaChart points={GAS} labels={LABELS} ticks={TICKS} unit="p/therm" yMin={80} />
        </Box>
        <Box icon="bars" title="Daily Tanker Transits" sub="transits" h={380}>
          <AreaChart points={TRANSITS} labels={LABELS} ticks={TICKS} unit="transits" />
        </Box>
      </Wide>

      <Section title="What I built" />
      <Prose>
        <p>A live tracker of around 1,300 ships across the Persian Gulf and Gulf of Oman. It ingests AIS positions, classifies each ship by type, and watches the tanker and LNG segment specifically. From that it derives one strait-status signal: a plain read on whether energy trade is flowing or under stress. I built it for the weeks when one warning about the strait could move UK gas by more than a tenth in a session.</p>
      </Prose>

      <Section title="What to watch" />
      <Prose>
        <p>The transit chart is the part I'd keep. Daily tanker transits ran at between forty and seventy a day through February, dropped to single figures on the first of March and stayed there through mid-April, with one day above ten in the seven weeks that followed.<Fn n={5} /> AIS coverage in the region was degraded by jamming and by ships going dark, so even those counts are a lower bound. The price chart shows the other half of the story: the risk got priced, then the sensitivity faded. I think a tracker like this earns its keep in the first fortnight of a crisis, while the market is still deciding what the strait is worth.</p>
      </Prose>

      <Footnotes notes={[
        <>UK NBP gas rose 11.7% in one session on 13 April 2026, to 122.5p per therm, after a formal warning the strait could close "indefinitely"; the benchmark later peaked near 151p. <a href="https://www.financialcontent.com/article/marketminute-2026-4-13-british-natural-gas-prices-soar-117-amid-hormuz-blockade-threat" target="_blank" rel="noopener">FinancialContent, 13 Apr 2026</a>.</>,
        <>The 2026 Iran-US confrontation over the strait. <a href="https://en.wikipedia.org/wiki/2026_Strait_of_Hormuz_crisis" target="_blank" rel="noopener">2026 Strait of Hormuz crisis, overview</a>; <a href="https://researchbriefings.files.parliament.uk/documents/CBP-10636/CBP-10636.pdf" target="_blank" rel="noopener">UK Parliament research briefing CBP-10636</a>.</>,
        <>US precedent for using force to keep Gulf fuel routes open: the <a href="https://en.wikipedia.org/wiki/Carter_Doctrine" target="_blank" rel="noopener">Carter Doctrine</a> (1980); the 1984-88 <a href="https://www.usni.org/magazines/naval-history/2025/june/tanker-war" target="_blank" rel="noopener">Tanker War</a>; and <a href="https://www.globalsecurity.org/military/ops/earnest_will.htm" target="_blank" rel="noopener">Operation Earnest Will</a> (1987-88), when the US Navy reflagged and escorted Kuwaiti tankers through the Gulf.</>,
        <>Prices eased to about 96p by late May 2026, the lowest since February, as shipping normalised and Qatari LNG resumed; a US-Iran agreement to reopen the strait was announced on 14 June and signed on 17 June. <a href="https://tradingeconomics.com/commodity/uk-natural-gas" target="_blank" rel="noopener">Trading Economics, UK natural gas</a>; <a href="https://www.aljazeera.com/news/2026/6/11/iran-shuts-hormuz-strait-but-wasnt-it-already-closed" target="_blank" rel="noopener">Al Jazeera</a>.</>,
        <>Daily tanker-transit counts are from <a href="https://portwatch.imf.org/" target="_blank" rel="noopener">IMF PortWatch</a>, "Daily Chokepoints Data" for the Strait of Hormuz (field <em>n_tanker</em>), built on AIS data from the UN Global Platform. Static snapshot, 1 February to 21 June 2026, retrieved 29 June 2026. AIS coverage in the region was degraded during the crisis by GPS jamming and vessels going dark, so counts are a lower bound.</>,
      ]} />
    </Article>
  );
}
