---
name: drift
description: 'Detects divergence between a spec''s acceptance criteria and the actual tests and code. Use for /drift, "check drift" or "does the implementation match the spec". Runs during /review at STANDARD and above.'
---

# Skill: Drift — Spec vs Implementation Divergence Detection

Activate when: User says `/drift`, "check drift", "does the implementation match the spec", or auto-invoked during `/review` at STANDARD+ tiers after implementation is complete.

This skill compares spec acceptance criteria against actual test assertions and implementation code to detect divergence — things the spec promised but the code doesn't deliver, or things the code does that the spec never mentioned.

## Process

### Step 1: Load Inputs

1. Read the spec from `docs/specs/[feature].md` (get the path from `node scripts/vibe.mjs status`)
2. Extract all acceptance criteria (AC-001, AC-002, etc.) with their Given/When/Then text
3. Read the traceability matrix to find test file paths for each AC

If no spec exists: Report "No spec found — drift detection requires a spec. Use `/spec` first."

### Step 2: Analyze Each AC

For each acceptance criterion:

**a) Find the test:**
- Read the test file from the traceability matrix
- If no test file mapped: Flag as `UNTESTED` (high drift risk)

**b) Compare test assertions against AC intent:**
- Read the test code for this AC
- Check: Does the test assert all THEN/AND conditions from the spec?
- Check: Does the test set up the GIVEN preconditions correctly?
- Check: Does the test trigger the WHEN action?

**c) Check implementation coverage:**
- From the test, trace to the implementation code being tested
- Check: Does the implementation handle the edge cases mentioned in the spec?
- Check: Are there code paths in the implementation not covered by any AC?

**d) Assign drift status:**

| Status | Meaning |
|--------|---------|
| `CLEAN` | Test fully covers AC intent. No divergence. |
| `PARTIAL` | Test covers some but not all THEN conditions. |
| `UNTESTED` | AC has no corresponding test. |
| `OVERTESTED` | Test asserts things not in the spec (not necessarily bad — may indicate missing ACs). |
| `STALE` | Spec was updated after tests were written. Timestamps don't match. |

### Step 2b: Mock Boundary Check

For each AC's test file, check whether the test mocks the very module the AC is supposed to verify:

**a) Detect mock patterns:**
- JavaScript/TypeScript: `jest.mock(...)`, `vi.mock(...)`, `sinon.stub(...)`
- Python: `unittest.mock.patch(...)`, `monkeypatch.setattr(...)`
- Go: mock interfaces in `_test.go` files (e.g. `type mock*` structs)

**b) Compare mock targets against AC boundaries:**
- If the test mocks the exact module/function the AC's WHEN/THEN is supposed to exercise, the test may not be verifying real behavior
- Don't flag unrelated mocks (e.g. mocking an HTTP client when the AC is about form validation)
- Don't flag fixtures, factories, or test data builders — only mock/stub/spy patterns

**c) Check for integration test backup:**
- Search for integration or E2E tests that cover the same AC without mocking
- An AC with a mocked unit test AND an integration test is covered

**d) Assign mock status:**

| Status | Meaning |
|--------|---------|
| `REAL` | Test hits the real boundary — no relevant mocks |
| `MOCK-COVERED` | Unit test mocks the boundary, but an integration test covers it |
| `MOCK-ONLY` | Unit test mocks the boundary with no integration backup |

Rules:
- `MOCK-ONLY` is a caution, not a failure — some boundaries are expensive to test without mocks
- Don't flag mocks of external services (APIs, databases) unless the AC specifically tests the integration
- Don't flag fixtures, factories or test data builders

### Step 3: Check for Undocumented Behavior

Scan the implementation files for behavior NOT covered by any AC:
- Error handling that no AC specifies
- Edge cases the code handles but the spec doesn't mention
- API endpoints or routes not in the spec
- State management logic without corresponding ACs

Flag these as `UNDOCUMENTED` — they're not bugs, but they represent spec gaps that should be formalized.

### Step 4: Present Drift Report

```
DRIFT REPORT: [Feature Name]

| AC | Status | Mock | Risk | Details |
|----|--------|------|------|---------|
| AC-001 | CLEAN | REAL | Low | All 3 THEN conditions asserted |
| AC-002 | PARTIAL | MOCK-COVERED | Medium | Missing assertion for "AND session expires after 24h" |
| AC-003 | UNTESTED | — | High | No test file mapped in traceability matrix |

UNDOCUMENTED BEHAVIOR:
- src/services/auth.ts:45 — Rate limiting logic (not in spec)
- src/components/LoginForm.tsx:89 — Remember me checkbox (not in spec)

SUMMARY:
- 2/3 ACs fully covered
- 1 AC needs test coverage
- 2 undocumented behaviors found

DRIFT RISK: MEDIUM
Recommendation: Add test for AC-003, consider adding ACs for rate limiting and remember-me.
```

### Step 5: Save to Memory

```
Use mcp__memory__create_entities with entities:
  - name: "drift-[feature-name]"
    entityType: "drift-check"
    observations:
      - "Feature: [name], ACs: [total], Clean: [count], Partial: [count], Untested: [count]"
      - "Undocumented behaviors: [count]"
      - "Overall risk: [LOW/MEDIUM/HIGH]"
```

If memory MCP is unavailable, skip this step.

## When to Auto-Invoke

- During `/review` at STANDARD+ tiers: Run drift detection between Gate 3 (ACs met) and Gate 5 (code review)
- The review skill should incorporate drift findings into the code review gate

## Risk Levels

| Level | Criteria | Action |
|-------|----------|--------|
| LOW | All ACs CLEAN, 0-1 undocumented behaviors, no MOCK-ONLY | Proceed — no drift |
| MEDIUM | 1+ PARTIAL ACs, or 2+ undocumented behaviors, or any MOCK-ONLY findings | Flag to user — fix before shipping |
| HIGH | Any UNTESTED ACs, or 3+ PARTIAL, or STALE spec | Block shipping — update spec or tests first |

## State Tracking

Drift checks run inside the review phase, so they don't change the workflow phase.
On completion: return the drift results to the review so they go into the review report.

## Rules

- Drift detection is read-only — never modify code, tests, or specs
- Report findings objectively — don't auto-fix drift, let the user decide
- OVERTESTED is informational, not a failure — extra test coverage is usually good
- UNDOCUMENTED behavior is not a bug — it may be intentional. Flag it, don't judge it
- If the spec has no traceability matrix, all ACs are effectively UNTESTED

## Error Recovery

- **Spec file not found:** Check `.vibe/state.json` for the spec path. If not there, search `docs/specs/` for matching feature name. If still not found, report: "No spec found for [feature]."
- **Test files not found:** The traceability matrix may have stale paths. Search for test files by name pattern. Report which ones couldn't be found.
- **Implementation files unclear:** Use the test imports to trace back to implementation files. If imports are indirect (re-exports), follow the chain.
- **Large codebase (50+ implementation files):** Focus drift analysis on files directly imported by tests. Don't scan the entire codebase.
- **Memory MCP unavailable:** Skip memory step. Present drift report only.
