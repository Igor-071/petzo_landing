#!/usr/bin/env bash
# Validates the Iggy template itself. Run locally or in CI:
#   scripts/validate-template.sh [repo-root]
# Exits 1 and lists every problem found.

# shellcheck disable=SC2016  # backticks and $ in the patterns below are literal
set -uo pipefail

ROOT="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$ROOT" || exit 1

ERRORS=()
error() { ERRORS+=("$1"); }

command -v jq >/dev/null 2>&1 || { echo "validate-template: jq is required" >&2; exit 1; }

# --- settings.json -------------------------------------------------------------
SETTINGS=".claude/settings.json"
if ! jq empty "$SETTINGS" 2>/dev/null; then
  error "$SETTINGS is not valid JSON"
else
  VALID_EVENTS='["PreToolUse","PostToolUse","UserPromptSubmit","Stop","SubagentStop","SessionStart","SessionEnd","PreCompact","Notification"]'
  while IFS= read -r event; do
    error "$SETTINGS: unknown hook event '$event'"
  done < <(jq -r --argjson ok "$VALID_EVENTS" '.hooks // {} | keys[] | select(. as $e | $ok | index($e) | not)' "$SETTINGS")

  while IFS= read -r problem; do
    error "$SETTINGS: $problem"
  done < <(jq -r '
    .hooks // {} | to_entries[] | .key as $event | .value | to_entries[] |
    .key as $i | .value as $entry |
    if ($entry.hooks | type) != "array" then
      "invalid hook entry: missing hooks[] in \($event)[\($i)]"
    else
      $entry.hooks[] | select(.type != "command" or (.command | type) != "string") |
      "invalid hook in \($event)[\($i)]: needs type \"command\" and a command string"
    end' "$SETTINGS")

  while IFS= read -r script; do
    case "$script" in
      *.sh)  [ -x "$script" ] || error "$SETTINGS: hook script $script is missing or not executable" ;;
      *.mjs) [ -f "$script" ] || error "$SETTINGS: hook script $script is missing" ;;
    esac
  done < <(jq -r '.hooks // {} | .[][] | .hooks // [] | .[].command // empty' "$SETTINGS" |
           grep -oE 'hooks/[A-Za-z0-9_.-]+\.(sh|mjs)' | sort -u)

  for risky in 'Bash(git commit' 'Bash(git push' 'Bash(npx *)' 'Bash(gh *)'; do
    if jq -e --arg r "$risky" '.permissions.allow // [] | any(startswith($r))' "$SETTINGS" >/dev/null; then
      error "$SETTINGS: '$risky...' must not be auto-allowed (move it to ask)"
    fi
  done
  for required in 'Bash(git commit *)' 'Bash(git push *)'; do
    jq -e --arg r "$required" '.permissions.ask // [] | index($r)' "$SETTINGS" >/dev/null ||
      error "$SETTINGS: '$required' must be in permissions.ask"
  done
fi

# --- .mcp.json -------------------------------------------------------------------
if ! jq empty .mcp.json 2>/dev/null; then
  error ".mcp.json is not valid JSON"
elif grep -q '@anthropic/mcp-playwright' .mcp.json; then
  error ".mcp.json: @anthropic/mcp-playwright doesn't exist. Use @playwright/mcp"
fi

# --- Skills --------------------------------------------------------------------
for skill in .claude/skills/*/SKILL.md; do
  dir=$(basename "$(dirname "$skill")")
  if [ "$(head -1 "$skill")" != "---" ]; then
    error "$skill: missing YAML frontmatter (name, description)"
    continue
  fi
  frontmatter=$(awk 'NR == 1 { next } /^---$/ { exit } { print }' "$skill")
  name=$(sed -n 's/^name:[[:space:]]*//p' <<< "$frontmatter")
  [ "$name" = "$dir" ] || error "$skill: frontmatter name '$name' should be '$dir'"
  description=$(sed -n 's/^description:[[:space:]]*//p' <<< "$frontmatter")
  if [ -z "$description" ]; then
    error "$skill: frontmatter needs a description"
  elif [[ ! "$description" =~ ^[\'\"] && "$description" == *": "* ]]; then
    error "$skill: description contains ': ' and must be quoted, or the YAML won't parse"
  fi
done

# --- Agents --------------------------------------------------------------------
for required in scout reviewer bug-hunter; do
  [ -f ".claude/agents/$required.md" ] || error ".claude/agents/$required.md is missing"
done
for agent in .claude/agents/*.md; do
  [ -e "$agent" ] || continue
  frontmatter=$(awk 'NR == 1 { next } /^---$/ { exit } { print }' "$agent")
  if ! grep -q '^name:' <<< "$frontmatter" || ! grep -q '^description:' <<< "$frontmatter"; then
    error "$agent: subagents need name and description in frontmatter"
  fi
  # tools: Read, Grep   or   tools:\n  - Read\n  - Grep
  tools=$(awk '
    /^tools:/ { sub(/^tools:[[:space:]]*/, ""); if ($0 != "") { print; exit } listing = 1; next }
    listing && /^[[:space:]]*-[[:space:]]*/ { sub(/^[[:space:]]*-[[:space:]]*/, ""); printf "%s, ", $0; next }
    listing { exit }' <<< "$frontmatter" | sed 's/, $//')
  if [ -z "$tools" ]; then
    error "$agent needs a tools list, so it doesn't inherit every tool"
  fi
  # Agents that report on code must not be able to change it.
  case "$(basename "$agent")" in
    scout.md|reviewer.md|bug-hunter.md)
      for tool in Edit Write MultiEdit NotebookEdit; do
        if [[ ",$tools," =~ [,[:space:]]${tool}[,[:space:]] ]]; then
          error "$(basename "$agent") must not have $tool: it reports on code, it doesn't change it"
        fi
      done ;;
  esac
done

# --- GitHub Actions pinning --------------------------------------------------------
# A tag can be moved by the action's owner, a commit SHA can't. Local actions
# (./...) and docker:// images are exempt.
while IFS= read -r line; do
  ref=$(sed -E 's/.*uses:[[:space:]]*["'"'"']?([^"'"'"'[:space:]]+).*/\1/' <<< "$line")
  case "$ref" in ./*|docker://*) continue ;; esac
  [[ "$ref" =~ @[0-9a-f]{40}$ ]] || error "${line%%:*}: $ref isn't pinned to a commit SHA (use owner/action@<sha> # vX.Y.Z)"
done < <(grep -rnE '^[[:space:]-]*uses:' .github/workflows .github/actions 2>/dev/null | sed -E 's/^([^:]+):[0-9]+:/\1:/')

# --- Single sources of truth ---------------------------------------------------
GATES=".claude/skills/review/gates.md"
[ -f "$GATES" ] || error "$GATES is missing (the one definition of the quality gates)"
CLAUDE_LINES=$(wc -l < CLAUDE.md | tr -d ' ')
[ "$CLAUDE_LINES" -le 150 ] || error "CLAUDE.md has $CLAUDE_LINES lines (max 150). It loads every turn; move detail into skills or docs."
# Only the workflow's own docs are checked. A project's README is its own, and
# fill-in checklists (PR, review and spec templates) list the widths on purpose.
BREAKPOINT='\b(320|375|768|1024|1440)px\b|\b(320|375|768|1024|1440)/(320|375|768|1024|1440)\b'
PASS_CRITERIA='Lighthouse[^|]*(>|≥|>=)[[:space:]]*90|FCP[[:space:]]*<[[:space:]]*1\.5'
for doc in CLAUDE.md docs/GUIDE.md docs/METHODOLOGY.md .claude/skills/*/SKILL.md; do
  [ -f "$doc" ] || continue
  if grep -qE '^\|[[:space:]]*Gate[[:space:]]*\|[[:space:]]*MINIMAL' "$doc"; then
    error "$doc defines a gate table. Link to $GATES instead."
  fi
  if grep -qE "$BREAKPOINT" "$doc"; then
    error "$doc lists breakpoints. They're defined once, in $GATES."
  fi
  if grep -qE "$PASS_CRITERIA" "$doc"; then
    error "$doc repeats gate pass criteria. They're defined once, in $GATES."
  fi
done

# The template keeps one guide per question: GUIDE (how) and METHODOLOGY (why),
# plus the templates. Projects add their own docs freely.
if [ -f .iggy-template ]; then
  for doc in docs/*.md; do
    [ -e "$doc" ] || continue
    case "${doc#docs/}" in
      GUIDE.md|METHODOLOGY.md|SPEC_TEMPLATE.md|PLAN_TEMPLATE.md) ;;
      *) error "$doc is a new top-level guide. Fold it into docs/GUIDE.md (how) or docs/METHODOLOGY.md (why)." ;;
    esac
  done
fi

# --- Git index -----------------------------------------------------------------
if git rev-parse --git-dir >/dev/null 2>&1 && [ ! -f .gitmodules ]; then
  while IFS= read -r gitlink; do
    error "committed submodule pointer without .gitmodules: $gitlink"
  done < <(git ls-files -s | awk '$1 == "160000" { print $4 }')
fi

# --- Markdown links ------------------------------------------------------------
while IFS= read -r doc; do
  doc_dir=$(dirname "$doc")
  while IFS= read -r link; do
    target="${link%%#*}"
    [ -z "$target" ] && continue
    [[ "$target" =~ ^(https?:|mailto:|/) ]] && continue
    [ -e "$doc_dir/$target" ] || error "$doc: broken link to $link"
  done < <(sed -E '/^```/,/^```/d' "$doc" | grep -oE '\]\([^)[:space:]]+\)' | sed -E 's/^\]\((.*)\)$/\1/')
done < <(git ls-files '*.md' 2>/dev/null || find . -name '*.md' -not -path './node_modules/*')

# --- Node scripts ----------------------------------------------------------------
if command -v node >/dev/null 2>&1; then
  while IFS= read -r module; do
    output=$(node --check "$module" 2>&1) || error "$module doesn't parse:"$'\n'"$output"
  done < <(find hooks scripts -name '*.mjs' 2>/dev/null)
  for schema in schemas/*.json; do
    jq empty "$schema" 2>/dev/null || error "$schema is not valid JSON"
  done
  if [ -f iggy.config.json ] && ! output=$(CLAUDE_PROJECT_DIR="$ROOT" node scripts/vibe.mjs validate 2>&1); then
    error "iggy.config.json or .vibe/state.json doesn't match its schema:"$'\n'"$output"
  fi
else
  echo "validate-template: node not installed, skipping .mjs checks" >&2
fi

# --- Shell scripts ---------------------------------------------------------------
if command -v shellcheck >/dev/null 2>&1; then
  if ! output=$(shellcheck -S warning hooks/*.sh scripts/*.sh 2>&1); then
    error "shellcheck found problems:"$'\n'"$output"
  fi
else
  echo "validate-template: shellcheck not installed, skipping shell lint" >&2
fi

# --- Result ----------------------------------------------------------------------
if [ ${#ERRORS[@]} -gt 0 ]; then
  echo "Template validation failed (${#ERRORS[@]} problems):" >&2
  for e in "${ERRORS[@]}"; do echo "  - $e" >&2; done
  exit 1
fi

echo "Template validation passed."
