import { lazy } from "react";
import type { ProjectMeta } from "../types";

export const meta: ProjectMeta = {
  slug: "traitors",
  kind: "writing",
  title: "What The Traitors final did to the power grid",
  date: "2026-06-18",
  line: "The Traitors final went out on BBC One on 23 January 2026 to 9.4 million people, with no advert breaks. I looked for the kettles in five-minute grid data, before the final and after it, and worked out how big an audience a TV pickup needs.",
  page: lazy(() => import("./Page")),
  preview: lazy(() => import("./Preview")),
};
