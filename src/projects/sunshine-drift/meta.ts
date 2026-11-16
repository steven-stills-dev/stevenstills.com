import { lazy } from "react";
import type { ProjectMeta } from "../types";

export const meta: ProjectMeta = {
  slug: "sunshine-drift",
  kind: "writing",
  title: "Demand forecast errors on sunny days",
  date: "2026-10-29",
  line: "I tested Britain's public day-ahead demand forecast against sunshine to separate fixable bias from weather-forecast surprise, and to correct it without overfitting.",
  page: lazy(() => import("./Page")),
  preview: lazy(() => import("./Preview")),
};
