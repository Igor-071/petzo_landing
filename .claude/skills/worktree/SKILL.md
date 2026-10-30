---
name: worktree
description: 'Manages git worktrees to work on several features in parallel on isolated branches. Use for /worktree or "work on something in parallel".'
---

# Skill: Parallel Workflow (Worktrees)

Activate when: User says `/worktree`, "work on something in parallel", "start a parallel feature", or wants to manage multiple features simultaneously.

## What Are Worktrees?

Git worktrees let you have multiple branches checked out simultaneously in separate directories. Each worktree is independent — you can work on Feature A in one, Feature B in another, without stashing or switching branches.

## Commands

### Start a parallel feature

```
/worktree start <feature-name>
```

1. Create a new branch: `feature/<feature-name>`
2. Create worktree: `git worktree add .claude/worktrees/<feature-name> -b feature/<feature-name>`
3. In the new worktree: `node scripts/vibe.mjs start <feature> --tier <TIER>` (each worktree has its own `.vibe/`)
4. Report:
```
PARALLEL WORKFLOW STARTED

Feature: <feature-name>
Branch: feature/<feature-name>
Directory: .claude/worktrees/<feature-name>

You now have two active workstreams. Use /worktree switch to change context.
```

### List parallel workflows

```
/worktree list
```

1. Run `git worktree list`
2. For each worktree, read its `.vibe/state.json` entry
3. Report:
```
PARALLEL WORKFLOWS

  main (current)
    Feature: user-dashboard
    Tier: STANDARD
    Phase: Implementation (3/5 ACs)

  .claude/worktrees/auth-flow
    Feature: auth-flow
    Tier: LIGHT
    Phase: Completed, awaiting merge
    Branch: feature/auth-flow
```

### Switch context

```
/worktree switch <feature-name>
```

1. Save current state to `.vibe/state.json`
2. Note the context switch
3. Load state for the target feature
4. Report where we left off

Note: Claude Code works in a single directory, so "switching" means noting which feature we're working on and using the right branch context. Actual directory switching is for git operations.

### Merge back

```
/worktree merge <feature-name>
```

1. Verify all quality gates pass for the feature
2. Switch to the target branch (usually main): `git checkout main`
3. Merge: `git merge feature/<feature-name>`
4. **STOP & WAIT** — user confirms merge looks good
5. Clean up: `git worktree remove .claude/worktrees/<feature-name>`
6. Delete branch: `git branch -d feature/<feature-name>`
7. `node scripts/vibe.mjs complete` (moves the feature to history)

### Clean up

```
/worktree clean
```

1. List all worktrees
2. Identify completed/merged ones
3. Remove them: `git worktree remove <path>`
4. Prune: `git worktree prune`
5. Report what was cleaned

## Rules

- Each worktree gets its own branch — never share branches between worktrees
- Never merge without user approval
- Run quality gates BEFORE merge, not after
- Keep worktree list clean — remove completed ones promptly
- Maximum 3 parallel worktrees recommended (cognitive overhead)
- If user tries to start a 4th: Warn about complexity, ask if they want to merge/complete one first

## Error Recovery

- **Worktree creation fails (branch already exists):** Ask user — should we reuse the existing branch or create a new one with a suffix?
- **Merge conflicts:** Report the conflicting files. Ask user how to resolve. Never auto-resolve.
- **Worktree directory already exists:** Check if it's a stale worktree. Offer to clean it up.
- **Lost track of which worktree is active:** Run `git worktree list` and `cat .vibe/state.json`. Reconcile and report.
