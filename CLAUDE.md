# CLAUDE.md - Iggy v4

How Claude Code works on this project. This file loads on every turn, so it holds the rules. The details live in the skills (`.claude/skills/`) and `docs/`.

## Project Overview

**Project:** Petzo Landing Page
**Type:** web
**Stack:** Vite, Three.js, GSAP, Lenis, vanilla JS/CSS

---

## Tiers: Ceremony Matches Complexity

Every request gets a tier. The `/vibe` skill detects it, proposes it and runs its phases.

| Tier | When | Phases |
|------|------|--------|
| **MINIMAL** | Typos, copy, styling, config | Change → Lint |
| **LIGHT** | Bug fixes, small additions, refactoring | Understand → Failing test → Fix → Verify → Approval |
| **STANDARD** | New features, significant changes | Scout → Spec → Test plan → Implement (TDD) → Review → Present |
| **FULL** | Epics, architecture, security, migrations | STANDARD + technical design, all 10 gates, architecture and security review, full docs |
| **EMERGENCY** | Production down, critical security | Reproduce → Regression test → Fix → Critical tests only → Ship with approval → Postmortem within 24h |

Emergency keywords always win. When the tier is unclear, ask. The user can always override ("make this STANDARD", `--light`).

## Commands

```
/vibe (or /v) fix|tweak|update|add|refactor|feature|epic|hotfix <description>
/vibe status | approve | override <reason> | pause | resume | abort
/plan <idea or document>     Decompose into ordered features
Flags: --minimal --light --standard --full --skip-test --with-spec --with-review
```

- "Not quite", "redo", "wrong": ask what to change, then revise.
- "Make it thorough": propose a higher tier. "Keep it simple": propose a lower one. Either way, wait for approval.
- The full command reference is in the `/vibe` skill.

Skills: `/scout` `/prime` `/plan` `/spec` `/test-plan` `/implement` `/review` `/drift` `/ship` `/bug` `/fix` `/checkpoint` `/retro` `/status` `/mock-data-doc` `/worktree` `/getting-started`. The full reference is in `docs/GUIDE.md`.

## Enforced Workflow

These rules are enforced by hooks, not just written down. Each hook has tests in `tests/hooks/`.

| What | Enforced by | Effect |
|------|-------------|--------|
| Only the user approves | `hooks/record-approval.mjs` (UserPromptSubmit) | An approval is recorded only when the user's **whole message** is `approved`, `approve`, `lgtm`, `looks good`, `ship it`, `green light` or `/vibe approve`. "Approved, but…" is feedback. |
| Tier needs the user's confirmation | `hooks/phase-gate.mjs` (PreToolUse) | Source edits stay blocked until the user approves the proposed tier. Only an approval at `tier_proposed` confirms a tier. |
| No code before an approved spec | `hooks/phase-gate.mjs` | At STANDARD/FULL, source edits need the spec and test plan approved. Editing the spec afterwards needs a new approval, except for its Traceability and `## Notes` sections. |
| Test fails first | `hooks/phase-gate.mjs` | At STANDARD/FULL, source edits unlock only after a failing `vibe.mjs test` run. Test files are never blocked. |
| No false "done" | `hooks/stop-gate.mjs` (Stop) | A line starting with "FEATURE COMPLETE", "IMPLEMENTATION COMPLETE" or "ALL GATES PASSED" is blocked unless the logged test and lint runs passed after the last edit |
| Hook-owned files | `hooks/security-guard.sh` | Claude can't write `.vibe/approvals.json`, `.vibe/overrides.jsonl` or `.vibe/test-log.jsonl`, run the gate hooks by hand, or delete `.vibe/` |

**How Claude works with it:**
- Drive state through `node scripts/vibe.mjs`: `start <feature> --tier <T>`, `tier <T>`, `phase <name>`, `spec <path>`, `test`, `lint`, `status`, `complete`, `abort`, `validate`. Never edit `.vibe/` by hand.
- Run tests and lint through `vibe.mjs test` and `vibe.mjs lint`. Only logged runs count.
- When a gate blocks, tell the user why. Never work around it. Only the user can type `/vibe override <reason>`, which allows one blocked action and is logged for `/retro`.
- If the work isn't done, say so plainly without the completion phrases.

**Configuration** (`iggy.config.json`): `enforcement` is `"strict"` (default: every source edit needs a confirmed tier) or `"standard-only"` (only confirmed STANDARD/FULL work is gated; faster for prototypes, weaker). `sourceDirs` sets the gated folders. `commands.test` and `commands.lint` are what `vibe.mjs` runs. State schema and file formats: `docs/GUIDE.md` § Workflow state.

**Git backstop:** `lefthook.yml` runs gitleaks, lint and typecheck before each commit and tests before each push (`lefthook install`). CI re-runs the automated gates on every PR.

## Quality Gates

The gates per tier, how to verify them, the pass criteria and the breakpoints are defined once, in `.claude/skills/review/gates.md`. Never skip a gate the active tier requires. A gate that can't run is reported as SKIPPED, never as passed.

## Agents

Three subagents in `.claude/agents/` work with fresh context. None has file-editing tools. The reviewer and bug-hunter have Bash, for git and test runs only:
- **scout** briefs on conventions, prior art and risks before a spec.
- **reviewer** independently checks the gates and the diff during `/review`.
- **bug-hunter** traces the root cause when the Five Whys stall.

## Acceptance Criteria

Every acceptance criterion at STANDARD and above uses Given/When/Then with concrete values, and gets a row in the spec's traceability matrix (criterion → test file → test name → status):

```gherkin
### AC-001: [Brief description]
GIVEN [precondition]
WHEN [action]
THEN [expected result]
```

The delivery format and the feature-doc step after approval are defined in the `/vibe` skill.

## Code Style

- Small functions, one purpose each. Clear names, no abbreviations.
- Handle errors at system boundaries. Trust internal code.
- Conventional commits: `feat|fix|docs|spec|test|refactor|chore(scope): description`. The message says WHY. The diff shows what.
- Use `use context7` (or the context7 MCP tools) before writing code against any framework or library.

## Project Commands

All commands (dev, test, coverage, lint, lintFix, typecheck, build, e2e, audit) live in `iggy.config.json` → `commands`, with defaults for the project's `language` (node, python or go). Hooks, CI and lefthook all read them from there.
- Run one with `node scripts/vibe.mjs run <name>`. Run tests and lint as `vibe.mjs test` / `vibe.mjs lint`, so they're logged.
- `node scripts/vibe.mjs config` shows the resolved commands.
- `mode` (`prototype` or `production`) sets how strict CI is (see `gates.md` § Modes and CI).

## When Stuck or Something Fails

- Run `node scripts/vibe.mjs status` to see what's proposed, approved and passing. Read the spec in `docs/specs/`.
- After any fix, re-run **all** checks, not just the one that failed. If a fix breaks other tests, revert and rethink the design.
- If a quick fix grows (3+ files, unclear root cause), propose moving to STANDARD.
- Never guess at requirements, types or root causes. Ask the user.
- Memory (`mcp__memory__*`): search it before starting a workflow and save lessons after one. Skip it if the server is unavailable.

## Key Places

| Path | What |
|------|------|
| `.claude/skills/` | Workflow skills. `review/gates.md` defines the quality gates. |
| `.claude/agents/` | scout, reviewer, bug-hunter |
| `.claude/settings.json` | Permissions and hooks |
| `hooks/`, `scripts/vibe.mjs` | Gate hooks and the state CLI |
| `knowledge/` | Conventions, approved dependencies, anti-patterns, production readiness, security checklist |
| `docs/` | Methodology, workflow rules, quick reference, templates, specs, bugs, reviews, features |
| `docs/evidence/` | Auto-generated evidence trails per completed feature |
| `scripts/promote-to-production.sh` | Validates readiness and promotes mode to production |
| `scripts/add-mop-foundation*.sh` | Pull the MOP Next.js / React Native foundation. Workflow files are never overwritten. |

## Critical Rules

**ALWAYS**
1. Match ceremony to complexity: use the right tier.
2. Write failing tests before implementation (LIGHT and above).
3. Wait for the user's explicit approval at every phase gate.
4. Keep the traceability matrix current, and write feature docs on approval (STANDARD and above).
5. Drive workflow state through `node scripts/vibe.mjs`.

**NEVER**
1. Commit or push without the user's instruction.
2. Skip a quality gate the active tier requires, or report a skipped gate as passed.
3. Work around a blocking hook, or write `.vibe/` files by hand.
4. Guess at requirements. Ask.
5. Force push, `reset --hard` or `clean -f`.
