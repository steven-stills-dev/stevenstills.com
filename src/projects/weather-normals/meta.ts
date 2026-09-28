import { lazy } from "react";
import type { ProjectMeta } from "../types";

export const meta: ProjectMeta = {
  slug: "weather-normals",
  kind: "writing",
  title: "Is the 30-year normal still normal?",
  date: "2026-09-27",
  line: "Central England averaged 9.46°C over 1961 to 1990, 10.27°C over 1991 to 2020 and 10.97°C over the last five years. I look at what that drift does to a demand forecast, what a degree is worth in gigawatts, and why gas has already stopped looking back.",
  page: lazy(() => import("./Page")),
  preview: lazy(() => import("./Preview")),
};
