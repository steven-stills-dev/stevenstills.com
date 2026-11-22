import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { usePageMeta } from "../lib/meta";

export default function Home() {
  usePageMeta("Steven Stills", "I use my unique experience in front and back end development, in an AI-accelerated world, to bring design and engineering expertise together and build simple, digestible insights.");

  return (
    <Layout>
      <section className="split">
        <div className="split-text">
          <h1 className="headline">Finding the right insights to build confidence in your data</h1>
          <p className="lede">I use my unique experience in front and back end development, in an AI-accelerated world, to bring design and engineering expertise together and build simple, digestible insights.</p>
        </div>
        <Link className="portrait portrait-wide" to="/about">
          <img src="/img/me_lisbon.jpeg" alt="Steven Stills" />
          <span className="btn btn-s">More about me</span>
        </Link>
      </section>
    </Layout>
  );
}
