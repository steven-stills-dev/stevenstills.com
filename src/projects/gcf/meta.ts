import { lazy } from "react";
import type { ProjectMeta } from "../types";

export const meta: ProjectMeta = {
  slug: "gcf",
  kind: "writing",
  title: "What's going on with Group Correction Factors",
  date: "2026-11-15",
  line: "Every half hour, Britain's settlement system rescales what suppliers say their customers used to match what flowed into each region. Since half-hourly settlement began, that correction has swung further than at any time in 20 years, and I look at why.",
  page: lazy(() => import("./Page")),
  preview: lazy(() => import("./Preview")),
};
