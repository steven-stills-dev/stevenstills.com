import { lazy } from "react";
import type { ProjectMeta } from "../types";

export const meta: ProjectMeta = {
  slug: "mhhs-forecast",
  kind: "writing",
  title: "Fourteen months to four. What half-hourly settlement does to a supplier's forecast",
  date: "2026-09-27",
  line: "Since 1998 British homes were settled on a profile built from about 2,500 sample sites. By July 2027 all 33 million meters settle on their own half-hourly reads, with the final answer in four months instead of fourteen. I look at what that changes for a demand forecast.",
  page: lazy(() => import("./Page")),
  preview: lazy(() => import("./Preview")),
};
