import { lazy } from "react";
import type { ProjectMeta } from "../types";

export const meta: ProjectMeta = {
  slug: "winter-replay",
  kind: "writing",
  title: "Replaying thirty-five winters through a hedge book",
  date: "2026-09-14",
  line: "I replayed every winter since 1991/92 through an illustrative gas supplier's hedge book to see how much margin the weather alone can move, and how little 35 winters can tell me about a one-in-ten.",
  page: lazy(() => import("./Page")),
  preview: lazy(() => import("./Preview")),
};
