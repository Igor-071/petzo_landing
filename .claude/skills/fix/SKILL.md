---
name: fix
description: 'Quick fix for MINIMAL or LIGHT changes: a small bug, typo, copy or styling change that doesn''t need a spec. Use for /fix, "fix this" or "quick fix".'
---

# Skill: Quick Fix

Activate when: User says `/fix`, "fix this", "quick fix", or describes a small bug/change that doesn't need full ceremony.

This is a shortcut for MINIMAL and LIGHT tiers. No spec, no test plan, no full review.

## Process

### Step 1: Assess Scope

Read the user's request and determine:

**MINIMAL** (just do it):
- Typo, spelling, grammar fix
- Copy/wording change
- CSS/styling tweak (color, padding, margin, font)
- Config file change
- Single-line fix with obvious correctness

**LIGHT** (test + fix):
- Bug fix (logic error, crash, wrong behavior)
- Small component addition or modification
- Refactoring (extract function, rename, move file)
- Anything that could break existing behavior

If unclear: Default to LIGHT (safer).

Then `node scripts/vibe.mjs start fix-[short-name] --tier <MINIMAL|LIGHT>` and propose the tier in one line: "TIER: LIGHT. Reply approved to go ahead." Source edits stay blocked until the user replies with just "approved". With `"enforcement": "standard-only"` in `iggy.config.json`, quick fixes don't need that confirmation.

### Step 2: Execute

**MINIMAL path:**
1. Read the relevant file(s)
2. Make the change
3. `node scripts/vibe.mjs lint`
4. If lint passes: Report "Fixed. Lint clean."
5. If lint fails: Auto-fix with the project's lint auto-fix command, then report

**LIGHT path:**
1. Read relevant code to understand the issue
2. Write a failing test that reproduces the bug/validates the change
   - If the change is purely visual (CSS-only): skip the test, note why
3. `node scripts/vibe.mjs test`: confirm it fails (RED)
4. Make the fix (minimum change to pass the test)
5. `node scripts/vibe.mjs test` and `node scripts/vibe.mjs lint`
6. If everything passes: Report results
7. If something fails: Fix and re-run
8. **STOP & WAIT** for user approval

### Step 3: Update State

After the user approves the result: `node scripts/vibe.mjs complete`. This moves the workflow to history.

### Step 4: Save to Memory

If the fix revealed a pattern (common bug type, fragile area of code):

```
Use mcp__memory__create_entities with entities:
  - name: "fix-[brief-description]"
    entityType: "fix-pattern"
    observations:
      - "Fix: [description], Tier: [MINIMAL/LIGHT], Files: [affected files]"
      - "Pattern: [what was wrong and why — e.g., 'missing null check in API response handler']"
```

If memory MCP is unavailable, skip this step.

## Output Format

**MINIMAL:**
```
FIXED: [description]
File: [path]
Lint: Clean
```

**LIGHT:**
```
FIXED: [description]

Changes:
- [file]: [what changed]

Tests: X passing, 0 failing
Lint: Clean

AWAITING YOUR APPROVAL
```

## Error Recovery

- If the "quick fix" turns out to be complex (3+ files, unclear root cause): STOP. Recommend upgrading to STANDARD tier with `/vibe feature`.
- If tests fail after the fix: Don't thrash. Read the failing test, understand why, fix properly.
- If lint can't be auto-fixed: Report the issue. Fix manually.
- If the file doesn't exist or path is wrong: Ask user for correct location.

## Rules

- Never create a spec for a quick fix
- Never run full quality gates — just lint (MINIMAL) or lint+tests (LIGHT)
- If the user asks for something that clearly needs a spec (new feature, new page, API endpoint): Redirect to `/vibe feature` or `/spec`
- Quick fixes should complete in one interaction. If you need to STOP & WAIT more than once, the change isn't quick.
