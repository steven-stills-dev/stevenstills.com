import { lazy } from "react";
import type { ProjectMeta } from "../types";

export const meta: ProjectMeta = {
  slug: "tempanddemand",
  kind: "writing",
  title: "Seasonal normal weather in gas demand allocation",
  date: "2026-08-28",
  line: "Britain's gas industry allocates and forecasts demand against a seasonal normal that is reset once every five years. I look at temperature and gas demand since 2015, compare the published seasonal normal with the weather since October 2022, and estimate what the difference was worth in the 2024/25 gas year.",
  page: lazy(() => import("./Page")),
  preview: lazy(() => import("./Preview")),
};
