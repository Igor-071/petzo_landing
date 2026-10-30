#!/bin/bash

# =============================================================================
# Iggy - Add MOP React Native Foundation
# =============================================================================
#
# Pulls the latest MOP React Native foundation from
# https://github.com/ministryofprogramming/mop-foundation-react-native
# and overlays it on the current project WITHOUT clobbering the Iggy
# workflow files (CLAUDE.md, .claude/, config/, docs/, scripts/, etc.).
#
# Usage:
#   ./scripts/add-mop-foundation-rn.sh              # pulls latest main
#   ./scripts/add-mop-foundation-rn.sh v1.2.0       # pulls tag/branch/commit
#
# Safe to re-run. Existing foundation files are overwritten; workflow files
# are preserved.
#

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

REPO="ministryofprogramming/mop-foundation-react-native"
REF="${1:-}"  # optional tag/branch/commit; empty = default branch
DEGIT_TARGET="$REPO"
[ -n "$REF" ] && DEGIT_TARGET="$REPO#$REF"

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Add MOP React Native Foundation                       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Source: ${YELLOW}$DEGIT_TARGET${NC}"
echo ""

# -----------------------------------------------------------------------------
# Prerequisite checks
# -----------------------------------------------------------------------------
if ! command -v npx >/dev/null 2>&1; then
    echo -e "${RED}Error: npx not found. Install Node.js first.${NC}"
    exit 1
fi

if ! command -v rsync >/dev/null 2>&1; then
    echo -e "${RED}Error: rsync not found.${NC}"
    exit 1
fi

# Must be run from project root (sanity check)
if [ ! -f "CLAUDE.md" ]; then
    echo -e "${RED}Error: CLAUDE.md not found. Run this from the project root.${NC}"
    exit 1
fi

# -----------------------------------------------------------------------------
# Warn on existing React Native files
# -----------------------------------------------------------------------------
CONFLICT=0
for f in package.json app.json eas.json tsconfig.json; do
    if [ -f "$f" ]; then
        CONFLICT=1
        break
    fi
done

if [ "$CONFLICT" = "1" ]; then
    echo -e "${YELLOW}Warning: React Native-related files already exist (package.json, app.json, eas.json, tsconfig.json).${NC}"
    echo "They will be OVERWRITTEN by the MOP foundation."
    read -r -p "Continue? (y/n): " CONFIRM
    if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
        echo "Cancelled."
        exit 0
    fi
fi

# -----------------------------------------------------------------------------
# Fetch foundation to a temp directory
# -----------------------------------------------------------------------------
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

echo -e "${YELLOW}Fetching foundation into temporary directory...${NC}"

# Disable exit-on-error for the degit call so we can handle failure gracefully
set +e
npx --yes degit "$DEGIT_TARGET" "$TMP_DIR" --force 2>/tmp/degit_error.txt
DEGIT_EXIT=$?
set -e

if [ $DEGIT_EXIT -ne 0 ] || [ ! -d "$TMP_DIR" ] || [ -z "$(ls -A "$TMP_DIR")" ]; then
    echo -e "${RED}✗ Could not fetch MOP foundation from $REPO${NC}"
    echo ""
    echo -e "${YELLOW}Possible reasons:${NC}"
    echo "  • The repo doesn't exist or is private"
    echo "  • No internet connection"
    echo "  • GitHub is temporarily unavailable"
    echo ""
    cat /tmp/degit_error.txt 2>/dev/null || true
    echo ""
    echo -e "${YELLOW}Falling back to create-expo-app...${NC}"
    echo ""

    # Fallback: scaffold with official create-expo-app
    npx --yes create-expo-app@latest . \
        --template blank-typescript \
        --yes 2>&1

    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: create-expo-app also failed. Install Node.js and try again.${NC}"
        exit 1
    fi

    echo ""
    echo -e "${GREEN}✓ Scaffolded with create-expo-app (Expo + TypeScript)${NC}"
    echo -e "${YELLOW}Note: Re-run this script when the MOP foundation repo is available to get the full foundation.${NC}"
    echo ""

    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     Foundation installed (via create-expo-app)             ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. pnpm install         # install dependencies"
    echo "  2. pnpm start           # start the Expo dev server"
    echo "  3. Review new files (git status) before committing"
    echo ""
    echo -e "${GREEN}Done.${NC}"
    exit 0
fi

echo -e "${GREEN}✓ Foundation fetched${NC}"
echo ""

# -----------------------------------------------------------------------------
# Copy foundation files into project, skipping Iggy workflow files
# -----------------------------------------------------------------------------
echo -e "${YELLOW}Overlaying foundation onto project (preserving workflow files)...${NC}"

# Files/dirs the workflow owns — never overwrite these.
# .gitignore is handled specially (merged) below.
rsync -a \
    --exclude='CLAUDE.md' \
    --exclude='CLAUDE.local.md' \
    --exclude='CLAUDE.local.md.example' \
    --exclude='.claude/' \
    --exclude='.mcp.json' \
    --exclude='config/' \
    --exclude='docs/METHODOLOGY.md' \
    --exclude='docs/GUIDE.md' \
    --exclude='docs/SPEC_TEMPLATE.md' \
    --exclude='docs/PLAN_TEMPLATE.md' \
    --exclude='docs/specs/' \
    --exclude='docs/reviews/' \
    --exclude='docs/features/' \
    --exclude='docs/bugs/' \
    --exclude='scripts/' \
    --exclude='.gitignore' \
    --exclude='.git/' \
    "$TMP_DIR/" .

echo -e "${GREEN}✓ Foundation files copied${NC}"

# -----------------------------------------------------------------------------
# Merge .gitignore if the foundation has one
# -----------------------------------------------------------------------------
if [ -f "$TMP_DIR/.gitignore" ]; then
    echo -e "${YELLOW}Merging .gitignore entries from foundation...${NC}"
    MERGE_MARKER="# --- merged from MOP React Native foundation ---"

    # Only add the block once
    if ! grep -qF "$MERGE_MARKER" .gitignore 2>/dev/null; then
        {
            echo ""
            echo "$MERGE_MARKER"
            cat "$TMP_DIR/.gitignore"
        } >> .gitignore
        echo -e "${GREEN}✓ .gitignore merged${NC}"
    else
        echo -e "${YELLOW}.gitignore already contains MOP React Native foundation entries — skipped${NC}"
    fi
fi

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Foundation installed                                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. pnpm install         # install foundation dependencies"
echo "  2. Review any new files (git status) before committing"
echo "  3. pnpm start           # start the Expo dev server"
echo ""
echo -e "${YELLOW}Re-run this script any time to pull the latest foundation:${NC}"
echo "  ./scripts/add-mop-foundation-rn.sh"
echo ""
echo -e "${GREEN}Done.${NC}"
