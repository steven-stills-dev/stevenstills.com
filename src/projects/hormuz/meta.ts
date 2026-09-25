import { lazy } from "react";
import type { ProjectMeta } from "../types";

export const meta: ProjectMeta = {
  slug: "hormuz",
  kind: "project",
  title: "Hormuz Tracker",
  date: "2026-06-08",
  line: "Daily tanker transits through the Strait of Hormuz fell from between forty and seventy to single figures in March 2026, and front-month UK gas peaked near 151p a therm before falling back toward 96p by late May.",
  live: "https://hormuz.stevenstills.com",
  page: lazy(() => import("./Page")),
  preview: lazy(() => import("./Preview")),
};
