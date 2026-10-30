#!/usr/bin/env node
// Iggy workflow state CLI. Skills call this instead of editing .vibe/ by hand.
//
//   vibe.mjs status                         Show the active workflow and what the user confirmed
//   vibe.mjs start <feature> --tier <TIER>  Start a workflow; the tier waits for the user's approval
//   vibe.mjs tier <TIER>                    Propose a different tier (needs approval again)
//   vibe.mjs phase <phase>                  Move to a phase: scout, spec, test_plan, implement, review, present, docs
//   vibe.mjs spec <path>                    Set the spec file whose hash approvals are tied to
//   vibe.mjs test | lint                    Run the configured command and log its exit code
//   vibe.mjs run <command> [args...]        Run any configured command (typecheck, build, e2e...) without logging
//   vibe.mjs config                         Print the resolved iggy.config.json (defaults filled in)
//   vibe.mjs complete | abort               Close the active workflow and move it to history
//   vibe.mjs validate                       Check .vibe/state.json and iggy.config.json against their schemas
//
// There is deliberately no approve or override command. Only the user can do
// that, by sending the message themselves (see hooks/record-approval.mjs).

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  COMMAND_NAMES,
  HISTORY_LIMIT,
  StateError,
  TIERS,
  appendTestRun,
  approvalsFor,
  confirmedTier,
  hasAcceptanceCriteria,
  loadConfig,
  loadOverrides,
  loadRawConfig,
  missingCommandReason,
  loadState,
  newRunId,
  projectDir,
  relativeToProject,
  runIdOf,
  saveState,
  schemaErrors,
  specHash,
  testRunsFor,
  writeEvidence,
} from "../hooks/lib/vibe-state.mjs";

const SCHEMAS = join(dirname(fileURLToPath(import.meta.url)), "..", "schemas");

class UsageError extends Error {}

function fail(message) {
  throw new UsageError(message);
}

function requireActive(state) {
  if (!state.active) fail("No active workflow. Start one with: vibe.mjs start <feature> --tier <TIER>");
  return state.active;
}

function parseTier(value) {
  const tier = String(value || "").toUpperCase();
  if (!TIERS.includes(tier)) fail(`Tier must be one of ${TIERS.join(", ")}.`);
  return tier;
}

// --- Commands ------------------------------------------------------------------

function nextAction(active) {
  const confirmed = confirmedTier(active);
  const approvals = approvalsFor(active);
  const { phase, tier, specPath } = active;

  if (phase === "tier_proposed") {
    if (confirmed !== tier) return `Reply "approved" to confirm the ${tier} tier.`;
    return "Tier confirmed. Move to scout or spec: node scripts/vibe.mjs phase scout";
  }
  if (phase === "spec") {
    const specApproval = approvals.findLast((a) => a.phase === "spec");
    if (!specApproval) return 'Reply "approved" to approve the spec and move to test planning.';
    if (specPath && specApproval.specHash !== specHash(specPath)) {
      return 'Spec ACs changed since approval. Reply "approved" to re-approve.';
    }
  }
  if (phase === "test_plan") {
    const testPlanApproval = approvals.findLast((a) => a.phase === "test_plan");
    if (!testPlanApproval) return 'Reply "approved" to approve the test plan and begin implementation.';
  }
  if (phase === "implement") {
    const tests = testRunsFor(active).filter((r) => r.kind === "test" && !r.skipped);
    const sawRed = tests.some((r) => r.exit !== 0);
    const lastTest = tests.at(-1);
    if (!sawRed) return "Write a failing test, then run: node scripts/vibe.mjs test";
    if (lastTest.exit !== 0) return "Test is failing (RED). Write the code to make it pass, then run: node scripts/vibe.mjs test";
    return "Tests pass after a failing run. When every AC is done, move to review: node scripts/vibe.mjs phase review";
  }
  if (phase === "review") return "Run /review to check quality gates.";
  if (phase === "present") return 'Reply "approved" to complete the feature.';
  if (phase === "docs") return "Generate feature docs, then: node scripts/vibe.mjs complete";
  return null;
}

function status() {
  const state = loadState();
  if (!state.active) {
    console.log("No active workflow.");
    return;
  }
  const { feature, tier, phase, specPath } = state.active;
  const confirmed = confirmedTier(state.active);
  const tierLabel = confirmed === tier ? `${tier} (confirmed)` : `${tier} (waiting for your approval)`;
  const approvals = approvalsFor(state.active);
  const lastRun = (kind) => testRunsFor(state.active).filter((run) => run.kind === kind).pop();
  const describeRun = (run) => (!run ? "not run" : run.skipped ? "skipped" : run.exit === 0 ? "passed" : `failed (exit ${run.exit})`);
  const pendingOverrides = loadOverrides().filter((o) => o.runId === runIdOf(state.active) && !o.used).length;

  console.log(`Feature:   ${feature}`);
  console.log(`Tier:      ${tierLabel}`);
  console.log(`Phase:     ${phase}`);
  console.log(`Spec:      ${specPath || "none"}`);
  console.log(`Approved:  ${approvals.length ? approvals.map((a) => a.phase).join(", ") : "nothing yet"}`);
  console.log(`Tests:     ${describeRun(lastRun("test"))}`);
  console.log(`Lint:      ${describeRun(lastRun("lint"))}`);
  if (pendingOverrides) console.log(`Overrides: ${pendingOverrides} unused`);

  const next = nextAction(state.active);
  if (next) {
    console.log("");
    console.log(`Next:      ${next}`);
  }
}

function start(args) {
  const feature = args[0];
  const tierFlag = args.indexOf("--tier");
  if (!feature || feature.startsWith("--")) fail("Usage: vibe.mjs start <feature> --tier <TIER>");
  if (!/^[A-Za-z0-9._-]+$/.test(feature)) fail("Feature names can only use letters, digits, dot, dash and underscore.");
  const tier = parseTier(tierFlag === -1 ? null : args[tierFlag + 1]);

  const state = loadState();
  if (state.active) fail(`Workflow "${state.active.feature}" is still active. Run vibe.mjs complete or abort first.`);
  state.active = {
    runId: newRunId(),
    feature,
    tier,
    phase: "tier_proposed",
    specPath: null,
    startedAt: new Date().toISOString(),
  };
  saveState(state);
  console.log(`Started "${feature}" with proposed tier ${tier}. Waiting for the user to approve the tier.`);
}

function proposeTier(args) {
  const state = loadState();
  const active = requireActive(state);
  active.tier = parseTier(args[0]);
  active.phase = "tier_proposed";
  saveState(state);
  console.log(`Proposed tier ${active.tier} for "${active.feature}". Waiting for the user's approval.`);
}

function setPhase(args) {
  const phases = ["scout", "spec", "test_plan", "implement", "review", "present", "docs"];
  if (!phases.includes(args[0])) fail(`Phase must be one of ${phases.join(", ")}.`);
  const state = loadState();
  const active = requireActive(state);
  if (confirmedTier(active) !== active.tier) {
    fail(`Tier ${active.tier} is not confirmed yet. Ask the user to reply with just "approved" first.`);
  }
  active.phase = args[0];
  saveState(state);
  console.log(`Phase: ${args[0]}`);
}

function setSpec(args) {
  if (!args[0]) fail("Usage: vibe.mjs spec <path>");
  const path = relativeToProject(args[0]);
  if (path.startsWith("..") || !existsSync(join(projectDir(), path))) fail(`Spec file not found in the project: ${args[0]}`);
  const state = loadState();
  requireActive(state).specPath = path;
  saveState(state);
  console.log(`Spec: ${path}`);
  if (!hasAcceptanceCriteria(readFileSync(join(projectDir(), path), "utf8"))) {
    console.log("Warning: this spec has no acceptance criteria (AC-001, AC-002, ...). Add them before asking for approval.");
  }
}

function runChecked(kind) {
  const command = loadConfig().commands[kind];
  const active = loadState().active;
  const base = { kind, command, runId: active ? runIdOf(active) : null, feature: active?.feature ?? null, at: Date.now() };

  if (missingCommandReason(command)) {
    appendTestRun({ ...base, exit: null, skipped: true });
    console.log(`${kind}: skipped (no ${kind} command configured)`);
    return 0;
  }

  const result = spawnSync(command, { cwd: projectDir(), shell: true, stdio: "inherit" });
  // Killed by a signal (status null): count it as a failure.
  const exit = result.status ?? 1;
  appendTestRun({ ...base, exit, at: Date.now() });
  console.log(`${kind}: ${exit === 0 ? "passed" : `failed (exit ${exit})`}`);
  return exit;
}

function close(result) {
  const state = loadState();
  const active = requireActive(state);
  if (result === "completed") {
    const evidencePath = writeEvidence(active);
    if (evidencePath) console.log(`Evidence: ${evidencePath}`);
  }
  state.history = [
    { feature: active.feature, tier: active.tier, result, endedAt: new Date().toISOString() },
    ...state.history,
  ].slice(0, HISTORY_LIMIT);
  state.active = null;
  saveState(state);
  console.log(`Workflow "${active.feature}" ${result}.`);
}

function validate() {
  const schema = (name) => JSON.parse(readFileSync(join(SCHEMAS, name), "utf8"));
  const checks = [
    ["state.json", schemaErrors(loadState(), schema("state.schema.json"), "state")],
    ["iggy.config.json", schemaErrors(loadRawConfig(), schema("iggy.config.schema.json"), "config")],
  ];
  let failed = false;
  for (const [file, errors] of checks) {
    if (!errors.length) {
      console.log(`${file} is valid.`);
      continue;
    }
    failed = true;
    console.error(`${file} is invalid:`);
    for (const error of errors) console.error(`  - ${error}`);
  }
  return failed ? 1 : 0;
}

function printConfig() {
  console.log(JSON.stringify(loadConfig(), null, 2));
}

// Runs a configured command without logging it. Used by lefthook and CI so
// every runner uses the same commands as vibe.mjs test / lint.
function runCommand(args) {
  const name = args[0];
  if (!COMMAND_NAMES.includes(name)) fail(`Command must be one of ${COMMAND_NAMES.join(", ")}.`);
  const command = loadConfig().commands[name];
  if (missingCommandReason(command)) {
    console.log(`${name}: skipped (no ${name} command configured)`);
    return 0;
  }
  // Extra arguments are single-quoted, so they reach the command as literal text.
  const extra = args.slice(1).map((arg) => `'${arg.replace(/'/g, "'\\''")}'`);
  const result = spawnSync([command, ...extra].join(" "), { cwd: projectDir(), shell: true, stdio: "inherit" });
  return result.status ?? 1;
}

// --- Main ------------------------------------------------------------------------

const [command, ...args] = process.argv.slice(2);
const commands = {
  status: () => status(),
  start: () => start(args),
  tier: () => proposeTier(args),
  phase: () => setPhase(args),
  spec: () => setSpec(args),
  test: () => runChecked("test"),
  lint: () => runChecked("lint"),
  complete: () => close("completed"),
  abort: () => close("aborted"),
  validate: () => validate(),
  config: () => printConfig(),
  run: () => runCommand(args),
};

try {
  if (!commands[command]) {
    fail(`Unknown command "${command ?? ""}". Commands: ${Object.keys(commands).join(", ")}.`);
  }
  process.exitCode = commands[command]() ?? 0;
} catch (error) {
  if (!(error instanceof UsageError || error instanceof StateError)) throw error;
  console.error(`vibe: ${error.message}`);
  process.exitCode = 1;
}
