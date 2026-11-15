import "../pages/About.css";

/** Portrait and introduction that open the About page. */
export default function AboutHero() {
  return (
    <div className="about-hero">
      <div className="about-hero-portrait">
        <img src="/img/portrait-4.jpg" alt="Steven Stills" />
      </div>
      <div className="about-hero-text">
        <p className="kicker">About</p>
        <h1 className="headline">Steven Stills</h1>
        <p className="about-role">Net zero nerd, keeping an active body and a healthy mind</p>
        <p className="lede">I've spent 16 years in the energy industry, in trading, forecasting, billing and metering. On this site I take one energy problem at a time, show how I worked through it and say what I'd do about it.</p>
      </div>
    </div>
  );
}
