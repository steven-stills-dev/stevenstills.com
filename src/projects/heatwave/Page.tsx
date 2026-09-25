import { Article, Prose, Section, Wide } from "../../components/Article";
import Box from "../../components/Box";
import { usePageMeta } from "../../lib/meta";
import "./heatwave.css";

export default function Heatwave() {
  const lede = "The UK had four heatwaves before August 2026, and through them the imbalance price moved first and moved more than demand. I look at what my live tracker found, how I built it, and why I switched it off in August.";
  usePageMeta("Heatwave Tracker & Impact (retired)", lede);

  return (
    <Article
      kicker="Project · energy markets & climate"
      title="Heatwave Tracker & Impact"
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
          <p>Thank you to everyone who used the heatwave detector through July. It was a difficult year, statistically and emotionally. I've ordered a heat pump to get my family ready for what's coming, and I'm now researching what the industry can do about it, as I'm sure plenty of good people are ahead of me.</p>
        </Box>
      </Prose>

      <Section title="Heat moves price before it moves demand" />
      <Prose>
        <p>From late June to the end of July 2026 I tracked UK heat against demand and against the imbalance price, through the four heatwaves of that summer. Demand moved late, and not by much. Price moved first and moved more, because summer margins are thin and plant is on outage. That is the risk I'd want a retail supplier to see.</p>
      </Prose>

      <Wide>
        <div className="photo photo-wide hw-retired">
          <img src="/img/heatwave_1.jpg" alt="850hPa temperature across the UK and western Europe on the tracker's final run" />
        </div>
      </Wide>

      <Section title="What I built" />
      <Prose>
        <p>A web app that put the temperature forecast on a map and ran through the summer. Around the map I showed heatwave and red-alert probabilities over 7 and 14 days, a rolling imbalance price profile against the mean, and the day's heat coverage, and I could scrub the whole screen forward through the forecast.</p>
      </Prose>

      <Wide>
        <div className="photo photo-wide hw-retired">
          <img src="/img/heatwave_2.jpg" alt="Heatwave Reporter interface: heat and alert probabilities, latest news, imbalance price profile, and a scrubable forecast map" />
        </div>
      </Wide>

      <Prose>
        <p>Under the hood it was FastAPI behind Caddy, in Docker on a GCP VM built with Terraform, with SQLite for the store and vanilla JS on the front end. Temperature and the 1991–2020 climatology came from Open-Meteo, the imbalance prices from Elexon's BMRS system-prices endpoint.</p>
      </Prose>

      <Section title="Why I retired it" />
      <Prose>
        <p>I built it to watch one summer, and that summer is over. What interests me now is what comes after the heat: dry ground sheds rain instead of absorbing it, and the flooding starts.</p>
      </Prose>
    </Article>
  );
}
