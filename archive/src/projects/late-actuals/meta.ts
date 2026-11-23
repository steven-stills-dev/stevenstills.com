import { lazy } from "react";
import type { ProjectMeta } from "../types";

export const meta: ProjectMeta = {
  slug: "late-actuals",
  kind: "writing",
  title: "Building lag features when demand actuals arrive late",
  date: "2026-10-13",
  line: "I replayed two years of daily demand forecasts with actuals held back three weeks, to show how much a backtest flatters a model that reads lags it could never see live.",
  page: lazy(() => import("./Page")),
  preview: lazy(() => import("./Preview")),
};
