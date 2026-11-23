import { lazy } from "react";
import type { ProjectMeta } from "../types";

export const meta: ProjectMeta = {
  slug: "eclipse",
  kind: "writing",
  title: "What the solar eclipse did to the power grid",
  date: "2026-09-30",
  line: "On 12 August 2026 the Moon covered about nine tenths of the Sun over Britain at dinner time. I measured what that took off solar power, whether everyone going outside to watch took anything off demand, and what both did to the forecast.",
  page: lazy(() => import("./Page")),
  preview: lazy(() => import("./Preview")),
};
