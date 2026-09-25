import Box from "./Box";
import "../pages/About.css";

/** Portrait-and-intro panel shared by the About page and the home page. */
export default function AboutHero() {
  return (
    <Box className="about-hero-box">
      <div className="about-hero">
        <div className="about-hero-portrait">
          <img src="/img/portrait-4.jpg" alt="Steven Stills" />
        </div>
        <div className="about-hero-text">
          <p className="kicker">About</p>
          <h1 className="headline">Steven Stills</h1>
          <p className="about-role">Net zero nerd practising active body &amp; healthy mind</p>
          <p className="lede">I've spent 16 years solving problems in the energy industry, from trading and forecasting to billing and metering. Here I look at how the energy transition is changing it for the better.</p>
        </div>
      </div>
    </Box>
  );
}
