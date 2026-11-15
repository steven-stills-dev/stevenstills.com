import { useSearchParams } from "react-router-dom";
import { Article, Prose, Section, Wide, Fn, Footnotes } from "../../components/Article";
import { usePageMeta } from "../../lib/meta";
import ShapeExplorer, { DEFAULT_SUPPLIER } from "./ShapeExplorer";
import IndicatorChart from "./IndicatorChart";
import PriceShape from "./PriceShape";
import ValueBars, { ShapeImbalanceBars } from "./ValueBars";
import "./electricity-suppliers.css";

const title = "Electricity supply profile changes in MHHS";
const lede = "Market-wide half-hourly settlement (MHHS) is moving Britain's homes off shared demand profiles and onto their own metered half hours, so each supplier pays for the shape of its own customers' day. I look at how ten suppliers' settled demand shapes and the price of each half hour have changed since 2021, and what the difference between the shapes costs.";

const a = (href: string, text: string) => <a href={href} target="_blank" rel="noopener">{text}</a>;

export default function ElectricitySuppliers() {
  usePageMeta(title, lede);
  const [params, setParams] = useSearchParams();
  const supplier = params.get("supplier") ?? DEFAULT_SUPPLIER;

  return (
    <Article kicker="Writing · energy markets" title={title} lede={lede}>
      <Prose>
        <p>For almost three decades most British homes were not settled on the electricity they used in each half hour. Elexon's profiles, fitted to a sample of about 2,500 meters, spread each home's estimated consumption across the day, and every profiled home in the same class and region got the same shape whichever supplier it was with.<Fn n={1} /> Suppliers could elect to settle customers with smart meters on their actual reads, but in November 2020 fewer than 1% of metering points were settled that way.<Fn n={2} /> Ofgem's description of the result is that a supplier "would be indifferent about whether a customer consumed during peak periods or off-peak periods".<Fn n={3} /></p>
        <p>Market-wide half-hourly settlement (MHHS) ends that arrangement one meter at a time. Meters began to move in October 2025, and a migrated home is settled on its own half-hourly readings, so its supplier pays for the electricity the home uses in each half hour at that half hour's price. A supplier whose customers use more of their electricity in the expensive hours than other suppliers' customers do now carries that cost itself.</p>
        <p>In March 2026 Ofgem published what the change does to nine suppliers' customers. Settling homes on what they actually used, instead of on profiles, lowered the average cost of a household by about £0.30 a year, but the gap between suppliers came to about £3.90 a customer.<Fn n={3} k="b" /> A typical home uses 2,500&nbsp;kWh a year on Ofgem's measure,<Fn n={4} /> so a supplier whose customers' shape costs £1/MWh more than its rivals' carries roughly £2.50 a customer a year.</p>
        <p>The difficulty for a supplier is that the settlement record is in transition. While meters are migrating, the settled history is a blend of profiled and measured demand, and the blend changes every week, so a change in a supplier's shape can come from its customers or from the way their meters are settled. I wanted to know how each supplier's shape has moved since 2021, how much of the movement I can put down to customers, how the price of each half hour moved over the same years, and what each shape costs in pounds. I take those questions in order and finish with what I would do about the answers.</p>
      </Prose>

      <Section title="How ten suppliers' demand shapes have changed" />
      <Wide>
        <ShapeExplorer supplier={supplier}
          onSupplier={(s) => setParams(s === DEFAULT_SUPPLIER ? {} : { supplier: s }, { replace: true })} />
      </Wide>
      <Prose>
        <p>The chart shows the selected supplier's average daily demand shape in summer and in winter, each half hour as a ratio to the day's mean, with one line for every season since 2021 and a dashed line for the average supplier in the latest season. The shapes come from Elexon's settlement data for the ten suppliers I track.<Fn n={5} /><Fn n={6} /></p>
        <p>To compare suppliers I measured three parts of the day as a share of the day's demand: the night from midnight to 07:00, the early afternoon from 11:00 to 15:00 and the evening from 16:00 to 21:00. Each figure is a share, so the three are tied together. When the overnight share rises, the other shares fall even where the electricity used in those hours has not changed.</p>
      </Prose>

      <Section title="Overnight demand and electric cars" />
      <Wide>
        <IndicatorChart indicator="overnight_share" title="Share of Demand 00:00-07:00" />
      </Wide>
      <Prose>
        <p>The chart shows the share of each supplier's demand that falls between midnight and 07:00, with the average as a dashed line. Octopus Energy has the largest change. In summer 2021, 21.1% of Octopus's settled demand fell between midnight and 07:00, in summer 2025 26.7% and this summer 29.2%.<Fn n={5} k="b" /> The summer share also rose at seven of the other eight suppliers with data for both 2021 and 2025, and ScottishPower's was almost unchanged. In winter the rise is concentrated in British Gas and Octopus.</p>
        <p>I think electric cars explain most of the overnight rise. At the end of 2022 there were 652,341 battery electric cars on British roads, and by April 2026 there were 1,797,809.<Fn n={7} /> Ofgem counted 653,000 households on a smart EV tariff in July 2025, up from 354,000 a year earlier, and that one product accounted for almost all the growth in smart time-of-use tariffs.<Fn n={8} /> Octopus says more than half of those customers are its own, on a tariff that charges the car between 23:30 and 05:30.<Fn n={9} /> A book with that many cars set to charge in the same six hours is what I would expect the Octopus line to look like.</p>
      </Prose>

      <Section title="Early afternoon demand and rooftop solar" />
      <Wide>
        <IndicatorChart indicator="midday_share" title="Share of Demand 11:00-15:00" />
      </Wide>
      <Prose>
        <p>The chart shows the share of demand between 11:00 and 15:00. Between summer 2021 and summer 2025 the summer share fell at all nine suppliers with data for both years, by between 0.9 and 3.3 percentage points, while the average winter share barely changed.<Fn n={5} k="c" /> Some of the summer fall is the overnight share rising: about a third of Octopus's fall and half of British Gas's.</p>
        <p>I think rooftop solar is the main reason, and much of its effect never reaches a meter. MCS certified 267,032 rooftop solar installations in 2025, 31% more than in 2011, the previous record year.<Fn n={10} /> Electricity a household makes and uses on its own roof isn't counted as consumption,<Fn n={11} /> so a new panel appears in the settlement data as lower demand in the hours when the sun is up. On 23 April 2026 solar on the distribution network reached 15.4&nbsp;GW, the highest Britain has recorded.<Fn n={12} /> A fall that appears in summer and hardly at all in winter fits the solar explanation.</p>
      </Prose>

      <Section title="Evening demand, where the suppliers diverge" />
      <Wide>
        <IndicatorChart indicator="red_band_share" title="Share of Demand 16:00-21:00" />
      </Wide>
      <Prose>
        <p>The chart shows the share of demand between 16:00 and 21:00. The average has hardly moved in either season, but individual suppliers have gone in different directions. British Gas's and Octopus's winter evening shares fell the most. ScottishPower went the other way, with a larger evening share in both seasons and a smaller winter overnight share, while the settled volume in its account roughly halved,<Fn n={5} k="d" /> and I haven't found anyone who explains the ScottishPower change.</p>
        <p>I'd be careful with a tidy explanation for British Gas and Octopus. Average household electricity use fell 8.9% in 2022 and was still 6.5% below 2021 in 2024,<Fn n={11} k="b" /> but that is annual volume and says nothing about which half hours gave way. The Demand Flexibility Service had 1.98 million meters registered in winter 2024/25 and moved 3,917.7&nbsp;MWh across the whole winter,<Fn n={13} /> about 2&nbsp;kWh for each registered meter, which I think is too little to change a seasonal average. The better candidates are cars charging after midnight instead of at 18:00, and heat pump tariffs: homes on Octopus's Cosy tariff halved their heat pump's evening peak use.<Fn n={14} /> Much of the fall is arithmetic: both suppliers' winter overnight shares rose by about 4 points, which alone accounts for about half of British Gas's fall in evening share and about three quarters of Octopus's.</p>
      </Prose>

      <Section title="How much of the change is settlement" />
      <Prose>
        <p>The settlement method sits under all three charts, and it is the part I know best. While most homes were profiled, every profiled home in the same class and region carried the same shape. So until last autumn I'd expect the gaps between suppliers' shapes to come mostly from the customers already settled half-hourly, from the mix of meter types and from where each book sits.</p>
        <p>Then the meters started to move. By the week ending 18 September 2026, 68.56% of Britain's meter points had migrated to half-hourly settlement. In the Settlement Final run for week 36, migrated meters were 64.27% of metering systems and carried 25.27% of the volume.<Fn n={15} /> Elexon doesn't publish migration by supplier. In June 2026 it said only that one large and one small supplier had moved about three quarters of their meters.<Fn n={16} /> So I read the 2026 lines with care. Some of Octopus's step from 26.7% to 29.2% overnight this summer may be settlement recording cars that were already charging at night.</p>
      </Prose>

      <Section title="How the price of each half hour changed" />
      <Prose>
        <p>The chart shows the average price of each half hour in every season since 2021, from Elexon's market index.<Fn n={17} /> In summer 2021 the night was the cheapest part of the day, at £80.7/MWh between midnight and 07:00 against £98.5/MWh from 11:00 to 15:00, and the cheapest half hour started at 04:30, at £75.69/MWh. The early afternoon first averaged below the night in summer 2023, and by summer 2025 the gap was wide: £68.3/MWh overnight, £52.9/MWh in the early afternoon and £86.8/MWh from 16:00 to 21:00, with the cheapest half hour starting at 14:30, at £49.56/MWh. In winter 2025 the night was still the cheapest part of the day, at £69.9/MWh against £100.7/MWh in the evening.</p>
      </Prose>
      <Wide>
        <PriceShape />
      </Wide>
      <Prose>
        <p>Those prices put an overnight EV tariff in a different position in each season. A charging window from 23:30 to 05:30 covers the cheapest hours of each winter in the data, but in summer 2025 the night averaged about £15/MWh more than the early afternoon. Priced against the average supplier's shape, Octopus's summer demand cost £1.07/MWh more this summer and its winter demand £0.77/MWh less in Win-25.<Fn n={18} /> If the overnight rise is cars on that tariff, the tariff now asks for summer hours that are no longer the cheapest.</p>
      </Prose>

      <Section title="What each supplier's shape costs" />
      <Prose>
        <p>To put pounds on the shapes I priced each supplier's shape at those half-hourly prices, season by season, then priced the average supplier's shape (the trimmed mean in the charts above) the same way.<Fn n={18} k="b" /> I read the gap between the two as roughly what is at stake when a supplier stops being settled on a shared profile and starts paying for its own customers' day. The chart shows that gap for the last full year, Sum-25 and Win-25.</p>
      </Prose>
      <Wide>
        <ValueBars />
      </Wide>
      <Prose>
        <p>E.ON Next has the flattest large book and comes out £33.3 million a year cheaper than the average shape. Its account also carries Npower Commercial and Utility Warehouse volume,<Fn n={6} k="b" /> so I would not read the E.ON Next figure as a household book. Octopus is £9.3 million cheaper, its winter saving outweighing its summer cost, and British Gas £4.4 million cheaper. OVO Energy is £3.5 million a year dearer, all of it from its summer shape. ScottishPower is £3.0 million a year cheaper. The smaller suppliers sit within a million pounds either way, but their gaps per MWh are in the same range as the large suppliers': So Energy's winter shape costs £0.46/MWh more than the average, and Fuse Energy's summer shape £1.17/MWh more.</p>
        <p>The next chart shows each supplier's shape cost against flat baseload beside its imbalance cost, both per MWh. Imbalance cost here is the cost of settling the gap between what a supplier bought and what its customers used at the cash-out price instead of the market index.<Fn n={18} k="c" /></p>
      </Prose>
      <Wide>
        <ShapeImbalanceBars />
      </Wide>
      <Prose>
        <p>Imbalance is the cost I hear the industry discuss most, and on these figures it is the smaller of the two. E.ON Next's imbalance cost it about £8.1 million a year over the last two years and British Gas's about £5.0 million, while Octopus's came to almost nothing. For nine of the ten suppliers the shape cost against baseload runs to several times the imbalance cost, and Octopus's imbalance cost is slightly negative.</p>
      </Prose>

      <Section title="What the reform costs suppliers to run" />
      <Prose>
        <p>Ofgem's 2021 business case put suppliers' cost of the reform at £88.5 million up front and £24.2 million a year after that, for the whole industry, in 2019 prices. It expected suppliers to save £2.1 million a year on imbalance, and suppliers told it they expected £4.5 million a year from better forecasting.<Fn n={2} k="b" /> For scale, Octopus's shape came out £9.3 million a year cheaper than the average and OVO Energy's £3.5 million dearer, against a running cost of £24.2 million a year for all suppliers together in 2019 prices. I think the forecast is where a supplier first sees the cost of its shape, but on these figures the larger sum is in the shape itself.</p>
        <p>The one cost I can't size is the regional correction. GSP (grid supply point) Group Correction still spreads the gap between what settlement allocates and what the grid measured, and at the programme's M10 milestone in September 2025 the weights that decide who absorbs that gap changed significantly, enough for some suppliers to raise concerns.<Fn n={19} /> Elexon's own slides from July and September report correction factors breaching thresholds more often and "extreme GSP-level outliers" still under investigation.<Fn n={15} k="b" /> Until that investigation settles, part of every supplier's settlement bill is a share of a regional gap that the supplier did not cause.</p>
      </Prose>

      <Section title="What I would do with these figures" />
      <Prose>
        <p>Since 2021 the overnight share of summer demand has risen at most of these suppliers, led by Octopus, while the cheapest summer half hours have moved from the night to the early afternoon. So I would move the cheap window with the seasons. A summer EV or battery tariff that charges in the early afternoon buys the cheapest hours of the day, where one that charges overnight bought hours that averaged about £15/MWh more in summer 2025. I read the overnight chart as consistent with customers moving when a tariff asks them to, with the settlement caveat above, and the Cosy evidence suggests heat pump homes are the winter equivalent.<Fn n={14} k="b" /> I would also hedge the shape the book has now. A position bought as baseload plus an evening peak block assumes the 2021 day. With a summer 2025 trough near £50/MWh in the early afternoon and nights near £68/MWh, and a wider gap this summer, the hedge needs half-hourly or at least four-hour granularity, and it needs rebuilding as each tranche of meters migrates and the settled shape changes.</p>
        <p>On the data, I would forecast on measured demand and treat the migrated share of my own book as an input in its own right while meters are still migrating. The new settlement timetable starts on 2 July 2027,<Fn n={20} /> and until migration completes the settled history is a blend of profiled and measured demand. I would also check every settlement run against the final one and watch the correction factor in each GSP group weekly. BFY Group, a consultancy, found in 2024 that volumes at the first reconciliation run were typically 8% above the final run,<Fn n={21} /> which is a large difference between an early run and the volume a supplier ends with.</p>
      </Prose>

      <Footnotes
        notes={[
          <>Profiles are regressions on temperature, sunset time and day of the week, with a target sample of 2,500 customers across all profile classes. {a("https://www.elexon.co.uk/bsc/settlement/profiling/", "Elexon, Profiling")}.</>,
          <>"As at November 2020, less than 1% of metering points were settled under the elective arrangements"; supplier costs of £88.5m transitional and £24.2m a year ongoing (2019 prices), including managing imbalances at £6.0m one-off and a £2.1m annual saving; suppliers reported expected forecasting savings of £4.5m a year. {a("https://www.ofgem.gov.uk/sites/default/files/docs/2021/04/mhss_final_impact_assessment_final_version_for_publication_20.04.21_1_0.pdf", "Ofgem, MHHS Final Impact Assessment, 20 April 2021")}.</>,
          <>Profile classes are "updated annually based on a historic view of a sample"; a supplier "would be indifferent about whether a customer consumed during peak periods or off-peak periods"; the nine-supplier analysis finds a weighted average commodity cost impact of about £0.30 a customer and a range of about £3.90 across suppliers. {a("https://www.ofgem.gov.uk/sites/default/files/2026-03/Energy-price-cap-technical-approach-to-MHHS.pdf", "Ofgem, Energy price cap: technical approach to MHHS, call for input, 25 March 2026")}.</>,
          <>Ofgem's Typical Domestic Consumption Value for a medium single-rate electricity user is 2,500&nbsp;kWh a year from 1 July 2026, down from 2,700&nbsp;kWh. {a("https://www.ofgem.gov.uk/sites/default/files/2026-05/Review%20of%20typical%20domestic%20consumption%20values%20decision.pdf", "Ofgem, Review of typical domestic consumption values: decision, 27 May 2026")}, Table 1.</>,
          <>Elexon S0142 settlement report (SAA-I014), P114 data, 1 January 2021 to 12 September 2026. Contains BSC information that is available from Elexon at no charge and which is licensed under the Elexon Public Data Licence. {a("https://www.elexon.co.uk/bsc/documents/bsc-public-data-licence-for-p114-data-items/", "Elexon, BSC Public Data Licence for P114 data items")}.</>,
          <>E.ON Next uses the EONEMUK consumption account, which includes Npower Commercial and Utility Warehouse volume. ScottishPower uses SPOWER02's consumption account. Octopus Energy is MERCURY, REGENT and COPPER summed. Fuse Energy volumes are negligible before Win-24.</>,
          <>652,341 battery electric cars at the end of 2022; 1,797,809 in use at April 2026. {a("https://www.smmt.co.uk/2023/04/britain-gets-back-in-the-driving-seat-with-more-than-a-million-evs-on-the-road/", "SMMT, 25 April 2023")}; {a("https://www.smmt.co.uk/one-in-22-vehicles-now-zero-emission-as-uk-fleet-reaches-record-high/", "SMMT, 24 April 2026")}.</>,
          <>Smart time-of-use customers rose from 497,000 to 835,000 in the year to July 2025, "driven almost entirely by EV tariffs, which grew by 84%, from 354,000 to 653,000". {a("https://www.ofgem.gov.uk/sites/default/files/2026-01/State-of-the-Market-Energy-Retail-Highlights-January-2026.pdf", "Ofgem, State of the Market, January 2026")}.</>,
          <>"653k domestic customers were on a Smart Time of Use EV tariff in July 2025. More than half were with Octopus"; off-peak charging "between 11:30pm and 5:30am". {a("https://octopus.energy/smart/intelligent-octopus-go/", "Octopus Energy, Intelligent Octopus Go")}, accessed 29 September 2026.</>,
          <>267,032 rooftop solar installations in 2025, 31% above the 2011 record. {a("https://mcscertified.com/uk-homes-installing-a-small-scale-renewable-every-90-seconds/", "MCS, 10 February 2026")}.</>,
          <>"Electricity consumed directly from on-site generation is not captured in these statistics"; mean domestic consumption fell 8.9% in 2022 and was 6.5% lower in 2024 than in 2021. {a("https://www.gov.uk/government/statistics/subnational-electricity-and-gas-consumption-summary-report-2024/subnational-electricity-and-gas-consumption-summary-report-2024--2", "DESNZ, Subnational electricity and gas consumption, 19 December 2025")}.</>,
          <>15.4&nbsp;GW of distribution-connected solar between 12:30 and 13:00 on 23 April 2026. {a("https://www.neso.energy/britains-electricity-system-breaks-zero-carbon-record-gas-reaches-historic-low-and-solar-hits-historic-high", "NESO, April 2026")}.</>,
          <>1.98 million meters registered and 3,917.7&nbsp;MWh reduced or shifted over 44 activations in winter 2024/25. {a("https://www.neso.energy/nearly-2-million-households-and-businesses-registered-demand-flexibility-service-dfs-last-winter", "NESO, 4 July 2025")}.</>,
          <>Heat pumps raise home electricity use by 61%; a heat pump time-of-use tariff is "halving electricity consumption during the evening peak". Bernard, Hackett, Metcalfe and Schein, {a("https://www.nber.org/papers/w33036", "NBER working paper 33036, October 2024")}.</>,
          <>23,179,061 completed migrations, 68.56% of MPANs, week ending 18 September 2026; Settlement Final run for week 36, 64.27% of metering systems and 25.27% of volume; correction factors "exhibiting more frequent threshold breaches" and "extreme GSP-level outliers". {a("https://www.elexon.co.uk/bsc/documents/groups/mhhs-transitional-operations-group/mhhs-transitional-operations-group-meeting-49-slide-deck-25-sept-2026/", "Elexon, Transitional Operations Group meeting 49, 25 September 2026")}; {a("https://www.elexon.co.uk/bsc/documents/groups/mhhs-transitional-operations-group/mhhs-transitional-operations-group-meeting38-slidedeck-10july2026/", "meeting 38, 10 July 2026")}.</>,
          <>"Two Suppliers (one large and one small) have now completed around three quarters of their migrations". {a("https://www.elexon.co.uk/bsc/article/two-suppliers-complete-75-of-their-migrations-under-the-mhhs-programme/", "Elexon, 17 June 2026")}.</>,
          <>My calculation. Mean market index price for each settlement period across each season's days, provider APXMIDP, 1 April 2021 to 12 September 2026; half hours with no traded volume are skipped. Contains BMRS data &copy; Elexon Limited copyright and database right 2026. {a("https://data.elexon.co.uk/bmrs/api/v1", "Elexon Insights API, market index data")}; {a("https://www.elexon.co.uk/bsc/data/balancing-mechanism-reporting-agent/copyright-licence-bmrs-data/", "Elexon, licence to use BMRS data")}.</>,
          <>My calculation, from the settlement volumes in note 5 and the prices in note 17. Shape cost is each supplier's normalised profile priced at the season's mean price by half hour, less baseload, on the season's volume. The average shape is the trimmed mean of the ten profiles at each half hour, rescaled to a mean of 1. Imbalance is credited energy less contracted volume, priced at the market index less the cash-out price, 13 September 2024 to 12 September 2026, halved to a year. Seasonal mean prices miss the days when cold weather and high prices coincide, so the shape costs are a floor. The figures against the average don't sum to zero, because the average is unweighted. Credited energy is net of any export metered in each supplier's production account, and British Gas's also of generation reallocated to it.</>,
          <>M10 "led to a significant change in GSP Group Correction Scaling Weights"; "some Suppliers have subsequently expressed concerns". {a("https://www.elexon.co.uk/bsc/documents/change/issues/101-150/scaling-weights-consultation/", "Elexon, Proposed approach to reviewing Scaling Weights, 9 February 2026")}.</>,
          <>M16, new settlement timetable, 2 July 2027. {a("https://www.mhhsprogramme.co.uk/programme-information/key-programme-milestones", "MHHS Programme, Key Programme Milestones")}.</>,
          <>"On average, settled volumes are typically 8% higher at R1 than RF." {a("https://www.bfygroup.co.uk/blog/mhhs-could-pose-a-major-commercial-risk-for-suppliers", "BFY Group, 15 August 2024")}.</>,
        ]}
      />
    </Article>
  );
}
