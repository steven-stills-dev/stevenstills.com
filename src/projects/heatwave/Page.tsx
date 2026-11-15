import { Article, Prose, Section, Wide, Fn, Footnotes } from "../../components/Article";
import Box from "../../components/Box";
import { usePageMeta } from "../../lib/meta";
import "./heatwave.css";

export default function Heatwave() {
  const lede = "The UK had four heatwaves before August 2026. On their 28 days the imbalance price averaged £109.76/MWh, against a baseline of £100.93/MWh from the days without a heatwave, and national demand averaged 22,629 MW, against a baseline of 21,817 MW. I describe the live tracker I built to follow the heat and the imbalance price, and what I found in the demand and price data afterwards.";
  usePageMeta("Tracking UK heatwaves against demand and imbalance prices", lede);

  return (
    <Article
      kicker="Project · energy markets & climate · updated 12 Nov 2026"
      title="Tracking UK heatwaves against demand and imbalance prices"
      lede={lede}
    >
      <Prose>
        <Box>
          <div className="hw-status">
            <span className="chip">Retired</span>
            <span className="hw-status-text">I took the live tracker offline in August 2026.</span>
          </div>
        </Box>
      </Prose>

      <Prose>
        <Box title="Edit">
          <p>Thank you to everyone who used the tracker through July. I'm now researching what the industry can do about the heat, as I'm sure plenty of good people are ahead of me.</p>
        </Box>
      </Prose>

      <Section title="Why a heatwave is a risk for a retail supplier" />
      <Prose>
        <p>A retail supplier buys electricity ahead of time against a forecast of what its customers will use. Any difference is settled half-hour by half-hour (each half-hour is a settlement period) at the imbalance price, quoted in £/MWh. A hot spell can reach a supplier through the volume of demand, in MWh, and through the price paid on each MWh of imbalance.</p>
        <p>The UK had four heatwaves before August 2026: one in May, one in June and two in July.<Fn n={1} /> My tracker ran from late June to the end of July, so it was live for the last three. It had no demand feed, so for this page I pulled demand and price data for all four.</p>
      </Prose>

      <Section title="How the tracker worked" />
      <Prose>
        <p>I built a web app that put the temperature forecast on a map, drawn at the 850hPa pressure level.</p>
      </Prose>

      <Wide>
        <div className="photo photo-wide hw-retired">
          <img src="/img/heatwave_1.jpg" alt="850hPa temperature across the UK and western Europe, as drawn by the tracker" />
        </div>
      </Wide>

      <Prose>
        <p>Around the map I showed heatwave and red-alert probabilities over 7 and 14 days, a rolling imbalance price profile against the mean, and the day's heat coverage, all of which could be scrubbed forward through the forecast.</p>
      </Prose>

      <Wide>
        <div className="photo photo-wide hw-retired">
          <img src="/img/heatwave_2.jpg" alt="The tracker's interface, titled Heatwave Reporter: heat and alert probabilities, latest news, imbalance price profile, and a scrubable forecast map" />
        </div>
      </Wide>

      <Prose>
        <p>The app was FastAPI behind Caddy, in Docker on a GCP VM built with Terraform, with SQLite and vanilla JS. Temperature and the 1991–2020 climatology came from Open-Meteo, and the imbalance prices from Elexon's BMRS system-prices endpoint.</p>
      </Prose>

      <Section title="What I found in demand and in the imbalance price" />
      <Prose>
        <p>I pulled two public Elexon series for 1 May to 31 July 2026: national demand, and the system price, which is the imbalance price for each settlement period.<Fn n={2} /><Fn n={3} /> I dated the four heatwaves from daily maximum temperatures in ten cities, which gives 23 to 28 May, 21 to 27 June, 6 to 17 July and 28 to 30 July, 28 days in all.<Fn n={1} k="b" /> The baseline is a straight line fitted through the other 64 days, with one level for weekdays and another for weekends and bank holidays, because demand on those days fell by about 30 MW a day between May and July.<Fn n={4} /></p>
        <p>National demand averaged 22,629 MW across the 28 heatwave days, against a baseline of 21,817 MW, which is 3.7% higher. The heatwaves did not agree: demand was 4.5% below baseline in May, and 8.5%, 3.6% and 9.6% above in June and the two July heatwaves. National demand leaves out demand met by embedded generation (solar panels and small wind farms on local networks), and NESO's estimate of embedded solar output averaged 4,862 MW on heatwave days against a baseline of 3,897 MW.<Fn n={5} /> With embedded solar and wind added back, demand averaged 28,639 MW against a baseline of 27,297 MW, which is 4.9% higher, and it was above baseline in all four heatwaves.</p>
        <p>The imbalance price averaged £109.76/MWh on heatwave days against a baseline of £100.93/MWh, which is 8.8% higher. One evening carries much of that: on 23 June the price was above £450/MWh in every half-hour from 18:00 to 22:00 and reached £800/MWh in the half-hour from 20:30. Without 23 June, the other 27 heatwave days averaged £106.27/MWh against a baseline of £100.69/MWh, which is 5.5% higher. The daily mean price on baseline weekdays had a standard deviation of £20.53/MWh, so a gap of about £9/MWh sits inside the ordinary spread from one day to the next.</p>
        <p>I think the spike on 23 June comes from the state of the system in summer, when margins (the spare generating capacity above demand) are thin and plant is on outage. I have not tested that against margin or outage data here.</p>
      </Prose>

      <Section title="What I would watch when a heatwave is forecast" />
      <Prose>
        <p>I would watch the imbalance price in each half-hour, since daily means smooth over evenings like 23 June. A supplier that had bought less electricity than its customers used between 18:00 and 22:00 that evening settled the shortfall at £454.50 to £800/MWh, on a day when the mean price was £204.23/MWh.</p>
        <p>For demand I would use the figure with embedded solar and wind added back, which was above baseline in all four heatwaves, by between 0.8% and 8.7%. I would also check how thin margins are and how much plant is on outage before the heat arrives.</p>
        <p>Four heatwaves is a small sample, so I would repeat these measurements in the next hot summer before relying on them.</p>
      </Prose>

      <Footnotes notes={[
        <>Heatwave count and dates. The Met Office called the hot spell that began on 6 July 2026 "the third heatwave of the year", after one in May and one in June (<a href="https://www.metoffice.gov.uk/about-us/news-and-media/media-centre/weather-and-climate-news/2026/third-heatwave-of-year-to-bring-prolonged-spell-of-hot-and-dry-weather" target="_blank" rel="noopener">Met Office, 6 July 2026</a>), and a fourth was forecast and reported for the last week of July (<a href="https://www.metoffice.gov.uk/about-us/news-and-media/media-centre/weather-and-climate-news/2026/a-mixed-week-ahead-with-rain-for-some-a-potential-heatwave-and-average-temperatures-towards-the-weekend" target="_blank" rel="noopener">Met Office, 27 July 2026</a>; <a href="https://www.irishnews.com/news/uk/uk-set-for-fourth-heatwave-as-wildfires-hit-parts-of-country-KZVML62LIVKFZPDC5OBVHUUFXA/" target="_blank" rel="noopener">The Irish News, 25 July 2026</a>). The Met Office gives 21 to 29 May and 18 to 28 June for the first two heatwaves (<a href="https://www.metoffice.gov.uk/about-us/news-and-media/media-centre/weather-and-climate-news/2026/more-than-2700-excess-deaths-estimated-in-england-and-wales-during-may-and-june-heatwaves" target="_blank" rel="noopener">Met Office, 13 July 2026</a>) and I found no published dates for the two July heatwaves, so I dated all four by one rule, based on the <a href="https://weather.metoffice.gov.uk/learn-about/weather/types-of-weather/temperature/heatwave" target="_blank" rel="noopener">Met Office heatwave definition</a>: the days on which one or more of ten cities (London, Cambridge, Birmingham, Bristol, Manchester, Cardiff, Southampton, Norwich, Leeds and Nottingham) was in a run of three or more days with a daily maximum of 28°C or above, the top of the Met Office's range of <a href="https://rmets.org/metmatters/shifting-baseline-uk-heatwaves" target="_blank" rel="noopener">county thresholds</a>. Temperatures are from the <a href="https://open-meteo.com/en/docs/historical-weather-api" target="_blank" rel="noopener">Open-Meteo</a> archive API, daily maximum 2 m temperature, 1 May to 31 July 2026, retrieved 12 November 2026.</>,
        <>National demand is Elexon's Initial National Demand Outturn (INDO), a half-hourly average in MW, from the Elexon Insights Solution <a href="https://data.elexon.co.uk/bmrs/api/v1/demand/outturn?settlementDateFrom=2026-05-01&settlementDateTo=2026-05-28" target="_blank" rel="noopener">demand outturn endpoint</a>, for settlement dates 1 May to 31 July 2026, retrieved 12 November 2026. All 48 settlement periods are present on each of the 92 days. Daily energy is the sum of the 48 half-hourly values.</>,
        <>The imbalance price is Elexon's system price (dataset DISEBSP), one price per half-hour settlement period, from the Elexon Insights Solution <a href="https://data.elexon.co.uk/bmrs/api/v1/balancing/settlement/system-prices/2026-06-23" target="_blank" rel="noopener">system prices endpoint</a>, for settlement dates 1 May to 31 July 2026, retrieved 12 November 2026. All 48 settlement periods are present on each day, and the system buy price equals the system sell price in every period.</>,
        <>Baseline method. For each quantity I fitted one straight line through its values on the 64 days from 1 May to 31 July 2026 that fall outside the four heatwaves, with one level for weekdays (43 days) and another for weekends with the bank holidays of 4 and 25 May (21 days). Each heatwave day is compared with the line's value for its own date and day type. The fitted slope is −29.6 MW a day for national demand, −15.7 MW a day for demand with embedded generation added back, and less than 1p/MWh a day for the imbalance price. Against one average for the whole three months, with no slope, national demand on the heatwave days was 1.1% above baseline in place of 3.7%, and the imbalance price was 8.8% above on either basis. The <a href="/data/heatwave/demand_price_daily.csv" target="_blank" rel="noopener">daily table</a> holds every day's figures.</>,
        <>Embedded generation is from NESO's <a href="https://www.neso.energy/data-portal/historic-demand-data" target="_blank" rel="noopener">Historic Demand Data</a> 2026 file, fields EMBEDDED_SOLAR_GENERATION and EMBEDDED_WIND_GENERATION, which are NESO's half-hourly estimates in MW, for 1 May to 31 July 2026, retrieved 12 November 2026. The solar figures are means across all 48 half-hours of the day.</>,
      ]} />
    </Article>
  );
}
