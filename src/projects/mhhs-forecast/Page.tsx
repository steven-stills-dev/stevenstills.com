import { Article, Prose, Section, Wide, Fn, Footnotes, StatRow } from "../../components/Article";
import Box from "../../components/Box";
import LineChart from "../../components/charts/LineChart";
import { PAD_R } from "../../components/charts/geom";
import { useSize } from "../../lib/useSize";
import { usePageMeta } from "../../lib/meta";
import D from "./data.json";
import "./mhhs-forecast.css";

// profile: Elexon PC1 1997 winter weekday (UKERC EDC); smart: Elexon Insights
// LSS smart domestic import, Feb 2026 weekdays, mean of 14 GSP groups.
// Migration: Elexon TOG #38, weekly at SF, share of MSIDs and of volume.
const SECONDARY = "var(--ste-secondary)";
const NIGHT = "var(--ste-night)";
const HH_TICKS = [0, 11, 23, 35, 47].map((i) => ({ i, label: D.hh[i] }));
const WK_TICKS = D.weeks.flatMap((w, i) => (/^Wk (43|1|13|25) /.test(w) ? [{ i, label: w }] : []));

/** 1997 domestic profile against the measured 2026 smart shape; also the home preview. */
export function ShapeChart({ h }: { h?: number }) {
  return (
    <Box icon="activity" title="Winter Weekday Shape" sub="% of daily energy" h={h}>
      <LineChart labels={D.hh} ticks={HH_TICKS} unit="%" digits={2}
        series={[
          { name: "Smart domestic, 2026", values: D.smart, color: SECONDARY },
          { name: "Profile class 1, 1997", values: D.pc1, color: NIGHT },
        ]} />
      <div className="legend">
        <span><i style={{ background: SECONDARY }} />Smart domestic, 2026</span>
        <span><i style={{ background: NIGHT }} />Profile class 1, 1997</span>
      </div>
    </Box>
  );
}

/** How a domestic half hour gets its settled volume, before and after. */
function SettlementFlow() {
  const rows = [
    { label: "Profiled", steps: ["Meter read every few months", "Estimated annual consumption", "Spread by the class profile", "Regional correction"] },
    { label: "Half-hourly", steps: ["Smart meter, 48 reads a day", "Data Integration Platform", "Load shape fills any gaps", "Regional correction"] },
  ];
  return (
    <div className="mhhs-flow">
      {rows.map((r, k) => (
        <div className="mhhs-flow-row" key={r.label}>
          <span className="mhhs-flow-label">{r.label}</span>
          {r.steps.map((s, i) => <span key={s} className={"mhhs-flow-step" + (k === 1 && i < 3 ? " is-new" : "")}>{s}</span>)}
        </div>
      ))}
    </div>
  );
}

// Working days after the settlement day. Legacy: Elexon 2017. New: MHHS-DEL1590, post-M16.
const RUNS = [
  { name: "Before", runs: [["II", 5], ["SF", 16], ["R1", 39], ["R2", 84], ["R3", 154], ["RF", 292]] as const },
  { name: "From July 2027", runs: [["II", 4], ["SF", 7], ["R1", 30], ["RF", 84]] as const },
];

/** Settlement runs on a working-day axis, old timetable against new. */
function RunTimeline() {
  const [ref, { w: W }] = useSize<HTMLDivElement>();
  const row = 100, H = RUNS.length * row + 24, MAX = 300, L = 14;
  const X = (d: number) => L + (d / MAX) * (W - L - PAD_R - 10);
  return (
    <div ref={ref} style={{ width: "100%" }}>
      {W > 0 && (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: "block" }}>
          {[0, 50, 100, 150, 200, 250, 300].map((d) => (
            <g key={d}>
              <line x1={X(d)} x2={X(d)} y1={6} y2={H - 22} stroke="var(--hairline)" strokeDasharray="2 4" />
              <text x={X(d)} y={H - 6} textAnchor="middle" fontSize="10.5" fill="var(--ste-dusk)">{d}</text>
            </g>
          ))}
          {RUNS.map((r, k) => {
            const y = k * row + 64, last = r.runs[r.runs.length - 1][1];
            const c = k === 0 ? NIGHT : SECONDARY;
            return (
              <g key={r.name}>
                <text x={0} y={y - 46} fontSize="12" fill="var(--ste-dusk)">{r.name}</text>
                <line x1={X(0)} x2={X(last)} y1={y} y2={y} stroke={c} strokeWidth={6} strokeLinecap="round" />
                {r.runs.map(([n, d]) => {
                  // II and SF sit a few days apart: push their labels to either side
                  const anchor = n === "II" ? "end" : n === "SF" ? "start" : "middle";
                  const dx = n === "II" ? -4 : n === "SF" ? 4 : 0;
                  const lift = n === "R1" && W < 640 ? 14 : 0;
                  return (
                    <g key={n}>
                      <circle cx={X(d)} cy={y} r={6} fill="var(--ste-midday)" stroke={NIGHT} strokeWidth={2} />
                      <text x={X(d) + dx} y={y - 14 - lift} textAnchor={anchor} fontSize="11.5" fontWeight={600} fill={NIGHT}>{n}</text>
                      <text x={X(d) + dx} y={y + 22 + lift} textAnchor={anchor} fontSize="10.5" fill="var(--ste-dusk)">{d}</text>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

const MILESTONES = [
  { d: "2025-09-24", t: "Central systems live" },
  { d: "2025-10-22", t: "First meters move" },
  { d: "2026-07-22", t: "Half migrated" },
  { d: "2026-10-28", t: "All suppliers ready" },
  { d: "2027-04-01", t: "Final run at 7 months" },
  { d: "2027-05-07", t: "Migration complete" },
  { d: "2027-07-02", t: "New timetable" },
  { d: "2027-10-31", t: "Old runs finish" },
];
const MON3 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Programme milestones as a vertical timeline; past milestones filled. */
function MilestoneStrip() {
  return (
    <ol className="mhhs-road">
      {MILESTONES.map((m) => {
        const [yy, mm, dd] = m.d.split("-");
        return (
          <li key={m.d} className={m.d <= "2026-09-27" ? "is-done" : undefined}>
            <span className="mhhs-road-date">{`${+dd} ${MON3[+mm - 1]} ${yy}`}</span>
            <span className="mhhs-road-t">{m.t}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** Share of GB homes by smart electricity meter status, June 2026. */
function SmartStack() {
  const parts = [
    { label: "Smart meter, smart mode", v: 71, c: SECONDARY },
    { label: "Smart meter, traditional mode", v: 3.8, c: NIGHT },
    { label: "No smart meter", v: 25.2, c: "var(--track)" },
  ];
  return (
    <>
      <div className="mhhs-stack">
        {parts.map((p) => <span key={p.label} style={{ width: `${p.v}%`, background: p.c }} title={`${p.label}: ${p.v}%`} />)}
      </div>
      <div className="legend">
        {parts.map((p) => <span key={p.label}><i style={{ background: p.c }} />{p.label}, {p.v}%</span>)}
      </div>
    </>
  );
}

export default function MhhsForecast() {
  const lede = "Since 1998 British homes have been settled on a profile built from about 2,500 sample sites, and by July 2027 all 33 million meters will settle on their own half-hourly reads, with the final answer in four months instead of fourteen. I look at how the old estimate worked, what the migration has moved so far, and what it changes for anyone forecasting demand.";
  usePageMeta("What half-hourly settlement does to a supplier's forecast", lede);

  return (
    <Article kicker="Writing · settlement & forecasting" title="Fourteen months to four. What half-hourly settlement does to a supplier's forecast" lede={lede}>
      <Prose>
        <p>On 22 October 2025 the first domestic meters in Britain moved onto a settlement system that uses what they actually consumed in each half hour.<Fn n={1} /> Until then a typical home was settled on a profile, a shape Elexon built by regressing the demand of roughly 2,500 sample sites on temperature, sunset time and day of the week, then applied to every customer in the class.<Fn n={2} /> By 22 July 2026, half of Britain's meter points had moved across.<Fn n={3} /> This is the story of Market-wide Half-Hourly Settlement, and what it does to the number a supplier's forecast is judged against.</p>
        <p>In November 2020, fewer than 1% of metering points were settled half-hourly by choice.<Fn n={4} /> By May 2026, 26.8%.<Fn n={5} /> By July, 50%.<Fn n={3} k="b" /> The programme plans for around 80% by October and for all of roughly 33 million meters by 7 May 2027.<Fn n={6} /><Fn n={7} /></p>
        <p>For scale, the profile a household was settled on came from about 2,500 metered sites. The shape that replaces it is the average of every actual smart read in its category, recomputed each day, inside a system Elexon expects to handle up to 500 billion half-hourly readings a year.<Fn n={8} /><Fn n={9} /></p>
        <p>In this piece I look at how a home was settled before, how far the old profile sits from what homes do now, why half the meters have moved but only a fraction of the volume, and what a four-month settlement cycle changes for the people forecasting it.</p>
      </Prose>

      <Wide>
        <StatRow stats={[
          { num: "33m", label: "meters moving to half-hourly settlement" },
          { num: "50%", label: "migrated by 22 July 2026" },
          { num: "14 to 4", label: "months to the final settlement run" },
        ]} />
      </Wide>

      <Section title="How a home was settled before" />
      <Prose>
        <p>A supplier buys electricity for its customers in half-hour blocks, and settlement works out afterwards how much each supplier's customers actually used in each block. For a home with a meter read every few months, nobody knew. So the system estimated an annual consumption from the reads, spread it across the day using the profile for that customer's class, and then scaled every supplier in the region so that the total matched what the grid measured flowing into it.<Fn n={10} /></p>
        <p>That last step is the GSP Group Correction Factor, and it is where estimates became everybody's problem. Any gap between the sum of the estimates and the measured regional total was spread back across suppliers, so one firm's bad reads nudged another firm's bill.<Fn n={11} /> Elexon's old performance standard asked suppliers to settle 97% of their energy on actual reads by the final run, fourteen months after the day.<Fn n={10} k="b" /></p>
      </Prose>

      <Wide>
        <Box icon="layers" title="How A Half Hour Gets Its Volume">
          <SettlementFlow />
        </Box>
      </Wide>

      <Prose>
        <p>The new route replaces the estimate with the reading. A smart meter's 48 half-hourly values arrive through a central Data Integration Platform, and where a reading is missing, a load shape fills the gap: the simple mean of the actual half-hourly data from every meter in the same category that day.<Fn n={11} k="b" /> The regional correction survives, but it has less to correct. Elexon reports that correction factors for migrated meters now sit inside its 0.9 to 1.1 comfort range.<Fn n={12} /></p>
      </Prose>

      <Section title="The profile was a 1990s household" />
      <Prose>
        <p>The profile Elexon publishes openly is the 1997 original for domestic unrestricted customers, profile class 1. The load shapes from the new system are public too, through Elexon's Insights API with no key, from February 2026.<Fn n={13} /> I put a winter weekday from each on the same scale, as a share of the day's energy.</p>
      </Prose>

      <Wide>
        <ShapeChart h={420} />
      </Wide>

      <Prose>
        <p>The 1997 household peaks in the early evening with 3.74% of its day in a single half hour, and runs 4.6 to 1 from that peak to its overnight trough. The 2026 smart shape runs 1.67 to 1. Between 16:00 and 19:00 the profile puts 20.6% of the day's energy, the measured shape 14.4%. Overnight, from midnight to 07:00, it runs the other way: 14.2% on the profile, 30.4% measured.<Fn n={13} k="b" /></p>
        <p>I'd read that carefully. The smart domestic category mixes every tariff, so Economy 7 homes, storage heaters and overnight EV charging all sit in the 2026 line. Today's profile coefficients are behind an Elexon Portal login and have moved on from 1997, and when Elexon compared them against the new load shapes in March 2025 it found "some differences" but did "not believe the variation to be significant".<Fn n={14} /> What the chart does show is how far a home's day has moved since profiling was designed, and that settlement now sees the real one.</p>
      </Prose>

      <Section title="Half the meters, an eighth of the volume" />
      <Prose>
        <p>Elexon's transitional operations group publishes the migration week by week, both as a share of meters and as a share of the energy settled at the first firm run.<Fn n={15} /> The two lines tell different stories.</p>
      </Prose>

      <Wide>
        <Box icon="activity" title="Migrated To Half-Hourly Settlement" sub="%" h={400}>
          <LineChart labels={D.weeks} ticks={WK_TICKS} unit="%" digits={2}
            series={[
              { name: "Meters", values: D.count, color: SECONDARY },
              { name: "Volume", values: D.volume, color: NIGHT },
            ]} />
          <div className="legend">
            <span><i style={{ background: SECONDARY }} />Meters</span>
            <span><i style={{ background: NIGHT }} />Volume</span>
          </div>
        </Box>
      </Wide>

      <Prose>
        <p>By week 25 of 2026, 34.81% of meters had migrated but only 12.69% of settled volume.<Fn n={15} k="b" /> The first to move were small, mostly domestic supplies, and the big consumers are still to come. For a forecaster that means the settled history is a blend of two regimes for the whole of 2026 and most of 2027, with the blend shifting every week. A model trained on it is learning a moving mix of profiled and measured demand, and I'd treat the migration share as a feature in its own right until July 2027.</p>
        <p>The pace matters too. On 3 July 2026 completed migrations stood at 14.1 million, 13.26% behind the original plan from October 2025, though only 2% behind the revised one.<Fn n={15} k="c" /></p>
      </Prose>

      <Section title="Fourteen months becomes four" />
      <Prose>
        <p>Settlement doesn't produce one answer. It produces a run of them, each later one using more actual reads: the Interim Initial run a few working days after the day, then Settlement Final, then reconciliation runs R1, R2 and R3, and the Final Reconciliation run fourteen months out.<Fn n={10} k="c" /> Once the new timetable starts on 2 July 2027, R2 and R3 disappear, Settlement Final moves from 16 working days to 7, and the Final Reconciliation run comes in at 84 working days, about four months.<Fn n={16} /></p>
      </Prose>

      <Wide>
        <Box icon="layers" title="Settlement Runs" sub="working days">
          <RunTimeline />
        </Box>
      </Wide>

      <Prose>
        <p>This is the part that changes my job most. A forecast's accuracy depends on which run you score it against, because the early runs still carry estimates that the later runs correct. When I build the training set for a two-week demand forecast, every lagged feature has to be old enough that its value has stopped moving, which in the current timetable means at least 28 days to read the Interim Initial figures and 49 days for Settlement Final. Shorten the cycle and those lags shrink, the labels settle sooner, and the gap between how a forecast looks on day eight and how it looks on the final answer closes from over a year to a season.</p>
        <p>The cut comes in two steps. The final run drops from fourteen months to seven from 1 April 2027, replacing R3, and to four at the July cutover, replacing R2. The Dispute Final run falls from 28 months to 20.<Fn n={16} k="b" /><Fn n={17} /></p>
      </Prose>

      <Wide>
        <Box icon="activity" title="Road To The New Timetable">
          <MilestoneStrip />
        </Box>
      </Wide>

      <Section title="What has to stay true" />
      <Prose>
        <p>Half-hourly settlement only settles on reality if two things hold. The first is that the reads arrive. At the end of June 2026, 75% of British homes had a smart electricity meter, 71% in smart mode and 3.8% working as a traditional meter, which leaves roughly a quarter with no smart meter at all.<Fn n={18} /> Every home without half-hourly data settles on a load shape instead, which is an estimate again, a better-informed one.</p>
      </Prose>

      <Wide>
        <Box icon="bars" title="Homes By Smart Meter Status" sub="June 2026">
          <SmartStack />
        </Box>
      </Wide>

      <Prose>
        <p>The second is that the migration keeps pace. It started behind its original plan and, as of July, still was.<Fn n={15} k="d" /> The October 2026 decision point for the seven-month final run and the April 2027 confirmation of the seven-day Settlement Final both depend on the stragglers moving.<Fn n={17} k="b" /></p>
        <p>What rescues both conditions is the load shape itself. Because it is rebuilt every day from the actual reads of everyone who does have data, a home without a smart meter is estimated from its smart neighbours this week, and no longer from a sample of 2,500 sites regressed decades ago.<Fn n={11} k="c" /></p>
      </Prose>

      <Section title="What I take from this" />
      <Prose>
        <p>Ofgem signed off the reform on 20 April 2021 with a net benefit of £1.56 billion to £4.51 billion to 2045, and the case rests on customers moving demand out of the evening peak, which only pays if suppliers are billed for when their customers use power.<Fn n={19} /> Ofgem's own bounds had that shift at 1% to 6% of system peak by 2025. Its own impact assessment put the supplier imbalance saving at £2.1 million a year across the whole industry, which tells me the regulator never saw forecasting as the prize.<Fn n={4} k="b" /></p>
        <p>I see it the other way round. A supplier now carries the true time-of-day cost of every customer, and the forecast is where that cost first shows up. The four-month cycle makes the forecast honest faster, the load shape makes the estimate current, and the migration mix is the one variable I'd watch every week until July 2027.</p>
        <p>For almost three decades a British home used electricity the way a 1997 spreadsheet said it did. From next July it uses it the way it actually does.</p>
      </Prose>

      <Footnotes notes={[
        <>The first meters moved to MHHS on 22 October 2025; old and new regimes run in parallel until July 2027. <a href="https://www.elexon.co.uk/2025/10/22/suppliers-start-moving-meters-to-half-hourly-settlement-hitting-a-major-milestone-for-clean-power-2030/" target="_blank" rel="noopener">Elexon, 22 October 2025</a>.</>,
        <>The Profile Administrator samples roughly 2,500 sites and regresses half-hourly demand on temperature, sunset time and day type. <a href="https://www.elexon.co.uk/bsc/settlement/profiling/" target="_blank" rel="noopener">Elexon, Profiling</a>.</>,
        <>"50% of industry MPANs migrated". <a href="https://www.mhhsprogramme.co.uk/news-articles/50-of-all-industry-meter-point-administration-numbers-mpans-migrated" target="_blank" rel="noopener">MHHS Programme, 22 July 2026</a>.</>,
        <>As at November 2020 fewer than 1% of metering points were settled under elective half-hourly arrangements; supplier imbalance management costs £6.0m one-off and saves £2.1m a year; load shifting of 1% to 6% of system peak in 2025 across the lower and upper bounds (Table 11). <a href="https://www.ofgem.gov.uk/sites/default/files/docs/2021/04/mhss_final_impact_assessment_final_version_for_publication_20.04.21_1_0.pdf" target="_blank" rel="noopener">Ofgem, MHHS Final Impact Assessment, 20 April 2021</a>.</>,
        <>9.03 million MPANs, 26.8% of GB MPANs, migrated at 26 May 2026. <a href="https://www.elexon.co.uk/elexondocuments/about/finances-report-policies/annual-report-and-financial-statements/annual-report-and-financial-statements-2025-2026/" target="_blank" rel="noopener">Elexon, Annual Report 2025/26</a>.</>,
        <>Around 80% of meters planned by October 2026. <a href="https://www.elexon.co.uk/bsc/article/two-suppliers-complete-75-of-their-migrations-under-the-mhhs-programme/" target="_blank" rel="noopener">Elexon, 17 June 2026</a>; "33 million meters" from <a href="https://www.elexon.co.uk/2026/02/23/elexon-sets-out-the-next-steps-for-market-wide-half-hourly-settlement-at-utility-weeks-customer-first-forum-2026/" target="_blank" rel="noopener">Elexon, 23 February 2026</a>.</>,
        <>M15, full migration, 7 May 2027; M16, new settlement timetable, 2 July 2027; M14, 28 October 2026. <a href="https://www.mhhsprogramme.co.uk/programme-information/key-programme-milestones" target="_blank" rel="noopener">MHHS Programme, Key Programme Milestones</a>.</>,
        <>A load shape is "a simple mean of available actual SP level data for each category", used to convert register reads, estimate invalid data and default missing data. <a href="https://www.mhhsprogramme.co.uk/api/documentlibrary/Design%20Documents/MHHSP_METH005%20LSS_Method_Statement%20v5.3.pdf" target="_blank" rel="noopener">MHHS Programme, Load Shaping Service Methodology Statement v5.3</a>.</>,
        <>"Up to 500 billion half-hourly meter readings each year". <a href="https://www.elexon.co.uk/2025/09/24/market-wide-half-hourly-settlement-reaches-major-milestone/" target="_blank" rel="noopener">Elexon, 24 September 2025</a>.</>,
        <>Annualised Advances and Estimated Annual Consumption; the 97% actual-read standard at RF; legacy run timings of II +5, SF +16, R1 +39, R2 +84, R3 +154 and RF +292 working days. <a href="https://assets.elexon.co.uk/wp-content/uploads/sites/11/2017/03/28161104/Beginners-Guide-to-Settlement-Performance-for-Suppliers-FINAL.pdf" target="_blank" rel="noopener">Elexon, Beginner's Guide to Settlement Performance for Suppliers, 2017</a>.</>,
        <>GSP Group Correction spreads the difference between allocated volumes and the regional take across BM Units; it is retained in the new Volume Allocation Service, and load shapes are simple means of actual half-hourly data by category. <a href="https://www.ofgem.gov.uk/sites/default/files/docs/2019/02/dwg_mhhs_tomv1.1.pdf" target="_blank" rel="noopener">Elexon Design Working Group, Target Operating Model v1.1, February 2019</a>.</>,
        <>Correction factors between 0.9 and 1.1 are treated as reasonable; MHHS metering systems "show improvement remaining within thresholds". <a href="https://www.elexon.co.uk/bsc/data/trading-operations-report/gsp-group-correction-factors-data-trading-operations-report/" target="_blank" rel="noopener">Elexon, GSP Group Correction Factors</a>.</>,
        <>My calculation. Profile class 1, winter weekday, 1997, from the <a href="https://ukerc.rl.ac.uk/cgi-bin/dataDiscover.pl?Action=detail&amp;dataid=5af8ae29-86a7-4e8c-9fe4-1e2d99d9fb96" target="_blank" rel="noopener">UKERC Energy Data Centre copy of the Elexon load profiles</a>. Smart domestic import load shapes, mean of 14 GSP groups over six February 2026 weekdays, from <a href="https://data.elexon.co.uk/bmrs/api/v1/lss/load-shape-period?date=2026-02-18" target="_blank" rel="noopener">Elexon Insights API, load-shape-period</a>. Both scaled to a share of daily energy.</>,
        <><a href="https://www.elexon.co.uk/bsc/article/load-shaping-service-visualisation-tool/" target="_blank" rel="noopener">Elexon, Load Shaping Service visualisation tool, 28 March 2025</a>.</>,
        <>Weekly MHHS share of MSIDs and of volume at SF, weeks 43 of 2025 to 25 of 2026; 14,106,437 completions at 3 July 2026, 13.26% behind the original M11 baseline and 2.00% behind the May 2026 plan. <a href="https://www.elexon.co.uk/bsc/documents/groups/mhhs-transitional-operations-group/mhhs-transitional-operations-group-meeting38-slidedeck-10july2026/" target="_blank" rel="noopener">Elexon, Transitional Operations Group meeting 38, 10 July 2026</a>.</>,
        <>Post-M16 run timings: II WD+4, SF WD+7, R1 WD+30, RF WD+84, no R2 or R3; DF from 28 to 20 months. <a href="https://www.mhhsprogramme.co.uk/api/documentlibrary/Design%20Documents/MHHHS-DEL1590_MHHSP_Transition_to_new_Settlement_%20Timetable%20v2.3%20Approved.pdf" target="_blank" rel="noopener">MHHS Programme, Transition to the new Settlement Timetable, v2.3, March 2025</a>.</>,
        <>RF moves to 7 months from 1 April 2027, replacing R3, with a decision in October 2026; SF at 7 working days confirmed in April 2027. <a href="https://www.mhhsprogramme.co.uk/migration/migration-governance/steg" target="_blank" rel="noopener">MHHS Programme, STEG</a>.</>,
        <>At 30 June 2026, 75% of homes had a smart electricity meter: 71% in smart mode, 3.8% in traditional mode. <a href="https://www.gov.uk/government/statistics/smart-meters-in-great-britain-quarterly-update-june-2026/smart-meters-in-great-britain-quarterly-update-june-2026-statistical-bulletin" target="_blank" rel="noopener">DESNZ, Smart meters in Great Britain, June 2026</a>.</>,
        <>Net benefits of £1,559m to £4,509m to 2045; MHHS places "the right incentives on retailers to develop and offer new tariffs". <a href="https://www.ofgem.gov.uk/decision/electricity-retail-market-wide-half-hourly-settlement-decision-and-full-business-case" target="_blank" rel="noopener">Ofgem, Decision and Full Business Case, 20 April 2021</a>.</>,
      ]} />
    </Article>
  );
}
