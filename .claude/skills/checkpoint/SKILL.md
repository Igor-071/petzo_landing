---
name: checkpoint
description: 'Named save points for work in progress via scripts/checkpoint.sh: save, list, restore, drop. Use for /checkpoint.'
disable-model-invocation: true
---

# Skill: Checkpoint — Safe Rollback Points

Activate when: User says `/checkpoint`, "save checkpoint", "create save point", or during implementation when a safe rollback point is needed before a risky change.

This skill creates named save points using git stash, allowing safe rollback during TDD cycles, refactoring, or any multi-step implementation work.

## Commands

All operations go through `scripts/checkpoint.sh`, which is covered by `tests/skills/checkpoint.bats`. Don't run raw `git stash` commands for checkpoints.

| Command | Runs | What it does |
|---------|------|--------------|
| `/checkpoint save [name]` | `scripts/checkpoint.sh save [name]` | Snapshots tracked and untracked changes. The working tree and staging area stay exactly as they were. |
| `/checkpoint list` | `scripts/checkpoint.sh list` | Lists checkpoints, newest first |
| `/checkpoint restore [name]` | `scripts/checkpoint.sh restore [name]` | Returns to the checkpoint. Current changes are saved first as `auto-before-restore-<time>`, so nothing is lost. |
| `/checkpoint drop [name]` | `scripts/checkpoint.sh drop [name]` | Deletes a checkpoint. Confirm with the user first; it can't be undone. |

## Process

1. Run the matching script command.
2. Report its output to the user as-is.
3. On restore, tell the user the name of the automatic backup checkpoint if one was created.

## Auto-Checkpoint During Implementation

During `/implement` TDD cycles, automatically suggest a checkpoint:
- Before the BLUE (refactor) phase of each AC — refactoring is when regressions happen
- Before attempting a fix that touches 3+ files
- When the user says "let me try something" or "experimental"

Suggest, don't force: "This is a good spot for a checkpoint. Run `/checkpoint save pre-refactor`?"

## State Tracking

Checkpoints don't need `.vibe/state.json` tracking — they live in git stash, which is persistent. The stash list is the source of truth.

## Rules

- Always use the "checkpoint:" prefix in stash messages — this distinguishes workflow checkpoints from manual stashes
- Never auto-save checkpoints without telling the user — always report what was saved
- Checkpoints are local only — they are never pushed to remote
- If the user has existing non-checkpoint stashes, leave them alone — only manage entries with the "checkpoint:" prefix
- Checkpoint names use only letters, digits, `.`, `-` and `_`: `pre-refactor`, `before-auth`, `working-state`
- Restore brings changes back unstaged. A renamed file shows up as a deletion plus a new file until you stage it again.
- If HEAD moved since the checkpoint was saved, restore can end in a conflict. Tell the user the name of the `auto-before-restore-*` backup, and have them resolve the conflict before saving a new checkpoint.

## Error Recovery

- **Restore conflicts:** Rare, because current changes are moved aside first. If it happens, report the conflicting files and ask the user how to resolve them. Their previous changes are safe in the `auto-before-restore-*` checkpoint.
- **Checkpoint not found:** List available checkpoints. Suggest the closest match if the name is similar.
- **Too many checkpoints (5+):** Warn: "You have [N] checkpoints. Consider dropping old ones to keep things clean."
- **Accidental drop:** Cannot undo a stash drop. Warn before dropping: "This will permanently delete checkpoint '[name]'. Proceed?"
