import { lazy } from "react";
import type { ProjectMeta } from "../types";

export const meta: ProjectMeta = {
  slug: "data-centre-demand",
  kind: "writing",
  title: "Data centre demand is the grid's next big challenge. Is now the right time?",
  date: "2026-07-24",
  line: "Data centres are asking for 50GW of grid connections, about the whole of Britain's peak demand. I think the worry is mostly backwards.",
  page: lazy(() => import("./Page")),
  preview: lazy(() => import("./Preview")),
};
