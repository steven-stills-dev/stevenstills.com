import { lazy } from "react";
import type { ProjectMeta } from "../types";

export const meta: ProjectMeta = {
  slug: "ml-through-the-years",
  kind: "writing",
  title: "Machine learning through the years",
  date: "2025-10-15",
  line: "From SARIMA in 2016 to LSTMs in lockdown to gradient boosting at settlement scale: why each model rose and fell, and how XGBoost and LightGBM learn.",
  page: lazy(() => import("./Page")),
  preview: lazy(() => import("./Preview")),
};
