#!/usr/bin/env bash
# PreToolUse hook for Read/Edit/Write/Bash.
# Blocks access to secrets files and dangerous shell commands.
# Exit 2 blocks the tool call and shows stderr to Claude.
# Requires: jq. Fails closed (blocks) when jq is missing.

set -uo pipefail

block() { echo "Blocked by security guard: $1" >&2; exit 2; }

command -v jq >/dev/null 2>&1 || block "jq is not installed, so tool calls can't be checked. Install jq (brew install jq / apt-get install jq)."

INPUT=$(cat)
TOOL=$(jq -r '.tool_name // empty' <<< "$INPUT") || block "could not parse hook input"
TARGET=$(jq -r '.tool_input.file_path // .tool_input.command // empty' <<< "$INPUT")

# Heredoc bodies are usually text being written (docs, tests), not commands or
# file reads, so both checks skip them. Exception: a heredoc fed to a shell
# (bash <<SH, or cat <<SH | bash) runs its body, so that body is checked like any command.
SHELL_INTERPRETER='(^|[|;&(`[:space:]])(sudo[[:space:]]+)?(ba|z|da|k)?sh([[:space:]]|$)'
strip_heredoc_bodies() {
  awk -v shell_re="$SHELL_INTERPRETER" '
    delimiter != "" {
      line = $0
      if (strip_tabs) sub(/^\t+/, "", line)
      if (line == delimiter) { delimiter = ""; next }
      if (keep_body) print
      next
    }
    { print }
    match($0, /<<-?[[:space:]]*["'"'"']?[A-Za-z_][A-Za-z0-9_]*["'"'"']?/) {
      before = substr($0, 1, RSTART - 1)
      after = substr($0, RSTART + RLENGTH)
      marker = substr($0, RSTART, RLENGTH)
      strip_tabs = (marker ~ /^<<-/)
      keep_body = (before ~ shell_re || after ~ shell_re)
      gsub(/^<<-?[[:space:]]*|["'"'"']/, "", marker)
      delimiter = marker
    }'
}

CHECKED="$TARGET"
[[ "$TOOL" == "Bash" ]] && CHECKED=$(strip_heredoc_bodies <<< "$TARGET")

# Keep block messages short: first line of the command, at most 120 characters.
SUMMARY=$(head -1 <<< "$TARGET" | cut -c1-120)

# Template env files (.env.example, .env.local.sample...) are safe. Strip them so
# ".env.example .env" still trips the check.
SCRUBBED=$(sed -E 's/\.env(\.[A-Za-z0-9_-]+)*\.(example|sample|template)//g' <<< "$CHECKED")

SECRETS='(^|[[:space:]/="'"'"'])\.env([.[:space:]"'"'"']|$)|\.pem([[:space:]"'"'"']|$)|\.key([[:space:]"'"'"']|$)|id_(rsa|ed25519|ecdsa)|credentials\.json|\.aws/credentials|secrets\.json|\.npmrc([[:space:]]|$)'
if [[ "$SCRUBBED" =~ $SECRETS ]]; then
  block "$SUMMARY looks like a secrets file. Ask the user to share only the values you need."
fi

if [[ "$TOOL" == "Bash" ]]; then
  # shellcheck disable=SC2016  # $HOME is a literal pattern here, not an expansion
  DANGER='rm[[:space:]]+-[a-zA-Z]*r[a-zA-Z]*f?[a-zA-Z]*[[:space:]]+(/|~|\$HOME)([[:space:]]|/?$|/?\*)|git[[:space:]]+push.*[[:space:]](-f|--force(-with-lease)?)([[:space:]]|$)|git[[:space:]]+reset[[:space:]]+--hard|git[[:space:]]+clean[[:space:]]+-[a-zA-Z]*f|curl[^|]*\|[[:space:]]*(sudo[[:space:]]+)?(ba|z)?sh([[:space:]]|$)'
  if [[ "$CHECKED" =~ $DANGER ]]; then
    block "$SUMMARY is destructive. Ask the user to run it themselves if it's really needed."
  fi
fi

# Workflow files only the hooks may write: approvals, overrides and the test log.
# Claude proposes state through scripts/vibe.mjs; the user's decisions stay the user's.
HOOK_OWNED='\.vibe/(approvals\.json|overrides\.jsonl|test-log\.jsonl)'
OWNED_MESSAGE="is written only by the workflow hooks, so approvals and test results can't be forged. Use node scripts/vibe.mjs status to read it, or ask the user."
if [[ "$TOOL" =~ ^(Write|Edit|MultiEdit|NotebookEdit)$ && "$TARGET" =~ $HOOK_OWNED ]]; then
  block "$TARGET $OWNED_MESSAGE"
fi
if [[ "$TOOL" == "Bash" ]]; then
  [[ "$CHECKED" =~ $HOOK_OWNED ]] && block "$SUMMARY touches a file that $OWNED_MESSAGE"
  DELETE_VIBE='(^|[|;&[:space:]])rm[[:space:]]+[^|;&]*(^|[[:space:]/])\.vibe(/|[[:space:]]|$)'
  [[ "$CHECKED" =~ $DELETE_VIBE ]] && block "$SUMMARY deletes workflow state. Ask the user to run it themselves."
  # shellcheck disable=SC2016  # $CLAUDE_PROJECT_DIR is a literal pattern here
  RUN_GATE_HOOK='(^|[|;&][[:space:]]*|(node|bun|deno|bash|sh)[[:space:]]+)("?\$CLAUDE_PROJECT_DIR"?/)?[^|;&[:space:]]*hooks/(record-approval|phase-gate|stop-gate)\.mjs'
  [[ "$CHECKED" =~ $RUN_GATE_HOOK ]] && block "$SUMMARY runs a workflow gate hook by hand. Only Claude Code runs those."
fi

exit 0
