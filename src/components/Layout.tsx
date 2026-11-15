import type { ReactNode } from "react";
import Nav from "./Nav";

/** Standard scrolling page: masthead, content, full-width contact footer. */
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="wrap">
        <Nav />
        <main>{children}</main>
      </div>
      <footer className="foot">
        <div className="wrap foot-in">
          <a className="foot-mail" href="mailto:stevenprusinskistills@proton.me">stevenprusinskistills@proton.me</a>
          <div className="foot-meta">
            <a href="https://www.linkedin.com/in/steven-stills" target="_blank" rel="noopener">LinkedIn</a>
            <span>© 2026 Steven Stills</span>
          </div>
        </div>
      </footer>
    </>
  );
}
