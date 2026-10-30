---
name: vibe
description: 'Adaptive workflow router. Picks a tier (MINIMAL, LIGHT, STANDARD, FULL, EMERGENCY) for a change and runs that tier''s phases. Use for /vibe or /v, or whenever the user asks to fix, tweak, add, build, refactor or ship something in this project.'
---

# Skill: Vibe — Adaptive Workflow Router

Activate when: User says `/vibe`, `/v`, or describes a change/feature/fix/task to work on.

This is the **master router**. It detects complexity, picks the right tier, and executes the workflow.

## Process

### Step 1: Parse the Request

Extract from the user's message:
- **What** they want (fix, feature, refactor, etc.)
- **Scope** clues (file names, component names, "small", "big", "major")
- **Explicit command** (`/vibe fix`, `/vibe feature`, `/vibe epic`, etc.)
- **Explicit tier flag** (`--minimal`, `--light`, `--standard`, `--full`)

### Step 2: Detect Tier

**If explicit tier flag** → Use that tier. No detection needed.

**If explicit command** → Use the command's default tier:
| Command | Default Tier |
|---------|-------------|
| `tweak` | MINIMAL |
| `fix` | LIGHT |
| `update` | LIGHT |
| `refactor` | LIGHT |
| `add` | STANDARD |
| `feature` | STANDARD |
| `epic` | FULL |
| `hotfix` | EMERGENCY |

**If natural language** → Run auto-detection with confidence scoring:

Scan for signals in each tier and count matches:

| Tier | Signals (weight: 1 each) |
|------|-------------------------|
| MINIMAL | typo, spelling, grammar, copy, wording, rename, color, padding, margin, config, env, "change X to Y", single file/line scope |
| LIGHT | fix, bug, broken, crash, error, wrong, add button, small component, refactor, extract, move, 1-3 files, 10-100 lines |
| STANDARD | feature, implement, build, create, new page, form, API endpoint, database, auth, 3-10 files, 100-500 lines |
| FULL | epic, major, architecture, redesign, migration, security overhaul, platform, 10+ files, 500+ lines |
| EMERGENCY | urgent, critical, production down, security vulnerability, data breach, users affected, hotfix |

**Scope multipliers** (boost confidence when present):
- File count mentioned ("3 files") → +2 to the matching tier
- Line estimate mentioned ("about 200 lines") → +2 to the matching tier
- Specific file path mentioned → +1 to MINIMAL or LIGHT (implies targeted change)

**Calculate confidence:**
```
winning_tier = tier with highest signal count
confidence = winning_signals / total_signals_detected

HIGH  (>0.75): One tier dominates — proceed immediately
MEDIUM (0.5-0.75): Some ambiguity — propose with reasoning, proceed
LOW   (<0.5): Signals split across tiers — ask user before proceeding
```

**Emergency always wins.** Any emergency signal = EMERGENCY tier, confidence HIGH.

### Step 3: Propose and Confirm

Every tier waits for the user's confirmation. The workflow hooks block source edits until the user replies with just "approved" (see CLAUDE.md § Enforced Workflow). Run `node scripts/vibe.mjs start <feature> --tier <TIER>` and then propose:

**HIGH or MEDIUM confidence**: propose and wait.
```
TIER: STANDARD (confidence: medium)
Signals: "feature" + "auth" (2 STANDARD) vs "small" (1 LIGHT)
Phases: Scout → Spec → Test Plan → Implement → Review

Reply "approved" to start, or tell me a different tier.
```

If the user names another tier, run `node scripts/vibe.mjs tier <TIER>` and propose again.

**LOW confidence** — ask user before proceeding:
```
TIER: unclear (confidence: low)
Signals: "add" (STANDARD) + "button" (LIGHT) + "redesign" (FULL)

This could go multiple ways. What's the scope?
1. Small addition to existing page → LIGHT
2. New feature with spec → STANDARD
3. Major rework → FULL
4. Product idea / multiple features → run /plan first to decompose
```

Use AskUserQuestion for LOW confidence. Do NOT proceed without an answer.

### Step 4: Check Memory

Before executing, search the memory knowledge graph for relevant context:

```
Use the mcp__memory__search_nodes tool with query: "[feature name] OR [related keywords]"
```

Look for:
- Similar features built before (what tier was used?)
- Lessons learned that apply to this type of change
- User's past tier override patterns

If relevant memory exists, mention it briefly:
"Note: A similar auth feature was built last week at STANDARD tier. Reusing patterns."

If memory MCP is unavailable, skip and proceed.

### Step 5: Load State

Run `node scripts/vibe.mjs status`:
- If an active workflow exists for a DIFFERENT feature: Warn user. Ask to complete or abort the other one (`node scripts/vibe.mjs complete` or `abort`).
- If resuming the SAME feature: Report where we left off, including what the user has approved.
- If no active workflow: `node scripts/vibe.mjs start <feature> --tier <TIER>` (done in Step 3).

Never edit `.vibe/state.json` by hand, and never write `.vibe/approvals.json`, `.vibe/overrides.jsonl` or `.vibe/test-log.jsonl`. Only the hooks write those, and the security guard blocks attempts.

### Step 6: Execute the Tier

Run tests and lint through `node scripts/vibe.mjs test` and `node scripts/vibe.mjs lint`. They run the commands from `iggy.config.json` and log the result, and the stop gate only trusts logged runs.

**MINIMAL:**
1. Read the relevant file(s)
2. Make the change
3. `node scripts/vibe.mjs lint`
4. If lint fails: fix and re-lint
5. Report: "Done. Lint clean."
6. `node scripts/vibe.mjs complete`

**LIGHT:**
1. Read relevant code to understand the issue
2. If testable: Write a failing test → `node scripts/vibe.mjs test` (RED)
3. Make the fix / change
4. `node scripts/vibe.mjs test` and `node scripts/vibe.mjs lint`
5. If tests fail: fix and re-run
6. Report results
7. **STOP & WAIT** for approval
8. `node scripts/vibe.mjs complete`

**STANDARD:**
1. `node scripts/vibe.mjs phase scout`, then invoke `/scout`
2. Invoke `/spec` → **STOP & WAIT** for approval
3. Invoke `/test-plan` → **STOP & WAIT** for approval
4. Invoke `/implement` (TDD cycle for each AC; source edits unlock after the first failing test run)
5. Invoke `/review` (quality gates; review agent verifies independently)
6. `node scripts/vibe.mjs phase present`, present results → **STOP & WAIT** for approval
7. On approval: generate feature docs, then `node scripts/vibe.mjs complete`

**FULL:**
1. If the request looks like multiple STANDARD features bundled together, suggest `/plan` to decompose first.
2. Same as STANDARD, but:
   - Spec includes technical design, security, performance sections
   - Run ALL 10 quality gates
   - Architecture review gate
   - Security review gate (if auth/data changes)
   - Generate comprehensive documentation
   - `node scripts/vibe.mjs complete`

**EMERGENCY:**
1. Reproduce the issue (exact steps)
2. Write regression test
3. Fix (minimal, targeted)
4. Run critical tests only
5. **STOP & WAIT** — user decides to ship
6. After shipping: schedule postmortem within 24h
7. Create `docs/bugs/BUG-[number]-[name].md`
8. `node scripts/vibe.mjs complete`

### Step 7: Save to Memory

After any workflow completes, persist results to the memory knowledge graph:

```
Use mcp__memory__create_entities with entities:
  - name: "workflow-[feature-name]"
    entityType: "workflow"
    observations:
      - "Feature: [name], Tier: [tier], Result: [completed/aborted]"
      - "Gates: [list passed/failed gates]"
      - "Issues: [any notable issues encountered]"

If user overrode tier detection:
Use mcp__memory__add_observations to add:
  - "User overrode [detected tier] → [chosen tier] for [change type]"

If a bug pattern was found:
Use mcp__memory__create_entities with entityType: "bug-pattern"
```

If memory MCP is unavailable, skip and proceed.

## Command Reference

`/vibe` has the alias `/v`.

| Command | Default tier |
|---------|-------------|
| `/vibe tweak <description>` | MINIMAL |
| `/vibe fix <description>`, `/vibe update …`, `/vibe refactor …` | LIGHT |
| `/vibe add <description>`, `/vibe feature …` | STANDARD |
| `/vibe epic <description>` | FULL |
| `/vibe hotfix <description>` | EMERGENCY |
| `/plan <description>` | (pre-workflow) |

**Flags** (append to any command): `--minimal`, `--light`, `--standard`, `--full` force a tier. `--skip-test` skips tests (MINIMAL only). `--with-spec` adds a spec phase to LIGHT. `--with-review` adds a review phase to LIGHT. A forced tier is still proposed and needs the user's approval.

**Workflow control:**
- `/vibe status`: `node scripts/vibe.mjs status`
- `/vibe approve`: typed by the user. The approval hook records it.
- `/vibe override <reason>`: typed by the user. Allows one blocked action.
- `/vibe pause`: stop and summarize where things are. State stays in `.vibe/` as is.
- `/vibe resume`: `node scripts/vibe.mjs status`, then continue from the recorded phase.
- `/vibe abort`: `node scripts/vibe.mjs abort`

**Natural-language triggers:**
- **Approval:** a message that is *only* "approved", "looks good", "green light", "ship it" or "lgtm". The hook records it. A longer message is feedback.
- **Rejection:** "change this", "not quite", "redo", "wrong". Ask what needs to change, then revise.
- **More ceremony:** "this needs more ceremony", "make it thorough". Propose the next tier up with `node scripts/vibe.mjs tier <TIER>` and wait for approval.
- **Less ceremony:** "keep it simple", "just do it". Propose the next tier down the same way. Dropping below STANDARD skips the spec gates, so say that explicitly.

## Error Recovery

- If auto-detection is uncertain: Ask the user. Never guess.
- If a tier's phases fail midway: Save state. Report what happened. Ask to retry or change tier.
- If user overrides to a lower tier mid-workflow: Drop remaining phases for the higher tier.
- If user overrides to a higher tier mid-workflow: Add remaining phases for the higher tier.
- If `.vibe/state.json` is corrupted: `node scripts/vibe.mjs validate` shows what's wrong. Ask the user before resetting it.
- If a gate blocks wrongly: explain the block to the user. Only they can grant a one-time `/vibe override <reason>`.
- If memory MCP is unavailable: Skip memory steps. Proceed normally.

## Output Format (Completion)

```
FEATURE COMPLETE: [Feature/Fix Name]
TIER: [MINIMAL | LIGHT | STANDARD | FULL | EMERGENCY]

WHAT WAS BUILT:
[Clear description]

[If STANDARD+:]
ACCEPTANCE CRITERIA:
- AC-001: [description] — PASSED
...

QUALITY GATES:
| Gate | Status |
|------|--------|
| Lint | PASS   |
...

HOW TO TEST:
1. [Steps]

AWAITING YOUR APPROVAL
```
