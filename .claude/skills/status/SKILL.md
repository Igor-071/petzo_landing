---
name: status
description: 'Shows the current workflow state from .vibe/state.json: feature, tier, phase, acceptance criteria and gates. Use for /status, /vibe status, "where are we" or "what am I working on".'
---

# Skill: Workflow Status

Activate when: User says `/status`, `/vibe status`, "what's the status", "where are we", or "what am I working on".

## Process

### Step 1: Read State

Run `node scripts/vibe.mjs status`. It combines `.vibe/state.json` (what Claude proposed) with `.vibe/approvals.json` (what the user confirmed) and the latest logged test and lint runs.

If the file doesn't exist or is empty:
```
NO ACTIVE WORKFLOW

Start one with:
  /vibe <description>    Auto-detect tier and begin
  /spec <feature>        Start a STANDARD+ spec
  /fix <description>     Quick fix (MINIMAL/LIGHT)

No recent history found.
```

### Step 2: Display Active Workflow (if exists)

```
WORKFLOW STATUS

Active: [Feature Name]
Tier: [MINIMAL | LIGHT | STANDARD | FULL | EMERGENCY]
Phase: [Current phase] ([progress])
Started: [timestamp or relative time]

[If STANDARD+:]
Acceptance Criteria:
  [x] AC-001: [description] — PASSED
  [x] AC-002: [description] — PASSED
  [ ] AC-003: [description] — IN PROGRESS
  [ ] AC-004: [description] — PENDING
  [ ] AC-005: [description] — PENDING

[If gates have been run:]
Quality Gates:
  [x] Lint — PASSED
  [x] Tests — PASSED (12/12)
  [ ] Responsive — NOT YET RUN
  [ ] Code review — NOT YET RUN

Next: [What comes next in the workflow]
```

### Step 3: Display History (last 5)

```
Recent History:
  1. [Feature Name] — LIGHT — Completed [date]
  2. [Feature Name] — STANDARD — Completed [date]
  3. [Feature Name] — MINIMAL — Completed [date]
```

### Step 4: Show Parallel Workflows (if worktrees active)

```
Parallel Workflows:
  main: [active feature] — STANDARD — Implementation phase
  feature/auth: [feature name] — LIGHT — Completed, awaiting merge
```

## Error Recovery

- If `.vibe/state.json` is corrupted: Report the issue. Offer to create a fresh state file.
- If state references files that no longer exist (spec deleted, etc.): Note the inconsistency. Suggest cleanup.
- If no state file but there are specs/reviews in docs/: Mention them as potential in-progress work.
