import { lazy } from "react";
import type { ProjectMeta } from "../types";

export const meta: ProjectMeta = {
  slug: "tempanddemand",
  kind: "writing",
  title: "More than half of days in Central England now run warmer than normal",
  date: "2026-09-28",
  line: "In 1961 to 1990 a third of days in Central England ran warmer than normal for their date, and from 2022 to 2025 it was 59%. I follow the spread of days since 2015 and what gas demand did over the same years.",
  page: lazy(() => import("./Page")),
  preview: lazy(() => import("./Preview")),
};
