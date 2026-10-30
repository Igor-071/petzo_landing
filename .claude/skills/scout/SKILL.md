---
name: scout
description: 'Codebase reconnaissance before a STANDARD or FULL workflow. Scans conventions, prior art, patterns and risks and returns a short briefing. Use for /scout or at the start of any new feature.'
---

# Skill: Scout — Codebase Reconnaissance

Activate when: User says `/scout`, or auto-invoked at the start of STANDARD+ tier workflows via `/vibe`.

## Purpose

Scan the project for conventions, patterns, prior art, and risks before writing a spec or code. Returns a concise briefing so the rest of the workflow builds on reality, not assumptions.

## Process

### Step 1: Launch the Scout

Use the Agent tool with `subagent_type: scout` (defined in `.claude/agents/scout.md`, read-only). Pass the feature name and one line on what it should do. The agent knows what to report and in what format.

### Step 2: Return Briefing

**When auto-invoked (via `/vibe`):**
- Display a one-line summary to the user: `Scout: [key finding]. Full briefing consumed.`
- Feed the full briefing into subsequent workflow phases internally

**When explicitly invoked (`/scout`):**
- Display the full 20-30 line briefing to the user

## Output Format

```
SCOUT BRIEFING: [Feature Name]

STRUCTURE: [1-2 lines on project layout]
CONVENTIONS: [2-3 lines on patterns found]
TEST PATTERNS: [1-2 lines on testing approach]
PRIOR ART: [2-3 lines on reusable existing code]
RISKS: [2-3 lines on concerns]
```

## State Tracking

On start: `node scripts/vibe.mjs phase scout`.
On completion: include the number of actionable findings (risks, prior art matches, convention notes) in the briefing. The next phase is `spec`.

## Rules

- Never spawned for MINIMAL or LIGHT tiers
- Always spawned as step 1 for STANDARD and FULL tiers (unless user skips with `--skip-scout`)
- The subagent is read-only — it must not modify any files
- Briefing should cite specific file paths, not vague descriptions
- If the project is empty or has no source code yet, report that and skip

## Error Recovery

- **Subagent fails or times out:** Proceed without briefing. Log: "Scout unavailable — proceeding without codebase briefing."
- **Project is empty:** Report "No source code found" and proceed to spec phase.
- **Subagent returns too much:** Truncate to 30 lines. The briefing is a summary, not a report.
