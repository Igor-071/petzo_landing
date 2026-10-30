#!/usr/bin/env node
// PreToolUse hook for Write/Edit/MultiEdit. Enforces the workflow on source
// files (iggy.config.json "sourceDirs"). Test files are never gated.
//
//   strict (default)  every source edit needs a tier the user confirmed
//   standard-only     only workflows the user confirmed as STANDARD/FULL are gated
//
// STANDARD/FULL also need: spec approved, test plan approved, the spec unchanged
// since the latest approval, and a failing test run logged after the test-plan
// approval (RED before GREEN). "/vibe override <reason>" from the user allows
// one blocked action.
//
// Exit 2 blocks the edit and shows stderr to Claude.

import { readFileSync } from "node:fs";
import {
  GATED_TIERS,
  StateError,
  approvalsFor,
  confirmedTier,
  consumeOverride,
  isTestFile,
  isUnderSourceDirs,
  loadConfig,
  loadState,
  relativeToProject,
  specHash,
  testRunsFor,
} from "./lib/vibe-state.mjs";

const WAIT = "Ask the user to review it and reply with just \"approved\".";

class Blocked extends Error {}

function block(message) {
  throw new Blocked(message);
}

function targetPath() {
  try {
    const input = JSON.parse(readFileSync(0, "utf8"));
    return input.tool_input?.file_path ?? input.tool_input?.notebook_path ?? null;
  } catch {
    return null;
  }
}

function checkStandardGates(active, approvals) {
  const specApproval = approvals.findLast((a) => a.phase === "spec");
  const testPlanApproval = approvals.findLast((a) => a.phase === "test_plan");
  if (!active.specPath || !specApproval) {
    block(`Spec not approved — waiting for human approval. Run \`node scripts/vibe.mjs phase spec\` and \`vibe.mjs spec <path>\` first. ${WAIT}`);
  }
  if (!testPlanApproval) {
    block(`Test plan not approved — waiting for human approval. Run \`node scripts/vibe.mjs phase test_plan\`, add the test plan to the spec, then: ${WAIT}`);
  }

  // The latest approval that covered the spec must match the spec as it is now
  // (the traceability section is ignored, so filling it in is fine).
  const latestSpecApproval = approvals.filter((a) => a.specHash).pop();
  if (!latestSpecApproval || latestSpecApproval.specHash !== specHash(active.specPath)) {
    block(`Spec changed since your approval (${active.specPath}). Show the user the changes and ask them to approve again.`);
  }

  const failingRunAfterPlan = testRunsFor(active).some(
    (run) => run.kind === "test" && !run.skipped && run.exit !== 0 && run.at > testPlanApproval.at,
  );
  if (!failingRunAfterPlan) {
    block("Write a failing test first (RED). Add the test, run `node scripts/vibe.mjs test`, and see it fail before writing the code.");
  }
}

function checkGate(path) {
  const config = loadConfig();
  const active = loadState().active;
  const strict = config.enforcement !== "standard-only";

  if (!active) {
    if (strict) block("No active workflow. Start one with /vibe so the user can confirm the tier first.");
    return;
  }

  const tier = confirmedTier(active);
  if (!tier) {
    if (strict) block(`Tier not confirmed for "${active.feature}" (proposed: ${active.tier}). ${WAIT}`);
    return;
  }
  if (tier !== active.tier) {
    block(`Tier change from ${tier} to ${active.tier} isn't confirmed. ${WAIT}`);
  }
  if (GATED_TIERS.includes(tier)) checkStandardGates(active, approvalsFor(active));
}

function main() {
  const file = targetPath();
  if (!file) return 0;
  const path = relativeToProject(file);
  if (!isUnderSourceDirs(path, loadConfig().sourceDirs) || isTestFile(path)) return 0;

  try {
    checkGate(path);
    return 0;
  } catch (error) {
    if (!(error instanceof Blocked)) throw error;
    const active = loadState().active;
    const override = active ? consumeOverride(active) : null;
    if (override) {
      console.error(`[Iggy] Gate skipped once for ${path} by the user's override: ${override.reason}`);
      return 0;
    }
    console.error(`[Iggy] Blocked edit to ${path}: ${error.message}`);
    return 2;
  }
}

try {
  process.exitCode = main();
} catch (error) {
  console.error(`[Iggy] ${error instanceof StateError ? "Blocked" : "Unexpected error"}: ${error.message}. Check .vibe/ permissions.`);
  process.exitCode = 2;
}
