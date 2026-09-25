import { lazy } from "react";
import type { ProjectMeta } from "../types";

export const meta: ProjectMeta = {
  slug: "hormuz",
  kind: "project",
  title: "Hormuz Tracker",
  date: "2026-06-08",
  line: "Daily tanker transits through the Strait of Hormuz fell from between forty and seventy to single figures in March 2026, and front-month UK gas peaked near 151p a therm before falling back toward 96p by late May. I look at how the market priced the strait, the live map of around 1,300 ships I built to watch it, and the one chart I'd keep.",
  live: "https://hormuz.stevenstills.com",
  page: lazy(() => import("./Page")),
  preview: lazy(() => import("./Preview")),
};
