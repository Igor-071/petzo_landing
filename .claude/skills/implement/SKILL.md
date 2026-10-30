---
name: implement
description: 'TDD implementation of an approved spec, one acceptance criterion at a time (RED, GREEN, refactor), with traceability. Use after the spec and test plan are approved, or for /implement.'
---

# Skill: TDD Implementation

Activate when: User approves a spec and you're ready to write code.

## Process

For EACH acceptance criterion in the approved spec:

### Step 0: Resolve the API (if using a framework or library)
Before writing any test, fetch current documentation:
```
Add 'use context7' to your next prompt, or invoke the context7 MCP tool.
Do this BEFORE writing the test — stale API docs mean a broken test from the start.
Skip this step only if you are writing pure logic with no third-party imports.
```

### Step 1: RED — Write a failing test
```
Write a test that asserts the expected behavior from the AC.
Run it with `node scripts/vibe.mjs test`. It MUST fail. If it passes, the test is wrong.
Source edits stay blocked until the first failing run is logged.
```

### Step 2: GREEN — Write minimum code
```
Write the simplest code that makes the test pass.
No optimization. No cleverness. Just make it green.
Run ALL tests — not just the new one.
```

### Step 2.5: Checkpoint (if risky)
```
Before refactoring, suggest a checkpoint if:
- The refactor touches 3+ files
- The user says "let me try something"
Use /checkpoint save to create a git stash restore point.
```

### Step 3: BLUE — Refactor
```
Clean up while all tests stay green.
Extract duplication. Improve names. Simplify logic.
Run ALL tests after refactoring.
```

### Step 4: Update traceability
```
Fill in the test file and test name in the spec's traceability matrix.
```

Then move to the next AC.

## Rules

- One AC at a time. Don't batch.
- Run tests after EVERY change. Not just at the end.
- If a test is hard to write, the design is wrong. Refactor first.
- Context7 is Step 0, not a footnote — do it before writing the test.
- Keep test files next to source files or in a parallel `__tests__/` directory — match the project convention.

## After All ACs Are Done

1. `node scripts/vibe.mjs test`
2. `node scripts/vibe.mjs lint`
3. Present results to user in this format:

```
IMPLEMENTATION COMPLETE: [Feature Name]

Acceptance Criteria:
- AC-001: [description] — PASSED
- AC-002: [description] — PASSED

Tests: X passing, 0 failing
Lint: Clean

Traceability:
| Criterion | Test File        | Test Name              | Status |
|-----------|------------------|------------------------|--------|
| AC-001    | auth.test.ts:15  | handles valid login    | PASS   |

AWAITING YOUR APPROVAL
```

4. **STOP. Wait for user approval.**

## State Tracking

On start: `node scripts/vibe.mjs phase implement`. Run every test and lint through `node scripts/vibe.mjs test` and `node scripts/vibe.mjs lint`, so the results are logged.
On each AC completion: Update the AC's status to "passed" with test file path.
On all ACs done: the phase stays `implement` until the user approves. The next phase is `review`.

## Memory Integration

After implementation completes, save patterns to memory:

```
Use mcp__memory__create_entities with entities:
  - name: "impl-[feature-name]"
    entityType: "implementation"
    observations:
      - "Feature: [name], ACs: [count], Tests: [count passing]"
      - "Patterns used: [e.g., TanStack Query, Zod validation, etc.]"
      - "Issues encountered: [any notable blockers or design changes]"
```

If memory MCP is unavailable, skip and proceed.

## Error Recovery
- **Context7 fails or is unavailable:** Warn user. Fall back to WebSearch for current docs. Note in output: "context7 unavailable — used web search for API docs."
- **RED test passes unexpectedly:** The test is wrong — it doesn't test what you think. Delete it. Re-read the AC. Write a test that actually fails without the implementation.
- **GREEN breaks other tests:** REVERT the change. The coupling means the design needs rethinking. Understand why the other tests broke before retrying. Fix the design, not the symptoms.
- **Lint fails after refactor:** Fix lint issues immediately. Re-run all tests to confirm nothing broke.
- **A dependency is missing:** Report it to user: "This AC requires [package]. Please install it." Don't auto-install packages.
- **Stuck on an AC:** After reasonable effort, STOP. Report what you tried, what failed, and where you're blocked. Ask for guidance. Don't spin.
- **Test is hard to write:** The design is wrong. Step back. Consider: Is the AC too broad? Is the component too coupled? Refactor the design first, then write the test.
