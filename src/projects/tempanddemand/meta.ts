import { lazy } from "react";
import type { ProjectMeta } from "../types";

export const meta: ProjectMeta = {
  slug: "tempanddemand",
  kind: "writing",
  title: "The forgotten problem in forecasting gas allocations",
  date: "2026-09-28",
  line: "In 2015, 43% of days in Central England ran warmer than normal and in 2026 it is 70%. Gas is the simple half of energy forecasting, but the seasonal normal in its settlement formula is reset only every five years and is already behind the weather.",
  page: lazy(() => import("./Page")),
  preview: lazy(() => import("./Preview")),
};
