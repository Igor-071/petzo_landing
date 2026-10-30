---
name: retro
description: 'End-of-session retrospective that saves learnings to the memory knowledge graph. Use for /retro, "session retro" or "what did we learn".'
---

# Skill: Retro — Session Learning Capture

Activate when: User says `/retro`, "session retro", "what did we learn", or at the end of a significant work session.

This skill captures learnings from the current session and persists them to the memory knowledge graph for future sessions. It turns one-off experiences into reusable knowledge.

## Process

### Step 1: Gather Session Data

Read `.vibe/overrides.jsonl` and report every override the user granted this session, with its reason. Frequent overrides mean a gate is miscalibrated.

Read `.vibe/state.json` to collect:
- Active workflow (if any): feature name, tier, current phase
- Recent history: completed workflows from this session
- Gates that failed and were fixed
- Tier overrides (user changed the detected tier)

Also review:
- `git log --oneline -10` for recent commits in this session
- `git diff --stat HEAD~5..HEAD` for scope of changes (adjust range to session)

### Step 2: Ask the User

Present a brief summary of what happened, then ask:

```
SESSION SUMMARY:
- Completed: [feature/fix names]
- Tier(s) used: [tiers]
- Gates that needed fixing: [list, or "none"]

Quick retro — what stood out?
```

Use AskUserQuestion with these options:
1. "Went smoothly — save as-is"
2. "Something was harder than expected"
3. "Found a better pattern"
4. "Skip retro"

If the user picks option 2 or 3, ask a follow-up: "What was it? (one sentence)"

### Step 3: Capture Learnings

Based on session data and user input, identify:

**Patterns to save:**
- Tier accuracy: Was the detected tier correct, or did the user override?
- Gate failures: Which gates failed first? Is this recurring?
- Workflow friction: Did any phase take longer or need retries?
- New conventions: Did the user establish a new pattern worth remembering?

**Categories:**
- `session-learning` — General workflow insight
- `tier-calibration` — Detected tier was wrong, user corrected
- `gate-pattern` — A gate keeps failing, systemic issue
- `convention` — New coding convention or preference discovered
- `tooling-issue` — MCP server, hook, or tool didn't work as expected

### Step 4: Save to Memory

```
Use mcp__memory__create_entities with entities:
  - name: "retro-[date]-[feature-name]"
    entityType: "session-learning"
    observations:
      - "Session: [date], Features: [list], Tiers: [list]"
      - "Outcome: [completed/partial/blocked]"
      - "[Learning 1 — e.g., 'Tier detection suggested LIGHT but needed STANDARD for auth changes']"
      - "[Learning 2 — e.g., 'Lint gate fails on every review — eslint config needs updating']"
      - "[User insight if provided]"
```

If tier was overridden:
```
Use mcp__memory__add_observations with observations:
  - entityName: "retro-[date]-[feature-name]"
    contents: ["Tier override: detected [X], user chose [Y] for [change type]"]
```

If a gate failed repeatedly (check memory for pattern):
```
Use mcp__memory__search_nodes with query: "gate [gate-name] failed"
```
If 3+ failures: Flag it prominently in the retro output.

### Step 5: Present Retro Report

```
RETRO: [Date]

SESSION:
- [Feature/fix 1]: [tier] — completed
- [Feature/fix 2]: [tier] — completed

LEARNINGS SAVED:
- [Learning 1]
- [Learning 2]

RECURRING PATTERNS:
- [If any gate/issue appeared 3+ times across sessions]

SUGGESTIONS:
- [If tier detection was wrong: "Consider adding '[keyword]' to STANDARD signals"]
- [If a gate keeps failing: "Consider adding a pre-save hook for [issue]"]
- [If a convention was established: "Consider adding to knowledge/CONVENTIONS.md"]
```

## State Tracking

On start: No state change needed — retro runs outside the normal workflow phases.
On completion: If an active workflow exists, leave it unchanged. Retro is a side-channel.

## Rules

- Never force a retro — if the user says "skip", skip
- Keep it short — the retro output should be under 20 lines
- Focus on actionable learnings, not congratulations
- Save to memory even if the user skips the interactive part — the session data itself is valuable
- If memory MCP is unavailable, present the retro report but note: "Memory unavailable — learnings not persisted. Consider noting them in CLAUDE.local.md."

## Error Recovery

- **No session data (.vibe/state.json empty or missing):** Fall back to `git log` to reconstruct what happened. Report: "No workflow state found — reconstructing from git history."
- **Memory MCP unavailable:** Present the retro report to the user. Suggest they save key learnings manually in `CLAUDE.local.md`.
- **User provides vague feedback:** Save what you have. Don't push for more detail — the retro should feel lightweight, not interrogative.
- **No recent commits:** The session may have been exploration/research only. Report: "No code changes detected. Was this a research session?" Save any user-provided learnings anyway.
