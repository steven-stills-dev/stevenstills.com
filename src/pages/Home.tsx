import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Archive, ChevronLeft, ChevronRight, Home as HomeIcon, LayoutGrid, Linkedin, Mail, User, X } from "lucide-react";
import { INSIGHTS, type Insight } from "../insights";
import Figure from "../components/Figure";
import Wordmark from "../components/Wordmark";
import { usePageMeta } from "../lib/meta";
import "./dash.css";

const MAIL = "mailto:stevenprusinskistills@proton.me";
const LINKEDIN = "https://www.linkedin.com/in/steven-stills";
const SECTIONS = [
  { id: "top", label: "Home", Icon: HomeIcon },
  { id: "insights", label: "Insights", Icon: LayoutGrid },
  { id: "archive", label: "Archive", Icon: Archive },
  { id: "about", label: "About", Icon: User },
];
const N = INSIGHTS.length;
const longDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** Lean a panel toward the pointer; the stylesheet turns the two numbers into a small 3D tilt. */
const tilt = (e: React.PointerEvent<HTMLElement>) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--tx", String((e.clientX - r.left) / r.width - 0.5));
  e.currentTarget.style.setProperty("--ty", String((e.clientY - r.top) / r.height - 0.5));
};
const level = (e: React.PointerEvent<HTMLElement>) => { e.currentTarget.style.setProperty("--tx", "0"); e.currentTarget.style.setProperty("--ty", "0"); };

/** The whole site on one page: who Steven is, the insights as a grid of panels, the archive and how to reach him. */
export default function Home() {
  usePageMeta("Steven Stills", "I use my unique experience in front and back end development, in an AI-accelerated world, to bring design and engineering expertise together and build simple, digestible insights.");
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { hash } = useLocation();
  const open = INSIGHTS.findIndex((it) => it.slug === params.get("i"));
  const [at, setAt] = useState(0);
  const sheet = useRef<HTMLDialogElement>(null);
  const from = useRef<{ x: number; y: number } | null>(null);
  const hero = useRef<HTMLElement>(null);
  const dim = useRef<SVGSVGElement>(null);
  const it = open >= 0 ? INSIGHTS[open] : null;

  useEffect(() => { document.documentElement.classList.add("dash-on"); return () => document.documentElement.classList.remove("dash-on"); }, []);

  // the rail marks whichever section is crossing the middle of the window
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) setAt(SECTIONS.findIndex((s) => s.id === e.target.id));
    }, { rootMargin: "-45% 0px -50% 0px" });
    SECTIONS.forEach((s) => { const el = document.getElementById(s.id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);

  // one dimension mark spans the headline's longest line, 24px above it; redrawn when the hero changes size
  useEffect(() => {
    const box = hero.current, svg = dim.current, h = box?.querySelector(".d-h");
    if (!box || !svg || !h) return;
    const draw = () => {
      const o = box.getBoundingClientRect(), range = document.createRange();
      range.selectNodeContents(h);
      const lines = [...range.getClientRects()];
      if (!lines.length) return;
      const L = Math.min(...lines.map((r) => r.left)) - o.left, R = Math.max(...lines.map((r) => r.right)) - o.left, y = Math.min(...lines.map((r) => r.top)) - o.top - 24;
      svg.setAttribute("width", String(o.width)); svg.setAttribute("height", String(o.height));
      // extension lines stop 4px short of the text; open arrowheads, no words
      svg.innerHTML = `<path d="M${L},${y + 20} V${y - 8} M${R},${y + 20} V${y - 8} M${L},${y} H${R} M${L + 6},${y - 4} L${L},${y} L${L + 6},${y + 4} M${R - 6},${y - 4} L${R},${y} L${R - 6},${y + 4}" />`;
    };
    const ro = new ResizeObserver(draw);
    ro.observe(box);
    document.fonts.ready.then(draw);
    return () => ro.disconnect();
  }, []);

  /** Open an insight, or close the sheet with null. The hash is kept so the page does not jump. */
  const go = (slug: string | null) => navigate({ search: slug ? `?i=${slug}` : "", hash }, { replace: open >= 0 && slug !== null, preventScrollReset: true });
  const pick = (e: React.MouseEvent<HTMLAnchorElement>, slug: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // let the browser open a new tab
    e.preventDefault();
    // the sheet grows from the panel that was clicked
    const r = e.currentTarget.getBoundingClientRect();
    from.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    go(slug);
  };

  useEffect(() => {
    const d = sheet.current;
    if (!d) return;
    if (open >= 0 && !d.open) {
      d.showModal();
      const r = d.getBoundingClientRect(), p = from.current;
      d.style.transformOrigin = p ? `${p.x - r.left}px ${p.y - r.top}px` : "";
    }
    if (open < 0 && d.open) d.close();
  }, [open]);

  const turn = (d: number) => go(INSIGHTS[(open + d + N) % N].slug);
  const tile = (x: Insight, i: number, feat = false) => (
    <a key={x.slug} className={`panel tile${feat ? " feat" : ""}`} href={`?i=${x.slug}`} onClick={(e) => pick(e, x.slug)} onPointerMove={tilt} onPointerLeave={level} style={{ ["--i" as string]: Math.min(2 + i, 8) }}>
      <span className="fig"><Figure fig={x.figure} bare /></span>
      <span className="tile-t">{x.title}</span>
    </a>
  );

  return (
    <div className="dash">
      <a className="skip" href="#insights">Skip to the insights</a>

      <nav className="rail" aria-label="Sections">
        <ul className="rail-nav" style={{ ["--at" as string]: at }}>
          {SECTIONS.map(({ id, label, Icon }, i) => (
            <li key={id}>
              <a href={`#${id}`} className="rail-a" aria-current={i === at ? "true" : undefined} aria-label={label} title={label}><Icon aria-hidden="true" /></a>
            </li>
          ))}
        </ul>
        <ul className="rail-out">
          <li><a href={MAIL} className="rail-a" aria-label="Email Steven" title="Email"><Mail aria-hidden="true" /></a></li>
          <li><a href={LINKEDIN} target="_blank" rel="noopener" className="rail-a" aria-label="Steven on LinkedIn" title="LinkedIn"><Linkedin aria-hidden="true" /></a></li>
        </ul>
      </nav>

      <main className="grid">
        <section id="top" ref={hero} className="panel hero" style={{ ["--i" as string]: 0 }}>
          <p className="name"><Wordmark /></p>
          <svg ref={dim} className="dim" aria-hidden="true" />
          <h1 className="d-h">Finding the right insights to build confidence in your data</h1>
          <p className="d-lede">I use my unique experience in front and back end development, in an AI-accelerated world, to bring design and engineering expertise together and build simple, digestible insights.</p>
          <div className="actions">
            <a className="d-btn" href={MAIL}>Get in touch</a>
            <a className="d-btn ghost" href={LINKEDIN} target="_blank" rel="noopener">LinkedIn</a>
          </div>
        </section>
        <div className="panel portrait" style={{ ["--i" as string]: 1 }}>
          <img src="/img/me_lisbon.jpeg" alt="Steven Stills" width="935" height="1169" />
        </div>

        <section id="insights" className="insights" aria-labelledby="insights-h">
          <h2 id="insights-h" className="sr-only">Insights</h2>
          {INSIGHTS.map((x, i) => tile(x, i, i === 0))}
        </section>

        <section id="archive" className="panel archive" aria-labelledby="archive-h">
          <h2 id="archive-h" className="panel-h">Archive</h2>
          <ul>
            {[...INSIGHTS].sort((a, b) => b.date.localeCompare(a.date)).map((x) => (
              <li key={x.slug}>
                <a href={`?i=${x.slug}`} onClick={(e) => pick(e, x.slug)}>
                  <time dateTime={x.date}>{shortDate.format(new Date(x.date))}</time>
                  <span>{x.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section id="about" className="panel about" aria-labelledby="about-h">
          <h2 id="about-h" className="panel-h">About</h2>
          <p className="d-lede">I give you clean insights into your data, helping you understand your domain, de-risk your margin and open up new revenue options.</p>
          <p>I learned the dark art of front-end design first, in 2012. Then I had to pick up engineering and data literacy after that to hit my own goals, so I've always been highly self-driven and laser-focused on the end result.</p>
          <p>Whether you're a senior leader in an organisation who's lost track of your data stack, or a fresh start-up looking to set up your data pipeline on best principles, I've done this for companies of all sizes over the last 15 years, in full-time and contract employment. Send me a message if you'd like to talk about how I can help, or about your specific business bottlenecks.</p>
          <div className="actions">
            <a className="d-btn" href={MAIL}>Get in touch</a>
            <a className="d-btn ghost" href={LINKEDIN} target="_blank" rel="noopener">LinkedIn</a>
          </div>
        </section>

        <footer className="tb">
          <span>© 2026 Steven Stills</span>
          <a href={MAIL}>Get in touch</a>
          <a href={LINKEDIN} target="_blank" rel="noopener">LinkedIn</a>
        </footer>
      </main>

      <dialog ref={sheet} className="sheet" aria-labelledby="sheet-h" onClose={() => { if (open >= 0) go(null); }}
        onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.close(); }}
        onKeyDown={(e) => { if (e.key === "ArrowRight") turn(1); else if (e.key === "ArrowLeft") turn(-1); }}>
        {it && (
          <article className="sheet-in" key={it.slug}>
            <header className="sheet-top">
              <h2 id="sheet-h" className="sheet-h" tabIndex={-1} autoFocus>{it.title}</h2>
              <button type="button" className="d-icon" aria-label="Close" onClick={() => sheet.current?.close()}><X aria-hidden="true" /></button>
            </header>
            <div className="fig" role="img" aria-label={it.alt}><Figure fig={it.figure} /></div>
            <p className="sheet-line">{it.line}</p>
            <footer className="sheet-foot">
              <p className="sheet-src"><time dateTime={it.date}>{longDate.format(new Date(it.date))}</time> · <a href={it.source.url} target="_blank" rel="noopener">{it.source.label}</a></p>
              <div className="sheet-turn">
                <button type="button" className="d-icon" aria-label="Previous insight" onClick={() => turn(-1)}><ChevronLeft aria-hidden="true" /></button>
                <button type="button" className="d-icon" aria-label="Next insight" onClick={() => turn(1)}><ChevronRight aria-hidden="true" /></button>
              </div>
            </footer>
          </article>
        )}
      </dialog>
    </div>
  );
}
