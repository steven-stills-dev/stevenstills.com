import { Article, Prose, Section, Wide, Fn, Footnotes, StatRow } from "../../components/Article";
import Box from "../../components/Box";
import UKMap, { type UKMapPoint } from "../../components/maps/UKMap";
import { usePageMeta } from "../../lib/meta";

// planned sites carry published megawatts, existing ones carry the cluster
// they sit in. Coordinates are town level.
const SITES: UKMapPoint[] = [
  { lat: 55.142, lon: -1.520, label: "Cambois 720MW", tone: "primary", r: 6, dy: -12 },
  { lat: 55.030, lon: -1.478, label: "Cobalt Park", tone: "primary", r: 3.4, dy: 12 },
  { lat: 55.795, lon: -3.970, label: "Ravenscraig 500MW", tone: "primary", r: 5.4, anchor: "left" },
  { lat: 51.655, lon: -1.230, label: "Culham 100MW", tone: "primary", r: 4, anchor: "left", dy: -4 },
  { lat: 52.908, lon: -3.940, label: "Trawsfynydd", tone: "primary", r: 3.4, anchor: "left" },
  { lat: 53.309, lon: -4.630, label: "Anglesey", tone: "primary", r: 3.4, anchor: "left" },
  { lat: 51.504, lon: -3.580, label: "Bridgend", tone: "primary", r: 3.4, anchor: "left" },
  { lat: 51.511, lon: -0.591, label: "Slough cluster", tone: "night", r: 6.4, anchor: "left", dy: 20 },
  { lat: 51.507, lon: -0.020, label: "Docklands", tone: "night", r: 4.6, dy: 4 },
];

/** Data centre sites map; also the home preview. */
export function SitesMap({ h }: { h?: number }) {
  return (
    <Box icon="map" title="Data Centre Sites" h={h}>
      <UKMap values={{}} points={SITES}
        pointLegend={[{ tone: "primary", label: "Announced, planned" }, { tone: "night", label: "Existing cluster" }]} />
    </Box>
  );
}

// operational onshore wind, MW, DESNZ planning database Q1 2026
const WIND: Record<string, number> = {
  "scotland": 9994, "wales": 1220, "northern-ireland": 1195,
  "yorkshire": 652, "north-east": 474, "north-west": 467, "east": 452,
  "east-midlands": 398, "south-west": 285, "south-east": 113,
  "london": 13, "west-midlands": 8,
};

const WIND_BANDS = [
  { max: 100, label: "Under 100 MW" },
  { max: 500, label: "100 to 500 MW" },
  { max: 1500, label: "500 to 1,500 MW" },
  { max: Infinity, label: "Over 1,500 MW" },
];

export default function DataCentres() {
  usePageMeta(
    "Data centres: the grid's next big challenge",
    "Data centres are asking for 50GW of grid connections, about the whole of Britain's peak demand. I think the worry is mostly backwards: this may be what decouples gas from the power price.",
  );

  return (
    <Article
      kicker="Opinion · energy markets & AI"
      title="Data centre demand is the grid's next big challenge. Is now the right time?"
    >
      {/* Lede parked with the article draft below until the research lands */}
      <div hidden>
        <p className="lede">Data centres are asking for 50GW of grid connections, about the whole of Britain's peak demand, and the coverage treats it as a crisis in waiting. I look at what else changed while the queue formed, what a wind farm needs before it gets built, and why this might be the forcing event decoupling has waited on since 2022.</p>
      </div>

      <Prose>
        <p>Scotland holds 9,994&nbsp;MW of operational onshore wind. England, all of it, holds 2,862&nbsp;MW, and the load wants to be in the Thames Valley.<Fn n={1} /> That gap is what makes it pay to switch northern generation off early. Cambois and Ravenscraig are the two sites that interest me most, because they are the first big loads proposed on the right side of the constraint.<Fn n={2} /></p>
      </Prose>

      <Wide>
        <SitesMap h={620} />
      </Wide>

      <Wide>
        <Box icon="map" title="Onshore Wind Capacity" sub="MW, operational, Q1 2026" h={620}>
          <UKMap
            values={WIND}
            bands={WIND_BANDS}
            format={(v) => `${v.toLocaleString("en-GB")} MW`}
          />
        </Box>
      </Wide>

      <Footnotes
        notes={[
          <>Renewable Energy Planning Database, Q1 2026 extract, operational sites only, summed by the database's own region field. Offshore wind, another 15,129&nbsp;MW, is excluded because the database files it as offshore rather than to a land region. <a href="https://www.gov.uk/government/publications/renewable-energy-planning-database-monthly-extract" target="_blank" rel="noopener">DESNZ, Renewable Energy Planning Database</a>. Map boundaries are the ONS ITL1 regions, January 2025; contains OS and National Statistics data &copy; Crown copyright and database right 2025.</>,
          <>Northumberland County Council consented the first phase of the QTS/Blackstone Cambois campus on 2 December 2025, a scheme that could scale to 720&nbsp;MW across up to ten buildings. Culham is the UK's first designated AI Growth Zone, with roughly 100&nbsp;MW of initial dual-resilient power and stated plans to scale beyond. North Lanarkshire was designated in January 2026, reported as unlocking around 500&nbsp;MW at Ravenscraig. Sites are plotted at town level, and dot size follows those published megawatts. <a href="https://www.datacenterdynamics.com/en/news/blackstone-gets-green-light-for-10bn-qts-data-center-in-northumberland-uk/" target="_blank" rel="noopener">DCD, on the Northumberland consent</a>; <a href="https://culham.org.uk/invest-at-culham-campus/expression-of-interest/" target="_blank" rel="noopener">Culham Campus</a>; <a href="https://www.datacenterdynamics.com/en/news/new-ai-growth-zone-in-north-lanarkshire-scotland-could-unlock-500mw-of-data-center-capacity/" target="_blank" rel="noopener">DCD, on North Lanarkshire</a>.</>,
        ]}
      />

      {/* ARTICLE PARKED: full draft hidden below until the research lands. Remove the hidden wrapper to restore. */}
      <div hidden>
        <Prose>
          <p>NESO has counted around 140 data centre proposals asking for roughly 50GW of grid connections. Britain's entire peak demand is about the same.<Fn n={1} /> Around two-thirds of the data centres the country already has sit within twenty miles of London, on the most congested part of the network, and new housing in west London stalled for years because data centres had claimed the spare capacity first.<Fn n={1} k="b" /> Stop reading there and the worry makes sense: a big, lumpy new load, badly placed, arriving fast.</p>
          <p>The forecasts don't narrow it much. NESO's central view has some 5.2GW of that 50GW actually connected by 2030, drawing just over 20TWh a year. Its Future Energy Scenarios have data centre demand rising from 7.6TWh in 2024 to somewhere between 20 and 41TWh by 2035, a spread so wide it barely counts as a forecast.<Fn n={2} /> The government wants AI Growth Zones of at least 500MW each, with at least one scaling past a gigawatt.<Fn n={3} /></p>
          <p>I think the worry is mostly backwards, and this piece is the case for that. I look at what else changed in the same eighteen months, what a wind farm actually needs before it gets built, and the job the industry has been putting off since 2022 that this demand might finally force.</p>
        </Prose>

        <Section title="Look what else just happened" />
        <Prose>
          <p>While the data centre queue was forming, two of the longest-standing blockages in British energy cleared.</p>
          <p>The first is onshore wind. England spent nine years under a de facto ban, because from 2015 a single local objection could kill a project, and that ban was lifted in July 2024. A year later came the first-ever Onshore Wind Strategy, forty-odd actions aimed at nearly doubling capacity to as much as 29GW by 2030.<Fn n={4} /> The cheapest new generation Britain can build is legal again, just as a wall of new demand shows up.</p>
          <p>The second is duller, and it's my corner of the industry, so I'll argue it matters more. Market-wide Half-Hourly Settlement, the reform that finally settles every meter in the country on the half hour rather than on an estimate, started migrating meters in October 2025, expects roughly 80% across by October this year, and completes in 2027, cutting the settlement cycle from fourteen months to four.<Fn n={5} /> That is the plumbing that lets suppliers see demand as it actually happens, price it, and pay people to move it. I've spent years working with settlement built on estimates. You cannot run a flexible grid on estimated meter readings, and until now, mostly, the industry did.</p>
          <p>So I'd flip the timing question. The worry assumes the demand is arriving at the worst possible moment. On the evidence, it's arriving at the first moment in decades the system could do something useful with it.</p>
        </Prose>

        <Section title="A wind farm's hardest problem is finding a buyer" />
        <Prose>
          <p>In my experience, renewables get built on revenue certainty. What a developer needs to reach a final investment decision is a creditworthy buyer signed up for fifteen years, and right now the best anchor tenant going is a hyperscaler with a board-level clean energy commitment. Google has a stated goal of running on carbon-free energy every hour of every day by 2030 and already matches around 74% of its consumption hourly. Microsoft signed a twenty-year deal to restart an entire nuclear plant at Three Mile Island for its data centres.<Fn n={6} /></p>
          <p>These buyers don't want annual certificates that net off over a year, the old trick where you buy Scottish wind on paper and burn gas at 6pm. They're contracting for <em>around-the-clock</em> clean power, which forces the portfolio to be designed properly from day one: wind plus solar plus storage plus something firm, shaped to a real load. That's the "from the ground up" system Britain keeps writing strategy documents about, except this time a customer is paying for it and no subsidy scheme has to coax it along.<Fn n={7} /></p>
        </Prose>

        <StatRow
          stats={[
            { num: "~50GW", label: "data centre connection requests" },
            { num: "29GW", label: "onshore wind target, 2030" },
            { num: "95%", label: "clean power target, 2030" },
          ]}
        />

        <Section title="The job the industry keeps putting off" />
        <Prose>
          <p>Now for the part I actually care about. Britain's electricity price is set by the most expensive generator running in each half hour, and that generator is nearly always gas. Gas set the price in as many as 98% of hours in 2021, and 84% of the time across recent years, despite producing well under half the country's electricity.<Fn n={8} /> I worked through the 2021–22 crisis, so I watched that mechanism put the gas price straight onto everyone's electricity bill. "Decouple electricity from gas" has been on the national to-do list ever since. The Review of Electricity Market Arrangements ran for three years, considered every option up to and including tearing the market into zones, and settled in July 2025 on reforming the national price instead.<Fn n={9} /></p>
          <p>Three years of review, to decide to reform the pricing model the market already had. Clean Power 2030 sets a target of 95% low-carbon generation, and NESO calls it achievable without raising costs,<Fn n={10} /> but a target a government sets itself is not a deadline. Nothing has ever forced this job to get done.</p>
          <p>Even at 5% of generation, gas can still set the price. Being rare doesn't stop it being the marginal unit. Gas stops setting the price only when something else can profitably be the flexible thing in the tight hours: storage, demand that moves itself, firm clean capacity. And that is exactly what a 24/7 clean-power buyer pays to build. Round-the-clock contracts fund the batteries and the flexibility directly, because hourly matching is the product being sold. The data centre queue is the first customer the decoupling project has ever had.</p>
        </Prose>

        <Section title="So, is now the right time?" />
        <Prose>
          <p>Wrong question, I think. There was never going to be a right time, only a forcing event. The demand is enormous and awkward and it will strain the grid. It is also underwritten by the deepest-pocketed buyers the electricity market has ever seen, with clean-power commitments at board level, landing just as onshore wind comes back and half-hourly settlement makes flexibility a real market. The concerns about data centres are right on the facts and wrong on the framing.</p>
        </Prose>

        <Footnotes
          notes={[
            <>NESO counts ~140 data centre proposals seeking around 50GW of grid connections, roughly equal to GB peak demand; some two-thirds of existing data centres sit within 20 miles of London, and spare capacity claims there stalled new housing in west London. <a href="https://reports.electricinsights.co.uk/?p=2687" target="_blank" rel="noopener">Drax Electric Insights Q1 2026, "Britain's AI ambitions depend on the grid"</a>.</>,
            <>NESO's central analysis points to ~5.2GW of connected data centre capacity and just over 20TWh of demand by 2030, with connection requests far exceeding that; Future Energy Scenarios 2025 models data centre demand rising from 7.6TWh (2024) to 20–41TWh by 2035. <a href="https://www.datacenterdynamics.com/en/news/uk-grid-operator-high-uncertainty-on-data-center-growth-makes-forecasting-hard-could-range-from-30-71twh-by-2050/" target="_blank" rel="noopener">Data Center Dynamics, on NESO's forecasts</a>.</>,
            <>The UK Compute Roadmap targets AI Growth Zones each serving at least 500MW of demand by 2030, with at least one scaling beyond 1GW. <a href="https://committees.parliament.uk/writtenevidence/166090/html/" target="_blank" rel="noopener">Written evidence to Parliament, DCU0081</a>.</>,
            <>England's de facto onshore wind ban (in place since 2015) was lifted in July 2024 via reform of the National Planning Policy Framework; the first Onshore Wind Strategy, published 4 July 2025, sets out 40+ actions to reach up to 29GW by 2030. <a href="https://www.osborneclarke.com/insights/wind-change-labour-government-lifts-de-facto-ban-onshore-wind-uk" target="_blank" rel="noopener">Osborne Clarke, on lifting the ban</a>; <a href="https://www.trowers.com/insights/2025/july/onshore-wind-strategy-addressing-the-challenges" target="_blank" rel="noopener">Trowers &amp; Hamlins, on the strategy</a>.</>,
            <>MHHS migration began in October 2025, with ~80% of meters expected to be migrated by October 2026 and completion in May 2027; full half-hourly settlement cuts the settlement cycle from 14 months to four. <a href="https://www.elexon.co.uk/bsc/operational/market-wide-half-hourly-settlement/" target="_blank" rel="noopener">Elexon, Market-wide Half-Hourly Settlement</a>.</>,
            <>Google targets 24/7 carbon-free energy on every grid it operates on by 2030 and reports ~74% hourly matching worldwide; Microsoft signed a 20-year agreement with Constellation to restart Three Mile Island Unit 1 (835MW) exclusively for its data centres. <a href="https://www.mckinsey.com/industries/electric-power-and-natural-gas/our-insights/how-hyperscalers-are-fueling-the-race-for-24-7-clean-power" target="_blank" rel="noopener">McKinsey, on the race for 24/7 clean power</a>.</>,
            <>24/7 clean-power PPAs contract hourly-matched portfolios blending wind, solar, storage and firm low-carbon sources, moving beyond annually-netted renewable certificates. <a href="https://www.datacenterdynamics.com/en/news/google-and-microsoft-back-247-carbon-free-energy-marketplace/" target="_blank" rel="noopener">Data Center Dynamics, on the 24/7 CFE marketplace</a>.</>,
            <>UCL research found gas set GB electricity costs 84% of the time in recent years despite generating under half of supply; a widely cited analysis put the figure at ~97–98% of hours in 2021. <a href="https://www.ucl.ac.uk/news/2022/sep/electricity-prices-dictated-gas-producers-who-provide-less-half-uk-electricity" target="_blank" rel="noopener">UCL, on gas setting electricity prices</a>; <a href="https://www.carbonbrief.org/qa-why-does-gas-set-the-price-of-electricity-and-is-there-an-alternative" target="_blank" rel="noopener">Carbon Brief, on marginal pricing</a>.</>,
            <>The REMA Summer Update of 10 July 2025 rejected zonal pricing and committed to a reformed national pricing model, retaining a single GB-wide wholesale market. <a href="https://www.nortonrosefulbright.com/en/knowledge/publications/4399413b/rema-summer-update-no-to-zonal-pricing-yes-to-reformed-national-pricing" target="_blank" rel="noopener">Norton Rose Fulbright, REMA Summer Update</a>.</>,
            <>The Clean Power 2030 Action Plan targets at least 95% of generation from low-carbon sources with no more than 5% unabated gas; NESO's advice judged this achievable without increasing costs and said it would insulate the UK from volatile international gas prices. <a href="https://www.gov.uk/government/publications/clean-power-2030-action-plan/clean-power-2030-action-plan-a-new-era-of-clean-electricity-main-report" target="_blank" rel="noopener">DESNZ, Clean Power 2030 Action Plan</a>; <a href="https://www.carbonbrief.org/analysis-how-the-uk-plans-to-reach-clean-power-by-2030/" target="_blank" rel="noopener">Carbon Brief analysis</a>.</>,
          ]}
        />
      </div>
    </Article>
  );
}
