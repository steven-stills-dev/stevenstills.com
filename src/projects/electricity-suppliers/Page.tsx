import { useSearchParams } from "react-router-dom";
import { Article, Prose, Section, Wide, Fn, Footnotes } from "../../components/Article";
import { usePageMeta } from "../../lib/meta";
import ShapeExplorer, { DEFAULT_SUPPLIER } from "./ShapeExplorer";
import IndicatorChart from "./IndicatorChart";
import PriceShape from "./PriceShape";
import ValueBars, { ShapeImbalanceBars } from "./ValueBars";
import "./electricity-suppliers.css";

const title = "What is happening to electricity suppliers";
const lede = "In summer 2021 the cheapest half hours in Britain's power market were overnight, and by summer 2025 they were at lunchtime, while the customers of ten suppliers spent those four years moving their demand into the night. I look at what moved each part of the day, how much of it is the meters rather than the households, and what each supplier's shape is worth in pounds now that half-hourly settlement makes it their bill.";

const a = (href: string, text: string) => <a href={href} target="_blank" rel="noopener">{text}</a>;

export default function ElectricitySuppliers() {
  usePageMeta(title, lede);
  const [params, setParams] = useSearchParams();
  const supplier = params.get("supplier") ?? DEFAULT_SUPPLIER;

  return (
    <Article kicker="Writing · energy markets" title={title} lede={lede}>
      <Wide>
        <ShapeExplorer supplier={supplier}
          onSupplier={(s) => setParams(s === DEFAULT_SUPPLIER ? {} : { supplier: s }, { replace: true })} />
      </Wide>

      <Prose>
        <p>In summer 2025 the cheapest half hour of an average day in Britain's short-term power market started at 14:30, at £49.56/MWh.<Fn n={1} /> Four summers earlier the cheapest started at 04:30, at £75.69/MWh. Between those two summers the customers of the ten suppliers I track moved their electricity the other way, out of the early afternoon and into the night.<Fn n={2} /><Fn n={3} /> This is the story of that mismatch, and of what it starts to cost now that half-hourly settlement bills each supplier for its own customers' day.</p>
        <p>Octopus Energy is the clearest case. In summer 2021 its customers used 21.1% of their day's electricity between midnight and 07:00. In summer 2025, 26.7%. This summer, 29.2%.<Fn n={2} k="b" /> Every supplier's summer share between 11:00 and 15:00 fell over the same four years, by between 0.9 and 3.3 percentage points, and British Gas and Octopus took the most out of the winter evening.</p>
        <p>For scale, in March Ofgem published what the same change does to nine suppliers' customers. Settling homes on what they actually used, instead of on profiles, barely moved the average cost of a household (about £0.30 a year less), but the gap between suppliers came to about £3.90 a customer.<Fn n={4} /> A typical home uses around 2,700&nbsp;kWh a year,<Fn n={5} /> so a supplier whose customers' shape costs £1/MWh more than its rivals' carries roughly £2.70 a customer before it has sold a single tariff.</p>
        <p>In this piece I look at what moved each part of the day, how much of the movement is the meters rather than the households, what each supplier's shape is worth in pounds, and what I'd do about it.</p>
      </Prose>

      <Section title="The night is jumping up" />
      <Wide>
        <IndicatorChart indicator="overnight_share" title="Share of Demand 00:00-07:00" />
      </Wide>

      <Section title="The early afternoon is falling" />
      <Wide>
        <IndicatorChart indicator="midday_share" title="Share of Demand 11:00-15:00" />
      </Wide>

      <Section title="The peak is falling" />
      <Wide>
        <IndicatorChart indicator="red_band_share" title="Share of Demand 16:00-21:00" />
      </Wide>

      <Section title="Why" />
      <Prose>
        <p>The night is the easiest to explain. At the end of 2022 there were 652,341 battery electric cars on British roads, and by April 2026 there were 1,797,809.<Fn n={6} /> Ofgem counted 653,000 households on a smart EV tariff in July 2025, up from 354,000 a year earlier, and that one product accounted for almost all the growth in smart time-of-use tariffs.<Fn n={7} /> Octopus says more than half of those customers are its own, on a tariff that charges the car between 23:30 and 05:30.<Fn n={8} /> That is the Octopus line in the overnight chart: a book full of cars told to charge in the same six hours.</p>
        <p>The early afternoon is the mirror image, and most of it never reaches a meter. MCS certified 267,032 rooftop solar installations in 2025, 31% more than in 2011, the previous record year.<Fn n={9} /> Electricity a household makes and uses on its own roof isn't counted as consumption,<Fn n={10} /> so every new panel shows up in the settlement data as demand that has gone missing between 11:00 and 15:00. On 23 April 2026 solar on the distribution network reached 15.4&nbsp;GW, the highest Britain has recorded.<Fn n={11} /></p>
        <p>The evening is harder, and I'd be careful with the tidy version. Household electricity use fell 8.9% in 2022 and was still 6.5% below 2021 in 2024,<Fn n={10} k="b" /> but that is annual volume and says nothing about which half hours gave way. The Demand Flexibility Service had 1.98 million meters registered in winter 2024/25 and moved 3,917.7&nbsp;MWh across the whole winter,<Fn n={12} /> far too little to shift a seasonal average. The better candidates are cars charging after midnight instead of at 18:00, and heat pump tariffs: homes on Octopus's Cosy tariff halved their heat pump's evening peak use.<Fn n={13} /> ScottishPower went the other way, with a sharper winter peak and less overnight demand while its book roughly halved,<Fn n={2} k="c" /> and I haven't found anyone who explains that.</p>
        <p>A second explanation runs under all three, and it is the one I know best. Until October 2025 most homes weren't settled on what they used. Elexon's profiles, fitted to a sample of about 2,500 meters, spread each home's estimated consumption across the day, and every profiled home in the same class and region got the same shape whichever supplier it was with.<Fn n={14} /> Suppliers could elect to settle smart customers on their actual reads, but in November 2020 fewer than 1% of metering points were settled that way.<Fn n={15} /> So until last autumn I'd expect the gaps between suppliers' shapes to come mostly from the customers already settled half-hourly, from the mix of meter types and from where each book sits.</p>
        <p>Then the meters started to move. By the week ending 18 September 2026, 68.56% of Britain's meter points had migrated to half-hourly settlement, but in the Settlement Final run for week 36 the migrated meters carried only 25.27% of the volume.<Fn n={16} /> Elexon doesn't publish migration by supplier. In June it said only that one large and one small supplier had moved about three quarters of their meters.<Fn n={17} /> That makes me read the 2026 lines with care. Some of Octopus's step from 26.7% to 29.2% overnight this summer may be settlement finally seeing cars that were already there.</p>
      </Prose>

      <Section title="The price moved the other way" />
      <Prose>
        <p>The chart shows the average price of each half hour in every season since 2021, from Elexon's market index.<Fn n={1} k="b" /> In summer 2021 the night was the cheapest part of the day, at £80.7/MWh between midnight and 07:00 against £98.5/MWh from 11:00 to 15:00. By summer 2025 the order had flipped: £68.3/MWh overnight, £52.9/MWh in the early afternoon and £86.8/MWh from 16:00 to 21:00. Winter still rewards the night, at £69.9/MWh against £100.7/MWh in the evening.</p>
      </Prose>
      <Wide>
        <PriceShape />
      </Wide>
      <Prose>
        <p>That leaves the EV tariff in an awkward spot. A charging window from 23:30 to 05:30 buys the cheapest hours of every winter, but in summer 2025 the night averaged about £15/MWh more than the early afternoon. Priced against the average supplier's shape, Octopus's summer demand cost £1.07/MWh more this summer and its winter demand £0.77/MWh less in Win-25.<Fn n={18} /> The customers did exactly what the tariff asked, and in summer the tariff asked for the wrong hours.</p>
      </Prose>

      <Section title="What each supplier's shape is worth" />
      <Prose>
        <p>To put pounds on it I priced each supplier's shape at those half-hourly prices, season by season, then priced the average supplier's shape (the trimmed mean in the charts above) the same way.<Fn n={18} k="b" /> The gap is roughly what moves when a supplier stops being settled on a shared profile and starts paying for its own customers' day. The chart shows that gap for the last full year, Sum-25 and Win-25.</p>
      </Prose>
      <Wide>
        <ValueBars />
      </Wide>
      <Prose>
        <p>E.ON Next has the flattest large book and comes out £33.3 million a year cheaper than the average shape. Octopus is £9.3 million cheaper, its winter nights outweighing its summer ones, and British Gas £4.4 million cheaper. OVO Energy is £3.5 million a year dearer, almost all of it in summer. The smaller suppliers sit within half a million pounds either way, but their gaps per MWh are as large as anyone's: So Energy's winter shape costs £0.46/MWh more than the average, and Fuse Energy's summer shape £1.17/MWh more.</p>
        <p>The next chart sets each supplier's shape against flat baseload beside its imbalance, the cost of settling the gap between what it bought and what its customers used at the cash-out price instead of the market index, both per MWh.<Fn n={18} k="c" /></p>
      </Prose>
      <Wide>
        <ShapeImbalanceBars />
      </Wide>
      <Prose>
        <p>Imbalance is the cost the industry argues about, and it is the small one. E.ON Next's imbalance cost it about £8.1 million a year over the last two years and British Gas's about £5.0 million, while Octopus's came to almost nothing. Every supplier's shape against baseload runs to several times its imbalance.</p>
      </Prose>

      <Section title="The cost of getting ready" />
      <Prose>
        <p>Ofgem's 2021 business case put suppliers' cost of the reform at £88.5 million up front and £24.2 million a year after that, for the whole industry, in 2019 prices. It expected suppliers to save £2.1 million a year on imbalance, and suppliers told it they expected £4.5 million a year from better forecasting.<Fn n={15} k="b" /> Set those beside the table and the proportions are fairly stark: the industry's whole annual running cost for the reform is smaller than the gap between E.ON Next's shape and the average. The forecast is where the shape cost shows up first, and the shape is where the money is.</p>
        <p>The one cost I can't size is the regional correction. GSP Group Correction still spreads the gap between what settlement allocates and what the grid measured, and at the programme's M10 milestone in September 2025 the weights that decide who absorbs that gap changed significantly, enough for some suppliers to object.<Fn n={19} /> Elexon's own slides from July and September report correction factors breaching thresholds more often and "extreme GSP-level outliers" still under investigation.<Fn n={16} k="b" /> Until that settles, part of every supplier's bill is a smear it didn't cause.</p>
      </Prose>

      <Section title="What I'd do next" />
      <Prose>
        <p>First, I'd move the cheap window with the seasons. A summer EV or battery tariff that charges in the early afternoon buys the cheapest hours of the day, and one that charges overnight bought hours that averaged about £15/MWh more in summer 2025. The overnight chart is the evidence that customers will move when a tariff asks them to. Heat pump homes are the winter version of the same lever, on the Cosy evidence.<Fn n={13} k="b" /></p>
        <p>Second, I'd hedge the shape the book actually has. A position bought as baseload plus an evening peak block assumes the 2021 day. With a summer trough near £50/MWh in the early afternoon and an overnight plateau near £68/MWh, the hedge needs half-hourly or at least four-hour granularity, and it needs rebuilding as each tranche of meters migrates and the settled shape moves with it.</p>
        <p>Third, I'd forecast on measured demand and treat each supplier's migrated share as an input in its own right until the new settlement timetable starts on 2 July 2027.<Fn n={20} /> Until then the settled history is a blend of profiled and measured demand, and the blend changes every week.</p>
        <p>Fourth, I'd check every settlement run against the final one and watch the correction factor in each GSP group weekly. BFY Group, a settlement consultancy, puts volumes at the first reconciliation run typically 8% above the final run,<Fn n={21} /> which is a lot of energy to have bought at the wrong price.</p>
      </Prose>

      <Section title="What I take from this" />
      <Prose>
        <p>For almost three decades a supplier's customers could use electricity whenever they liked and the supplier was settled on the same profile as everyone else. That arrangement is ending one meter at a time, and the settlement data already shows which books were cheap to serve all along. E.ON Next's flat day and Octopus's winter nights come out ahead. OVO's summers and the small suppliers' winter evenings carry the cost.</p>
        <p>I'd read the order of events as the lesson. The customers moved first, the price moved second, and the tariffs haven't caught up with either. The cheapest electricity of summer 2025 was at 14:30, and most of Britain's smart tariffs were still waiting for midnight.</p>
      </Prose>

      <Footnotes
        notes={[
          <>My calculation. Mean market index price for each settlement period across each season's days, provider APXMIDP, 1 April 2021 to 12 September 2026; half hours with no traded volume are skipped. Contains BMRS data &copy; Elexon Limited copyright and database right 2026. {a("https://data.elexon.co.uk/bmrs/api/v1", "Elexon Insights API, market index data")}; {a("https://www.elexon.co.uk/bsc/data/balancing-mechanism-reporting-agent/copyright-licence-bmrs-data/", "Elexon, licence to use BMRS data")}.</>,
          <>Elexon S0142 settlement report (SAA-I014), P114 data, 1 January 2021 to 12 September 2026. Contains BSC information that is available from Elexon at no charge and which is licensed under the Elexon Public Data Licence. {a("https://www.elexon.co.uk/bsc/documents/bsc-public-data-licence-for-p114-data-items/", "Elexon, BSC Public Data Licence for P114 data items")}.</>,
          <>E.ON Next uses the EONEMUK consumption account, which includes Npower Commercial and Utility Warehouse volume. ScottishPower uses SPOWER02's consumption account. Octopus Energy is MERCURY, REGENT and COPPER summed. Fuse Energy volumes are negligible before Win-24.</>,
          <>Profile classes are "updated annually based on a historic view of a sample"; a supplier "would be indifferent about whether a customer consumed during peak periods or off-peak periods"; the nine-supplier analysis finds a weighted average commodity cost impact of about £0.30 a customer and a range of about £3.90 across suppliers. {a("https://www.ofgem.gov.uk/sites/default/files/2026-03/Energy-price-cap-technical-approach-to-MHHS.pdf", "Ofgem, Energy price cap: technical approach to MHHS, call for input, 25 March 2026")}.</>,
          <>Typical Domestic Consumption Value for a medium electricity user, around 2,700&nbsp;kWh a year. {a("https://www.energy-uk.org.uk/publications/euk-explains-typical-domestic-consumption-values-2/", "Energy UK, Typical Domestic Consumption Values")}.</>,
          <>652,341 battery electric cars at the end of 2022; 1,797,809 in use at April 2026. {a("https://www.smmt.co.uk/2023/04/britain-gets-back-in-the-driving-seat-with-more-than-a-million-evs-on-the-road/", "SMMT, 25 April 2023")}; {a("https://www.smmt.co.uk/one-in-22-vehicles-now-zero-emission-as-uk-fleet-reaches-record-high/", "SMMT, 24 April 2026")}.</>,
          <>Smart time-of-use customers rose from 497,000 to 835,000 in the year to July 2025, "driven almost entirely by EV tariffs, which grew by 84%, from 354,000 to 653,000". {a("https://www.ofgem.gov.uk/sites/default/files/2026-01/State-of-the-Market-Energy-Retail-Highlights-January-2026.pdf", "Ofgem, State of the Market, January 2026")}.</>,
          <>"653k domestic customers were on a Smart Time of Use EV tariff in July 2025. More than half were with Octopus"; off-peak charging "between 11:30pm and 5:30am". {a("https://octopus.energy/smart/intelligent-octopus-go/", "Octopus Energy, Intelligent Octopus Go")}, accessed 29 September 2026.</>,
          <>267,032 rooftop solar installations in 2025, 31% above the 2011 record. {a("https://mcscertified.com/uk-homes-installing-a-small-scale-renewable-every-90-seconds/", "MCS, 10 February 2026")}.</>,
          <>"Electricity consumed directly from on-site generation is not captured in these statistics"; mean domestic consumption fell 8.9% in 2022 and was 6.5% lower in 2024 than in 2021. {a("https://www.gov.uk/government/statistics/subnational-electricity-and-gas-consumption-summary-report-2024/subnational-electricity-and-gas-consumption-summary-report-2024--2", "DESNZ, Subnational electricity and gas consumption, 19 December 2025")}.</>,
          <>15.4&nbsp;GW of distribution-connected solar between 12:30 and 13:00 on 23 April 2026. {a("https://www.neso.energy/britains-electricity-system-breaks-zero-carbon-record-gas-reaches-historic-low-and-solar-hits-historic-high", "NESO, April 2026")}.</>,
          <>1.98 million meters registered and 3,917.7&nbsp;MWh reduced or shifted over 44 activations in winter 2024/25. {a("https://www.neso.energy/nearly-2-million-households-and-businesses-registered-demand-flexibility-service-dfs-last-winter", "NESO, 4 July 2025")}.</>,
          <>Heat pumps raise home electricity use by 61%; a heat pump time-of-use tariff is "halving electricity consumption during the evening peak". Bernard, Hackett, Metcalfe and Schein, {a("https://www.nber.org/papers/w33036", "NBER working paper 33036, October 2024")}.</>,
          <>Profiles are regressions on temperature, sunset time and day of the week, with a target sample of 2,500 customers across all profile classes. {a("https://www.elexon.co.uk/bsc/settlement/profiling/", "Elexon, Profiling")}.</>,
          <>"As at November 2020, less than 1% of metering points were settled under the elective arrangements"; supplier costs of £88.5m transitional and £24.2m a year ongoing (2019 prices), including managing imbalances at £6.0m one-off and a £2.1m annual saving; suppliers reported expected forecasting savings of £4.5m a year. {a("https://www.ofgem.gov.uk/sites/default/files/docs/2021/04/mhss_final_impact_assessment_final_version_for_publication_20.04.21_1_0.pdf", "Ofgem, MHHS Final Impact Assessment, 20 April 2021")}.</>,
          <>23,179,061 completed migrations, 68.56% of MPANs, week ending 18 September 2026; Settlement Final run for week 36, 64.27% of metering systems and 25.27% of volume; correction factors "exhibiting more frequent threshold breaches" and "extreme GSP-level outliers". {a("https://www.elexon.co.uk/bsc/documents/groups/mhhs-transitional-operations-group/mhhs-transitional-operations-group-meeting-49-slide-deck-25-sept-2026/", "Elexon, Transitional Operations Group meeting 49, 25 September 2026")}; {a("https://www.elexon.co.uk/bsc/documents/groups/mhhs-transitional-operations-group/mhhs-transitional-operations-group-meeting38-slidedeck-10july2026/", "meeting 38, 10 July 2026")}.</>,
          <>"Two Suppliers (one large and one small) have now completed around three quarters of their migrations". {a("https://www.elexon.co.uk/bsc/article/two-suppliers-complete-75-of-their-migrations-under-the-mhhs-programme/", "Elexon, 17 June 2026")}.</>,
          <>My calculation, from the settlement volumes in note 2 and the prices in note 1. Shape cost is each supplier's normalised profile priced at the season's mean price by half hour, less baseload, on the season's volume. The average shape is the trimmed mean of the ten profiles at each half hour, rescaled to a mean of 1. Imbalance is credited energy less contracted volume, priced at the cash-out price less the market index, 13 September 2024 to 12 September 2026, halved to a year. Seasonal mean prices miss the days when cold weather and high prices coincide, so the shape costs are a floor. The figures against the average don't sum to zero, because the average is unweighted. Credited energy is net of any export metered in each supplier's production account, and British Gas's also of generation reallocated to it.</>,
          <>M10 "led to a significant change in GSP Group Correction Scaling Weights"; "some Suppliers have subsequently expressed concerns". {a("https://www.elexon.co.uk/bsc/documents/change/issues/101-150/scaling-weights-consultation/", "Elexon, Proposed approach to reviewing Scaling Weights, 9 February 2026")}.</>,
          <>M16, new settlement timetable, 2 July 2027. {a("https://www.mhhsprogramme.co.uk/programme-information/key-programme-milestones", "MHHS Programme, Key Programme Milestones")}.</>,
          <>"On average, settled volumes are typically 8% higher at R1 than RF." {a("https://www.bfygroup.co.uk/blog/mhhs-could-pose-a-major-commercial-risk-for-suppliers", "BFY Group, 15 August 2024")}.</>,
        ]}
      />
    </Article>
  );
}
