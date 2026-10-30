# Iggy Guide

How Iggy works day to day: what to type, what Claude does, what the hooks block, and how to configure it. For *why* it works this way, read [METHODOLOGY.md](./METHODOLOGY.md).

Each topic has one owner, and this guide links to it instead of repeating it:

| Topic | Owner |
|-------|-------|
| The rules Claude follows | [CLAUDE.md](../CLAUDE.md) |
| What each phase does, step by step | The skills in [`.claude/skills/`](../.claude/skills/) |
| Quality gates, pass criteria, breakpoints | [gates.md](../.claude/skills/review/gates.md) |
| Full command reference and flags | [The `/vibe` skill](../.claude/skills/vibe/SKILL.md#command-reference) |

---

## 1. Cheat sheet

| Tier | When | What happens | Your approvals |
|------|------|--------------|----------------|
| **MINIMAL** | Typo, copy, styling, config | Change → lint | Tier |
| **LIGHT** | Bug fix, small addition, refactor | Failing test → fix → tests and lint | Tier, result |
| **STANDARD** | New feature | Scout → spec → test plan → TDD → review → present | Tier, spec, test plan, result |
| **FULL** | Epic, architecture, security, migration | STANDARD plus design, security and all gates | Tier, spec, test plan, result |
| **EMERGENCY** | Production down | Reproduce → regression test → fix → critical tests → ship → postmortem within 24h | Tier, ship |

```
/vibe <what you want>          Detects the tier and proposes it
/vibe fix|update|refactor ...  LIGHT        /vibe tweak ...    MINIMAL
/vibe add|feature ...          STANDARD     /vibe epic ...     FULL
/vibe hotfix ...               EMERGENCY
/plan <idea>                   Split a big idea into ordered features first
/vibe status                   Where are we, and what's next
/vibe pause | resume | abort

Flags: --minimal --light --standard --full --with-spec --with-review
```

**Approving:** reply with only `approved` (or `approve`, `lgtm`, `looks good`, `ship it`, `green light`). "Approved, but rename X" is feedback, not an approval, and nothing unlocks.

**Changing the tier:** say "make it LIGHT" (or any tier) at any point. The workflow goes back to tier confirmation and waits for your `approved`.

---

## 2. How a change flows

1. **You ask.** `/vibe add CSV export` or plain words.
2. **Claude proposes a tier** and starts a workflow (`node scripts/vibe.mjs start`). Source edits stay blocked.
3. **You confirm** with `approved`, or name another tier.
4. **Claude runs the tier's phases.** At STANDARD and FULL:
   - `/scout` briefs on conventions and risks in the codebase.
   - `/spec` writes `docs/specs/<feature>.md` with Given/When/Then criteria. **You approve it.**
   - `/test-plan` adds the test matrix to the spec. **You approve it.**
   - `/implement` works one criterion at a time: failing test (RED), code (GREEN), refactor. Source edits unlock only after a logged failing test.
   - `/review` runs the gates, and the independent `reviewer` agent checks the diff.
   - Claude presents the result. **You approve it**, and Claude writes the feature docs and evidence.
5. **You decide when to commit.** `/ship` proposes the commit and PR; nothing is committed or pushed without you.

Big idea? Run `/plan` first. It splits the idea into 3–7 features, each sized for one STANDARD workflow.

Found a bug? `/bug` runs the Five Whys, writes a post-mortem in `docs/bugs/`, then a failing regression test before the fix.

---

## 3. What the hooks enforce

These are code, not suggestions. Each hook has tests in `tests/hooks/`, and all of them are wired in `.claude/settings.json`.

| Hook | When | What it does |
|------|------|--------------|
| `security-guard.sh` | Before every Read, Edit, Write and Bash call | Blocks secrets files (`.env*` except templates, keys, credentials) and destructive commands (force push, `reset --hard`, `clean -f`, `rm -rf /`, `curl \| sh`). Blocks writes to the hook-owned `.vibe/` files and running the gate hooks by hand. Fails closed without `jq`. |
| `phase-gate.mjs` | Before edits to files under `sourceDirs` (test files are exempt) | Blocks until the tier is confirmed. At STANDARD and FULL it also needs the spec and test plan approved, the spec unchanged since approval, and a logged failing test run. Fails closed without Node.js. |
| `post-edit.sh` | After edits to JS/TS files | Runs the project's own ESLint with `--fix` and flags risky code (`eval`, `innerHTML`, SQL built from strings, `exec` with built strings, logged secrets, `Math.random()` for tokens). Claude must fix it or explain why it's safe. |
| `record-approval.mjs` | When you send a message | Records an approval only when your whole message is an approval phrase. Records `/vibe override <reason>`. Never blocks your message. |
| `stop-gate.mjs` | When Claude finishes a turn | Blocks a line starting with "FEATURE COMPLETE", "IMPLEMENTATION COMPLETE" or "ALL GATES PASSED" unless the logged test and lint runs passed after the last edit. |

**When a gate blocks you:** Claude says why. If you want the action anyway, type `/vibe override <reason>`. It allows exactly one blocked action and is logged for `/retro`. Claude can't override on its own.

**Limits:** the security guard is a guardrail against mistakes, not a sandbox. It errs toward blocking (a command that only *mentions* `.env` is blocked, and you run it yourself), and it doesn't catch every destructive variant. The permission rules in `.claude/settings.json`, Claude Code's own confirmation prompts and CI are the other layers.

---

## 4. Skills

| Skill | Use it for |
|-------|-----------|
| `/vibe` | Everything. Detects the tier and runs its phases. |
| `/plan` | Splitting a product idea into ordered features |
| `/fix` | A quick MINIMAL or LIGHT change |
| `/status` | What's proposed, approved and passing |
| `/scout`, `/prime` | Codebase briefing before a spec; loading context for a task |
| `/spec`, `/test-plan`, `/implement`, `/review` | The STANDARD and FULL phases, in order (`/vibe` calls them for you) |
| `/drift` | Checking the code still matches the spec's criteria |
| `/ship` | Proposing the commit and PR |
| `/bug` | Root cause analysis, post-mortem and regression test |
| `/checkpoint` | Save points during implementation (git stash) |
| `/worktree` | Several features in parallel, each on its own branch and folder |
| `/mock-data-doc` | Prototype handoff: `docs/MOCKED_DATA_STRUCTURE.md` for the backend team |
| `/retro` | Saving the session's lessons to memory |
| `/getting-started` | A guided first feature |

Each skill is one file, `.claude/skills/<name>/SKILL.md`, with its steps and its own error recovery. The agents (`scout`, `reviewer`, `bug-hunter`) live in `.claude/agents/`; none of them can edit files.

---

## 5. Configuration

### `iggy.config.json`

Hooks, CI and lefthook all read it. `node scripts/vibe.mjs config` shows the resolved values, and `node scripts/vibe.mjs validate` checks it against `schemas/iggy.config.schema.json`.

| Key | What it sets |
|-----|--------------|
| `mode` | `prototype` (CI blocks on lint, types, tests and secrets; the rest warns) or `production` (every gate CI can run blocks). See [gates.md § Modes and CI](../.claude/skills/review/gates.md#modes-and-ci). |
| `language` | `node`, `python` or `go`. Sets the default commands. |
| `enforcement` | `strict` (every source edit needs a confirmed tier) or `standard-only` (only STANDARD and FULL work is gated; lighter for prototypes) |
| `sourceDirs` | The folders the phase gate protects |
| `commands` | `dev`, `test`, `coverage`, `lint`, `lintFix`, `typecheck`, `build`, `e2e`, `audit`. Run any with `node scripts/vibe.mjs run <name>`. |
| `web` | `startCommand`, `url`, `routes`: turns on the browser gates |
| `thresholds` | `changedLineCoverage`, `lighthousePerformance` |
| `coverageReport` | Where the coverage report is, if not the language default |

### Other files

| File | What it controls |
|------|-----------------|
| `CLAUDE.md` | The rules Claude follows. Loads every turn, so keep it short. |
| `CLAUDE.local.md` | Your personal preferences, gitignored. Start from `cp CLAUDE.local.md.example CLAUDE.local.md`. |
| `.claude/settings.json` | Hooks and permissions. Commits, pushes and installs always ask you first. |
| `.mcp.json` | MCP servers, below |
| `knowledge/` | Conventions, approved dependencies, UI anti-patterns, production readiness and the security checklist, read during review |

### MCP servers (`.mcp.json`)

| Server | Purpose | Setup |
|--------|---------|-------|
| `context7` | Current docs for any framework or library. Add "use context7" to a prompt. | None |
| `playwright` | Browser automation for the responsive and visual checks | None |
| `github` | Issues, PRs, code search | `export GITHUB_TOKEN=...` in your shell profile |
| `sequential-thinking` | Structured reasoning for architecture and hard debugging | None |
| `memory` | Lessons across sessions, stored in `.claude/memory.json` | None. Every memory step is skipped if it's unavailable. |

---

## 6. Workflow state

Everything lives in `.vibe/` (gitignored). Claude changes it only through `node scripts/vibe.mjs`; the hooks write the rest.

| File | Written by | Holds |
|------|-----------|-------|
| `state.json` | `vibe.mjs` | What Claude proposed: the active workflow (`runId`, `feature`, `tier`, `phase`, `specPath`, `startedAt`) and the last 20 in `history` |
| `approvals.json` | `record-approval.mjs` | What you confirmed: `{runId, feature, phase, tier, specPath, specHash, at}`. Only an approval at `tier_proposed` confirms a tier. |
| `overrides.jsonl` | `record-approval.mjs`, used up by `phase-gate.mjs` | One-time overrides: `{runId, feature, reason, at, used}` |
| `test-log.jsonl` | `vibe.mjs test` / `lint` | Every run: `{kind, command, runId, feature, exit, skipped, at}` |

**Phases:** `tier_proposed` → `scout` → `spec` → `test_plan` → `implement` → `review` → `present` → `docs`. MINIMAL and LIGHT go from `tier_proposed` straight to the work.

Everything is scoped to the workflow's `runId`, so restarting a feature under the same name starts from zero. The spec approval covers the whole spec except its `Traceability` section and a section titled exactly `Notes`, so filling in the matrix or adding a note doesn't need a new approval. One workflow runs at a time per folder; use `/worktree` for parallel work.

```bash
node scripts/vibe.mjs start login --tier STANDARD   # phase tier_proposed, waits for "approved"
node scripts/vibe.mjs phase spec
node scripts/vibe.mjs spec docs/specs/login.md      # approvals are tied to this file's content
node scripts/vibe.mjs phase test_plan
node scripts/vibe.mjs phase implement
node scripts/vibe.mjs test                          # the first failing run unlocks source edits
node scripts/vibe.mjs lint
node scripts/vibe.mjs status                        # what's proposed, approved and passing, and what's next
node scripts/vibe.mjs complete                      # writes docs/evidence/<feature>/summary.md; or: abort
```

The state schema is `schemas/state.schema.json`. Old v3 state files are upgraded on the next write.

---

## 7. CI and git hooks

**CI** (`.github/workflows/quality-gates.yml`) runs on pushes and pull requests to `main` and `develop`:

1. A **plan** job (`scripts/ci-plan.mjs`) reads `iggy.config.json` and decides which gates run and which block. The job summary lists every gate, and the reason for any gate that's off.
2. Each enabled gate runs the same command `vibe.mjs` and lefthook use. A gate with no command, or no project file for its language yet, is reported as off, never silently passed.
3. Reports (Playwright, axe, Lighthouse, coverage) are uploaded as artifacts.

Still manual, during `/review`: code review, the visual check and the security checklist part of the security gate.

**Going to production:**

```bash
./scripts/add-web-gates.sh              # web apps: Playwright, axe and Lighthouse templates
./scripts/promote-to-production.sh      # checks readiness and sets mode to production (--dry-run to preview)
./scripts/setup-branch-protection.sh    # once, as a repo admin: CI and one review required on main
```

For code-owner reviews, copy `.github/CODEOWNERS.example` to `CODEOWNERS`.

**Git hooks** (`lefthook.yml`, enabled with `lefthook install`): before each commit, gitleaks on staged changes, lint and typecheck; before each push, the tests. Each step skips with a message until its tool is set up, then failures block.

**This template only:** `.github/workflows/template-fixtures.yml` runs the gates against `tests/fixtures/` (web, a broken a11y page, prototype, Python and Go) to prove each gate catches what it should. It runs only while `.iggy-template` exists, and `init-project.sh` deletes that file.

---

## 8. MOP foundations

`init-project.sh` offers these when you pick Next.js or React Native. Both are pulled fresh with `degit`, so every project gets the latest version. Re-run any time to update: foundation files are overlaid, `.gitignore` is merged, and the workflow files (`CLAUDE.md`, `.claude/`, `docs/`, `scripts/`) are never touched.

```bash
./scripts/add-mop-foundation.sh            # Next.js, latest main
./scripts/add-mop-foundation.sh v1.2.0     # pinned to a tag, branch or commit
./scripts/add-mop-foundation-rn.sh         # React Native (Expo), latest main
```

**React Native** ([mop-foundation-react-native](https://github.com/ministryofprogramming/mop-foundation-react-native)): Expo SDK 56, React Native 0.85, React 19, TypeScript 6, Expo Router, TanStack Query, Zustand, react-hook-form with Zod, atomic design, EAS Build. It uses **pnpm**: `pnpm install`, `pnpm start`.

To run it on a simulator:

- **iOS (macOS only):** install Xcode from the App Store, run `xcode-select --install`, open Xcode once to accept the license, add a simulator under Xcode → Settings → Platforms, then `pnpm ios`.
- **Android:** install [Android Studio](https://developer.android.com/studio) with the SDK, Platform-Tools and Emulator, create a device in the Virtual Device Manager, add this to `~/.zshrc` and run `source ~/.zshrc`, then `pnpm android`:
  ```bash
  export ANDROID_HOME=$HOME/Library/Android/sdk
  export PATH=$PATH:$ANDROID_HOME/emulator
  export PATH=$PATH:$ANDROID_HOME/platform-tools
  ```

With `pnpm start` running, press `i` for iOS, `a` for Android or `r` to reload.

---

## 9. When something goes wrong

- **A gate blocked an edit.** Run `node scripts/vibe.mjs status`. It shows what's missing and the next step. Approve, change the tier, or use `/vibe override <reason>` once.
- **A fix broke other tests.** Revert, then fix the design. After any fix, re-run every check, not only the one that failed.
- **A quick fix keeps growing** (3+ files, unclear cause): switch to STANDARD.
- **Claude is stuck or unsure.** It should say so and ask, never guess at requirements or root causes.
- **The template itself looks broken:** `./scripts/validate-template.sh` checks the hooks, skills, agents, links and docs.

Each skill's own failure cases and recovery steps are in its `SKILL.md`.

---

## 10. Where things live

```
CLAUDE.md                 Rules for Claude
iggy.config.json          Mode, language, commands, gated folders
lefthook.yml              Git hooks
.claude/skills/           Skills; review/gates.md defines the gates
.claude/agents/           scout, reviewer, bug-hunter
.claude/settings.json     Hooks and permissions
hooks/                    The gate hooks
scripts/                  vibe.mjs (state CLI), CI plan, coverage gate, setup scripts
knowledge/                Conventions, dependencies, anti-patterns, readiness, security
templates/                Playwright and Lighthouse templates (add-web-gates.sh)
schemas/                  JSON schemas for the config and the state
docs/
  GUIDE.md                This guide
  METHODOLOGY.md          Why Iggy works this way
  SPEC_TEMPLATE.md        Feature spec template
  PLAN_TEMPLATE.md        Feature plan template
  adr/                    Architecture decision records
  specs/  plans/          Specs and plans (input)
  reviews/                Review reports
  features/  evidence/    Feature docs and evidence trails (output)
  bugs/                   Bug post-mortems
.vibe/                    Workflow state (gitignored)
```
