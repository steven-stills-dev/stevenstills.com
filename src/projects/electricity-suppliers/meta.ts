import { lazy } from "react";
import type { ProjectMeta } from "../types";

export const meta: ProjectMeta = {
  slug: "electricity-suppliers",
  kind: "writing",
  title: "Electricity supply profile changes in MHHS",
  date: "2026-09-29",
  pinned: true,
  line: "Market-wide half-hourly settlement makes each supplier pay for the shape of its own customers' day. I look at how ten suppliers' demand shapes and half-hourly prices have changed since 2021, and what the difference costs.",
  page: lazy(() => import("./Page")),
  preview: lazy(() => import("./Preview")),
};
