import { Suspense, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import Thumb from "../components/Thumb";
import { PROJECTS, fmtDate } from "../projects/registry";
import type { ProjectMeta } from "../projects/types";
import { usePageMeta } from "../lib/meta";

/** Compact list: small tone tile on the left, title and date on the right.
 *  A click previews the entry in the feature panel; a double click opens it. */
function Cards({ items, active, onPick }: { items: ProjectMeta[]; active: string; onPick: (slug: string) => void }) {
  const navigate = useNavigate();
  return (
    <ul className="cards">
      {items.map((p, i) => (
        <li key={p.slug}>
          <button type="button" className={"card" + (p.slug === active ? " on" : "")} aria-pressed={p.slug === active} onClick={() => onPick(p.slug)} onDoubleClick={() => navigate(`/${p.slug}`)}>
            <Thumb tone={i} />
            <span className="card-text">
              <span className="card-title">{p.title}</span>
              <span className="card-meta">{fmtDate(p.date)}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  usePageMeta("Steven Stills", "Data projects in energy markets, each led by the insight rather than the tech.");
  const projects = PROJECTS.filter((p) => p.kind === "project");
  const writing = PROJECTS.filter((p) => p.kind === "writing");
  const [active, setActive] = useState(projects[0]?.slug ?? "");

  const feat = PROJECTS.find((p) => p.slug === active);
  const Preview = feat?.preview;

  return (
    <Layout>
      <div className="home">
        <section className="home-intro">
          <img src="/img/portrait-4.jpg" alt="Steven Stills" />
          <div>
            <h1 className="home-role">Let's clear up a few things</h1>
            <p className="home-lede">I've spent 16 years solving problems in the energy industry, from trading and forecasting to billing and metering. Here I look at how the energy transition is changing it for the better.</p>
          </div>
          <div className="links-row"><Link to="/about">Beyond the day job</Link></div>
        </section>

        <div className="home-grid">
          {feat && (
            <section className="home-feature">
              <div className="carousel">
                {Preview && (
                  <div className="carousel-slide" key={feat.slug}>
                    <Suspense fallback={<div className="mapwrap"><div className="loading">Loading…</div></div>}>
                      <Preview />
                    </Suspense>
                  </div>
                )}
                <Link className="carousel-link" to={`/${feat.slug}`} aria-label={`Open ${feat.title}`} />
              </div>
              <div className="highlight" key={feat.slug}>
                <h2 className="highlight-title">{feat.title}</h2>
                <p className="highlight-line">{feat.line}</p>
                <div className="links-row">
                  <Link to={`/${feat.slug}`}>Read the write-up</Link>
                  {feat.live && <a href={feat.live} target="_blank" rel="noopener" className="ghost">Open live ↗</a>}
                </div>
              </div>
            </section>
          )}

          <div className="home-lists">
            <h2 className="home-h">Projects</h2>
            <Cards items={projects} active={active} onPick={setActive} />

            <h2 className="home-h">Writing</h2>
            <Cards items={writing} active={active} onPick={setActive} />
          </div>
        </div>
      </div>
    </Layout>
  );
}
