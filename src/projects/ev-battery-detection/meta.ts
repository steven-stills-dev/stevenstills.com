import { lazy } from "react";
import type { ProjectMeta } from "../types";

export const meta: ProjectMeta = {
  slug: "ev-battery-detection",
  kind: "writing",
  title: "Detecting electric cars and home batteries in half-hourly meter data",
  date: "2026-07-09",
  line: "I built simple, explainable rules to spot electric cars and home batteries in a month of half-hourly import readings, tested them on synthetic households, and checked whether clustering finds the same groups.",
  page: lazy(() => import("./Page")),
  preview: lazy(() => import("./Preview")),
};
