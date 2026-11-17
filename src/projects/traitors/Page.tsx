import { Article, Prose, Section, Wide, Fn, Footnotes } from "../../components/Article";
import Box from "../../components/Box";
import LineChart from "../../components/charts/LineChart";
import Histogram from "../../components/charts/Histogram";
import DataTable from "../../components/charts/DataTable";
import { fmt } from "../../lib/format";
import { usePageMeta } from "../../lib/meta";
import data from "./data.json";
import "./traitors.css";

const NIGHT = "var(--ste-night)", SECONDARY = "var(--ste-secondary)", TERTIARY = "var(--ste-tertiary)", BAND = "var(--ste-primary)";
const f = data.facts;
const fin = Object.fromEntries(data.finals.map((r) => [r.key, r]));
const s4 = fin.s4, c1 = fin.celeb1, s3 = fin.s3;
/** Comparison evenings that beat the final, from a permutation p value of (k + 1) / (n + 1). */
const beat = (p: number, n: number) => Math.round(p * (n + 1)) - 1;
const half = (labels: string[]) => labels.map((l, i) => ({ i, label: l })).filter((t) => t.label.endsWith(":00") || t.label.endsWith(":30"));
const TITLE = "What The Traitors final did to the power grid";
const LEDE = `The Traitors final went out on BBC One on 23 January to ${fmt(s4.live, 1)} million people, with no advert breaks to put the kettle on in. I looked for the kettles in five-minute grid data, before the final and after it.`;
const ext = { target: "_blank", rel: "noopener" };

function Legend({ items }: { items: [string, string][] }) {
  return <div className="legend">{items.map(([n, c]) => <span key={n}><i style={{ background: c }} />{n}</span>)}</div>;
}

/** Demand through the evening of the final against the path of an ordinary evening; also the home preview. */
export function EveningChart({ h }: { h?: number }) {
  const e = data.s4;
  return (
    <Box title="Demand on the Evening of the Final" sub="GW" h={h}>
      <LineChart labels={e.labels} ticks={half(e.labels)} unit="GW" digits={1} yMin={24} yMax={38} yTicks={[24, 26, 28, 30, 32, 34, 36, 38]}
        band={{ top: e.hi, bottom: e.lo, color: BAND }}
        series={[{ name: "23 January", values: e.actual, color: SECONDARY }, { name: "Ordinary evening", values: e.expected, color: NIGHT }]} />
      <Legend items={[["23 January", SECONDARY], ["Ordinary evening", NIGHT], ["Middle 80% of evenings", BAND]]} />
    </Box>
  );
}

function RiseChart({ k, title, name }: { k: "s4" | "celeb1"; title: string; name: string }) {
  const e = data.rise[k];
  return (
    <Box title={title} sub="MW" h={360}>
      <LineChart labels={e.labels} ticks={half(e.labels)} unit="MW" digits={0} yMin={-800} yMax={800} yTicks={[-800, -400, 0, 400, 800]}
        band={{ top: e.hi, bottom: e.lo, color: BAND }}
        series={[{ name, values: e.x, color: SECONDARY }]} />
      <Legend items={[[name, SECONDARY], ["Middle 90% of evenings", BAND]]} />
    </Box>
  );
}

function FinalsTable() {
  return (
    <Box title="Three Finals">
      <DataTable caption="The ten-minute rise in demand around the end of three finals of The Traitors"
        columns={[{ key: "name", label: "Final" }, { key: "live", label: "Overnight audience", unit: "million", digits: 1 }, { key: "end", label: "Billed end" },
          { key: "after", label: "After-show" }, { key: "rise", label: "Rise at the end", unit: "MW", digits: 0, tint: true },
          { key: "beaten", label: "Ordinary evenings with a bigger rise" }]}
        rows={[s3, c1, s4].map((r) => ({ name: r.name, live: r.live, end: r.end, after: r.after, rise: r.rise, beaten: `${beat(r.p, r.n)} of ${r.n}` }))} />
    </Box>
  );
}

function PowerChart() {
  const p = data.power;
  const pct = (a: number[]) => a.map((v) => v * 100);
  const ticks = p.audience.map((a, i) => ({ i, label: String(a) })).filter((t) => Number(t.label) % 5 === 0);
  return (
    <Box title="Chance of Seeing a Pickup by Audience" sub="%" h={380}>
      <LineChart labels={p.audience.map((a) => `${fmt(a, 1)} million`)} ticks={ticks} unit="%" digits={0} yMin={0} yMax={100} yTicks={[0, 25, 50, 75, 100]}
        series={[{ name: "Knowing when to look", values: pct(p.known), color: SECONDARY }, { name: "Searching the whole evening", values: pct(p.blind), color: NIGHT },
          { name: "Bigger than a typical forecast miss", values: pct(p.forecast), color: TERTIARY }]} />
      <Legend items={[["Knowing when to look", SECONDARY], ["Searching the whole evening", NIGHT], ["Bigger than a typical forecast miss", TERTIARY]]} />
    </Box>
  );
}

function ScenarioTable() {
  const row = (name: string, k: "as_aired" | "no_after_show" | "everyone_live", seen: string) =>
    ({ name, lo: f.scen[k][0], mid: f.scen[k][1], hi: f.scen[k][2], seen, miss: `${fmt(f.forecast_hit[k] * 100)}%` });
  return (
    <Box title="The Final, Simulated">
      <DataTable caption={`The ten-minute rise at the credits across ${fmt(f.draws)} simulated evenings`}
        columns={[{ key: "name", label: "Scenario" }, { key: "lo", label: "5th percentile", unit: "MW", digits: 0 }, { key: "mid", label: "Median", unit: "MW", digits: 0, tint: true },
          { key: "hi", label: "95th percentile", unit: "MW", digits: 0 }, { key: "seen", label: "Seen in five-minute data" }, { key: "miss", label: "Beats a typical forecast miss" }]}
        rows={[row("As it aired", "as_aired", "No"), row("No after-show on BBC One", "no_after_show", `${fmt(f.seen.no_after_show * 100)}%`),
          row(`${fmt(f.everyone)} million watching`, "everyone_live", `${fmt(f.seen.everyone_live * 100)}%`)]} />
    </Box>
  );
}

export default function Traitors() {
  usePageMeta(TITLE, LEDE);
  return (
    <Article kicker="Did it affect the grid · Part 1" title={TITLE} lede={LEDE}>
      <Prose>
        <p>The final of The Traitors went out on Friday 23 January, which was also my brother's 36th birthday. Only one of those two events drew {fmt(s4.live, 1)} million viewers, and I should probably apologise to him for which one this article is about.</p>
        <p>What stayed with me from the series was Rachel and Stephen. For the back half of it they were the only two Traitors left, in a game built on betrayal. They stuck it out to the end together with an unshakeable bond, and I found that a beautiful thing to watch.</p>
        <p>My job is short-term demand forecasting, and the trouble with the job is that I can't see {fmt(s4.live, 1)} million people do the same thing at the same moment without asking what it did to my numbers.</p>
        <p>The BBC has no advert breaks, so there is nowhere in the middle of a 75-minute final to put the kettle on. It has to go on before, or it has to wait until after. So which was it, and did the grid notice? Let's take a look.</p>
      </Prose>

      <Wide>
        <div className="traitors-pics">
          <div className="photo"><img src="/img/traitors-final.jpg" alt="Claudia Winkleman, in a dark coat on a Highland moor, sounding a red air horn" /></div>
          <div className="photo"><img src="/img/traitors-ardross.jpg" alt="Ardross Castle in the Scottish Highlands, where The Traitors is filmed, seen across its grounds" /></div>
        </div>
        <p className="traitors-credit">Images: BBC / Studio Lambert; Ardross Castle by Anne Burgess, CC BY-SA 2.0</p>
      </Wide>

      <Section title="Two Traitors, 75 minutes and no advert breaks" />
      <Prose>
        <p>The final ran on BBC One from 20:30 to 21:45.<Fn n={1} /> The BBC's overnight figures put the average audience at {fmt(s4.live, 1)} million across the 75 minutes, with a peak of 9.6 million.<Fn n={2} /></p>
        <p>Rachel Duffy and Stephen Libby won it and split £95,750, the first pair of Traitors to take the prize together.<Fn n={3} /> "Two traitors but totally faithful to each other," was how Claudia Winkleman put it at the end.<Fn n={3} k="b" /></p>
        <p>I should be straight about how long that lasted, because the number matters to me more than it should. The series opened with three Traitors and a secret fourth, who was unmasked to the others in episode 4. Hugo was banished in episode 3 and Fiona in episode 6, which left Rachel and Stephen on their own from episode 7 to episode 12, so half the series.<Fn n={4} /> I'd have told you it was 99% of it.</p>
      </Prose>

      <Section title="A TV pickup comes when a programme ends" />
      <Prose>
        <p>The grid has a name for what I was looking for. A TV pickup is the jump in demand when a big audience gets up at the same time. National Grid describes it as people watching a programme and then, when it ends, switching on kettles and ovens together.<Fn n={5} /></p>
        <p>The record is 2,800 megawatts (MW), after England's penalty shoot-out against West Germany in 1990.<Fn n={6} /> EastEnders managed 2,290 MW at the end of one episode in April 2001, against the 400 MW an ordinary episode used to bring.<Fn n={6} k="b" /></p>
        <p>Two things I read while checking this changed how I looked at the data. Damian Carrington, writing in the Guardian in 2013, reported that a pickup looks bigger than it is because people sitting still during the programme dig a dip in demand first. He also reported that the BBC's Doctor Who anniversary special drew a big audience that year and produced no surge at all, and that National Grid's forecasting manager suggested the programmes that followed may have held viewers in their seats.<Fn n={7} /> Keep that one in mind.</p>
        <p>The other was a BBC piece from 2007 about the analyst at National Grid whose job included reading the TV listings every day.<Fn n={8} /></p>
      </Prose>

      <Section title="Five-minute readings are fine enough to see a kettle" />
      <Prose>
        <p>Half-hourly demand, which is what demand forecasts are scored on, is too coarse for this. A kettle boils in a few minutes and the average over half an hour smooths it away.</p>
        <p>Elexon publishes something finer: the output of every type of power station and every interconnector, every five minutes.<Fn n={9} /> Added together that is the demand the transmission system was meeting at that moment, so I used it as demand.</p>
        <p>For a pickup I measured the rise over ten minutes, and compared it with the rise at the same time of evening on {s4.n} ordinary weekday evenings within six weeks of the final. Demand falls all evening in January, so a kettle moment shows up as the fall stalling or reversing for a few minutes. I searched from ten minutes before a billed time to fifteen minutes after it, because credits rarely roll exactly on the minute.<Fn n={9} k="b" /></p>
        <p>I also looked for an official number and couldn't find one. The system operator publishes its pickups for big football matches, and I found nothing from it on any final of The Traitors.</p>
      </Prose>
      <Wide><EveningChart h={380} /></Wide>
      <Prose>
        <p>That is the whole evening, with the path an ordinary evening would have taken from 20:00 in black. If you can spot the final in it, you have better eyes than me.</p>
      </Prose>

      <Section title="No kettles showed up before the final or after it" />
      <Prose>
        <p>So I took the usual evening away and looked only at the ten-minute changes.</p>
      </Prose>
      <Wide><RiseChart k="s4" title="Ten-minute Change in Demand Against an Ordinary Evening, 23 January 2026" name="23 January" /></Wide>
      <Prose>
        <p>Before the 20:30 start, the biggest ten-minute rise I could find was {fmt(f.before.rise)} MW, and {beat(f.before.p, s4.n)} of the {s4.n} ordinary evenings beat that in the same window. Around the end at 21:45 it was {fmt(s4.rise)} MW, which is to say nothing, and {beat(s4.p, s4.n)} of the {s4.n} ordinary evenings did better without a final to help them.</p>
        <p>So the answer to my question is that I can't see either. If the kettles went on before or after, the surge was too small for five-minute data to show.</p>
        <p>There is one bump. Demand rose {fmt(s4.late_rise)} MW more than usual in the ten minutes to {s4.late_at}. Only {beat(s4.late_p, s4.n)} of the {s4.n} ordinary evenings matched it at that time of night, but when I searched the whole evening instead of one spot, {beat(s4.blind_p, s4.n)} of the {s4.n} had a bump that size somewhere. I'd call it a maybe. What I can say is that it came 50 minutes after the final ended, which turns out to be interesting.</p>
      </Prose>

      <Section title="The celebrity final looks like it got one" />
      <Prose>
        <p>I wanted to know whether my method could find a pickup at all, so I ran it on the final of The Celebrity Traitors from Thursday 6 November 2025, which had {fmt(c1.live, 1)} million watching overnight.<Fn n={10} /></p>
      </Prose>
      <Wide><RiseChart k="celeb1" title="Ten-minute Change in Demand Against an Ordinary Evening, 6 November 2025" name="6 November" /></Wide>
      <Prose>
        <p>That final was billed to end at {c1.end}, and in the ten minutes to {c1.at} demand rose {fmt(c1.rise)} MW more than usual. Only {beat(c1.p, c1.n)} of {c1.n} ordinary evenings managed that in the same window, and {beat(c1.blind_p, c1.n)} of {c1.n} managed it anywhere in the evening. The rise starts a few minutes before the billed end, and I can only place it to within five minutes, so I'd call it a likely pickup. It also held: demand stayed about that far above the usual path for the next half an hour, which a kettle on its own doesn't do.</p>
        <p>On the same test, January's late bump is as strong as November's. What differs is where each one sits. November's is at the credits and January's is 50 minutes after them. I went back to the listings, like the analyst in 2007, and found one difference between the two nights.</p>
      </Prose>
      <Wide><FinalsTable /></Wide>
      <Prose>
        <p>In November the after-show, Uncloaked, was on BBC Two, and BBC One went straight to the News at Ten.<Fn n={10} k="b" /> In January Uncloaked followed the final on BBC One, from 21:45 to 22:40.<Fn n={1} k="b" /> The same was true of the series 3 final a year earlier, and the rise at its end was one that {beat(s3.p, s3.n)} of {s3.n} ordinary evenings beat.<Fn n={11} /></p>
        <p>My maybe-bump on 23 January came in the ten minutes to {s4.late_at}, five minutes before Uncloaked was billed to end. I'd guess the after-show held people on the sofa, the way the forecasting manager suggested in 2013, and the kettle waited for it. Three finals can't prove that. The series 3 after-show finished with no bump at all, on a smaller audience of {fmt(s3.live, 1)} million.</p>
      </Prose>

      <Section title={`It takes about ${fmt(f.need_known_50, 0)} million viewers to see a pickup half the time`} />
      <Prose>
        <p>The celebrity final gives me one measured response to work with. After taking off the biggest rise an ordinary evening manages on its own, it comes to {fmt(f.k_celeb[1])} MW for every million people watching, and the noise means it could be anywhere from {fmt(f.k_celeb[0])} to {fmt(f.k_celeb[2])} MW.</p>
        <p>To put that in kettles I built a small model of the minutes after the credits. I've assumed kettles of 2.2 to 3 kilowatts (kW), switched on about three minutes after the end on average, and boiling for two to four minutes.<Fn n={12} /> Spread out like that, a five-minute reading catches {fmt(f.snap_share * 100)}% of the true one-minute peak. On those assumptions the November pickup was {fmt(f.kettles_celeb[1], 1)} kettles for every 100 viewers. That looked low to me, so I checked it against Drax's sums for 1990, which come out at about four kettles per 100 viewers. National Grid's own figures for the Queen's address in 2020 come out nearer one.<Fn n={12} k="b" /> Most people, it seems, just sit there.</p>
        <p>Then I asked the question the other way round. I took the ordinary evenings, added a pickup for an audience of a given size, and ran my test on each one, {fmt(f.draws)} times for each size. A pickup has to beat {fmt(f.thr_known)} MW to stand out from the evening's own wobbles when I know when to look, and {fmt(f.thr_blind)} MW when I don't.</p>
      </Prose>
      <Wide><PowerChart /></Wide>
      <Prose>
        <p>The chart shows the chance of spotting the pickup against the size of the audience, in millions. Knowing when to look, it takes {fmt(f.need_known_50, 1)} million viewers to see it half the time and {fmt(f.need_known_80, 0)} million to see it four times in five. Searching a whole evening blind, it takes {fmt(f.need_blind_50, 0)} million and {fmt(f.need_blind_80, 0)} million.</p>
        <p>The celebrity final got over the line with {fmt(c1.live, 1)} million, which I now think was a slightly lucky night. It also answers part of my question about January: at November's rate, my test would catch {fmt(s4.live, 1)} million viewers only about one time in five, after-show or no after-show.</p>
        <p>An overnight figure is also not a count of people on the sofa at the credits. Across everything watched on TV sets in December 2025, Barb found that only 45% was live.<Fn n={13} /> I have no live figure for this final.</p>
      </Prose>

      <Section title={`The same final, simulated ${fmt(f.draws)} times`} />
      <Prose>
        <p>Last, I replayed 23 January under three sets of rules. As it aired. With Uncloaked moved to another channel, so the audience responds the way November's did. And with {fmt(f.everyone)} million watching, the audience for the Queen's address in April 2020.<Fn n={5} k="b" /> That broadcast really produced 500 to 600 MW, about half my model's median, so read that row as an upper case.</p>
      </Prose>
      <Wide><ScenarioTable /></Wide>
      <Wide>
        <Box title="Rise at the Credits With No After-show on BBC One" sub="% of simulated evenings" h={340}>
          <Histogram bins={data.hist.no_after_show} unit="MW" yUnit="%" yDigits={0} mark={f.thr_known} xTicks={[-400, 0, 400, 800, 1200, 1600, 2000, 2400]} />
        </Box>
      </Wide>
      <Prose>
        <p>Without the after-show I'd expect a pickup of about {fmt(f.scen.no_after_show[1])} MW, and I'd spot it on {fmt(f.seen.no_after_show * 100)}% of evenings. The line on the chart marks the {fmt(f.thr_known)} MW it has to clear. The chart shows the pickup on its own, and on a real evening the ordinary wobble sits on top of it, which is how a 400 MW pickup sometimes clears the line. About 5% of ordinary evenings clear it with no pickup at all. Even with {fmt(f.everyone)} million watching I'd miss it about one time in five.</p>
      </Prose>

      <Section title="The forecast never noticed" />
      <Prose>
        <p>Did it affect my demand forecasts? I can't show you mine, so here is the published one, and the answer is no. The published day-ahead forecast was out by {fmt(f.night_mae)} MW on average between 20:00 and 23:00 that night, against {fmt(f.mae)} MW on the ordinary evenings around it.<Fn n={14} /> It ran 600 to 800 MW low in five of the six half hours, which looks to me like the forecast having the level of the whole evening wrong. A show would have left a step at 21:45, and the step there is well inside the usual spread.</p>
        <p>November is the one that makes me think. That pickup held for half an hour, so it added somewhere between {fmt(Math.round(f.k_celeb[1] * c1.live * f.held / 10) * 10)} and {fmt(f.celeb_hh)} MW to a half-hourly number, which is about the size of the {fmt(f.mae)} MW typical miss I measured for January. The forecast error shows a step of about {fmt(Math.round(c1.hh.step / 100) * 100)} MW there, which is inside the usual noise, and I can't tell whether somebody had read the listings and put most of it in.<Fn n={14} k="b" /> I'd like to think so.</p>
        <p>So my brother's birthday passed without troubling the grid, and so did the final. If the BBC ever moves Uncloaked back to BBC Two for a civilian series, the five-minute data at the credits is where I'll be looking. Until then I have a pair of Traitors who stayed faithful to each other for six episodes, and a nation of kettles that, as far as five-minute data can tell, sat through 75 minutes and then the after-show as well. Rachel and Stephen weren't the only ones who held their nerve.</p>
      </Prose>

      <Footnotes notes={[
        <>BBC One schedule for <a href="https://www.bbc.co.uk/schedules/p00fzl6p/2026/01/23" {...ext}>Friday 23 January 2026</a>: The Traitors, the final, 20:30 to 21:45, then The Traitors: Uncloaked, 21:45 to 22:40. These are billed times, not the times the programmes went off air.</>,
        <>The Independent via Newswav, <a href="https://newswav.com/article/the-traitors-finale-watched-by-more-than-nine-million-viewers-A2601_rrfavg" {...ext}>The Traitors finale watched by more than nine million viewers</a>, January 2026, reporting BBC overnight figures.</>,
        <>PA Media via STV News, <a href="https://news.stv.tv/entertainment/traitors-rachel-and-stephen-make-series-history-as-dual-winners" {...ext}>Traitors Rachel and Stephen make series history as dual winners</a>, 24 January 2026.</>,
        <>Episode guide on Wikipedia, <a href="https://en.wikipedia.org/wiki/The_Traitors_(British_TV_series)_series_4" {...ext}>The Traitors (British TV series) series 4</a>, twelve episodes from 1 to 23 January 2026, with Rachel, Stephen and Hugo as the original Traitors and Fiona revealed as the Secret Traitor in episode 4.</>,
        <>National Grid, <a href="https://www.nationalgrid.com/stories/grid-at-work-stories/4-ways-lockdown-life-affected-uk-electricity-use" {...ext}>4 ways lockdown life affected UK electricity use</a>, 21 July 2020, which also gives 24 million viewers and a pickup of 500 to 600 MW for the Queen's address on 5 April 2020.</>,
        <>NESO, <a href="https://www.neso.energy/news/neso-ready-record-electricity-demand-during-biggest-ever-fifa-world-cup" {...ext}>NESO ready for record electricity demand during biggest ever FIFA World Cup</a>, 8 June 2026, for the 1990 record. Drax, <a href="https://www.drax.com/technology/7-of-the-biggest-tv-moments-in-uk-electricity-history/" {...ext}>7 of the biggest TV moments in UK electricity history</a>, 6 October 2016, for EastEnders.</>,
        <>Damian Carrington in <a href="https://www.theguardian.com/environment/2013/dec/20/strictly-come-dancing-bbc-national-grid" {...ext}>the Guardian</a>, 20 December 2013, on National Grid preparing for the Strictly Come Dancing final.</>,
        <>BBC News Magazine, <a href="http://news.bbc.co.uk/2/hi/uk_news/magazine/6981356.stm" {...ext}>6 September 2007</a>.</>,
        <>Elexon, <a href="https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELINST" {...ext}>generation by fuel type (FUELINST)</a>, every five minutes. I summed every fuel type and interconnector, and replaced a reading with the middle of its neighbours where it jumped more than 600 MW for one reading only. The comparison is with weekday evenings within 42 days of each final, leaving out the Christmas fortnight. A reading is five minutes from the next, so I can place a rise to within five minutes and no closer. Each count of ordinary evenings is out of the evenings compared.</>,
        <>BBC One schedule for <a href="https://www.bbc.co.uk/schedules/p00fzl6p/2025/11/06" {...ext}>Thursday 6 November 2025</a>: The Celebrity Traitors, 21:00 to 22:10, then BBC News at Ten. <a href="https://www.bbc.co.uk/schedules/p00fzl97/2025/11/06" {...ext}>BBC Two the same night</a>: Uncloaked, 22:10 to 22:55. Overnight audience of 11.1 million from Advanced Television, <a href="https://www.advanced-television.com/?p=273904" {...ext}>reporting BBC figures</a>.</>,
        <>BBC One schedule for <a href="https://www.bbc.co.uk/schedules/p00fzl6p/2025/01/24" {...ext}>Friday 24 January 2025</a>: the series 3 final, 20:30 to 21:40, then Uncloaked, 21:40 to 22:25. Overnight audience of 7.4 million from <a href="https://uk.style.yahoo.com/traitors-season-three-final-breaks-203733739.html" {...ext}>Yahoo UK</a>, 26 January 2025, which describes it as live viewing on BBC One, so the three audiences may not be counted the same way.</>,
        <>The kettle timings are my assumptions, not measurements. Drax (note 6) converts 1 MW to 400 kettles, which is 2.5 kW each, and gives 2,800 MW as 1,120,000 kettles for 1990; set against the audience of about 26 million that Drax gives, that is roughly four for every 100 viewers. National Grid (note 5) gives 300,000 kettles for the 24 million who watched the Queen's address. The kettle count treats the whole rise as kettles, so it overstates them.</>,
        <>Barb, What People Watched in 2025, as reported by Advanced Television, <a href="https://www.advanced-television.com/2026/02/19/barb-live-tv-viewing-remains-substantial-in-uk" {...ext}>Barb: Live TV viewing remains substantial in UK</a>, 19 February 2026.</>,
        <>Elexon, <a href="https://bmrs.elexon.co.uk/api-documentation/endpoint/forecast/demand/day-ahead/history" {...ext}>day-ahead national demand forecast</a>, the version published before noon the day before, against the <a href="https://bmrs.elexon.co.uk/api-documentation/endpoint/demand/outturn" {...ext}>initial demand outturn</a>, for the six half hours from 20:00 to 23:00. I measured the same forecast's usual error in <a href="/forecast-error">an earlier piece</a>. The step is the error in the half hour after the credits less the error in the half hour before.</>,
      ]} />
    </Article>
  );
}
