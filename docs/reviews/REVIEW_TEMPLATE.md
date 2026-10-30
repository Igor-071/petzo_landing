# Quality Review Template

Copy this template to `docs/reviews/[feature-name].md` after implementation.

Gate names and order match `.claude/skills/review/SKILL.md` — the authoritative definition.

---

```markdown
# Quality Review: [Feature Name]

**Reviewer:** [Reviewer]
**Date:** [YYYY-MM-DD]
**Spec:** [Link to docs/specs/[feature-name].md]
**Tier:** STANDARD | FULL
**Status:** In Review | Passed | Failed

---

## 1. Acceptance Criteria Verification

| Criterion | Description | Verified | Notes |
|-----------|-------------|----------|-------|
| AC-001 | [Brief description] | [ ] | |
| AC-002 | [Brief description] | [ ] | |
| AC-003 | [Brief description] | [ ] | |

**Result:** [ ] All criteria verified

---

## 2. Quality Gates

### STANDARD Tier (5 gates — always required)

### Gate 1: Tests pass
- [ ] Project's test command exits 0 (see CLAUDE.md § Project Commands)
- [ ] 0 failing tests
- [ ] Coverage meets project threshold (if configured)

**Status:** [ ] PASSED  [ ] FAILED

**Notes:**

---

### Gate 2: Lint clean
- [ ] Project's lint command exits 0 (see CLAUDE.md § Project Commands)
- [ ] 0 warnings
- [ ] TypeScript strict mode (no `any`)
- [ ] No `console.log` in production code paths
- [ ] No commented-out code

**Status:** [ ] PASSED  [ ] FAILED

**Notes:**

---

### Gate 3: All ACs met
- [ ] Every AC in the spec maps to a passing test
- [ ] Traceability matrix complete (all ✅)
- [ ] No AC marked ⏳ or ❌
- [ ] Happy path and edge cases both covered

**Status:** [ ] PASSED  [ ] FAILED

**Notes:**

---

### Gate 4: Responsive
*(Skip for CLI/backend projects)*

| Breakpoint | Tested | Issues |
|------------|--------|--------|
| 320px (iPhone SE) | [ ] | |
| 375px (iPhone standard) | [ ] | |
| 768px (Tablet) | [ ] | |
| 1024px (Desktop) | [ ] | |
| 1440px (Large desktop) | [ ] | |

- [ ] Touch targets ≥ 44x44px
- [ ] Body text ≥ 16px on mobile
- [ ] No horizontal scroll at any breakpoint
- [ ] Images scale appropriately

**Status:** [ ] PASSED  [ ] FAILED  [ ] N/A

**Notes:**

---

### Gate 5: Code review
- [ ] No dead code or unreachable branches
- [ ] No hardcoded values that should be config
- [ ] Error handling at system boundaries only
- [ ] No off-by-one or boundary errors
- [ ] Naming is clear; no abbreviations
- [ ] Matches design system / consistent spacing (if UI)
- [ ] Complex code has a one-line *why* comment

**Structural Production Readiness** *(see `knowledge/PRODUCTION_READINESS.md`)*
- [ ] No N+1 queries — batch fetches, no per-item DB calls in loops
- [ ] No unbounded queries — all list endpoints have pagination or limits
- [ ] No race conditions — shared state protected; concurrent access safe
- [ ] No missing `await` — all async calls properly awaited or error-handled
- [ ] No unhandled promise rejections — fire-and-forget promises have `.catch()`
- [ ] No memory leaks — listeners, timers, subscriptions cleaned up on disposal
- [ ] No missing loading/error states — async UI has loading, error, and empty states
- [ ] No circular dependencies — module imports form a DAG

**Status:** [ ] PASSED  [ ] FAILED

**Notes:**

---

### FULL Tier (adds 5 — skip for STANDARD tier)

### Gate 6: Performance
- [ ] Lighthouse Performance > 90
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] No Cumulative Layout Shift
- [ ] Images optimized (WebP, lazy loading)

**Metrics:**
- Lighthouse Score: ___
- FCP: ___s
- TTI: ___s
- Bundle Size Impact: ___KB

**Status:** [ ] PASSED  [ ] FAILED  [ ] N/A (STANDARD tier)

**Notes:**

---

### Gate 7: Accessibility
*(Skip for CLI/backend projects)*

- [ ] WCAG 2.1 AA (axe-core or Lighthouse a11y clean)
- [ ] Keyboard navigation works end-to-end (Tab, Enter, Escape)
- [ ] Focus visible on all interactive elements
- [ ] Screen reader labels present (tested with VoiceOver/NVDA)
- [ ] Proper heading hierarchy
- [ ] Alt text for all images
- [ ] Color contrast passes
- [ ] Form labels properly associated

**Status:** [ ] PASSED  [ ] FAILED  [ ] N/A

**Notes:**

---

### Gate 8: Cross-browser
*(Skip for non-web projects)*

| Browser | Version | Tested | Issues |
|---------|---------|--------|--------|
| Chrome | Latest | [ ] | |
| Safari | Latest | [ ] | |
| Firefox | Latest | [ ] | |
| Chrome Mobile | Latest | [ ] | |
| Safari Mobile | Latest | [ ] | |

**Status:** [ ] PASSED  [ ] FAILED  [ ] N/A

**Notes:**

---

### Gate 9: Build succeeds
- [ ] Project's build command exits 0 (see CLAUDE.md § Project Commands)
- [ ] No type errors
- [ ] No broken imports
- [ ] API calls wired to real endpoints (not mocks)
- [ ] Loading and error states display correctly

**Status:** [ ] PASSED  [ ] FAILED  [ ] N/A (STANDARD tier)

**Notes:**

---

### Gate 10: Security scan
*(Check against `knowledge/SECURITY_CHECKLIST.md` — OWASP Top 10)*

**A01 Broken Access Control**
- [ ] Auth middleware on all protected endpoints
- [ ] Authorization checks — users can only access their own resources
- [ ] CORS configured with specific origins (not `*`) on auth endpoints

**A02 Cryptographic Failures**
- [ ] No secrets hardcoded in source; all from environment variables
- [ ] No server secrets exposed in client bundles (`NEXT_PUBLIC_`, `REACT_APP_`)
- [ ] Passwords hashed with bcrypt/scrypt/argon2 (not MD5/SHA)

**A03 Injection**
- [ ] No SQL/NoSQL string concatenation — parameterized queries only
- [ ] No command injection — `execFile()` with args array, not `exec()` with strings
- [ ] No XSS — `innerHTML`/`dangerouslySetInnerHTML` reviewed and sanitized
- [ ] No path traversal — file paths validated against base directory

**A04 Insecure Design**
- [ ] Rate limiting on login, signup, password reset
- [ ] Server-side validation for all client-submitted data

**A05 Misconfiguration**
- [ ] No stack traces or internal errors leaked to client in production
- [ ] Security headers set (CSP, HSTS, X-Content-Type-Options)

**A06 Vulnerable Components**
- [ ] `npm audit` / `pip audit` clean; no known CVEs
- [ ] New dependencies approved in `knowledge/DEPENDENCIES.md`

**A07 Auth Failures**
- [ ] JWT has `exp` claim; access tokens short-lived
- [ ] Session tokens not in URLs; rotated after login
- [ ] Logout invalidates tokens server-side

**A08-A10 & Other**
- [ ] No sensitive data (passwords, tokens, PII) in logs
- [ ] HTTPS enforced for all external calls
- [ ] Server-side URL fetches validated against allowlist (SSRF)
- [ ] No prototype pollution vectors (`__proto__`, `constructor.prototype`)

**Status:** [ ] PASSED  [ ] FAILED  [ ] N/A (STANDARD tier)

**Notes:**

---

## 3. Traceability Matrix Verification

| Criterion | Test File | Test Name | Status |
|-----------|-----------|-----------|--------|
| AC-001 | `[file]` | `[name]` | ✅/❌ |
| AC-002 | `[file]` | `[name]` | ✅/❌ |
| AC-003 | `[file]` | `[name]` | ✅/❌ |

**All tests passing:** [ ] Yes  [ ] No

---

## 4. Summary

### Gates Summary

| Gate | Status |
|------|--------|
| Tests pass | |
| Lint clean | |
| All ACs met | |
| Responsive | |
| Code review | |
| Performance | |
| Accessibility | |
| Cross-browser | |
| Build succeeds | |
| Security scan | |

### Overall Result

[ ] **PASSED** — All required gates passed, ready for user testing
[ ] **FAILED** — Issues found, requires fixes

### Issues Found

| Issue | Severity | Gate | Description |
|-------|----------|------|-------------|
| 1 | High/Medium/Low | [Gate] | [Description] |

### Recommendations

[Any recommendations for improvement]

---

## 5. Sign-off

| Role | Name | Date | Approved |
|------|------|------|----------|
| Quality Lead | [Name] | [DATE] | [ ] |
```

---

## Usage Notes

1. Copy this template after implementation is complete
2. Verify each acceptance criterion manually
3. At STANDARD tier, Gates 6–10 are marked N/A
4. At FULL tier, ALL 10 gates must pass
5. Document any issues found
6. Feature cannot proceed to user testing until all required gates PASSED
