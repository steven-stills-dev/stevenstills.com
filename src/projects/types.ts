import type { ComponentType, LazyExoticComponent } from "react";

/** One entry in the project registry. Each project lives in src/projects/<slug>/
 *  with a meta.ts exporting `meta`; the registry discovers them automatically. */
export interface ProjectMeta {
  /** URL path segment, e.g. "hormuz" -> /hormuz */
  slug: string;
  kind: "project" | "writing";
  title: string;
  /** ISO date, e.g. "2026-09-07" */
  date: string;
  /** one sentence for lists and the highlight panel */
  line: string;
  /** external live app, if any */
  live?: string;
  /** the full page */
  page: LazyExoticComponent<ComponentType>;
  /** home feature-panel preview: the page's main map, or its core chart in a `Box` */
  preview?: LazyExoticComponent<ComponentType>;
}
