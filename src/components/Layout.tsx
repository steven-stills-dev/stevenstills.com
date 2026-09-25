import type { ReactNode } from "react";
import Nav from "./Nav";

/** Standard scrolling page wrapper: brand cell, content, footer. */
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="wrap">
      <div className="brandcell"><Nav /></div>
      {children}
      <footer className="site-foot">
        <span>© 2026 Steven Stills</span>
        <nav className="contact-links" aria-label="Contact">
          <a href="mailto:stevenstills@icloud.com">stevenstills@icloud.com</a>
          <a href="https://www.linkedin.com/in/steven-stills" target="_blank" rel="noopener">LinkedIn</a>
        </nav>
      </footer>
    </div>
  );
}
