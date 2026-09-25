import type { ReactNode } from "react";
import Layout from "./Layout";

/** Long-form page shell. Prose sits on a reading measure; anything wrapped in
 *  <Wide> breaks out to the figure width. */
export function Article({ kicker, title, lede, children }: { kicker: string; title: string; lede?: string; children: ReactNode }) {
  return (
    <Layout>
      <article className="article">
        <header className="article-head">
          <p className="kicker">{kicker}</p>
          <h1 className="headline">{title}</h1>
          {lede && <p className="lede">{lede}</p>}
        </header>
        {children}
      </article>
    </Layout>
  );
}

/** Reading-measure block of prose. */
export function Prose({ children }: { children: ReactNode }) {
  return <div className="prose">{children}</div>;
}

/** Breakout block for figures, maps and stat rows. */
export function Wide({ children }: { children: ReactNode }) {
  return <div className="wide">{children}</div>;
}

/** Section heading on the reading measure. */
export function Section({ title }: { title: string }) {
  return <div className="prose"><h2>{title}</h2></div>;
}

/** Footnote reference in running text. `k` suffixes the id when the same
 *  note is cited more than once, so ids stay unique. */
export function Fn({ n, k = "" }: { n: number; k?: string }) {
  return <sup className="fn"><a href={`#fn-${n}`} id={`ref-${n}${k}`}>{n}</a></sup>;
}

/** Numbered notes and sources list. Each note carries its own back-link. */
export function Footnotes({ notes }: { notes: ReactNode[] }) {
  return (
    <section className="prose footnotes" aria-label="Notes and sources">
      <h3>Notes &amp; sources</h3>
      <ol>
        {notes.map((note, i) => (
          <li key={i} id={`fn-${i + 1}`}>{note} <a href={`#ref-${i + 1}`} aria-label="Back to text">↩</a></li>
        ))}
      </ol>
    </section>
  );
}

/** Big-number stat callouts in a row. */
export function StatRow({ stats }: { stats: { num: string; label: string }[] }) {
  return (
    <div className="stat-row">
      {stats.map((s) => (
        <div className="stat" key={s.label}>
          <p className="stat-num">{s.num}</p>
          <p className="stat-label">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
