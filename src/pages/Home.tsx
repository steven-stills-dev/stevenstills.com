import { Suspense, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import Layout from "../components/Layout";
import { PROJECTS, fmtDate } from "../projects/registry";
import type { ProjectMeta } from "../projects/types";
import { usePageMeta } from "../lib/meta";

/** Index rows: title, kind and date, with the summary line on the selected row. A click shows the entry on the stage; a double click opens it. */
function Rows({ items, active, onPick }: { items: ProjectMeta[]; active: string; onPick: (slug: string) => void }) {
  const navigate = useNavigate();
  return (
    <ul className="rows">
      {items.map((p) => (
        <li key={p.slug}>
          <button type="button" className={"row" + (p.slug === active ? " on" : "")} aria-pressed={p.slug === active} onClick={() => onPick(p.slug)} onDoubleClick={() => navigate(`/${p.slug}`)}>
            <span className="row-t">{p.title}</span>
            <span className="row-k">{p.kind === "project" ? "Project" : "Writing"}</span>
            <span className="row-d">{fmtDate(p.date)}</span>
            {p.slug === active && <span className="row-l">{p.line}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  usePageMeta("Steven Stills", "Projects and writing on energy markets and forecasting. Each piece takes one problem, shows the working and ends with what I'd do about it.");
  const navigate = useNavigate();
  const pinned = PROJECTS.filter((p) => p.pinned);
  const rest = PROJECTS.filter((p) => !p.pinned);
  const [active, setActive] = useState((pinned[0] ?? PROJECTS[0])?.slug ?? "");
  // in the single-column layout the stage sits above the index, out of view, so a tap opens the entry
  const pick = (slug: string) => (window.matchMedia("(max-width: 900px)").matches ? navigate(`/${slug}`) : setActive(slug));

  const feat = PROJECTS.find((p) => p.slug === active);
  const Preview = feat?.preview;

  return (
    <Layout>
      <div className="home">
        <section className="hero">
          <h1 className="hero-h">Working through problems in energy markets</h1>
          <p className="hero-lede">I've spent 16 years in the energy industry, in trading, forecasting, billing and metering. On this site I take one energy problem at a time, show how I worked through it and say what I'd do about it.</p>
          <Link className="btn btn-face" to="/about"><img src="/img/me_lisbon_face.jpeg" alt="" />More about me</Link>
        </section>

        {feat && (
          <section className="stage">
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

        <div className="lists">
          {pinned.length > 0 && (
            <>
              <h2 className="lists-h">Highlights</h2>
              <Rows items={pinned} active={active} onPick={pick} />
            </>
          )}
          <h2 className="lists-h">Projects and writing</h2>
          <Rows items={rest} active={active} onPick={pick} />
        </div>
      </div>
    </Layout>
  );
}
