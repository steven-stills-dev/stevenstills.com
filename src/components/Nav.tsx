import { NavLink } from "react-router-dom";

const LINKS: [string, string][] = [
  ["/", "Home"],
  ["/about", "About"],
];

/** Brand cell: initials badge, name and the pill nav. */
export default function Nav() {
  return (
    <>
      <div className="brand">
        <NavLink to="/" className="brand-link">
          <span className="brand-mark" aria-hidden="true">SS</span>
          <span>Steven Stills</span>
        </NavLink>
      </div>
      <nav className="nav" aria-label="Primary">
        {LINKS.map(([to, label]) => (
          <NavLink key={to} to={to} end={to === "/"}>{label}</NavLink>
        ))}
      </nav>
    </>
  );
}
