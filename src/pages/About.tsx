import { Article, Prose, Section, Wide, Fn, Footnotes } from "../components/Article";
import Box from "../components/Box";
import AboutHero from "../components/AboutHero";
import UKMap from "../components/maps/UKMap";
import PillBars from "../components/charts/PillBars";
import { usePageMeta } from "../lib/meta";
import "./About.css";

/** Temporary grass, permanent pasture and sole right rough grazing as a share
 *  of total area on agricultural holdings, June 2025. London carries the
 *  South East figure because Defra reports the two together. */
const GRASS: Record<string, number> = {
  "northern-ireland": 92.5,
  "wales": 85.0,
  "north-west": 82.5,
  "scotland": 79.5,
  "north-east": 67.9,
  "south-west": 64.5,
  "west-midlands": 51.7,
  "yorkshire": 47.6,
  "south-east": 41.6,
  "london": 41.6,
  "east-midlands": 30.8,
  "east": 17.2,
};

const LIVESTOCK = [
  { label: "Farmland", value: 80 },
  { label: "Calories", value: 17 },
  { label: "Protein", value: 38 },
];

const NOTES = [
  <>UK utilised agricultural area was 16.8&nbsp;million hectares at 1 June 2025, 69% of the UK land area. Defra estimates that 83.9% of that area, and 56.2% of the croppable area, was used to feed livestock in 2024, including 70.2% of the barley and 53.1% of the wheat. 69% × 84% gives the 58% figure. <a href="https://www.gov.uk/government/statistics/agricultural-land-use-in-the-united-kingdom/agricultural-land-use-in-united-kingdom-at-1-june-2025" target="_blank" rel="noopener">Defra, agricultural land use in the UK at 1 June 2025</a>; <a href="https://www.gov.uk/government/statistics/agricultural-land-use-in-the-united-kingdom" target="_blank" rel="noopener">Defra, agricultural land used to feed livestock in the UK, December 2025</a>.</>,
  <>Temporary grass, permanent pasture and sole right rough grazing as a share of the total area on agricultural holdings, June 2025. Defra categorises each of those three as 100% land used to feed livestock. English regions from the Defra June survey regional tables, which report the South East and London together and cover commercial holdings only; Wales, Scotland and Northern Ireland from the UK country tables, where permanent grassland includes sole right rough grazing. Common rough grazing is outside both denominators. Northern Ireland 92.5%, Wales 85.0%, North West 82.5%, Scotland 79.5%, North East 67.9%, South West 64.5%, West Midlands 51.7%, Yorkshire and The Humber 47.6%, South East including London 41.6%, East Midlands 30.8%, East of England 17.2%. England 48.5% and the UK 64.4%. <a href="https://www.gov.uk/government/statistical-data-sets/structure-of-the-agricultural-industry-in-england-and-the-uk-at-june" target="_blank" rel="noopener">Defra, structure of the agricultural industry at June, region dataset</a>; <a href="https://www.gov.uk/government/statistics/agricultural-land-use-in-the-united-kingdom" target="_blank" rel="noopener">Defra, agricultural land use in the UK, land use and crops by country</a>.</>,
  <>UK self-sufficiency in beef and veal was 80.9% in 2024, unchanged on the year; sheep meat was 99.4%. <a href="https://ahdb.org.uk/beef-and-lamb-markets/2024-market-summary" target="_blank" rel="noopener">AHDB, beef and lamb market summary 2024</a>.</>,
  <>An average of 21.3&nbsp;million hectares of land overseas each year between 2016 and 2018 to meet UK demand for beef and leather, cocoa, palm oil, pulp and paper, rubber, soy and timber, equal to 88% of the UK land area. Soy alone accounted for 1.7&nbsp;million hectares. <a href="https://www.wwf.org.uk/sites/default/files/2020-07/RiskierBusinessReport_July2020_proofV5_0.pdf" target="_blank" rel="noopener">WWF and RSPB, <em>Riskier Business: the UK's overseas land footprint</em>, July 2020</a>.</>,
  <>Grazing land plus cropland grown for animal feed comes to 80% of global agricultural land use, while meat, dairy and farmed fish provide 17% of the world's calories and 38% of its protein. Land shares from Poore and Nemecek (2018); calorie and protein shares from the FAO. <a href="https://ourworldindata.org/global-land-for-agriculture" target="_blank" rel="noopener">Our World in Data, half of the world's habitable land is used for agriculture</a>.</>,
];

export default function About() {
  usePageMeta("About", "Fair warning, this isn't the professional introduction. An advertising degree, 16 years of statistical modelling in energy, and a lot of boxes and arrows.");

  return (
    <div className="about">
      <Article kicker="About" title="Steven Stills">
        <Wide>
          <AboutHero />
        </Wide>

        <Prose>
          <p>Fair warning, this isn't the professional introduction! I'm Steven. Most people who have known me a long time will be surprised when I bring up my advertising degree, on the assumption that I did "something in maths", but figuring out the solution has always been my keen interest and for the last 16 years that has meant a lot of statistical modelling and tonnes of charts and diagrams with boxes and arrows to explain what's going on. I'm dynamic, I'm empathetic and I'm very quick to notice an anomaly in the slide deck.</p>
        </Prose>

        <Wide>
          <div className="photo-pair">
            <div className="photo">
              <img src="/img/portrait-4.jpg" alt="Steven Stills, arms folded, in front of a lit-up bar interior." />
            </div>
            <div className="photo">
              <img src="/img/about-camera.jpg" alt="Steven walking past a graffiti wall, checking the back of a camera." style={{ objectPosition: "50% 32%" }} />
            </div>
          </div>
        </Wide>

        <Prose>
          <p>Outside of work my passions include photography, climbing, a good country hike or a long night in game design.</p>
          <p>At work I code in Python and TypeScript, and by night I switch to GDScript for gaming and HTML and CSS for websites like this. But I'm not the best at any of these. My value comes from using my wide set of skills to drive directly towards a tight deliverable.</p>
        </Prose>

        <Wide>
          <div className="photo-pair">
            <div className="photo">
              <img src="/img/about-climbing.jpg" alt="Steven high on an indoor bouldering wall, spanning between two volumes." />
            </div>
            <div className="photo">
              <img src="/img/about-towpath.jpg" alt="A canal towpath under trees, coffee cup held in shot." style={{ objectPosition: "50% 68%" }} />
            </div>
          </div>
        </Wide>

        <Prose>
          <p>I've chosen to share these hobbies because they all have something in common, problem solving. Photography is pattern recognition and parameter balancing to get the right shot. Bouldering is planning ahead and testing the process as you go, you might test the water, make an MVP of an attempt before you throw your full efforts in. And finally gaming, a hobby completing problems someone else put in your way, all tied up in a world of rules and boundaries. These all feed into how I solve problems in business. The coffee just helps.</p>
          <p>But I'm not always 100% on. I do enjoy a rest at the local sauna on a Friday evening, it's those moments of quiet that help facilitate the next week of problem solving.</p>
          <p>I firmly believe that you could be the most intelligent person in the world, but if you couldn't communicate your point, you'd also be the least intelligent person in the world. So I have worked on my communication a great deal over the years.</p>
          <p>Peer management and team motivation have always come natural to me, and I've worked hard to match my stakeholder management and upwards management to the same level.</p>
          <p>I'm at home in the chaos, and frequently go beyond my remit in a workplace because I believe that the only thing stopping answers coming forth is your imagination to find the solution.</p>
        </Prose>

        <Wide>
          <div className="photo photo-wide">
            <img src="/img/about-mural.jpg" alt="Steven and his partner standing in front of a large Sonic the Hedgehog street mural." />
          </div>
        </Wide>

        <Section title="My commitments to net zero" />

        <Prose>
          <p>I live in a zero waste household with my wife and neither of us have eaten meat in the last 9 years. We're both industry veterans and we're familiar with the <a href="https://www.reuters.com/sustainability/climate-energy/majority-recent-co2-emissions-linked-just-57-producers-report-says-2024-04-04/" target="_blank" rel="noopener">57 producers behind the majority of global CO<sub>2</sub> emissions</a>, but we also believe that every single person can make a difference, and this is us trying our best.</p>
          <p>If you haven't tried a zero waste shop yet, grab a couple of pieces of tupperware and find your nearest one. It's an adult pic 'n' mix and always a social affair. Mine is <a href="https://zeroyorkshire.co.uk/" target="_blank" rel="noopener">Zero Yorkshire</a>.</p>
        </Prose>

        <Wide>
          <div className="photo photo-wide">
            <img src="/img/about-zero-waste.jpg" alt="Inside a zero waste shop: shelves of labelled refill jars, an oat milk refill station, and tables of loose soaps, brushes and bath salts." />
          </div>
        </Wide>

        <Prose>
          <p>But why no meat? There isn't enough land in the UK to produce as much meat as we eat. Farmland covers 69% of the country and 84% of that farmland is used to feed livestock, so about 58% of the UK is there to feed animals.<Fn n={1} /> The arable side goes the same way, with 56% of croppable land growing animal feed, including 70% of the barley.<Fn n={1} k="b" /></p>
        </Prose>

        <Wide>
          <Box icon="map" h={620} title="Farmland Feeding Livestock" sub="June 2025">
            <UKMap
              values={GRASS}
              domain={[0, 100]}
              format={(v) => Math.round(v) + "%"}
              legendTitle="Farmland feeding livestock"
            />
          </Box>
        </Wide>

        <Prose>
          <p>Northern Ireland puts 93% of its farmed land into feeding livestock, Wales 85% and the North West 82%. Only the East of England comes in under a fifth, at 17%.<Fn n={2} /></p>
          <p>I'm not a preacher of it being "the right way". But any meat we do eat is taking from land off shore where it's needed over there. UK beef self-sufficiency was 80.9% in 2024,<Fn n={3} /> and meeting our demand for seven commodities, beef and soy among them, takes 21.3 million hectares of land overseas every year. That is 88% of the UK's own land area.<Fn n={4} /></p>
        </Prose>

        <Wide>
          <Box icon="bars" h={360} title="Livestock's Share of Farmland, Calories and Protein" sub="Global">
            <PillBars items={LIVESTOCK} unit="%" />
          </Box>
        </Wide>

        <Prose>
          <p>Globally it is starker. Livestock takes 80% of the world's agricultural land and gives back 17% of its calories and 38% of its protein.<Fn n={5} /></p>
        </Prose>

        <Section title="My stance on leadership" />

        <Prose>
          <p>I was raised in a working class family where you never discussed 'ages or wages', and now I'm hitting 40 I can see how much that silence set me back. Not understanding how money or pay worked meant I spent my 20s and most of my 30s clearing debt before I could build anything, and I only own a small investment portfolio with a decent retirement in sight because I got there the slow way. Put that financial stress next to a few early managers who were unsympathetic, and it taught me the kind of leader I did not want to be. So I lead people-first. There is always a story behind the face, and whether someone's struggle is financial, physical or mental, I try to draw on my own to help them. I am fair but firm, and that care tends to show up in the results, both from individuals and from the team. People who used to report to me still come back for guidance or a steer, years later, because of how we worked together.</p>
          <p>My teams are usually cross-functional, spanning trading, risk, operations, finance and data, and that mix carries a lot of technical detail. My job is to cut through it to the insight that actually matters. I'm not a fan of putting weak data in front of the stakeholders and investors who have to make decisions on it, so I make sure what leaves me is the best I can give them, using BI platforms and AI to build sharp, clear tools that keep everyone in the loop.</p>
        </Prose>

        <Section title="The question I keep asking" />

        <Prose>
          <p>In 2016 I built my first half-hourly demand forecasts with classic statistical models. I spent lockdown building neural networks, and today I forecast with gradient boosting on a customer book heading for 5 billion data points a year. I've made the move from Excel workbooks to enterprise systems myself, and now I steer energy firms through it.</p>
          <p>The question behind every step has been the same: how can I do this better? It pushed me deep into data fundamentals, AI and business transformation, and it's why I pair industry knowledge with proper data practice built from the ground up. Everything I build is meant to turn large, messy data into insight a leader can act on.</p>
          <p>I've been in leadership for over a decade, reporting straight to the C-suite and to shareholders, and leading multi-disciplinary teams across start-ups and matrixed organisations through influence rather than hierarchy. I take AI and machine learning from prototype to production at scale, translate the technical for non-technical stakeholders, and tie it to hard financial value.</p>
          <p>If you'd like to work together, get in touch.</p>
          <nav className="links-row" aria-label="Contact">
            <a href="mailto:stevenstills@icloud.com">stevenstills@icloud.com</a>
            <a href="https://www.linkedin.com/in/steven-stills" target="_blank" rel="noopener">LinkedIn</a>
          </nav>
        </Prose>

        <Footnotes notes={NOTES} />

        <Prose>
          <p className="about-attribution">Map boundaries are the ONS International Territorial Level 1 regions, January 2025, ultra generalised. Contains OS data &copy; Crown copyright and database right 2025; contains National Statistics data &copy; Crown copyright and database right 2025. <a href="https://geoportal.statistics.gov.uk/" target="_blank" rel="noopener">ONS Open Geography Portal</a>.</p>
        </Prose>
      </Article>
    </div>
  );
}
