import { readFileSync } from "node:fs";

const iggy = JSON.parse(readFileSync("iggy.config.json", "utf8"));

/** Routes the gates check, from iggy.config.json "web.routes" (default: "/"). */
export const routes: string[] = (iggy.web?.routes?.length ? iggy.web.routes : ["/"]).map(
  // "about" and "/about" mean the same route.
  (route: string) => "/" + route.replace(/^\/+/, ""),
);

/** Gate breakpoints, generated from .claude/skills/review/gates.md. */
export const breakpoints: { responsive: number[]; screenshots: number[] } = JSON.parse(
  readFileSync("e2e/breakpoints.json", "utf8"),
);
