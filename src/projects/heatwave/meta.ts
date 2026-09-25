import { lazy } from "react";
import type { ProjectMeta } from "../types";

export const meta: ProjectMeta = {
  slug: "heatwave",
  kind: "project",
  title: "Heatwave Tracker & Impact",
  date: "2026-04-28",
  line: "The UK had four heatwaves before August 2026, and through them the imbalance price moved first and moved more than demand. I look at what my live tracker found, how I built it, and why I switched it off in August.",
  page: lazy(() => import("./Page")),
  preview: lazy(() => import("./Preview")),
};
