import { Article, Prose, Section, Wide, Fn, Footnotes } from "../components/Article";
import Box from "../components/Box";
import AboutHero from "../components/AboutHero";
import UKMap from "../components/maps/UKMap";
import Bars from "../components/charts/Bars";
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
  <>UK self-sufficiency in beef and veal was 80.5% in 2025, down 0.2 percentage points on the year; sheep meat was 101.2%. <a href="https://ahdb.org.uk/beef-and-lamb-markets/2024-market-summary" target="_blank" rel="noopener">AHDB, beef and lamb market summary 2025</a>.</>,
  <>An average of 21.3&nbsp;million hectares of land overseas each year between 2016 and 2018 to meet UK demand for beef and leather, cocoa, palm oil, pulp and paper, rubber, soy and timber, equal to 88% of the UK land area. Soy alone accounted for 1.7&nbsp;million hectares. <a href="https://www.wwf.org.uk/sites/default/files/2020-07/RiskierBusinessReport_July2020_proofV5_0.pdf" target="_blank" rel="noopener">WWF and RSPB, <em>Riskier Business: the UK's overseas land footprint</em>, July 2020</a>.</>,
  <>Grazing land plus cropland grown for animal feed comes to 80% of global agricultural land use, while meat, dairy and farmed fish provide 17% of the world's calories and 38% of its protein. Land shares from Poore and Nemecek (2018); calorie and protein shares from the FAO. <a href="https://ourworldindata.org/global-land-for-agriculture" target="_blank" rel="noopener">Our World in Data, half of the world's habitable land is used for agriculture</a>.</>,
];

export default function About() {
  usePageMeta("About", "A personal introduction to Steven Stills: 16 years in the energy industry, how I work, and what my household does about net zero.");

  return (
    <div className="about">
      <Article kicker="About" title="Steven Stills">
        <Wide>
          <AboutHero />
        </Wide>

        <Prose>
          <p>Fair warning, this isn't the professional introduction. I'm Steven. Most people who have known me a long time are surprised when I bring up my advertising degree, on the assumption that I did "something in maths". Figuring out the solution has always been my keen interest, and for the last 16 years that has meant a lot of statistical modelling and tonnes of charts and diagrams with boxes and arrows to explain what's going on. I'm also quick to notice an anomaly in the slide deck.</p>
        </Prose>

        <Wide>
          <div className="photo-pair">
            <div className="photo">
              <img src="/img/me_lisbon.jpeg" alt="Steven Stills in a black T-shirt in front of a carved stone chapel doorway." style={{ objectPosition: "48% 50%" }} />
            </div>
            <div className="photo">
              <img src="/img/about-camera.jpg" alt="Steven walking past a graffiti wall, checking the back of a camera." style={{ objectPosition: "50% 32%" }} />
            </div>
          </div>
        </Wide>

        <Prose>
          <p>Outside of work my passions include photography, climbing, a good country hike or a long night in game design.</p>
          <p>At work I code in Python and TypeScript, and by night I switch to GDScript for gaming and HTML and CSS for websites like this. But I'm not the best at any of these. Where I'm useful is in putting a wide set of skills to work on one tightly defined deliverable.</p>
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
          <p>I've chosen to share these hobbies because they all have something in common: problem solving. Photography is pattern recognition and parameter balancing to get the right shot. Bouldering is planning ahead and testing the process as you go. You might test the water and make an MVP of an attempt (a minimum viable product, a first rough go) before you throw your full effort in. And finally gaming, a hobby of completing problems someone else put in your way, all tied up in a world of rules and boundaries. All three hobbies feed into how I solve problems at work. The coffee just helps.</p>
          <p>But I'm not always 100% on. I enjoy a rest at the local sauna on a Friday evening, and the quiet sets me up for the next week of problem solving.</p>
          <p>I've found that being right isn't much use if I can't explain the point, so I have worked on my communication a great deal over the years.</p>
          <p>Managing peers and motivating a team have always come naturally to me. Managing stakeholders and managing upwards took more work, and I've put that work in.</p>
          <p>I'm at home in the chaos, and I frequently go beyond my remit at work, because I think the answer is usually there for whoever has the imagination to look for it.</p>
        </Prose>

        <Wide>
          <div className="photo photo-wide">
            <img src="/img/about-mural.jpg" alt="Steven and his partner standing in front of a large Sonic the Hedgehog street mural." />
          </div>
        </Wide>

        <Section title="My commitments to net zero" />

        <Prose>
          <p>I live in a zero waste household with my wife, and neither of us has eaten meat in the last 9 years. We have both worked in the industry for a long time and we're familiar with the <a href="https://www.reuters.com/sustainability/climate-energy/majority-recent-co2-emissions-linked-just-57-producers-report-says-2024-04-04/" target="_blank" rel="noopener">57 producers linked to the majority of recent global CO<sub>2</sub> emissions</a>, but we also believe that each person can make a difference, and this is us trying our best.</p>
          <p>If you haven't tried a zero waste shop yet, grab a couple of pieces of tupperware and find your nearest one. It's an adult pic 'n' mix and always a social affair. Mine is <a href="https://zeroyorkshire.co.uk/" target="_blank" rel="noopener">Zero Yorkshire</a>.</p>
        </Prose>

        <Wide>
          <div className="photo photo-wide">
            <img src="/img/about-zero-waste.jpg" alt="Inside a zero waste shop: shelves of labelled refill jars, an oat milk refill station, and tables of loose soaps, brushes and bath salts." />
          </div>
        </Wide>

        <Prose>
          <p>Land use is the reason neither of us eats meat. The question I ask is how much land the meat the UK eats takes. Farmland covers 69% of the country and 84% of that farmland is used to feed livestock, so about 58% of the UK is used to feed animals.<Fn n={1} /> The arable side goes the same way, with 56% of croppable land growing animal feed, including 70% of the barley.<Fn n={1} k="b" /></p>
        </Prose>

        <Wide>
          <Box h={620} title="Grass and Rough Grazing Share of Farmland" sub="June 2025">
            <UKMap
              values={GRASS}
              domain={[0, 100]}
              format={(v) => Math.round(v) + "%"}
              legendTitle="Grass and rough grazing"
            />
          </Box>
        </Wide>

        <Prose>
          <p>The map shows the share of land on farm holdings that is under grass and rough grazing in each region, all of which Defra counts as land used to feed livestock.<Fn n={2} /> Northern Ireland has 92.5% of its farmland under grass, Wales 85.0% and the North West 82.5%. Only the East of England comes in under a fifth, at 17.2%. Crops grown for animal feed come on top of the grass shares and are not on the map.</p>
          <p>Even with 58% of the UK feeding animals, the UK produced less beef than it ate: UK beef and veal self-sufficiency was 80.5% in 2025.<Fn n={3} /> So some of the beef eaten in the UK is raised on land overseas. Meeting UK demand for seven commodities took an average of 21.3 million hectares of land overseas each year between 2016 and 2018, an area equal to 88% of the UK's own land area. Most of the seven are not meat, and soy accounted for 1.7 million hectares.<Fn n={4} /></p>
        </Prose>

        <Wide>
          <Box h={360} title="Livestock's Share of Farmland, Calories and Protein" sub="Global">
            <Bars items={LIVESTOCK} unit="%" />
          </Box>
        </Wide>

        <Prose>
          <p>The chart shows livestock's share of the world's farmland next to its share of the world's food. Grazing land and cropland grown for animal feed take 80% of global agricultural land, and meat, dairy and farmed fish provide 17% of the world's calories and 38% of its protein.<Fn n={5} /></p>
          <p>I'm not a preacher of it being "the right way". Not eating meat is the part of the land problem that my wife and I can do something about, so we do it.</p>
        </Prose>

        <Section title="The question I keep asking" />

        <Prose>
          <p>In 2016 I built my first half-hourly demand forecasts with classic statistical models. I spent lockdown building neural networks, and today I forecast with gradient boosting, a tree-based machine learning method, on a customer book heading for 5 billion data points a year. I've made the move from Excel workbooks to enterprise systems myself, and now I steer energy firms through the same move.</p>
          <p>At every step I've asked myself how I could do the work better. That question pushed me deep into data fundamentals, AI and business transformation, and it's why I pair industry knowledge with proper data practice built from the ground up. What I build is meant to turn large, messy data into something a leader can act on.</p>
          <p>I've been in leadership for over a decade, reporting straight to the executive team and to shareholders. I've led teams drawn from different disciplines, in start-ups and in larger organisations where the people on the team didn't report to me, so I've had to lead by persuading. I build AI and machine learning models as prototypes and then run them in production, explain the technical side to people who aren't technical, and show what the work is worth in money.</p>
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
