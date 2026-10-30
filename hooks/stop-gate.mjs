#!/usr/bin/env node
// Stop hook. While a workflow is active, Claude can't claim completion
// ("FEATURE COMPLETE", "IMPLEMENTATION COMPLETE", "ALL GATES PASSED") unless the
// last logged test run and lint run both passed after the last source edit.
//
// Claude can always end its turn by reporting honestly without the claim, so
// this never loops. Exit 2 keeps Claude working and shows stderr as the reason.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { StateError, confirmedTier, loadConfig, loadState, projectDir, testRunsFor } from "./lib/vibe-state.mjs";

// A claim starts a line (optionally as a heading or in bold). Quoting the phrase
// mid-sentence, e.g. explaining the delivery format, isn't a claim.
const COMPLETION_CLAIM = /^[ \t>]*(?:#+[ \t]*)?(?:\*\*|__)?(?:RESULT:[ \t]*)?(FEATURE COMPLETE|IMPLEMENTATION COMPLETE|ALL GATES PASSED)/m;
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", "coverage"]);

function readInput() {
  try {
    return JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return {};
  }
}

function textOf(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.filter((part) => part?.type === "text").map((part) => part.text).join("\n");
}

function lastAssistantMessage(input) {
  if (typeof input.last_assistant_message === "string") return input.last_assistant_message;
  if (!input.transcript_path || !existsSync(input.transcript_path)) return "";
  const lines = readFileSync(input.transcript_path, "utf8").trim().split("\n").reverse();
  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      const message = entry.message ?? entry;
      if (entry.type === "assistant" || message.role === "assistant") {
        const text = textOf(message.content);
        if (text) return text;
      }
    } catch {
      // Skip partial or non-JSON lines.
    }
  }
  return "";
}

function newestSourceEdit(sourceDirs) {
  let newest = 0;
  const walk = (dir) => {
    let entries = [];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else {
        try {
          newest = Math.max(newest, statSync(path).mtimeMs);
        } catch {
          // Broken symlink or unreadable file: it can't have been edited.
        }
      }
    }
  };
  for (const dir of sourceDirs) {
    const absolute = join(projectDir(), dir);
    if (existsSync(absolute) && statSync(absolute).isDirectory()) walk(absolute);
  }
  return newest;
}

function problems(active) {
  const found = [];
  const runs = testRunsFor(active);
  const lastTest = runs.filter((run) => run.kind === "test").pop();
  const lastLint = runs.filter((run) => run.kind === "lint").pop();
  const lastEdit = newestSourceEdit(loadConfig().sourceDirs);
  const tier = confirmedTier(active) ?? active.tier;

  if (tier !== "MINIMAL") {
    if (!lastTest) found.push("No test run is logged. Run `node scripts/vibe.mjs test`.");
    else if (lastTest.skipped) found.push("The last test run was skipped because no test command is configured. Set commands.test in iggy.config.json, or tell the user the change is untested.");
    else if (lastTest.exit !== 0) found.push(`The last test run failed (exit ${lastTest.exit}). Fix it and run \`node scripts/vibe.mjs test\` again.`);
    else if (lastTest.at < lastEdit) found.push("Source files changed after the last test run. Run `node scripts/vibe.mjs test` again.");
  }
  if (lastLint && !lastLint.skipped && lastLint.exit !== 0) {
    found.push(`The last lint run failed (exit ${lastLint.exit}). Fix it and run \`node scripts/vibe.mjs lint\` again.`);
  } else if (lastLint && !lastLint.skipped && lastLint.at < lastEdit) {
    found.push("Source files changed after the last lint run. Run `node scripts/vibe.mjs lint` again.");
  } else if (!lastLint) {
    found.push("No lint run is logged. Run `node scripts/vibe.mjs lint`.");
  }
  return found;
}

function main() {
  const input = readInput();
  const active = loadState().active;
  if (!active || !COMPLETION_CLAIM.test(lastAssistantMessage(input))) return 0;

  const found = problems(active);
  if (!found.length) return 0;
  console.error("[Iggy] You claimed completion, but the gates don't back it up yet:");
  for (const problem of found) console.error(`- ${problem}`);
  console.error("Fix and re-run them, or tell the user honestly what's still failing (without claiming completion).");
  return 2;
}

try {
  process.exitCode = main();
} catch (error) {
  console.error(`[Iggy] Could not check gates: ${error.message}.`);
  process.exitCode = 0;
}
