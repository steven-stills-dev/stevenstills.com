import { lazy } from "react";
import type { ProjectMeta } from "../types";

export const meta: ProjectMeta = {
  slug: "batteries",
  kind: "writing",
  title: "Home batteries add up at the front of the business. What happens at settlement?",
  date: "2026-06-29",
  line: "More than 40,000 home batteries were installed in 2025 and the sums behind them work. I follow a fleet of them to the half-hour where a supplier is billed for being wrong.",
  page: lazy(() => import("./Page")),
  preview: lazy(() => import("./Preview")),
};
