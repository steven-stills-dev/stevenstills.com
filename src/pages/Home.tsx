import { Suspense, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import Layout from "../components/Layout";
import { PROJECTS, fmtDate } from "../projects/registry";
import type { ProjectMeta } from "../projects/types";
import { usePageMeta } from "../lib/meta";

const CARDS = 4;
const kind = (p: ProjectMeta) => (p.kind === "project" ? "Project" : "Writing");

export default function Home() {
  usePageMeta("Steven Stills", "Projects and writing on energy markets and forecasting. Each piece takes one problem, shows the working and ends with what I'd do about it.");
  const navigate = useNavigate();
  // the cards under the stage: pinned entries first, then the newest, each one a switch for the stage
  const cards = [...PROJECTS.filter((p) => p.pinned), ...PROJECTS.filter((p) => !p.pinned)].slice(0, CARDS);
  const [active, setActive] = useState(cards[0]?.slug ?? "");
  const stage = useRef<HTMLElement>(null);
  // in the single-column layout the stage sits well above the cards, so a tap opens the entry
  const pick = (slug: string) => {
    if (window.matchMedia("(max-width: 900px)").matches) return navigate(`/${slug}`);
    setActive(slug);
    stage.current?.scrollIntoView({ block: "nearest", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  const feat = PROJECTS.find((p) => p.slug === active);
  const Preview = feat?.preview;

  return (
    <Layout>
      <div className="home">
        <section className="hero">
          <Link className="hero-portrait" to="/about">
            <img src="/img/me_lisbon.jpeg" alt="Steven Stills" />
            <span className="btn btn-s">More about me</span>
          </Link>
          <h1 className="hero-h">Working through problems in energy markets</h1>
          <p className="hero-lede">I've worked in energy retail for 16 years, end to end: from buying the power and forecasting demand to registering the meter, sending the bill and answering the complaint. On this site I take one energy problem at a time, show how I worked through it and say what I'd do about it.</p>
        </section>

        {feat && (
          <section className="stage" ref={stage}>
            <div className="stage-in">
              <div className="stage-view">
                {Preview && (
                  <div className="stage-slide" key={feat.slug}>
                    <Suspense fallback={<div className="mapwrap"><div className="loading">Loading…</div></div>}>
                      <Preview />
                    </Suspense>
                  </div>
                )}
                <Link className="stage-link" to={`/${feat.slug}`} aria-label={`Open ${feat.title}`} />
              </div>
              <div className="stage-cap" key={feat.slug}>
                <h2 className="stage-title">{feat.title}</h2>
                <p className="stage-line">{feat.line}</p>
                <div className="links-row">
                  <Link to={`/${feat.slug}`}>Read the write-up</Link>
                  {feat.live && <a href={feat.live} target="_blank" rel="noopener" className="ghost">Open live<ArrowUpRight strokeWidth={1.5} /></a>}
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="cards" aria-label="Highlights and latest">
          <h2 className="lists-h">Highlights and latest</h2>
          <ul className="card-row">
            {cards.map((p) => (
              <li key={p.slug}>
                <button type="button" className={"card" + (p.slug === active ? " on" : "")} aria-pressed={p.slug === active} onClick={() => pick(p.slug)} onDoubleClick={() => navigate(`/${p.slug}`)}>
                  <span className="card-m">{kind(p)} · {fmtDate(p.date)}</span>
                  <span className="card-t">{p.title}</span>
                  <span className="card-l">{p.line}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="index" aria-label="All projects and writing">
          <h2 className="lists-h">All projects and writing</h2>
          <ul className="irows">
            {PROJECTS.map((p) => (
              <li key={p.slug}>
                <Link className="irow" to={`/${p.slug}`}>
                  <span className="irow-d">{fmtDate(p.date)}</span>
                  <span className="irow-t">{p.title}</span>
                  <span className="irow-l">{p.line}</span>
                  <span className="irow-k">{kind(p)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Layout>
  );
}
