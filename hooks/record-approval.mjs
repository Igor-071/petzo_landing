#!/usr/bin/env node
// UserPromptSubmit hook. The only place approvals and overrides are created,
// so only a message the user actually sent can create one.
//
//   - A message that is *only* an approval phrase approves the current phase.
//     Anything longer ("approved, but rename X") is feedback and records nothing.
//   - "/vibe override <reason>" grants one blocked action and logs the reason.
//
// Never blocks the user's message. Plain stdout is added to Claude's context.

import { readFileSync } from "node:fs";
import { StateError, appendApproval, appendOverride, loadState, runIdOf, specHash } from "./lib/vibe-state.mjs";

const APPROVAL_PHRASES = new Set([
  "approved",
  "approve",
  "lgtm",
  "looks good",
  "ship it",
  "green light",
  "/vibe approve",
  "/v approve",
]);

function readPrompt() {
  try {
    const input = JSON.parse(readFileSync(0, "utf8"));
    return String(input.prompt ?? input.user_message ?? "");
  } catch {
    return "";
  }
}

function normalize(message) {
  return message.trim().toLowerCase().replace(/[\s.!]+$/, "").replace(/\s+/g, " ");
}

function recordApproval(active) {
  appendApproval({
    runId: runIdOf(active),
    feature: active.feature,
    phase: active.phase,
    tier: active.tier,
    specPath: active.specPath ?? null,
    specHash: active.specPath ? specHash(active.specPath) : null,
    at: Date.now(),
  });
  const phase = active.phase === "tier_proposed" ? `tier ${active.tier}` : active.phase;
  console.log(`[Iggy] Recorded your approval of ${phase} for "${active.feature}" (tier ${active.tier}).`);
}

function recordOverride(active, reason) {
  if (!reason) {
    console.log("[Iggy] /vibe override needs a reason, for example: /vibe override hotfix for login outage");
    return;
  }
  appendOverride({ runId: runIdOf(active), feature: active.feature, reason, at: Date.now(), used: false });
  console.log(`[Iggy] Override recorded for "${active.feature}": it allows one blocked action. Reason: ${reason}`);
}

function main() {
  const prompt = readPrompt();
  const message = normalize(prompt);
  const override = prompt.trim().match(/^\/(?:vibe|v)\s+override(?:\s+([\s\S]+))?$/i);
  const isApproval = APPROVAL_PHRASES.has(message);
  if (!override && !isApproval) return;

  const active = loadState().active;
  if (!active) {
    console.log("[Iggy] There's no active workflow, so nothing was approved.");
    return;
  }
  if (override) recordOverride(active, (override[1] || "").trim());
  else recordApproval(active);
}

try {
  main();
} catch (error) {
  console.log(`[Iggy] Couldn't record approval: ${error.message}. Check .vibe/ permissions.`);
}
