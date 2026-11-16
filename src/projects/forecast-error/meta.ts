import { lazy } from "react";
import type { ProjectMeta } from "../types";

export const meta: ProjectMeta = {
  slug: "forecast-error",
  kind: "writing",
  title: "Measuring demand forecast error",
  date: "2026-05-19",
  line: "I scored two years of Britain's day-ahead electricity demand forecast six ways and found the headline depends more on how the error is averaged than on the forecast itself.",
  page: lazy(() => import("./Page")),
  preview: lazy(() => import("./Preview")),
};
