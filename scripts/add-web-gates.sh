#!/usr/bin/env bash
# Adds the browser quality gates to a web project:
#   playwright.config.ts, e2e/{routes,responsive.spec,a11y.spec}.ts,
#   e2e/breakpoints.json (generated from the gate definitions), lighthouserc.cjs
# Existing files are never overwritten, except breakpoints.json, which is
# regenerated so it always matches .claude/skills/review/gates.md.
#
#   scripts/add-web-gates.sh [--no-install] [project-dir]
#
# Then add a "web" section to iggy.config.json:
#   "web": { "startCommand": "npm run start", "url": "http://localhost:3000", "routes": ["/"] }

set -euo pipefail

INSTALL=1
if [ "${1:-}" = "--no-install" ]; then INSTALL=0; shift; fi

TEMPLATE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT="$(cd "${1:-.}" && pwd)"
TEMPLATES="$TEMPLATE_ROOT/templates"

copy() {
  local source="$1" target="$2"
  if [ -e "$PROJECT/$target" ]; then
    echo "  kept your $target"
  else
    mkdir -p "$(dirname "$PROJECT/$target")"
    cp "$TEMPLATES/$source" "$PROJECT/$target"
    echo "  added $target"
  fi
}

echo "Adding web quality gates to $PROJECT"
copy playwright/playwright.config.ts playwright.config.ts
copy playwright/routes.ts e2e/routes.ts
copy playwright/responsive.spec.ts e2e/responsive.spec.ts
copy playwright/a11y.spec.ts e2e/a11y.spec.ts
copy lighthouse/lighthouserc.cjs lighthouserc.cjs

mkdir -p "$PROJECT/e2e"
node "$TEMPLATE_ROOT/scripts/breakpoints.mjs" > "$PROJECT/e2e/breakpoints.json"
echo "  wrote e2e/breakpoints.json from the gate definitions"

if [ -f "$PROJECT/.gitignore" ] || [ -d "$PROJECT/.git" ]; then
  for ignored in playwright-report/ test-results/ lighthouse-report/ .lighthouseci/; do
    grep -qxF "$ignored" "$PROJECT/.gitignore" 2>/dev/null || echo "$ignored" >> "$PROJECT/.gitignore"
  done
fi

if [ "$INSTALL" = 1 ] && [ -f "$PROJECT/package.json" ]; then
  echo "Installing @playwright/test and @axe-core/playwright..."
  (cd "$PROJECT" && npm install --save-dev @playwright/test @axe-core/playwright && npx playwright install chromium)
fi

if ! grep -q '"web"' "$PROJECT/iggy.config.json" 2>/dev/null; then
  echo ""
  echo "Next: add a \"web\" section to iggy.config.json so CI runs these gates:"
  echo '  "web": { "startCommand": "npm run start", "url": "http://localhost:3000", "routes": ["/"] }'
fi
