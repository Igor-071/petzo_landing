---
name: review
description: 'Runs the quality gates for the active tier and an independent review agent, then reports pass or fail per gate. Use after implementation, or for /review or "run the gates".'
---

# Skill: Quality Review

Activate when: Implementation is approved and ready for final review before shipping.

## Quality Gates

The gates, which tiers need them, how to verify them, the pass criteria and the breakpoints are all defined in **[gates.md](gates.md)**. Read it first. Run every gate the active tier requires and report pass, fail or skipped for each. All required gates must pass.

## Output Format

```
QUALITY REVIEW: [Feature Name]

| # | Gate           | Status | Notes              |
|---|----------------|--------|--------------------|
| 1 | Tests pass     | PASS   | 12/12 passing      |
| 2 | Lint clean     | PASS   |                    |
| 3 | All ACs met    | PASS   | 4/4 criteria       |
| 4 | Responsive     | PASS   | All breakpoints OK |
| 5 | Code review    | PASS   | No issues found    |

RESULT: ALL GATES PASSED — Ready to ship
```

## Review Agent (STANDARD+ tiers)

At STANDARD+ tiers, after running gates inline, launch an independent review agent for objectivity.

### Process

1. Use the Agent tool with `subagent_type: reviewer` (defined in `.claude/agents/reviewer.md`; it has no file-editing tools). Pass the feature name, the spec path, the tier and the base branch. It gathers the diff, test results and checklists itself.

2. If the review agent finds issues the inline review missed, report them to the user.
3. If the review agent and inline review agree, report confidence: "Both inline and independent review passed."

### LIGHT tier

LIGHT tier stays inline — no review agent. Just run gates 1-2 directly.

---

## Visual Verification (Gate 4b — UI changes)

For UI changes, capture Playwright screenshots at the screenshot widths in [gates.md](gates.md#breakpoints), show them to the user with a description of what changed, and wait for their confirmation. If Playwright is unavailable, mark the gate SKIPPED and ask the user to check visually.

## State Tracking

On start: `node scripts/vibe.mjs phase review`. Run gates 1 and 2 through `node scripts/vibe.mjs test` and `node scripts/vibe.mjs lint`. Don't write "ALL GATES PASSED" unless those logged runs passed after the last edit. The stop gate checks.
On each gate: record its status, the number of attempts and the first failure reason in the review report (`docs/reviews/[feature].md`, from `docs/reviews/REVIEW_TEMPLATE.md`).
Evidence: for every gate CI ran, link the CI run and its artifacts in the review report: Playwright report, axe results, Lighthouse report, coverage summary. A gate result without evidence is "not verified", not "passed". The PR description links the review report.
Between Gate 3 and Gate 5: At STANDARD+ tiers, run the `/drift` skill to check spec-implementation alignment. If drift is detected, report findings to the user before proceeding to Gate 5, and include them in the review report.
On completion: report how many issues the independent review agent caught. The next phase is `present` (`node scripts/vibe.mjs phase present`).

## Memory Integration

After review completes, persist gate results to memory:

```
Use mcp__memory__create_entities with entities:
  - name: "review-[feature-name]"
    entityType: "review-result"
    observations:
      - "Feature: [name], Tier: [tier]"
      - "Gates failed: [list any that failed first, or 'none']"
      - "Fix applied: [what was fixed to pass, if any]"

If a gate failed:
Use mcp__memory__search_nodes with query: "review gate [gate-name] failed"
Check if this gate fails repeatedly. If 3+ recent failures for the same gate:
  Report: "Note: [gate] has failed in the last N reviews — consider a pre-save hook or stricter lint config."
```

If memory MCP is unavailable, skip memory steps.

## Error Recovery

- **Tests fail:** Report which tests and why. If the fix is obvious (missing import, typo), fix it. If unclear, ask user. After ANY fix, re-run ALL gates from the beginning.
- **Lint fails:** Run the project's lint auto-fix command first (CLAUDE.md § Project Commands). If auto-fix resolves it, continue. If not, report remaining issues and fix manually. Re-run all gates.
- **Responsive check fails:** Report which breakpoint breaks and what the issue is (overflow, hidden content, tiny text). Fix. Re-check ALL breakpoints, not just the broken one.
- **Build fails:** Report the full error. Fix. Re-run the build. If the error is in a dependency, report to user.
- **Lighthouse < 90:** Report the score breakdown (Performance, Accessibility, Best Practices, SEO). Fix the top 3 issues by impact. Re-audit.
- **Accessibility fails:** Report axe-core violations with severity. Fix critical/serious first. Re-scan.
- **After ANY fix:** Re-run ALL gates from gate 1. Never assume a fix didn't affect other gates.
- **Gate is impossible to run** (e.g., no Lighthouse in CLI, no browser for responsive): Mark as SKIPPED with reason. Don't fail the review — but note it clearly.
- **All gates pass but code review finds issues:** Fix the issues. Re-run all automated gates to verify the fix didn't break anything.
