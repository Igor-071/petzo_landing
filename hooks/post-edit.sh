#!/usr/bin/env bash
# PostToolUse hook for Edit/Write/MultiEdit on JS/TS files.
#   1. Runs the project's own ESLint with --fix (never downloads ESLint).
#   2. Scans the newly written code for risky patterns (eval, innerHTML, SQL concat...).
# Findings exit 2. For PostToolUse that doesn't undo the edit; it sends stderr
# to Claude so it fixes the problem right away. Exit 0 means clean.

# shellcheck disable=SC2016  # regex patterns below are literal, nothing should expand
set -uo pipefail

command -v jq >/dev/null 2>&1 || exit 0

INPUT=$(cat)
FILE=$(jq -r '.tool_input.file_path // empty' <<< "$INPUT")
NEW_CODE=$(jq -r '[.tool_input.content, .tool_input.new_string, (.tool_input.edits // [] | .[].new_string)] | map(select(. != null)) | join("\n")' <<< "$INPUT")

[[ "$FILE" =~ \.(js|jsx|ts|tsx|mjs|cjs)$ ]] || exit 0

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$PWD}"
FINDINGS=()

# --- 1. Lint -----------------------------------------------------------------
ESLINT="$PROJECT_DIR/node_modules/.bin/eslint"
if [ -x "$ESLINT" ] && [ -f "$FILE" ]; then
  if ! LINT_OUTPUT=$(cd "$PROJECT_DIR" && "$ESLINT" --fix "$FILE" 2>&1); then
    FINDINGS+=("ESLint errors remain after --fix:"$'\n'"$LINT_OUTPUT")
  fi
fi

# --- 2. Risky code patterns ----------------------------------------------------
# Same code with string literals blanked out, for checks about identifiers.
CODE_WITHOUT_STRINGS=$(sed -E "s/\"([^\"\\]|\\.)*\"/''/g; s/'([^'\\]|\\.)*'/''/g; s/\`[^\`]*\`/''/g" <<< "$NEW_CODE")

check() {
  local pattern="$1" message="$2" code="${3:-$NEW_CODE}"
  if grep -qE -- "$pattern" <<< "$code"; then
    FINDINGS+=("$message")
  fi
}

check '\beval[[:space:]]*\('                         "eval() — dynamic code execution. Use JSON.parse() or a lookup table."
check '\.innerHTML[[:space:]]*='                      "innerHTML assignment — XSS risk. Use textContent or sanitize with DOMPurify."
check 'dangerouslySetInnerHTML'                       "dangerouslySetInnerHTML — XSS risk. Sanitize the input or render markdown safely."
check 'document\.write[[:space:]]*\('                 "document.write() — XSS risk and blocks rendering."
# Bare exec() or child_process.exec(), but not a regex's .exec()
check '(^|[^.[:alnum:]_]|(child_process|childProcess|cp)\.)exec(Sync)?[[:space:]]*\([[:space:]]*(`|[^)]*\+)' \
                                                      "exec() with a built string — shell injection risk. Use execFile() with an args array."
check '\b(SELECT|INSERT[[:space:]]+INTO|UPDATE|DELETE[[:space:]]+FROM)[[:space:]][^;]*("|'"'"'|`)[[:space:]]*\+|\.(query|execute|raw)[[:space:]]*\([[:space:]]*`[^`]*\$\{' \
                                                      "SQL built from strings — injection risk. Use parameterized queries."
check '__proto__|constructor\[|prototype\['           "Prototype pollution vector — validate keys before merging user input into objects."
check 'console\.(log|info|debug|warn|error)[[:space:]]*\([^;]*(password|secret|token|Token|apiKey|ApiKey|api_key)' \
                                                      "Logging a secret — never log passwords, tokens or keys." "$CODE_WITHOUT_STRINGS"
check '\b(token|secret|nonce|csrf|sessionId|apiKey)\b[^;]*Math\.random\(|Math\.random\([^;]*\b(token|secret|nonce|csrf|sessionId|apiKey)\b' \
                                                      "Math.random() for a security value — use crypto.randomUUID() or crypto.getRandomValues()."

[ ${#FINDINGS[@]} -eq 0 ] && exit 0

{
  echo "[Iggy] Review needed in $FILE:"
  for finding in "${FINDINGS[@]}"; do echo "- $finding"; done
  echo "Fix these now, or explain to the user why the code is safe."
} >&2
exit 2
