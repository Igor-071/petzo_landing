#!/usr/bin/env node
// Prints the gate breakpoints as JSON, read from the Breakpoints table in
// .claude/skills/review/gates.md, so the Playwright templates use exactly the
// widths the docs define.
//
//   breakpoints.mjs [path/to/gates.md]
//   -> {"responsive":[320,...],"screenshots":[375,...]}

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const gatesPath = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), "..", ".claude", "skills", "review", "gates.md");

const responsive = [];
const screenshots = [];
for (const row of readFileSync(gatesPath, "utf8").split("\n")) {
  const cells = row.split("|").map((cell) => cell.trim());
  const width = cells[1]?.match(/^(\d+)px$/);
  if (!width) continue;
  if (cells[3] === "✓") responsive.push(Number(width[1]));
  if (cells[4] === "✓") screenshots.push(Number(width[1]));
}

if (!responsive.length) {
  console.error(`breakpoints: no breakpoint rows found in ${gatesPath}`);
  process.exit(1);
}
console.log(JSON.stringify({ responsive, screenshots }));
