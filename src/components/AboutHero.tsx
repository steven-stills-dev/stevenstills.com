import "../pages/About.css";

/** Portrait and introduction that open the About page. */
export default function AboutHero() {
  return (
    <div className="about-hero">
      <div className="about-hero-portrait">
        <img src="/img/me_lisbon.jpeg" alt="Steven Stills" />
      </div>
      <div className="about-hero-text">
        <p className="kicker">About</p>
        <h1 className="headline">Steven Stills</h1>
        <p className="about-role">Net zero nerd, keeping an active body and a healthy mind</p>
        <p className="lede">I've worked in energy retail for 16 years, end to end: from buying the power and forecasting demand to registering the meter, sending the bill and answering the complaint. On this site I take one energy problem at a time, show how I worked through it and say what I'd do about it.</p>
      </div>
    </div>
  );
}
