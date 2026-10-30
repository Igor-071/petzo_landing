# Feature Specification Template

Copy this template to `docs/specs/[feature-name].md` when starting a new feature.

---

```markdown
# Specification: [Feature Name]

**Author:** [Author]
**Date:** [YYYY-MM-DD]
**Status:** Draft | Under Review | Approved | Implemented

---

## 1. Overview

### 1.1 Summary
[One paragraph describing what this feature does and why it's needed]

### 1.2 Goals
- [Goal 1]
- [Goal 2]
- [Goal 3]

### 1.3 Non-Goals
- [What this feature explicitly will NOT do]
- [Out of scope items]

### 1.4 User Story
As a [type of user],
I want [goal/desire],
So that [benefit/value].

---

## 2. Acceptance Criteria

> **Use concrete data.** Every GIVEN/WHEN/THEN should include specific values, not placeholders. Concrete data produces precise tests and catches edge cases early.

**Good example:**
```
### AC-001: Successful login
GIVEN a registered user with email "alice@example.com" and password "SecurePass1!"
WHEN they enter their credentials and click "Sign In"
THEN they are redirected to "/dashboard"
  AND a session cookie is set with 24-hour expiry
  AND the last-login timestamp is updated
```

**Bad example (too vague):**
```
### AC-001: Successful login
GIVEN a valid user
WHEN they log in
THEN they see the dashboard
```

---

### AC-001: [Brief descriptive title]

GIVEN [specific precondition with concrete values]
  AND [additional precondition if needed]
WHEN [specific action with real data]
  AND [additional action if needed]
THEN [measurable outcome with expected values]
  AND [additional outcome if needed]

---

### AC-002: [Brief descriptive title]

GIVEN [specific precondition with concrete values]
WHEN [specific action]
THEN [measurable outcome]

---

### AC-003: [Brief descriptive title]

GIVEN [specific precondition with concrete values]
WHEN [specific action]
THEN [measurable outcome]

---

### AC-004: Error Handling - [Error scenario]

GIVEN [specific precondition that leads to error]
WHEN [action that triggers error with concrete input]
THEN [exact error behavior — message text, UI state, retry logic]
  AND [user-visible feedback with exact message text]

---

### AC-005: Edge Case - [Edge case description]

GIVEN [edge case precondition with boundary values]
WHEN [action at the boundary]
THEN [expected behavior]

---

## 2b. Decision Tables (for complex conditional logic)

> Use decision tables when an AC has multiple input combinations that produce different outcomes. This complements Given/When/Then for branching scenarios.

| Condition | Condition | Expected Result |
|-----------|-----------|-----------------|
| [Input A = X] | [Input B = Y] | [Outcome 1] |
| [Input A = X] | [Input B = Z] | [Outcome 2] |
| [Input A = W] | [Input B = Y] | [Outcome 3] |

**Example — Login attempts:**

| Email valid? | Password correct? | Attempts < 3? | Result |
|-------------|-------------------|---------------|--------|
| Yes | Yes | — | Redirect to /dashboard |
| Yes | No | Yes | Show "Invalid credentials. N attempts remaining." |
| Yes | No | No | Lock account, show "Account locked for 15 minutes." |
| No | — | — | Show "Please enter a valid email address." |

---

## 3. Traceability Matrix

| Criterion | Test File | Test Name | Status |
|-----------|-----------|-----------|--------|
| AC-001 | | | ⏳ |
| AC-002 | | | ⏳ |
| AC-003 | | | ⏳ |
| AC-004 | | | ⏳ |
| AC-005 | | | ⏳ |

**Status:** ⏳ Pending | ✅ Passed | ❌ Failed

---

## 4. Technical Design

### 4.1 Components/Files to Create or Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/[Name].tsx` | Create | [Purpose] |
| `src/hooks/use[Name].ts` | Create | [Purpose] |
| `src/[existing].tsx` | Modify | [What changes] |

### 4.2 Data Model

```typescript
// Define any new types/interfaces
interface [Name] {
  id: string;
  // ... fields
}
```

### 4.3 API Endpoints (if applicable)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/[resource]` | [Description] |
| POST | `/api/[resource]` | [Description] |

### 4.4 State Management

[Describe how state will be managed - context, store, local state, etc.]

---

## 5. UI/UX Requirements

### 5.1 Mobile Requirements (320px - 767px)

- [Mobile-specific behavior]
- [Touch interactions]
- [Layout adjustments]

### 5.2 Tablet Requirements (768px - 1023px)

- [Tablet-specific behavior]

### 5.3 Desktop Requirements (1024px+)

- [Desktop-specific behavior]

### 5.4 Interactions

- [Hover states]
- [Click/tap behavior]
- [Animations/transitions]

### 5.5 Accessibility

- [Keyboard navigation]
- [Screen reader considerations]
- [Focus management]

---

## 6. Error Handling

| Error Scenario | User Message | Technical Handling |
|----------------|--------------|-------------------|
| [Scenario 1] | "[User-friendly message]" | [How to handle] |
| [Scenario 2] | "[User-friendly message]" | [How to handle] |

---

## 7. Performance Considerations

- [Loading strategy]
- [Caching approach]
- [Bundle size impact]
- [Lazy loading needs]

---

## 8. Security Considerations

- [Authentication requirements]
- [Authorization checks]
- [Input validation]
- [Data sanitization]

---

## 9. Testing Strategy

### 9.1 Unit Tests
- [What to unit test]

### 9.2 Integration Tests
- [What to integration test]

### 9.3 Manual Testing
- [Manual testing scenarios]

---

## 10. Dependencies

### 10.1 New Dependencies
- [Package name] - [Why needed]

### 10.2 Feature Dependencies
- [Other features this depends on]

---

## 11. Production Readiness (FULL tier: required)

Fill in every subsection for FULL-tier features. For STANDARD, delete what doesn't apply.

### 11.1 Threat Model (STRIDE-lite)

| Threat | Where it could happen | Mitigation | Test or check |
|--------|----------------------|------------|---------------|
| **S**poofing (pretending to be someone else) | | | |
| **T**ampering (changing data in transit or at rest) | | | |
| **R**epudiation (denying an action) | | | |
| **I**nformation disclosure (leaking data) | | | |
| **D**enial of service | | | |
| **E**levation of privilege | | | |

### 11.2 Data Model and Migrations

- Schema changes: [tables, columns, indexes]
- Migration: [forward script, how long it takes on production-sized data, whether it locks tables]
- Backfill: [needed? how?]
- Backwards compatibility: [can the previous release run against the new schema?]

### 11.3 Rollback Plan

- How to roll back the code: [revert / redeploy previous version / feature flag off]
- How to roll back the data: [down migration, restore point, or why it's not needed]
- Who decides, and the signal that triggers it: [error rate, alert, metric]

### 11.4 Observability

- Logs: [events logged, with no secrets or personal data]
- Metrics: [what's counted or timed]
- Alerts: [condition → who gets paged]
- Dashboard: [link once it exists]

### 11.5 Configuration and Secrets

| Setting | Where it lives | Default | Secret? |
|---------|----------------|---------|---------|
| | | | |

### 11.6 Architecture Decisions

List the ADRs for this feature (`docs/adr/NNNN-*.md`, from `docs/adr/0000-template.md`).

---

## 12. Rollout Plan

- [ ] Implementation complete
- [ ] All tests passing
- [ ] Quality gates passed
- [ ] User testing approved
- [ ] Documentation generated
- [ ] Ready for commit

---

## 13. Open Questions

- [ ] [Question 1]
- [ ] [Question 2]

---

## Sign-off

| Role | Name | Date | Approved |
|------|------|------|----------|
| Product Owner | [User] | | [ ] |
| Tech Lead | [Name] | | [ ] |
| Quality Lead | [Name] | | [ ] |
```

---

## Usage Notes

1. Copy this template to `docs/specs/[feature-name].md`
2. Fill in all sections
3. Ensure ALL acceptance criteria use Given/When/Then with **concrete data** (not placeholders)
4. Include at least one error handling AC with exact error messages
5. Include at least one edge case AC with boundary values
6. Add a decision table (section 2b) if any AC has 3+ input combinations
7. Leave traceability matrix status as ⏳
8. Present to user for approval before coding
