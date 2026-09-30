import { lazy } from "react";
import type { ProjectMeta } from "../types";

export const meta: ProjectMeta = {
  slug: "electricity-suppliers",
  kind: "writing",
  title: "What is happening to electricity suppliers",
  date: "2026-09-29",
  line: "The cheapest electricity moved to lunchtime while ten suppliers' customers moved into the night, and half-hourly settlement is starting to price the difference.",
  page: lazy(() => import("./Page")),
  preview: lazy(() => import("./Preview")),
};
