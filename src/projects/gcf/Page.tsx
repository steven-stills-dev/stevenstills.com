import { Article, Prose, Section, Wide, Fn, Footnotes } from "../../components/Article";
import Box from "../../components/Box";
import LineChart from "../../components/charts/LineChart";
import { useState } from "react";
import { MON } from "../../lib/format";
import { SOLAR, S_PLAIN } from "../batteries/Page";
import { usePageMeta } from "../../lib/meta";
import data from "./data.json";
import "./gcf.css";

/* Monthly mean import GCF (legacy GCF to 21 Sep 2025), simple mean over the 14 GSP Groups and every half hour. */
const MONTH_LABELS = data.months.map((m) => `${MON[parseInt(m.slice(5, 7), 10) - 1]} ${m.slice(0, 4)}`);
const MONTH_TICKS = data.months.reduce<{ i: number; label: string }[]>((acc, m, i) => {
  if (m.endsWith("-01") && parseInt(m.slice(0, 4), 10) % 4 === 2) acc.push({ i, label: m.slice(0, 4) });
  return acc;
}, []);

const HH = Array.from({ length: 48 }, (_, k) => `${String(Math.floor(k / 2)).padStart(2, "0")}:${k % 2 ? "30" : "00"}`);
const HH_TICKS = [{ i: 0, label: "00:00" }, { i: 12, label: "06:00" }, { i: 24, label: "12:00" }, { i: 36, label: "18:00" }, { i: 47, label: "23:30" }];
const NIGHT = "var(--ste-night)", SECONDARY = "var(--ste-secondary)";

/** Monthly import GCF since 2006; also the home preview. */
export function MonthlyGcfChart({ h }: { h?: number }) {
  return (
    <Box title="Import Group Correction Factor by Month" sub="factor" h={h}>
      <LineChart labels={MONTH_LABELS} ticks={MONTH_TICKS} digits={3} yMin={0.8} yMax={1.1}
        series={[{ name: "GCF", values: data.monthly }]} />
    </Box>
  );
}

function SummerShapeChart() {
  return (
    <Box title="Summer Import Group Correction Factor by Half Hour" sub="factor" h={380}>
      <LineChart labels={HH} ticks={HH_TICKS} digits={3} yMin={0.7} yMax={1.1}
        series={[{ name: "2024", values: data.shape2024, color: NIGHT }, { name: "2026", values: data.shape2026, color: SECONDARY }]} />
      <div className="legend">
        <span><i style={{ background: NIGHT }} />2024</span>
        <span><i style={{ background: SECONDARY }} />2026</span>
      </div>
    </Box>
  );
}

/* Illustrative summer household day: modelled grid import from the batteries piece, plus a 4kWp array
   peaking at 2.8kW, interpolated from hourly to half-hourly. Settled = metered x factor, weight 1 assumed. */
const GEN = HH.map((_, k) => {
  const h = k / 2, a = SOLAR[Math.floor(h)], b = SOLAR[Math.min(24, Math.floor(h) + 1)];
  return (2.8 * (a + (b - a) * (h - Math.floor(h)))) / 100;
});
const EXPORT = GEN.map((g, k) => Math.max(0, +(g - S_PLAIN[k]).toFixed(3)));
const DAY = {
  Consumption: { metered: S_PLAIN, settled: S_PLAIN.map((v, k) => +(v * data.shape2026[k]).toFixed(3)) },
  "Solar export": { metered: EXPORT, settled: EXPORT.map((v, k) => +(v * (2 - data.shape2026[k])).toFixed(3)) },
};
type DayView = keyof typeof DAY;

/** One modelled summer day, metered against settled after the July and August 2026 factor. */
function HouseholdDayChart() {
  const [view, setView] = useState<DayView>("Consumption");
  const d = DAY[view];
  return (
    <>
      <Box title="Household Day, Metered and Settled" sub="kW" h={380}>
        <LineChart labels={HH} ticks={HH_TICKS} unit="kW" digits={2}
          series={[{ name: "Metered", values: d.metered, color: NIGHT, dash: "5 4" }, { name: "Settled", values: d.settled, color: SECONDARY }]} />
        <div className="legend">
          <span><i style={{ background: NIGHT }} />Metered</span>
          <span><i style={{ background: SECONDARY }} />Settled</span>
        </div>
      </Box>
      <div className="gcf-chips" role="tablist" aria-label="Flow">
        {(Object.keys(DAY) as DayView[]).map((v) => (
          <button key={v} role="tab" aria-selected={view === v} className={"chip" + (view === v ? " on" : "")} onClick={() => setView(v)}>{v}</button>
        ))}
      </div>
    </>
  );
}


const TITLE = "What's going on with Group Correction Factors";

export default function Gcf() {
  const lede = "Every half hour, Britain's settlement system rescales the electricity suppliers say their customers used so that it matches what actually flowed into each region. Since the switch to half-hourly settlement in September 2025, that rescaling has swung further from normal than at any time in the past 20 years.";
  usePageMeta(TITLE, lede);

  return (
    <Article kicker="Writing · settlement · updated 15 Nov 2026" title={TITLE} lede={lede}>
      <Section title="What are group correction factors?" />
      <Prose>
        <p>Elexon, which runs electricity settlement, knows two things about each of Great Britain's 14 regional networks every half hour: how much electricity went in, and how much suppliers say their customers used. A good chunk of the second figure is estimated, so the two never quite agree. The group correction factor is the multiplier that forces them to.<Fn n={1} /></p>
        <p>At exactly 1, suppliers' figures add up. Above 1, they're billed for more than their own figures say, and below 1 for less. Elexon is comfortable with anything between 0.9 and 1.1.<Fn n={2} /></p>
      </Prose>

      <Section title="What's the current situation?" />
      <Prose>
        <p>Right now the factor sits well below 1, so suppliers have collectively claimed more electricity than came into their regions. I averaged every factor Elexon has published since 2006, month by month across the 14 regions.<Fn n={3} /> October 2026 came in at 0.846 vs 1.040 in October 2024, and June to October 2026 each set a new low for their month.</p>
      </Prose>
      <Wide><MonthlyGcfChart h={400} /></Wide>
      <Prose>
        <p>Every region dipped. In summer the factor was lowest in the early afternoon, the hours when rooftop solar peaks: between 14:00 and 14:30 the July and August factor averaged 0.781 vs 0.914 two years earlier.</p>
      </Prose>
      <Wide><SummerShapeChart /></Wide>
      <Prose>
        <p>None of this is final. Each day is re-run as real meter reads replace estimates, and the factor moves between runs.<Fn n={4} /></p>
      </Prose>

      <Section title="When did they start going wrong?" />
      <Prose>
        <p>Before the switch, the trouble ran the other way. Through the late 2010s and early 2020s the factor crept above 1, to a yearly average of 1.018 in 2024, and Ofgem added 1.89% to the electricity price cap from January 2026 to cover the cost.<Fn n={5} /></p>
        <p>Then came the switch. Until September 2025 most homes were settled on occasional meter readings spread over a standard daily shape. Market-wide half-hourly settlement (MHHS), which started on 22 September 2025, settles every meter on what it used in each half hour, from smart meter data where it exists and estimates where it doesn't. It also split the factor in two: one for electricity drawn from the grid, one for electricity sent back to it.<Fn n={6} /> Suppliers have been moving meters onto the new system through 2026.</p>
        <p>The import factor held near 1 through the first winter, turned in late spring 2026 and has set a new low for its month every month since June.</p>
      </Prose>

      <Section title="Were there any changes to try and fix it?" />
      <Prose>
        <p>Two, and both were about who carries the correction, not how big it is. Each type of volume carries a scaling weight that sets its share of the correction. The switch gave large business sites with accurate half-hourly meters a share they had never carried, which Drax put at about 21 GWh, or roughly £1.6m.<Fn n={7} /> Ofgem approved a fix, the P507 Alternative, that put those sites' old weights back from 5 May 2026, though it refused to backdate it. A wider reset of the weights followed on 27 May.<Fn n={8} /></p>
      </Prose>

      <Section title="Did it work?" />
      <Prose>
        <p>For the business sites, on paper, yes: from 5 May the biggest of them went back to carrying none of the correction. I couldn't find a published review that checks the money, though.</p>
        <p>For the factor, the May changes made the numbers look worse without changing anyone's bill. The factor is the gap divided by the weighted volume, and May set the weight on a lot of volume, including migrated half-hourly use, to zero. Same gap, smaller base, so the factor lands further from 1. Elexon's working group says as much.<Fn n={8} k="b" /> In my data the typical daily spread of the factor across regions and half hours was 0.044 in April, 0.073 in the first weeks of May and 0.095 after 27 May.</p>
        <p>The gap itself is mostly about export. Elexon's Issue 120 working group agreed in September 2026 that the main cause of extreme factors in early runs is export data that hasn't arrived, or has been estimated as zero.<Fn n={8} k="c" /> If a home's solar export goes missing, the system thinks the region used more than it did, and scales everyone's import down. Elexon's own example is North Scotland at midnight on 28 June 2026: 0.08 on the first run, 0.77 once more export had been settled. Across Britain that June, settled export rose 6.1% between the first two runs, and Elexon's operations group has logged more low and negative factors since May.<Fn n={9} /></p>
        <p>Export doesn't explain the nights, though, and the nights are where the factor is now falling fastest. Between midnight and 06:00 it held at about 1.00 until June, then slid to 0.956 in July, 0.886 in August and 0.798 in October, the lowest part of the day by then. A second culprit fits that. In settlement data I've seen, estimated half hours spread a home's day over one flat shape, with about 22% of its energy between midnight and 06:00, where a single-rate home with real readings uses nearer 18%. Real readings carry a weight of zero, so the correction lands entirely on the estimates and has to claw that overnight excess back. The night dip has deepened month by month as more meters moved across.</p>
        <p>So the fix did what it said for the sites it was written for. It also made the factor jumpier, and it was never going to touch the missing export behind the gap. Elexon says the factors are improving and within its range.<Fn n={2} k="b" /> On the runs published so far, August to October 2026 all averaged below 0.9.</p>
      </Prose>

      <Section title="Where are we now, and what should suppliers expect?" />
      <Prose>
        <p>Where the factor lands depends on the meter. A home with good half-hourly readings has a weight of zero and settles on exactly what it used. A home on estimates is scaled half hour by half hour. The chart shows a modelled summer day for a home on estimates, at the average July and August 2026 factor for each half hour.<Fn n={10} /></p>
      </Prose>
      <Wide><HouseholdDayChart /></Wide>
      <Prose>
        <p>The home's 8.0 kWh of use settles as 7.4 kWh. Export goes the other way, because the export factor mirrors import (in October 2026 it was 1.154, which is 2 minus 0.846). If that home's 16.1 kWh of solar export carried a weight of 1, it would settle as 19.1 kWh.</p>
        <p>For suppliers, the next year is about re-runs. If Elexon's working group is right, the factor should drift back towards 1 as missing export is filled in, with the summer months moving most. Ofgem's 1.89% cap allowance was set when the factor sat above 1, and is reviewed each August,<Fn n={5} k="b" /> while Issue 120, which will settle the weights for good, is still being assessed.<Fn n={8} k="d" /> On the current timetable the final run comes 14 months after each day, so September 2025 is finally settled this month and October 2026 in December 2027.<Fn n={4} k="b" /></p>
      </Prose>

      <Footnotes notes={[
        <>Elexon, <a href="https://bscdocs.elexon.co.uk/guidance-notes/grid-supply-point-gsp-group-correction" target="_blank" rel="noopener">GSP Group Correction guidance note</a>, version 10.0, effective 8 May 2026. The factor scales settled energy in each GSP Group and settlement period so the total matches the GSP Group Take, and is calculated separately for import and export. Before MHHS the scaling weights were 0 for export and for half-hourly import in measurement classes C, D and E, 1.0 for consumption in classes A, B, F and G, and 1.2 for their losses.</>,
        <>Elexon, <a href="https://www.elexon.co.uk/bsc/data/trading-operations-report/gsp-group-correction-factors-data-trading-operations-report/" target="_blank" rel="noopener">GSP Group Correction Factors data, Trading Operations Report</a>, retrieved 15 November 2026.</>,
        <>Elexon Portal, GSP Group Correction Factor files GSPGCF_2006.xls to GSPGCF_2024.xls and GSPGCF.csv, downloaded November 2026 (login required): about 5.4 million half-hourly values, January 2006 to 21 October 2026. Each value is the latest run available for that day; monthly figures are simple means across the 14 GSP Groups and every half hour. The import series uses the legacy factor to 21 September 2025 and the MHHS import factor from 22 September 2025. Values above 2.0 in the early years fall on October clock-change days.</>,
        <>MHHS Programme, <a href="https://mhhs-prod-webapp.azurewebsites.net/uploads/5afb6ff7-7f6d-45ba-9663-5a7f66075f97/MHHS-DEL4484_Settlement_Timetable_Consultation_on_RF_Reductions_v1.0.pdf" target="_blank" rel="noopener">Settlement timetable consultation on RF reductions</a>, 29 April 2026. The final (RF) run takes place 14 months after the settlement day, and the consultation proposes shortening it to 7 months and later to 4. None of the days since the switch had reached the final run by 21 October 2026.</>,
        <>Ofgem, <a href="https://www.ofgem.gov.uk/sites/default/files/2025-11/Energy%20price%20cap%20methodology%20group%20correction%20factors%20decision.pdf" target="_blank" rel="noopener">Energy price cap methodology: group correction factors decision</a>, 21 November 2025. The 1.89% uplift to electricity loss factors applied from 1 January 2026, based on the demand-weighted GB average factor for 2023-24 and 2024-25. Ofgem reviews the value each year.</>,
        <>Ofgem, <a href="https://www.ofgem.gov.uk/decision/market-wide-half-hourly-settlement-mhhs-change-request-cr061-alignment-m10-go-live-delivery-date-220925-clarification" target="_blank" rel="noopener">MHHS change request CR061 decision</a>, which set the M10 go-live for 22 September 2025.</>,
        <>Drax, <a href="https://energy.drax.com/intelligence/ofgem-to-amend-group-correction-factors/" target="_blank" rel="noopener">Ofgem to amend group correction factors</a>, 17 April 2026, quoting Elexon figures: measurement class C scaling weights rose from 0 to 0.55 for actual data and 0.95 for estimates. Elexon, <a href="https://www.elexon.co.uk/mod-proposal/p507/" target="_blank" rel="noopener">P507</a>; Ofgem, <a href="https://www.ofgem.gov.uk/publications/p507-balancing-and-settlement-code-bsc-proposed-changes" target="_blank" rel="noopener">P507 decision</a>: Ofgem rejected the backdated proposal and approved the forward-only P507 Alternative, effective 5 May 2026. P506, a separate modification implemented on 16 January 2026, deals with industry reference data and not with correction factors: <a href="https://www.elexon.co.uk/mod-proposal/p506/" target="_blank" rel="noopener">Elexon, P506</a>.</>,
        <>Elexon, Issue 120 Workgroup 4, September 2026: <a href="https://www.elexon.co.uk/bsc/documents/change/issues/101-150/issue-120-workgroup-4-slides/" target="_blank" rel="noopener">slides</a> and <a href="https://www.elexon.co.uk/bsc/documents/change/issues/101-150/issue-120-workgroup-4-meeting-summary/" target="_blank" rel="noopener">meeting summary</a>. The import factor is 1 + UD/(WI + WE), where UD is unallocated demand and WI and WE are weighted import and export. The M10 weights gave profiled import a weight of 1.4, which held factors closer to 1 until May; the review effective 27 May returned it to 1.0 and set migrated half-hourly consumption to 0. Members broadly agreed that missing export, or export estimated as zero, is the main cause of extreme factors in early runs. Issue 120 was still in assessment, last updated 11 September 2026.</>,
        <>Elexon, <a href="https://www.elexon.co.uk/bsc/documents/groups/mhhs-transitional-operations-group/transitional-operations-group-meeting41-slidedeck-31july2026/" target="_blank" rel="noopener">MHHS Transitional Operations Group meeting 41</a>, 31 July 2026: more low and negative factors since the May weight updates, concentrated in North Scotland and the first (II) run.</>,
        <>My model, so treat accordingly. Consumption is the modelled summer household from my <a href="/batteries">home batteries</a> piece (about 8 kWh a day, no solar). Solar is a 4 kWp array peaking at 2.8 kW on a clear day; export is generation above the home's use. Settled import is metered use times the average July and August 2026 import factor for each half hour, at a weight of 1. Settled export uses 2 minus that factor, and also assumes a weight of 1, which I haven't confirmed for estimated export.</>,
      ]} />
    </Article>
  );
}
