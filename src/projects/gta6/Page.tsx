import { useState } from "react";
import { Article, Prose, Section, Wide, Fn, Footnotes } from "../../components/Article";
import Box from "../../components/Box";
import LineChart from "../../components/charts/LineChart";
import DataTable from "../../components/charts/DataTable";
import UKMap from "../../components/maps/UKMap";
import { fmt } from "../../lib/format";
import { usePageMeta } from "../../lib/meta";
import { GSP_GEO } from "./gsp-geo";
import data from "./data.json";
import "./gta6.css";

const NIGHT = "var(--ste-night)", SECONDARY = "var(--ste-secondary)";
const HH = Array.from({ length: 48 }, (_, k) => `${String(Math.floor(k / 2)).padStart(2, "0")}:${k % 2 ? "30" : "00"}`);
const HH_TICKS = [{ i: 0, label: "00:00" }, { i: 12, label: "06:00" }, { i: 24, label: "12:00" }, { i: 36, label: "18:00" }, { i: 47, label: "23:30" }];
const f = data.facts;
const MAPS = { "Players per 1,000 residents": "per1000", "Evening load": "mw" } as const;
const TITLE = "What will GTA6 do to the power grid";
const LEDE = `Grand Theft Auto VI comes out on Thursday and ${fmt(f.players / 1e6, 1)} million people in the UK say they will play it that day. What does that mean for domestic and national demand?`;
const ext = { target: "_blank", rel: "noopener" };
type MapKey = keyof typeof MAPS;

function Legend({ items }: { items: [string, string][] }) {
  return <div className="legend">{items.map(([n, c]) => <span key={n}><i style={{ background: c }} />{n}</span>)}</div>;
}

/** One home's half-hourly use with and without a day of play; also the home preview. */
export function HomeChart({ h }: { h?: number }) {
  return (
    <Box title="Household Electricity Use on Launch Day" sub="kWh per half hour" h={h}>
      <LineChart labels={HH} ticks={HH_TICKS} unit="kWh" digits={2} yMin={0} yMax={0.6} yTicks={[0, 0.2, 0.4, 0.6]}
        series={[{ name: "Launch day", values: data.home_after, color: SECONDARY }, { name: "Ordinary Thursday", values: data.home, color: NIGHT }]} />
      <Legend items={[["Launch day", SECONDARY], ["Ordinary Thursday", NIGHT]]} />
    </Box>
  );
}

function NationalChart() {
  return (
    <Box title="National Demand on Launch Day" sub="GW" h={380}>
      <LineChart labels={HH} ticks={HH_TICKS} unit="GW" digits={1} yMin={20} yMax={45} yTicks={[20, 25, 30, 35, 40, 45]}
        series={[{ name: "Launch day", values: data.after, color: SECONDARY }, { name: "Ordinary Thursday", values: data.before, color: NIGHT }]} />
      <Legend items={[["Launch day", SECONDARY], ["Ordinary Thursday", NIGHT]]} />
    </Box>
  );
}

/** Launch-day players by GSP group, as a rate or as evening load. */
function PlayersMap({ h }: { h?: number }) {
  const [m, setM] = useState<MapKey>("Players per 1,000 residents");
  const key = MAPS[m];
  const vals = data.table.map((r) => r[key]);
  const domain: [number, number] = [Math.floor((Math.min(...vals) * 0.7) / 5) * 5, Math.ceil(Math.max(...vals) / 5) * 5];
  return (
    <>
      <Box title="Launch-day Players by GSP Group" sub={key === "mw" ? "MW" : "per 1,000"} h={h}>
        <UKMap geo={GSP_GEO} values={Object.fromEntries(data.table.map((r) => [r.key, r[key]]))} domain={domain}
          format={(v) => (key === "mw" ? `${fmt(v, 0)} MW` : `${fmt(v, 0)} per 1,000`)} legendTitle={m} />
      </Box>
      <div className="gta6-chips" role="group" aria-label="Measure">
        {(Object.keys(MAPS) as MapKey[]).map((o) => (
          <button key={o} aria-pressed={m === o} className={"chip" + (m === o ? " on" : "")} onClick={() => setM(o)}>{o}</button>
        ))}
      </div>
    </>
  );
}

function GroupTable() {
  return (
    <Box title="Launch Day by GSP Group">
      <DataTable sortBy="per1000" caption="Estimated launch-day players and evening load by GSP group"
        columns={[{ key: "name", label: "GSP group" }, { key: "young", label: "Aged 18 to 34", unit: "%", digits: 1 },
          { key: "players", label: "Players", unit: "thousand", digits: 0 }, { key: "per1000", label: "Per 1,000 residents", digits: 0, tint: true },
          { key: "mw", label: "Evening load", unit: "MW", digits: 0 }]}
        rows={data.table} />
    </Box>
  );
}

export default function Gta6() {
  usePageMeta(TITLE, LEDE);
  return (
    <Article kicker="Did it affect the grid · Part 3" title={TITLE} lede={LEDE}>
      <Prose>
        <p>The first Grand Theft Auto I played was a top-down crime sim on the PlayStation 1, that big grey monster of a box. You drove recklessly and beat up strangers in pixel graphics. Did I think that weird little game would change the world within 30 years? No. I was far too biased towards Japanese RPGs. Final Fantasy and Dragon Quest had my attention, so my gaming calls were never the best.</p>
        <p>My energy calls have been better. I've had a good run predicting short-term profile drift, in what has been a pretty tough year for it.</p>
        <p>That is what got me thinking. We spend so much time on group correction factors, weather impacts and electric vehicle saturation in portfolios. What if we have all missed the whale? Grand Theft Auto 6.</p>
        <p>It has certainly made waves everywhere else in my life. I know a lot of people who have been waiting, quite impatiently, since GTA5 came out in 2013. Some have booked a week off work to do it old school, the way they did for 5, and maybe even 4, and 3 back in the day. Each of those was revolutionary in its own right. So maybe, just maybe, this one changes the game for the grid too. Let's take a look at the maths.</p>
      </Prose>

      <Wide>
        <div className="gta6-pics">
          <div className="photo"><img src="/img/gta6-cover.jpg" alt="The Grand Theft Auto VI standard edition box art: nine illustrated panels around the game's logo" /></div>
          <div className="photo"><img src="/img/gta6-vice-city.jpg" alt="A screenshot from the game: a jet passing low over a rusting Vice City sign at sunset" /></div>
        </div>
        <p className="gta6-credit">Images: Rockstar Games</p>
      </Wide>

      <Section title="People really are booking the day off" />
      <Prose>
        <p>The game lands on Thursday 19 November.<Fn n={1} /> An <a href="https://www.uswitch.com/media-centre/2026/11/gt-delay-gta-vi-warning-for-13-5-million-brits-download-could-take-more-than-two-days-in-slowest-broadband-areas/" {...ext}>Opinium</a> poll for Uswitch this month found about {fmt(f.plan_to_play / 1e6, 1)} million UK adults plan to play it at some point, and {fmt(f.players / 1e6, 1)} million of them on day one.<Fn n={2} /></p>
        <p>The people I know are not unusual, either. In a OnePoll survey for Uswitch, {f.leave_pct}% of employed gamers who plan to play said they plan to or may take annual leave, and 9% admitted they may call in sick.<Fn n={2} k="b" /> BrightHR, whose absence software covers more than 1.2 million UK employees, reckons 83,000 days of leave have been booked for it, costing employers £12.4m.<Fn n={3} /></p>
        <p>The broadband has felt it already. Virgin Media O2 said the pre-load on 10 November beat its record for evening peak traffic by 3.8%.<Fn n={4} /></p>
      </Prose>

      <Section title={`PC users miss out, and each PS5 user adds ${f.watts} W`} />
      <Prose>
        <p>Bad news for the PC crowd: there is no PC version at launch.<Fn n={1} k="b" /> So this is a console story.</p>
        <p>Sony's own numbers put a PlayStation 5 at 197 to 219 watts (W) while you play.<Fn n={5} /> An Xbox Series X is 154 W.<Fn n={6} /> I've called it {f.console_w} W for the console and thrown in {f.tv_w} W for the screen, so {f.watts} W a player.</p>
        <p>That looked like a lot to me, so I checked it twice. It is right, and the reason is that homes use less than you'd think. A typical household gets through {fmt(f.tdcv_kwh)} kilowatt hours (kWh) a year, which works out at about {f.home_avg_w} W on average across the day and night.<Fn n={7} /> So a console and a TV really do about double what the house is drawing while they are on.</p>
        <p>I've assumed play comes in three-hour loops, which is about the stretch between snacks and life I can just about handle. One loop is {fmt(f.loop_kwh, 1)} kWh. Take the day off, fit in three, and you add {fmt(f.day_kwh, 1)} kWh to a home that normally uses {fmt(f.home_kwh, 1)} kWh a day, so {f.home_uplift_pct}% more. OK, on average that's only {f.cost_p}p per day, so maybe this isn't the whale at the domestic level.<Fn n={8} /></p>
      </Prose>
      <Wide><HomeChart h={360} /></Wide>

      <Section title={`Launch night adds ${fmt(f.added_peak_mw)} MW to the grid`} />
      <Prose>
        <p>However, what if we scale this up! I've assumed the {f.leave_pct}% with leave, about {fmt(f.leave_players)} people, play three loops from 09:00. Everyone else gets one in after work, starting somewhere between 19:00 and 20:30.</p>
        <p>By {f.added_peak_time} all {fmt(f.players / 1e6, 1)} million are on, and at {f.watts} W each that is {fmt(f.added_peak_mw)} megawatts (MW). National demand at {f.added_peak_time} last Thursday, 12 November, was {fmt(f.eve_gw, 1)} gigawatts (GW), so the launch adds {fmt(f.added_peak_pct, 1)}%.<Fn n={9} /> During the working day the people on leave add {fmt(f.added_day_mw)} MW, or {fmt(f.added_day_pct, 1)}%.</p>
      </Prose>
      <Wide><NationalChart /></Wide>
      <Prose>
        <p>If you are squinting at that chart trying to find the difference, that is the answer.</p>
        <p>Television has had bigger days of impact on the grid. The biggest TV pickup on NESO's list is 2,800 MW, after a missed penalty in England's 1990 World Cup semi-final. Half-time in the Euro 2024 final was 1,300 MW and the 1966 final 600 MW.<Fn n={10} /> The thing with a TV pickup is that it all lands at once, when everyone gets up at half-time to put the kettle on. My GTA crowd drifts in over an hour and a half as people get home from work, which I'd guess makes for a much calmer evening in the control room.</p>
        <p>If all {fmt(f.plan_to_play / 1e6, 1)} million played at the same moment it would be {fmt(f.all_mw)} MW, which would beat the 1990 record. Luckily some of them have work in the morning.</p>
      </Prose>

      <Section title="London has the most players for its size" />
      <Prose>
        <p>I shared the players out across the 14 grid supply point (GSP) groups, which are the regions the electricity market settles in. I used two things: how many 18 to 34 year olds live in each one, and how many adults there have a console at home.<Fn n={11} /></p>
      </Prose>
      <Wide><PlayersMap h={620} /></Wide>
      <Prose>
        <p>London is the odd one. Ofcom found only 37% of adults in the capital have a console at home, against 47% in the North East and the North West.<Fn n={12} /> But {fmt(f.top.young, 1)}% of people in London's group are aged 18 to 34 and nowhere else gets above {fmt(f.others_young[1], 1)}%, so it still comes top at {fmt(f.top.per1000)} players for every 1,000 residents, with {f.second.name} next on {fmt(f.second.per1000)}.</p>
      </Prose>
      <Wide><GroupTable /></Wide>

      <Section title="Nobody has missed the whale" />
      <Prose>
        <p>Sadly, no game-changing impact on the grid. At national level the {fmt(f.added_peak_pct, 1)}% the launch adds at {f.added_peak_time} is about the size of the error the published day-ahead forecast makes in any normal half hour, which I <a href="/forecast-error">measured at 2.42%</a>. The whale is in there, but so is everything else.</p>
        <p>But someone who takes the day off, and has a shrewd eye for domestic demand, could see something like three spiking periods on their own meter, if their gaming stamina is anything like mine and three hours is an absolute cap on game-time attention.</p>
        <p>I'll find out on the night. Elexon publishes its first estimate of demand as each half hour ends, so the {f.added_peak_time} number will be out at 21:00 on Thursday.<Fn n={9} k="b" /></p>
        <p>So my gaming calls are no better than they were. I picked Final Fantasy over the series that went on to change the world, and this year I went looking for a whale and found a minnow. Group correction factors, the weather and electric cars can have my attention back. If, like me, you have Thursday booked off, enjoy it: nine hours of play will cost you about {f.cost_p}p in electricity, and the grid will barely know you were there.</p>
      </Prose>

      <Footnotes notes={[
        <>Rockstar Games, <a href="https://www.rockstargames.com/VI" {...ext}>Grand Theft Auto VI</a>, which lists the date and two platforms, PlayStation 5 and Xbox Series X|S, read 16 November 2026.</>,
        <>Uswitch, <a href="https://www.uswitch.com/media-centre/2026/11/gt-delay-gta-vi-warning-for-13-5-million-brits-download-could-take-more-than-two-days-in-slowest-broadband-areas/" {...ext}>GTA VI warning for 13.5 million Brits</a>, updated 9 November 2026. Opinium surveyed 2,000 UK adults from 3 to 6 November 2026. OnePoll surveyed 1,000 employed UK adults who play video games from 22 to 29 September 2026, and put the time-off questions to the 438 who plan to play.</>,
        <>BrightHR, <a href="https://www.brighthr.com/blog/holidays/gta-vi-is-coming-are-your-staff-planning-a-getaway/" {...ext}>GTA VI is coming: are your staff planning a getaway?</a>, 9 November 2026. The estimate covers November and December and is scaled up from absence records for more than 1.2 million employees at 70,000 businesses.</>,
        <>Virgin Media O2, <a href="https://news.virginmediao2.co.uk/?p=11832" {...ext}>GTA VI breaks Virgin Media broadband records as fans rush to pre-load game</a>, 11 November 2026.</>,
        <>Sony Interactive Entertainment, <a href="https://www.playstation.com/en-ie/legal/ecodesign/" {...ext}>Ecodesign for energy-related products</a>: active gaming, three-game average, from 196.9 W (CFI-1016A) to 219.2 W (CFI-71 with disc drive).</>,
        <>Microsoft, <a href="https://learn.microsoft.com/en-us/gaming/sustainability/lab-platform-baselines" {...ext}>Gaming Sustainability Lab platform baselines</a>: active gameplay averaged across more than 200 titles, 154 W on the Xbox Series X and 74 W on the Series S. The {f.tv_w} W for the television is my allowance, not a measurement.</>,
        <>Ofgem's typical household uses {fmt(f.tdcv_kwh)} kWh of electricity a year from 1 July 2026: Energy UK, <a href="https://www.energy-uk.org.uk/publications/energy-uk-explains-typical-domestic-consumption-values-2/" {...ext}>Typical Domestic Consumption Values</a>, 1 July 2026. Spread over the 8,760 hours in a year that is {f.home_avg_w} W. The ordinary day's shape is illustrative.</>,
        <>Ofgem, <a href="https://www.ofgem.gov.uk/information-consumers/energy-advice-households/standing-charge-electricity-and-gas" {...ext}>Energy price cap unit rates and standing charges</a>: {f.unit_p}p a kWh for electricity paid by direct debit, 1 October to 31 December 2026.</>,
        <>Elexon, <a href="https://bmrs.elexon.co.uk/api-documentation/endpoint/demand/outturn" {...ext}>initial national demand outturn</a> for 12 November 2026, each half hour published as it ends. The launch-day line adds {f.watts} W for every player: three loops starting between 09:00 and 10:30 for players on leave, one loop starting between 19:00 and 20:30 for the rest. Televisions that would have been on anyway are not taken off.</>,
        <>NESO, <a href="https://www.neso.energy/news/neso-ready-record-electricity-demand-during-biggest-ever-fifa-world-cup" {...ext}>NESO ready for record electricity demand during biggest ever FIFA World Cup</a>, 8 June 2026.</>,
        <>Boundaries are NESO's <a href="https://www.neso.energy/data-portal/gis-boundaries-gb-dno-license-areas" {...ext}>GIS Boundaries for GB DNO Licence Areas</a>, 3 May 2024. Population is the ONS mid-{f.pop_year} estimate for each local authority, from <a href="https://www.nomisweb.co.uk/datasets/pestsyoala" {...ext}>Nomis</a>, with each authority placed in the group that contains its centre point. Northern Ireland is outside the GB market, which leaves {fmt(f.gb_players / 1e6, 2)} million players on the map.</>,
        <>Ofcom, <a href="https://www.ofcom.org.uk/siteassets/resources/documents/research-and-data/data/statistics/2026/technology-tracker/technology-tracker-2026---data-tables-core.xlsx?v=423917" {...ext}>Technology Tracker 2026</a>, table 42: adults with a games console at home, by nation and English region, from a survey of 4,033 UK adults.</>,
      ]} />
    </Article>
  );
}
