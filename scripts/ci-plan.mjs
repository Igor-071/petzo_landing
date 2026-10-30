#!/usr/bin/env node
// Decides which quality gates CI runs for this project, and which ones block,
// from iggy.config.json. The quality-gates workflow keys every job off this.
//
//   ci-plan.mjs                  Print the plan as JSON
//   ci-plan.mjs --github-output  Also write <gate>_enabled / <gate>_blocking to
//                                $GITHUB_OUTPUT and a table to $GITHUB_STEP_SUMMARY
//
// Set CLAUDE_PROJECT_DIR to plan for a project in another directory.

import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { StateError, loadConfig, loadRawConfig, missingCommandReason, projectDir, schemaErrors } from "../hooks/lib/vibe-state.mjs";

const SCHEMA = join(dirname(fileURLToPath(import.meta.url)), "..", "schemas", "iggy.config.schema.json");

const SEMGREP_PACKS = {
  node: ["p/owasp-top-ten", "p/javascript", "p/typescript"],
  python: ["p/owasp-top-ten", "p/python"],
  go: ["p/owasp-top-ten", "p/golang"],
};

// A language's commands only make sense once its project file exists. A fresh
// project (or this template) without one runs no command gates.
const PROJECT_FILES = {
  node: ["package.json"],
  python: ["pyproject.toml", "setup.py", "requirements.txt"],
  go: ["go.mod"],
};

function missingProjectFile(language) {
  const files = PROJECT_FILES[language];
  return files.some((file) => existsSync(join(projectDir(), file))) ? null : `no ${files.join(" or ")}`;
}

function gate(enabled, blocking, reason) {
  return { enabled, blocking: enabled && blocking, reason };
}

function commandGate(config, name, blocking) {
  const missing = missingProjectFile(config.language) ?? missingCommandReason(config.commands[name]);
  if (missing) return gate(false, false, `${name}: ${missing}`);
  return gate(true, blocking, config.commands[name]);
}

function webGate(config, name, blocking, needsProduction = false) {
  if (!config.web) return gate(false, false, "no web section in iggy.config.json");
  if (config.language !== "node") return gate(false, false, "browser gates run through Playwright (node projects)");
  if (needsProduction && config.mode !== "production") return gate(false, false, "production mode only");
  const template = name === "lighthouse" ? "lighthouserc.cjs" : "playwright.config.ts";
  if (!existsSync(join(projectDir(), template))) {
    return gate(false, false, `no ${template}: run scripts/add-web-gates.sh to add the browser gates`);
  }
  if (name !== "lighthouse") {
    const missing = missingProjectFile(config.language) ?? missingCommandReason(config.commands.e2e);
    if (missing) return gate(false, false, `e2e: ${missing}`);
  }
  return gate(true, blocking, config.web.url);
}

export function buildPlan(config) {
  const production = config.mode === "production";
  const gates = {
    lint: commandGate(config, "lint", true),
    typecheck: commandGate(config, "typecheck", true),
    test: commandGate(config, "test", true),
    coverage: commandGate(config, "coverage", production),
    e2e: webGate(config, "e2e", production),
    a11y: webGate(config, "a11y", production),
    lighthouse: webGate(config, "lighthouse", true, true),
    secrets: gate(true, true, "gitleaks"),
    audit: commandGate(config, "audit", production),
    sast: gate(true, production, "semgrep"),
    build: production ? commandGate(config, "build", true) : gate(false, false, "production mode only"),
  };
  return {
    mode: config.mode,
    language: config.language,
    semgrepConfigs: SEMGREP_PACKS[config.language].map((pack) => `--config ${pack}`).join(" "),
    thresholds: config.thresholds,
    gates,
  };
}

function writeGithubOutput(plan) {
  const lines = [`plan=${JSON.stringify(plan)}`, `mode=${plan.mode}`, `language=${plan.language}`, `semgrep_configs=${plan.semgrepConfigs}`];
  for (const [name, { enabled, blocking }] of Object.entries(plan.gates)) {
    lines.push(`${name}_enabled=${enabled}`, `${name}_blocking=${blocking}`);
  }
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, lines.join("\n") + "\n");

  if (process.env.GITHUB_STEP_SUMMARY) {
    const rows = Object.entries(plan.gates).map(
      ([name, g]) => `| ${name} | ${g.enabled ? "yes" : "no"} | ${g.blocking ? "yes" : g.enabled ? "warns" : "—"} | ${g.reason} |`,
    );
    const summary = [
      `### Quality gate plan: ${plan.mode} mode, ${plan.language}`,
      "",
      "| Gate | Runs | Blocks | Why |",
      "|------|------|--------|-----|",
      ...rows,
      "",
    ];
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary.join("\n") + "\n");
  }
}

function main() {
  const errors = schemaErrors(loadRawConfig(), JSON.parse(readFileSync(SCHEMA, "utf8")), "config");
  if (errors.length) {
    console.error("iggy.config.json is invalid:");
    for (const error of errors) console.error(`  - ${error}`);
    return 1;
  }
  const plan = buildPlan(loadConfig());
  if (process.argv.includes("--github-output")) writeGithubOutput(plan);
  console.log(JSON.stringify(plan, null, 2));
  return 0;
}

try {
  process.exitCode = main();
} catch (error) {
  if (!(error instanceof StateError)) throw error;
  console.error(`ci-plan: ${error.message}`);
  process.exitCode = 1;
}
