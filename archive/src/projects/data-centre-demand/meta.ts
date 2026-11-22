import { lazy } from "react";
import type { ProjectMeta } from "../types";

export const meta: ProjectMeta = {
  slug: "data-centre-demand",
  kind: "writing",
  title: "Data centre demand and grid connections in Britain",
  date: "2026-07-24",
  line: "Data centres are asking for about 50GW of grid connections, about the whole of Britain's peak demand. I map the announced sites against the onshore wind to see where the new demand would connect.",
  page: lazy(() => import("./Page")),
  preview: lazy(() => import("./Preview")),
};
