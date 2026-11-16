import { lazy } from "react";
import type { ProjectMeta } from "../types";

export const meta: ProjectMeta = {
  slug: "gta6",
  kind: "writing",
  title: "What will GTA6 do to the power grid",
  date: "2026-11-16",
  line: "Grand Theft Auto VI comes out on 19 November 2026 and 2.8 million people in the UK say they will play it that day. I estimate what that adds to one home's meter, to national demand and to each of the 14 GSP groups.",
  page: lazy(() => import("./Page")),
  preview: lazy(() => import("./Preview")),
};
