import { lazy } from "react";
import type { ProjectMeta } from "../types";

export const meta: ProjectMeta = {
  slug: "heatwave",
  kind: "project",
  title: "Tracking UK heatwaves against demand and imbalance prices",
  date: "2026-04-28",
  line: "The UK had four heatwaves before August 2026, and I built a live tracker to follow the heat and the imbalance price. Afterwards I measured each heatwave's demand and its imbalance price against a baseline from the summer's other days, and I describe what I found.",
  page: lazy(() => import("./Page")),
  preview: lazy(() => import("./Preview")),
};
