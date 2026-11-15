import { Suspense, useEffect } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import About from "./pages/About";
import DesignTray from "./components/DesignTray";
import { PROJECTS } from "./projects/registry";

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) { document.getElementById(hash.slice(1))?.scrollIntoView(); return; }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

const Fallback = () => <div className="wrap"><div className="loading">Loading…</div></div>;

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          {PROJECTS.map((p) => <Route key={p.slug} path={`/${p.slug}`} element={<p.page />} />)}
          <Route path="/gen-ai-grid" element={<Navigate to="/data-centre-demand" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <DesignTray />
    </>
  );
}
