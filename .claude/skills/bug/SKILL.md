---
name: bug
description: 'Structured bug analysis: root cause (5 Whys), postmortem in docs/bugs/, failing regression test first, then a minimal fix. Use when a bug is reported or found, or for /bug.'
---

# Skill: Bug Analysis

Activate when: A bug is found during development or reported by user.

## Process

### 1. STOP — Don't fix yet
Understand before acting.

### 2. Reproduce
```
Write the exact steps to reproduce the bug.
If you can't reproduce it, you can't fix it.
```

### 3. Five Whys
```
Why did it happen? → [Answer 1]
Why? → [Answer 2]
Why? → [Answer 3]
Why? → [Answer 4]
Why? → [Root cause]
```

### 3b. Bug Agent (when root cause is unclear)

If the Five Whys stall or the root cause is uncertain, launch an independent investigation:

1. Use the Agent tool with `subagent_type: bug-hunter` (defined in `.claude/agents/bug-hunter.md`; it has no file-editing tools). Pass the bug description, the reproduction steps and where the Five Whys stalled.

2. Use the agent's analysis to inform the fix. If the agent identifies a different root cause than your initial analysis, update the Five Whys.
3. If the agent's confidence is low, report to user and ask for guidance.

### 4. Write failing test FIRST
```
Write a test that reproduces the bug.
Run it. Confirm it fails.
This is now your regression test.
```

### 5. Fix — Minimal change
```
Fix the root cause. Not the symptom.
The smallest change that makes the failing test pass.
```

### 6. Verify
```
Run ALL tests. Not just the new one.
The fix must not break anything else.
```

### 7. Document in `docs/bugs/BUG-[number]-[name].md`

```markdown
# BUG-[number]: [Short description]

## What happened
[One paragraph]

## Root cause (Five Whys)
1. [Why 1]
2. [Why 2]
3. [Why 3]
4. [Why 4]
5. [Root cause]

## Fix applied
[What was changed and why]

## Regression test
[File:line — test name]

## Prevention
[What would prevent this class of bug in the future]
```

## State Tracking

On start: `node scripts/vibe.mjs start bug-[short-name] --tier LIGHT` (or `EMERGENCY`) and ask the user to approve the tier before changing code.
On verification: run `node scripts/vibe.mjs test` and `vibe.mjs lint`, then `node scripts/vibe.mjs complete` once the user approves.

## Memory Integration

After bug resolution, persist the pattern to the memory knowledge graph:

```
Use mcp__memory__create_entities with entities:
  - name: "bug-[BUG-number]-[short-name]"
    entityType: "bug-pattern"
    observations:
      - "Category: [e.g., SSR hydration, race condition, null reference]"
      - "Root cause: [one-line root cause from Five Whys]"
      - "Files: [affected file paths]"
      - "Prevention: [what would prevent this class of bug]"

Use mcp__memory__create_relations to link related bugs:
  - from: "bug-[this]" to: "bug-[related]" relationType: "similar-to"
```

On future bugs, search first:
```
Use mcp__memory__search_nodes with query: "[error message or symptom keywords]"
```
If a match is found: "A similar bug was found before — see BUG-003. Root cause was [pattern]."

If memory MCP is unavailable, skip memory steps. The bug postmortem doc still captures this information.

## Rules
- Never skip the failing test. The test proves the bug existed and proves it's fixed.
- Fix root causes, not symptoms. A symptom fix means the bug comes back.
- Keep bug docs short. If it takes more than a page, the bug is multiple bugs.

## Error Recovery
- **Bug is not reproducible:** Document exactly what you tried (steps, environment, data). Ask user for more context, exact steps, or screenshots. Don't guess at a fix for a bug you can't reproduce.
- **Five Whys stalls (can't go deeper):** Report where the analysis stopped and why. Ask user for domain knowledge: "I reached 'the validation regex is wrong' but I don't know why it was written this way. Can you provide context?"
- **Regression test is hard to write:** The bug may span multiple systems or involve timing/state. Simplify: test the smallest reproducible case. If truly untestable, document why and add a manual test step.
- **Fix breaks other tests:** REVERT immediately. The root cause analysis was incomplete — the actual root cause is deeper or different. Go back to Five Whys with new information.
- **Can't find root cause after reasonable effort:** Report your findings honestly. Suggest pair debugging or point to the most likely area. Don't fabricate a root cause.
- **Bug is actually a feature request:** Clarify with user. If it's a feature, redirect to `/vibe feature` or `/spec`. Don't treat feature requests as bugs.
