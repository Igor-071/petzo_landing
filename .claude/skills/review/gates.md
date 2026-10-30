# Quality Gates

**This file is the one definition of the quality gates.** CLAUDE.md, the workflow docs and the other skills link here instead of repeating it. `scripts/validate-template.sh` fails if a gate table, breakpoint list or pass criterion shows up in them. The fill-in checklists in `.github/PULL_REQUEST_TEMPLATE.md` and `docs/reviews/REVIEW_TEMPLATE.md` list the same widths on purpose. Keep them in sync with this file.

## Which gates run at which tier

| # | Gate | MINIMAL | LIGHT | STANDARD | FULL | EMERGENCY |
|---|------|---------|-------|----------|------|-----------|
| 1 | Tests pass | — | Required | Required | Required | Critical tests only |
| 2 | Lint clean | Required | Required | Required | Required | — |
| 3 | All ACs met | — | — | Required | Required | — |
| 4 | Responsive | — | Optional | Required | Required | — |
| 4b | Visual | — | Optional | Optional | Required | — |
| 5 | Code review | — | — | Required | Required | — |
| 6 | Performance | — | — | — | Required | — |
| 7 | Accessibility | — | — | — | Required | — |
| 8 | Cross-browser | — | — | — | Required | — |
| 9 | Build succeeds | — | — | — | Required | — |
| 10 | Security scan | — | — | — | Required | — |

Gates 4, 4b, 7 and 8 apply only to changes with a UI. Mark them N/A otherwise. EMERGENCY runs only the critical tests so the fix ships fast. The postmortem within 24 hours is where the skipped gates get their follow-up.

## How to verify each gate

| # | Gate | How to verify | Pass criteria |
|---|------|---------------|---------------|
| 1 | **Tests pass** | `node scripts/vibe.mjs test` (logged; the stop gate only trusts logged runs). In CI, also `scripts/coverage-gate.mjs` on the PR's changed lines | 0 failures. Production: changed-line coverage ≥ `thresholds.changedLineCoverage` (default 80%) |
| 2 | **Lint clean** | `node scripts/vibe.mjs lint` | 0 errors, 0 warnings |
| 3 | **All ACs met** | Traceability matrix in the spec, plus `/drift` | Every AC has a passing test that asserts it |
| 4 | **Responsive** | `e2e/responsive.spec.ts` (Playwright) at each [breakpoint](#breakpoints), or a manual check | No layout breaks, no horizontal scroll, readable text |
| 4b | **Visual** | Playwright screenshots at the [screenshot widths](#breakpoints), shown to the user | The user confirms it looks right |
| 5 | **Code review** | The `reviewer` subagent, plus your own read of the diff against `knowledge/CONVENTIONS.md`, `DEPENDENCIES.md`, `ANTI-PATTERNS.md` and `PRODUCTION_READINESS.md` | No blocker or major findings |
| 6 | **Performance** | Lighthouse CI with `lighthouserc.cjs` (`npx @lhci/cli autorun`) | Performance score ≥ `thresholds.lighthousePerformance` (default 90), FCP < 1.5s |
| 7 | **Accessibility** | `e2e/a11y.spec.ts` (`@axe-core/playwright`) on every route in `web.routes` | WCAG 2.1 AA, 0 serious or critical violations, keyboard navigation works |
| 8 | **Cross-browser** | The Playwright suite in Chromium, Firefox and WebKit (on automatically in production mode) | No visual or functional regressions |
| 9 | **Build succeeds** | `node scripts/vibe.mjs run build` | 0 errors |
| 10 | **Security scan** | `knowledge/SECURITY_CHECKLIST.md` (OWASP Top 10), plus CI's gitleaks, Semgrep and dependency audit (`vibe.mjs run audit`) | No open findings. Production: no high or critical dependency advisories |

## Breakpoints

| Width | Device | Responsive check (gate 4) | Screenshot (gate 4b) |
|-------|--------|:---:|:---:|
| 320px | Small phone (iPhone SE) | ✓ | |
| 375px | Phone | ✓ | ✓ |
| 768px | Tablet | ✓ | ✓ |
| 1024px | Small desktop | ✓ | |
| 1440px | Desktop | ✓ | ✓ |

## Checklists

Work through these during `/review`. Copy them into the review report (`docs/reviews/REVIEW_TEMPLATE.md`).

### Gate 1: Tests pass
- [ ] `node scripts/vibe.mjs test` passes after the last edit
- [ ] 0 failing tests
- [ ] Production: changed-line coverage meets `thresholds.changedLineCoverage`

### Gate 2: Lint clean
- [ ] `node scripts/vibe.mjs lint` passes after the last edit
- [ ] 0 warnings
- [ ] TypeScript strict mode (no `any`)
- [ ] No `console.log` in production code paths
- [ ] No commented-out code

### Gate 3: All ACs met
- [ ] Every AC in the spec maps to a passing test
- [ ] Traceability matrix complete
- [ ] No AC marked ⏳ or ❌
- [ ] Happy path and edge cases both covered

### Gate 4: Responsive
*(Skip for CLI/backend projects)*
- [ ] Every width in [Breakpoints](#breakpoints)
- [ ] Touch targets ≥ 44x44px
- [ ] Body text ≥ 16px on mobile

### Gate 5: Code review
- [ ] No dead code or unreachable branches
- [ ] No hardcoded values that should be config
- [ ] Error handling at system boundaries only
- [ ] No off-by-one or boundary errors
- [ ] Naming is clear; no abbreviations
- [ ] Matches design system / consistent spacing (if UI)
- [ ] Complex code has a one-line comment explaining *why*

**FULL tier adds gates 6–10:**

### Gate 6: Performance
- [ ] Lighthouse performance score meets `thresholds.lighthousePerformance` (default 90)
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] No Cumulative Layout Shift
- [ ] Images optimized

### Gate 7: Accessibility
*(Skip for CLI/backend projects)*
- [ ] WCAG 2.1 AA (axe-core or Lighthouse a11y)
- [ ] Keyboard navigation works end-to-end
- [ ] Screen reader labels present
- [ ] Color contrast passes
- [ ] Alt text for images
- [ ] Semantic HTML

### Gate 8: Cross-browser
*(Skip for non-web projects)*
- [ ] Chrome (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Chrome Mobile
- [ ] Safari Mobile

### Gate 9: Build succeeds
- [ ] `node scripts/vibe.mjs run build` exits 0
- [ ] No type errors
- [ ] No broken imports
- [ ] API calls wired to real endpoints (not mocks)
- [ ] Loading and error states display correctly

### Gate 10: Security scan
- [ ] No XSS vectors (`dangerouslySetInnerHTML` reviewed)
- [ ] No SQL/command injection points
- [ ] Secrets only in environment variables
- [ ] Input sanitization at boundaries
- [ ] Auth checks on protected routes

## When a gate can't run

If a gate's tool isn't available (no browser, no Lighthouse), mark the gate **SKIPPED** with the reason and ask the user to check it by hand. Never report a skipped gate as passed.

## Modes and CI

`mode` in `iggy.config.json` decides how strict CI is. `scripts/ci-plan.mjs` turns the config into a plan, and `.github/workflows/quality-gates.yml` runs every gate the plan enables:

| Gate in CI | `prototype` | `production` |
|------------|-------------|--------------|
| Lint, typecheck, tests, secrets (gitleaks) | Blocks | Blocks |
| Coverage on changed lines | Reports only | Blocks below the threshold |
| E2E, responsive, accessibility (needs `web`) | Runs, warns | Blocks; adds Firefox and WebKit |
| Lighthouse (needs `web`) | Skipped | Blocks below the threshold |
| Dependency audit, Semgrep | Run, warn | Block |
| Build | Skipped | Blocks |

"Warns" means the gate runs and a failure shows as a warning annotation while its check stays green, so branch protection only ever blocks on gates that are meant to block.

A gate is turned off, and the plan's job summary says why, when:
- its command isn't configured
- the language's project file (`package.json`, `pyproject.toml`/`requirements.txt`, `go.mod`) doesn't exist yet
- for browser gates, the templates from `scripts/add-web-gates.sh` aren't installed

Node commands follow the lockfile's package manager (npm, pnpm, yarn or bun). yarn and bun projects set `commands.audit` themselves, because their audit commands differ by version. Run `node scripts/ci-plan.mjs` locally to see the plan. Code review (gate 5) and the visual check (4b) always need people. In production mode, `scripts/setup-branch-protection.sh` makes CI and one approving review required on `main`.

Browser gates need the templates: `scripts/add-web-gates.sh` adds `playwright.config.ts`, `e2e/` and `lighthouserc.cjs`. Then add a `web` section to `iggy.config.json`.
