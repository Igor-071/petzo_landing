#!/usr/bin/env bash
# Turns on branch protection for production mode: the quality-gate checks
# must pass and one person must approve every PR. Run once, as a repo admin.
#
#   scripts/setup-branch-protection.sh [branch]   (default: main)
#
# Needs the GitHub CLI (gh), logged in with admin rights on the repository.

set -euo pipefail

BRANCH="${1:-main}"

if ! command -v gh >/dev/null 2>&1; then
  echo "This script needs the GitHub CLI (gh): https://cli.github.com, then gh auth login." >&2
  exit 1
fi

REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
CODE_OWNERS=false
if [ -f .github/CODEOWNERS ] || [ -f CODEOWNERS ] || [ -f docs/CODEOWNERS ]; then CODE_OWNERS=true; fi

# Job names from .github/workflows/quality-gates.yml. A job the plan skips
# reports "skipped", which GitHub counts as passing.
cat <<JSON | gh api -X PUT "repos/$REPO/branches/$BRANCH/protection" --input -
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "Plan",
      "Secret scan",
      "Lint, types, tests",
      "Coverage on changed lines",
      "E2E and responsive",
      "Accessibility",
      "Performance (Lighthouse)",
      "Dependency audit",
      "Static analysis (Semgrep)",
      "Build"
    ]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": $CODE_OWNERS
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON

echo "Protected $BRANCH on $REPO: quality-gate checks required, 1 approving review$([ "$CODE_OWNERS" = true ] && echo ", code owners")."
