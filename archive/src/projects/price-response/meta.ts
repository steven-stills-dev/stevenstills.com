import { lazy } from "react";
import type { ProjectMeta } from "../types";

export const meta: ProjectMeta = {
  slug: "price-response",
  kind: "writing",
  title: "Measuring how gas demand responds to price changes",
  date: "2026-08-12",
  line: "I weather-corrected eleven years of Britain's gas demand to see how far it falls when prices rise, and found one winter carries almost the whole answer.",
  page: lazy(() => import("./Page")),
  preview: lazy(() => import("./Preview")),
};
