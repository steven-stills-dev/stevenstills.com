import { NavLink } from "react-router-dom";

const LINKS: [string, string][] = [
  ["/", "Home"],
  ["/about", "About"],
];

/** Masthead: wordmark, primary links and the contact button. */
export default function Nav() {
  return (
    <header className="mast-row">
      <NavLink to="/" className="mast-name">Steven Stills</NavLink>
      <nav className="mast-nav" aria-label="Primary">
        {LINKS.map(([to, label]) => (
          <NavLink key={to} to={to} end={to === "/"}>{label}</NavLink>
        ))}
      </nav>
      <a className="btn btn-s ghost mast-cta" href="mailto:stevenstills@icloud.com">Get in touch</a>
    </header>
  );
}
