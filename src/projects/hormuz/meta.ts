import { lazy } from "react";
import type { ProjectMeta } from "../types";

export const meta: ProjectMeta = {
  slug: "hormuz",
  kind: "project",
  title: "Tracking ships in the Strait of Hormuz",
  date: "2026-06-08",
  pinned: true,
  line: "Daily tanker transits through the Strait of Hormuz fell to single figures in March 2026. I built a live map of the tankers and LNG carriers around the strait, the attacks on shipping and the routes that avoid it, and I compare the tanker counts with the UK gas price.",
  live: "https://hormuz.stevenstills.com",
  page: lazy(() => import("./Page")),
  preview: lazy(() => import("./Preview")),
};
