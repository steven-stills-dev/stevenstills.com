import { Article, Prose, Section, Wide, Fn, Footnotes, StatRow } from "../../components/Article";
import Box from "../../components/Box";
import UKMap, { type UKMapPoint } from "../../components/maps/UKMap";
import DataTable from "../../components/charts/DataTable";
import { usePageMeta } from "../../lib/meta";
import data from "./data.json";

// planned sites carry published megawatts, existing ones carry the cluster
// they sit in. Coordinates are town level.
const SITES: UKMapPoint[] = [
  { lat: 55.142, lon: -1.520, label: "Cambois 720MW", tone: "primary", r: 6, dy: -12 },
  { lat: 55.030, lon: -1.478, label: "Cobalt Park", tone: "primary", r: 3.4, dy: 12 },
  { lat: 55.866, lon: -3.980, label: "Airdrie 500MW", tone: "primary", r: 5.4, anchor: "left" },
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
    <Box title="Data Centre Sites" h={h}>
      <UKMap values={{}} points={SITES}
        pointLegend={[{ tone: "primary", label: "Announced, planned" }, { tone: "night", label: "Existing cluster" }]} />
    </Box>
  );
}

// operational onshore wind by region, MW, from scripts/data-centre-demand/build.py
const WIND: Record<string, number> = data.wind;

const SITE_COLUMNS = [
  { key: "site", label: "Site" },
  { key: "mw", label: "Published", unit: "MW" },
  { key: "wind", label: "Regional wind", unit: "MW", tint: true },
  { key: "region", label: "Region" },
  { key: "status", label: "Status" },
];

const WIND_BANDS = [
  { max: 100, label: "Under 100 MW" },
  { max: 500, label: "100 to 500 MW" },
  { max: 1500, label: "500 to 1,500 MW" },
  { max: Infinity, label: "Over 1,500 MW" },
];

export default function DataCentres() {
  usePageMeta(
    "Data centre demand and grid connections in Britain",
    "Data centres are asking for about 50GW of grid connections, about the whole of Britain's peak demand. I map the announced sites against the onshore wind to see where the new demand would connect.",
  );

  return (
    <Article
      kicker="Opinion · energy markets & AI · updated 16 Nov 2026"
      title="Data centre demand and grid connections in Britain"
      lede="Data centres are asking for about 50GW of grid connections, about the whole of Britain's peak demand. I map the announced sites against the onshore wind to see where the new demand would connect."
    >
      {/* Lede parked with the article draft below until the research lands */}
      <div hidden>
        <p className="lede">Data centres are asking for 50GW of grid connections, about the whole of Britain's peak demand. I work through what has changed since July 2024, what a wind farm needs before it gets built, and what the new demand could mean for the link between gas and electricity prices.</p>
      </div>

      <Prose>
        <p>NESO, the electricity system operator, reports around 140 data centre proposals asking for roughly 50GW of grid connections, about the whole of Britain's peak demand.<Fn n={1} /> Around two-thirds of the existing data centre capacity, 1.7GW of 2.4GW, sits within twenty miles of London.<Fn n={1} k="b" /> Most of the onshore wind is at the other end of the country, and the network can carry only so much power from north to south, a limit the industry calls a constraint. I mapped the wind and the announced sites.</p>
      </Prose>

      <Section title="Where the onshore wind is" />
      <Prose>
        <p>The first map shows operational onshore wind by region in October 2026, from the Renewable Energy Planning Database that DESNZ, the energy department, publishes.<Fn n={2} /> Scotland holds 10,202&nbsp;MW. England, all of it, holds 2,871&nbsp;MW, with 113&nbsp;MW in the South East and 13&nbsp;MW in London. Offshore wind, another 16,011&nbsp;MW, is filed as offshore and not to a land region, so the map leaves it out.<Fn n={2} k="b" /></p>
      </Prose>

      <Wide>
        <Box title="Onshore Wind Capacity" sub="MW, operational, October 2026" h={620}>
          <UKMap
            values={WIND}
            bands={WIND_BANDS}
            format={(v) => `${v.toLocaleString("en-GB")} MW`}
          />
        </Box>
      </Wide>

      <Section title="Where the data centres are proposed" />
      <Prose>
        <p>The second map shows two existing clusters, at Slough and in Docklands, and seven announced or planned sites, with the three that have published megawatts drawn larger.<Fn n={3} /> The two largest, Cambois and Airdrie, are both in the north. Cambois is in the North East of England, which holds 474&nbsp;MW of the onshore wind, so the wind map on its own does not put Cambois next to the wind. Northumberland County Council consented the first phase of the Cambois campus on 2 December 2025, a scheme that could scale to 720&nbsp;MW. North Lanarkshire was designated an AI Growth Zone in January 2026, around the site DataVita runs at Airdrie, where the government says DataVita plans more than 500&nbsp;MW of on-site power.<Fn n={3} k="b" /></p>
      </Prose>

      <Wide>
        <SitesMap h={620} />
      </Wide>

      <Prose>
        <p>The table shows each site beside the onshore wind operating in its region, and either column can be sorted. Airdrie is the only site with published megawatts in a region holding more than 1,500&nbsp;MW of onshore wind. Cambois's 720&nbsp;MW would be more than the 474&nbsp;MW of onshore wind operating in the whole of the North East, and Culham and the Slough cluster share a region with 113&nbsp;MW. A region is a coarse measure of distance, so I read the table as a first sort of the sites and no more.</p>
      </Prose>

      <Wide>
        <Box title="Data Centre Sites and Regional Onshore Wind" sub="MW">
          <DataTable columns={SITE_COLUMNS} rows={data.sites} sortBy="wind"
            caption="Announced, planned and existing data centre sites with their published megawatts and the operational onshore wind in the same region" />
        </Box>
      </Wide>

      <Section title="What I would watch at Cambois and Airdrie" />
      <Prose>
        <p>I think a big load on the wind's side of the constraint is the more useful place for new demand to connect, because I understand that wind to be the generation switched off when the network is full. I have not measured that. The Drax report makes a similar point, that "greater priority should go to regions with strong existing grid connections and low-carbon generation".<Fn n={1} k="c" /></p>
        <p>Both sites are still plans, and I would watch whether those megawatts are built and connected. If I were choosing a site for a large load, I would look at the wind map before the existing clusters. Among the sites with published megawatts, the table puts Airdrie first on that test.</p>
      </Prose>

      <Footnotes
        notes={[
          <>NESO reports 140 data centre proposals seeking around 50GW of grid connections, equal to Britain's entire peak demand; 1.7GW of the UK's 2.4GW of data centres lie within 20 miles of London. <a href="https://reports.electricinsights.co.uk/?p=2687" target="_blank" rel="noopener">Drax Electric Insights Q1 2026, "Britain's AI ambitions depend on the grid"</a>.</>,
          <>Renewable Energy Planning Database, Q3 2026 extract with records updated to 23 October 2026, operational sites only, summed by the database's own region field. Offshore wind, another 16,011&nbsp;MW, is excluded because the database files it as offshore rather than to a land region. <a href="https://www.gov.uk/government/publications/renewable-energy-planning-database-monthly-extract" target="_blank" rel="noopener">DESNZ, Renewable Energy Planning Database</a>. Map boundaries are the ONS ITL1 regions, January 2025; contains OS and National Statistics data &copy; Crown copyright and database right 2025.</>,
          <>Northumberland County Council consented the first phase of the QTS/Blackstone Cambois campus on 2 December 2025, a scheme that could scale to 720&nbsp;MW across up to ten buildings. Culham is the UK's first designated AI Growth Zone, with roughly 100&nbsp;MW of initial dual-resilient power and stated plans to scale beyond. North Lanarkshire was designated an AI Growth Zone on 29 January 2026, around DataVita's data centre site in Airdrie, and the government's announcement says DataVita plans to generate more than 500&nbsp;MW of on-site power within four years; the map and the table carry that figure for Airdrie. Cobalt Park is in the North East AI Growth Zone designated in September 2025, Anglesey and Trawsfynydd are the two bases of the North Wales zone confirmed in November 2025, and Bridgend is the western end of the South Wales zone announced in the same month; no megawatts are published for those four sites on their own. Slough has more than 30 operating data centres with around 1&nbsp;GW of capacity, on figures from the operator Kao Data, and Telehouse runs several data centres in London's Docklands. Sites are plotted at town level, and the three dots with published megawatts are drawn larger in that order. In the table a blank means no figure is published for the site on its own, and Slough's 1,000&nbsp;MW is the Kao Data figure of around 1&nbsp;GW. <a href="https://bebeez.eu/en/news/approval-given-to-first-phase-of-10bn-data-center-in-northumberland-england/" target="_blank" rel="noopener">DCD, on the Northumberland consent, republished by BeBeez, 8 Dec 2025</a>; <a href="https://culham.org.uk/invest-at-culham-campus/expression-of-interest/" target="_blank" rel="noopener">Culham Campus</a>; <a href="https://www.gov.uk/government/news/more-than-3400-jobs-and-targeted-support-for-local-communities-to-help-tackle-the-cost-of-living-as-lanarkshire-named-latest-ai-growth-zone" target="_blank" rel="noopener">UK Government, on Lanarkshire, 29 Jan 2026</a>; <a href="https://www.gov.uk/government/news/north-east-england-set-for-billions-in-investment-and-thousands-of-jobs-as-uk-and-us-ink-tech-partnership" target="_blank" rel="noopener">UK Government, on the North East, 16 Sep 2025</a>; <a href="https://www.gov.uk/government/news/ai-growth-zones-to-create-thousands-of-jobs-and-unlock-up-to-100-billion-in-investment-as-new-site-confirmed-for-north-wales" target="_blank" rel="noopener">UK Government, on North Wales, 13 Nov 2025</a>; <a href="https://www.gov.uk/government/news/ai-to-power-national-renewal-as-government-announces-billions-of-additional-investment-and-new-plans-to-boost-uk-businesses-jobs-and-innovation" target="_blank" rel="noopener">UK Government, on South Wales, 20 Nov 2025</a>; <a href="https://dcnnmagazine.com/?p=19793" target="_blank" rel="noopener">DCNN, on Kao Data's Slough figures</a>; <a href="https://www.telehouse.com/?p=1075" target="_blank" rel="noopener">Telehouse, on its Docklands sites</a>.</>,
        ]}
      />

      {/* ARTICLE PARKED: full draft hidden below until the research lands. Remove the hidden wrapper to restore. */}
      <div hidden>
        <Prose>
          <p>NESO has counted around 140 data centre proposals asking for roughly 50GW of grid connections, about Britain's entire peak demand.<Fn n={1} /> Around two-thirds of existing data centre capacity sits within twenty miles of London, where new housing in west London stalled because data centres had claimed the spare network capacity first.<Fn n={1} k="b" /></p>
          <p>The forecasts are far below the requests. NESO's central view has some 5.2GW of data centre capacity connected by 2030, and its Future Energy Scenarios have data centre demand rising from 7.6TWh in 2024 to between 20 and 41TWh by 2035.<Fn n={2} /> I think the timing is better than those numbers suggest.</p>
        </Prose>

        <Section title="What has changed since July 2024" />
        <Prose>
          <p>England spent nine years under a de facto ban on onshore wind, from 2015 until July 2024. A year later the first Onshore Wind Strategy aimed at as much as 29GW by 2030.<Fn n={3} /></p>
          <p>The second change is in my corner of the industry. Market-wide Half-Hourly Settlement (MHHS) settles every meter on the half hour instead of on an estimate. Meters started migrating in October 2025, and the programme completes in 2027.<Fn n={4} /> Half-hourly settlement lets suppliers see demand as it happens and pay people to move it. I've spent years working with estimated settlement, and I don't think a flexible grid can be run on it.</p>
        </Prose>

        <Section title="What a wind farm needs before it gets built" />
        <Prose>
          <p>In my experience, renewables get built on revenue certainty: a developer needs a creditworthy buyer signed up for fifteen years. I think the strongest candidate is a hyperscaler, one of the large cloud computing companies, with a board-level clean energy commitment. Google already matches around 74% of its consumption hourly, and Microsoft signed a twenty-year deal to restart Three Mile Island Unit 1 for its data centres.<Fn n={5} /></p>
          <p>These buyers are moving away from annual certificates, which let a company buy Scottish wind on paper while burning gas at 6pm, towards clean power matched hour by hour from wind, solar, storage and something firm.<Fn n={6} /></p>
        </Prose>

        <StatRow
          stats={[
            { num: "~50GW", label: "data centre connection requests" },
            { num: "29GW", label: "onshore wind target, up to, 2030" },
            { num: "95%", label: "clean power target, 2030" },
          ]}
        />

        <Section title="Why gas still sets the electricity price" />
        <Prose>
          <p>Britain's electricity price is set by the most expensive generator running in each half hour, usually gas. Gas set the price in as many as 98% of hours in 2021, and UCL research published in 2022 put the figure at 84% of the time, while gas generated under half the country's electricity.<Fn n={7} /> The Review of Electricity Market Arrangements settled in July 2025 on reforming the national price.<Fn n={8} /></p>
          <p>Clean Power 2030 sets a target of at least 95% low-carbon generation.<Fn n={9} /> Even at 5% of generation, gas can still set the price, because a generator that runs rarely can still be the marginal unit. Gas stops setting the price when storage, demand that shifts or firm clean capacity can profitably supply the tight hours. A buyer of hourly matched clean power pays for that flexibility directly, so I think data centre buyers are paying customers for the decoupling work.</p>
        </Prose>

        <Section title="What I would watch as the data centres connect" />
        <Prose>
          <p>What I would watch is how the data centres that connect buy their power. Contracts matched hour by hour pay for storage and flexibility, and annual certificates do not. For planning, I would work from NESO's central view of 5.2GW connected by 2030, because the 50GW is a queue of requests.</p>
        </Prose>

        <Footnotes
          notes={[
            <>NESO counts ~140 data centre proposals seeking around 50GW of grid connections, roughly equal to GB peak demand; some two-thirds of existing data centres sit within 20 miles of London, and spare capacity claims there stalled new housing in west London. <a href="https://reports.electricinsights.co.uk/?p=2687" target="_blank" rel="noopener">Drax Electric Insights Q1 2026, "Britain's AI ambitions depend on the grid"</a>.</>,
            <>NESO's central analysis points to ~5.2GW of connected data centre capacity and just over 20TWh of demand by 2030, with connection requests far exceeding that; Future Energy Scenarios 2025 models data centre demand rising from 7.6TWh (2024) to 20–41TWh by 2035. <a href="https://www.datacenterdynamics.com/en/news/uk-grid-operator-high-uncertainty-on-data-center-growth-makes-forecasting-hard-could-range-from-30-71twh-by-2050/" target="_blank" rel="noopener">Data Center Dynamics, on NESO's forecasts</a>.</>,
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
