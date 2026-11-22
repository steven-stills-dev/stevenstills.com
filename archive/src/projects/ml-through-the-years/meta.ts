import { lazy } from "react";
import type { ProjectMeta } from "../types";

export const meta: ProjectMeta = {
  slug: "ml-through-the-years",
  kind: "writing",
  title: "Demand forecasting models from SARIMA to gradient boosting",
  date: "2025-10-15",
  line: "I moved from SARIMA and linear regression in 2016 to LSTMs during lockdown and then to gradient boosting for half-hourly demand. I explain what prompted each move and how XGBoost and LightGBM learn.",
  page: lazy(() => import("./Page")),
  preview: lazy(() => import("./Preview")),
};
