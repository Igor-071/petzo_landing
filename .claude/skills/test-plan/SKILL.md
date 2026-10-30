---
name: test-plan
description: 'Plans the test matrix for an approved spec before implementation starts. Use after a spec is approved, or for /test-plan or "plan tests".'
---

# Skill: Test Planning

Activate when: User says "plan tests", "/test-plan", or after a spec is approved and before implementation begins.

Purpose: Between an approved spec and the first RED test, produce a test matrix so TDD cycles don't thrash. One pass of thinking up front saves many test rewrites later.

## Process

### Step 1: Load the approved spec

Read `docs/specs/[feature-name].md`. Confirm it is approved (look for an "APPROVED" marker or ask the user if unclear). If the spec has no ACs, stop and ask for ACs before planning tests.

### Step 2: For each AC, decide the test shape

For every AC-NNN in the spec, decide:

- **Test level**: unit | integration | E2E
- **Test strategy**: traditional | property-based (see below)
- **Test file**: where it will live (`src/**/*.test.ts`, `tests/e2e/*.spec.ts`, etc.)
- **Test name**: a Given/When/Then phrase matching the AC
- **Fixtures needed**: mock data, stubs, test DB seed
- **Edge cases**: at least one negative path per AC

**Property-based testing triggers:** If an AC involves any of these, suggest property-based tests alongside traditional ones:
- **Boundaries/ranges**: "between N and M", "at least X", "at most Y", "1-100 characters"
- **Data validation**: "valid email", "valid URL", "must match format"
- **State machines**: "transitions from X to Y", "cannot go from A to C directly"
- **Transformations**: "converts X to Y", "formats", "parses", "serializes"
- **Invariants**: "total must equal sum of parts", "order is preserved", "idempotent"

When suggesting property-based tests, specify:
- Library: `fast-check` (JS/TS), `Hypothesis` (Python), or project equivalent
- Property to test (e.g., "any string 6-20 chars with a digit is accepted")
- Generator to use (e.g., `fc.string({minLength: 6, maxLength: 20})`)

### Step 3: Call out cross-cutting tests

Some tests aren't tied to a single AC — call them out separately:
- Responsive breakpoint tests (if UI)
- Accessibility smoke test (if UI + FULL tier)
- Error-path tests that span multiple ACs

### Step 4: Write the test plan

Append a `## Test Plan` section to `docs/specs/[feature-name].md`:

```markdown
## Test Plan

| AC | Level | Strategy | File | Test Name | Fixtures | Edge Cases |
|----|-------|----------|------|-----------|----------|------------|
| AC-001 | unit | traditional | `src/auth/login.test.ts` | `redirects on valid credentials` | mock user | wrong password, locked account |
| AC-002 | integration | traditional | `tests/api/session.test.ts` | `stores session token` | in-memory db | expired token |
| AC-003 | unit | property | `src/auth/password.test.ts` | `accepts valid passwords` | fc.string generators | boundary lengths, special chars |

**Cross-cutting:**
- Responsive: `tests/responsive/login.spec.ts` (the breakpoints in `review/gates.md`)
- A11y smoke: `tests/a11y/login.spec.ts` (keyboard + axe)
```

### Step 5: Stop & Wait

Report:

```
TEST PLAN READY

File: docs/specs/[feature-name].md (Test Plan section appended)
Total tests planned: N
Levels: X unit, Y integration, Z E2E

Next: approve this plan, then /implement to start the TDD cycle.

AWAITING YOUR APPROVAL
```

## State Tracking

On start: `node scripts/vibe.mjs phase test_plan`. The test plan is appended to the spec file, which changes its hash, so the user's approval of the test plan covers both.
On completion: present the test plan with its test count and wait. The phase stays `test_plan` until the user approves.

## Rules

- One test per AC minimum. Fewer = AC is too vague, push back.
- Don't write the test code here — just the matrix.
- Prefer unit > integration > E2E. Only go higher when the AC demands it.
- If an AC involves boundaries or validation, always suggest property-based tests alongside traditional ones. Property tests find edge cases humans miss.
- If the spec has no ACs, stop and ask for ACs before planning tests.

## Error Recovery
- **Spec not found:** Ask user for the spec file location, or offer to create one with `/spec`.
- **Spec has no ACs:** STOP. Tell the user: "This spec has no acceptance criteria. I can't plan tests without them." Do not guess test shapes.
- **AC is untestable as written:** Flag it specifically. Propose a rewrite that's testable. Wait for approval before including in the plan.
- **Testing framework not configured:** Report what's missing (e.g., "No test runner found — need Jest, Vitest, or similar"). Don't proceed until resolved.
- **Too many ACs (>10):** Suggest splitting the feature. But plan all of them if user insists.
- **Conflicting ACs:** Flag the conflict. Ask user to clarify which behavior is correct.
