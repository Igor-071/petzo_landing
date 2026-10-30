#!/usr/bin/env bash
# Validates readiness and promotes a project from prototype to production mode.
#
#   scripts/promote-to-production.sh              Check and promote
#   scripts/promote-to-production.sh --dry-run    Report only, don't change config
#
# Checks: config validity, web gate templates (if applicable), CI plan, branch
# protection advisory. On pass, updates iggy.config.json mode to "production".

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DRY_RUN=false
if [ "${1:-}" = "--dry-run" ]; then
  DRY_RUN=true
fi

ERRORS=()
WARNINGS=()

pass() { echo -e "  ${GREEN}✓${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; ERRORS+=("$1"); }
warn() { echo -e "  ${YELLOW}!${NC} $1"; WARNINGS+=("$1"); }

echo ""
echo -e "${BLUE}Production Readiness Check${NC}"
echo "─────────────────────────────────"
echo ""

# --- 1. Config exists and validates ---
echo -e "${BLUE}Config${NC}"

CONFIG="$PROJECT_DIR/iggy.config.json"
if [ ! -f "$CONFIG" ]; then
  fail "iggy.config.json not found"
else
  pass "iggy.config.json exists"
  VALIDATE_OUTPUT=$(node "$SCRIPT_DIR/vibe.mjs" validate 2>&1) || true
  if echo "$VALIDATE_OUTPUT" | grep -q "invalid"; then
    fail "iggy.config.json validation failed: $(echo "$VALIDATE_OUTPUT" | grep -v "is valid")"
  else
    pass "iggy.config.json is valid"
  fi
fi
echo ""

# --- 2. Web project checks ---
if [ -f "$CONFIG" ]; then
  LANGUAGE=$(node -e "const c=JSON.parse(require('fs').readFileSync('$CONFIG','utf8'));console.log(c.language||'node')")
  HAS_WEB=$(node -e "const c=JSON.parse(require('fs').readFileSync('$CONFIG','utf8'));console.log(c.web?'yes':'no')")

  if [ "$LANGUAGE" = "node" ] && [ "$HAS_WEB" = "yes" ]; then
    echo -e "${BLUE}Web Gates${NC}"
    if [ -f "$PROJECT_DIR/playwright.config.ts" ] || [ -f "$PROJECT_DIR/playwright.config.js" ]; then
      pass "Playwright config found"
    else
      fail "Missing playwright.config.ts — run scripts/add-web-gates.sh first"
    fi
    if [ -f "$PROJECT_DIR/lighthouserc.cjs" ] || [ -f "$PROJECT_DIR/lighthouserc.js" ] || [ -f "$PROJECT_DIR/.lighthouserc.cjs" ]; then
      pass "Lighthouse config found"
    else
      fail "Missing lighthouserc.cjs — run scripts/add-web-gates.sh first"
    fi
    if compgen -G "$PROJECT_DIR/e2e/*.spec.*" > /dev/null 2>&1; then
      pass "E2E test files found in e2e/"
    else
      fail "No e2e/*.spec.* files found — add E2E tests before production"
    fi
    echo ""
  fi
fi

# --- 3. CI gate plan check ---
if [ -f "$CONFIG" ]; then
  echo -e "${BLUE}CI Gate Plan (production mode)${NC}"
  # Temporarily check what the plan looks like in production mode
  PLAN_OUTPUT=$(CLAUDE_PROJECT_DIR="$PROJECT_DIR" node -e "
    const fs = require('fs');
    const configPath = '$CONFIG';
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    config.mode = 'production';
    // Use a minimal check: load buildPlan and report disabled gates
    import('$SCRIPT_DIR/ci-plan.mjs').then(({ buildPlan }) => {
      // Build a mock config with production mode
      import('$SCRIPT_DIR/../hooks/lib/vibe-state.mjs').then(({ loadConfig }) => {
        const resolved = loadConfig();
        resolved.mode = 'production';
        const plan = buildPlan(resolved);
        const disabled = Object.entries(plan.gates)
          .filter(([, g]) => !g.enabled)
          .map(([name, g]) => name + ': ' + g.reason);
        if (disabled.length) {
          console.log('DISABLED:' + disabled.join('|'));
        } else {
          console.log('ALL_ENABLED');
        }
      });
    });
  " 2>&1) || true

  if echo "$PLAN_OUTPUT" | grep -q "ALL_ENABLED"; then
    pass "All CI gates enabled in production mode"
  elif echo "$PLAN_OUTPUT" | grep -q "^DISABLED:"; then
    DISABLED=$(echo "$PLAN_OUTPUT" | grep "^DISABLED:" | sed 's/^DISABLED://')
    IFS='|' read -ra ITEMS <<< "$DISABLED"
    for item in "${ITEMS[@]}"; do
      warn "Gate disabled: $item"
    done
  else
    warn "Could not check CI gate plan"
  fi
  echo ""
fi

# --- 4. Branch protection advisory ---
echo -e "${BLUE}Branch Protection${NC}"
if command -v gh > /dev/null 2>&1; then
  PROTECTION=$(gh api "repos/{owner}/{repo}/branches/main/protection" 2>&1) || true
  if echo "$PROTECTION" | grep -q "required_status_checks"; then
    pass "Branch protection configured on main"
  elif echo "$PROTECTION" | grep -q "Branch not protected"; then
    warn "No branch protection on main — run scripts/setup-branch-protection.sh"
  else
    warn "Could not check branch protection (check gh auth status)"
  fi
else
  warn "gh CLI not available — can't check branch protection"
fi
echo ""

# --- Summary ---
echo "─────────────────────────────────"
if [ ${#ERRORS[@]} -gt 0 ]; then
  echo -e "${RED}FAILED:${NC} ${#ERRORS[@]} error(s), ${#WARNINGS[@]} warning(s)"
  echo ""
  for e in "${ERRORS[@]}"; do echo -e "  ${RED}✗${NC} $e"; done
  for w in "${WARNINGS[@]}"; do echo -e "  ${YELLOW}!${NC} $w"; done
  echo ""
  echo "Fix the errors above before promoting to production."
  exit 1
fi

if [ "$DRY_RUN" = true ]; then
  echo -e "${GREEN}READY${NC} (dry run — config not changed)"
  if [ ${#WARNINGS[@]} -gt 0 ]; then
    echo -e "${YELLOW}${#WARNINGS[@]} warning(s) — review before promoting${NC}"
  fi
  exit 0
fi

# Update mode in iggy.config.json
if [ -f "$CONFIG" ]; then
  node -e "
    const fs = require('fs');
    const config = JSON.parse(fs.readFileSync('$CONFIG', 'utf8'));
    config.mode = 'production';
    fs.writeFileSync('$CONFIG', JSON.stringify(config, null, 2) + '\n');
  "
  echo -e "${GREEN}PROMOTED${NC} — iggy.config.json mode set to \"production\""
  echo ""
  echo "Next steps:"
  echo "  1. Review warnings above (if any)"
  echo "  2. Run: scripts/setup-branch-protection.sh"
  echo "  3. Commit: git add iggy.config.json && git commit -m 'chore: promote to production mode'"
fi
