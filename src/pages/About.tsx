import Layout from "../components/Layout";
import { usePageMeta } from "../lib/meta";

export default function About() {
  usePageMeta("About", "I give you clean insights into your data, helping you understand your domain, de-risk your margin and open up new revenue options.");

  return (
    <Layout>
      <section className="split">
        <div className="portrait portrait-tall">
          <img src="/img/me_lisbon.jpeg" alt="Steven Stills" />
        </div>
        <div className="split-text">
          <h1 className="headline">Steven Stills</h1>
          <p className="lede">I give you clean insights into your data, helping you understand your domain, de-risk your margin and open up new revenue options.</p>
          <div className="prose">
            <p>I learned the dark art of front-end design first, in 2012. Then I had to pick up engineering and data literacy after that to hit my own goals, so I've always been highly self-driven and laser-focused on the end result.</p>
            <p>Whether you're a senior leader in an organisation who's lost track of your data stack, or a fresh start-up looking to set up your data pipeline on best principles, I've done this for companies of all sizes over the last 15 years, in full-time and contract employment. Send me a message if you'd like to talk about how I can help, or about your specific business bottlenecks.</p>
          </div>
          <nav className="links-row" aria-label="Contact">
            <a href="mailto:stevenprusinskistills@proton.me">stevenprusinskistills@proton.me</a>
            <a className="ghost" href="https://www.linkedin.com/in/steven-stills" target="_blank" rel="noopener">LinkedIn</a>
          </nav>
        </div>
      </section>
    </Layout>
  );
}
