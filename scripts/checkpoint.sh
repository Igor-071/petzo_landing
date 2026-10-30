#!/usr/bin/env bash
# Named save points backed by git stash, used by the /checkpoint skill.
#
#   checkpoint.sh save <name>      Snapshot all changes (tracked + untracked). Working tree is untouched.
#   checkpoint.sh list             List checkpoints, newest first.
#   checkpoint.sh restore <name>   Return to a checkpoint. Current changes are saved first as
#                                  "auto-before-restore-<time>", so nothing is lost.
#   checkpoint.sh drop <name>      Delete a checkpoint.

set -euo pipefail

PREFIX="checkpoint:"

die() { echo "checkpoint: $1" >&2; exit 1; }

# Reads the whole stash list on purpose. Exiting awk at the first match can kill
# git with SIGPIPE while it's still writing, and pipefail turns that into a
# silent failure.
stash_ref_for() {
  local name="$1"
  git stash list --format='%gd %gs' | awk -v want="$PREFIX $name" '
    { ref = $1; $1 = ""; sub(/^ /, ""); sub(/^On [^:]*: /, "") }
    $0 == want && !found { print ref; found = 1 }'
}

has_changes() { [ -n "$(git status --porcelain)" ]; }

save() {
  local name="${1:-}"
  [ -n "$name" ] || die "usage: checkpoint.sh save <name>"
  [[ "$name" =~ ^[A-Za-z0-9._-]+$ ]] || die "names can only use letters, digits, dot, dash and underscore"
  [ -z "$(stash_ref_for "$name")" ] || die "a checkpoint named '$name' already exists"
  has_changes || { echo "Nothing to checkpoint — working tree is clean."; return 0; }

  local original_index snapshot
  original_index=$(git write-tree)
  git add -A
  snapshot=$(git stash create "$PREFIX $name")
  git stash store -m "$PREFIX $name" "$snapshot"
  git read-tree "$original_index"

  echo "CHECKPOINT SAVED: $name ($(git diff --name-only HEAD "$snapshot" | wc -l | tr -d ' ') files)"
}

list() {
  local found
  found=$(git stash list --format='%gd|%gs|%cr' | grep "|.*$PREFIX " || true)
  if [ -z "$found" ]; then
    echo "No active checkpoints."
    return 0
  fi
  sed -E "s/^([^|]*)\|(On [^:]*: )?$PREFIX ([^|]*)\|(.*)$/\3  (\4, \1)/" <<< "$found"
}

restore() {
  local name="${1:-}" ref
  [ -n "$name" ] || die "usage: checkpoint.sh restore <name>"
  [ -n "$(stash_ref_for "$name")" ] || die "no checkpoint named '$name'. Run: checkpoint.sh list"

  if has_changes; then
    local backup
    backup="auto-before-restore-$(date +%Y%m%d-%H%M%S)"
    git stash push --include-untracked -q -m "$PREFIX $backup"
    echo "Current changes saved as checkpoint '$backup'."
  fi

  ref=$(stash_ref_for "$name")
  git stash apply -q "$ref"
  git reset -q
  echo "CHECKPOINT RESTORED: $name"
}

drop() {
  local name="${1:-}" ref
  [ -n "$name" ] || die "usage: checkpoint.sh drop <name>"
  ref=$(stash_ref_for "$name")
  [ -n "$ref" ] || die "no checkpoint named '$name'"
  git stash drop -q "$ref"
  echo "Checkpoint '$name' deleted."
}

git rev-parse --git-dir >/dev/null 2>&1 || die "not inside a git repository"

case "${1:-}" in
  save)    shift; save "$@" ;;
  list)    list ;;
  restore) shift; restore "$@" ;;
  drop)    shift; drop "$@" ;;
  *)       die "usage: checkpoint.sh {save|list|restore|drop} [name]" ;;
esac
