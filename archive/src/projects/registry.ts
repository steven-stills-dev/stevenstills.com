import type { ProjectMeta } from "./types";
import { dlabel } from "../lib/format";

const modules = import.meta.glob<{ meta: ProjectMeta }>("./*/meta.ts", { eager: true });

/** Every project and piece of writing, newest first. */
export const PROJECTS: ProjectMeta[] = Object.values(modules)
  .map((m) => m.meta)
  .sort((a, b) => b.date.localeCompare(a.date));

/** "2026-09-07" -> "7 Sep 2026" */
export const fmtDate = (iso: string) => `${dlabel(iso)} ${iso.slice(0, 4)}`;
