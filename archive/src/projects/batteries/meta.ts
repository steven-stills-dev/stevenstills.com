import { lazy } from "react";
import type { ProjectMeta } from "../types";

export const meta: ProjectMeta = {
  slug: "batteries",
  kind: "writing",
  title: "Home batteries and settlement risk for suppliers",
  date: "2026-06-29",
  line: "A home battery changes the hours in which a household draws from the grid. I use early Australian data and a simple model to look at what that change does to a supplier's forecast and its settlement position.",
  page: lazy(() => import("./Page")),
  preview: lazy(() => import("./Preview")),
};
