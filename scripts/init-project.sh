#!/bin/bash

# =============================================================================
# Iggy - Project Initialization Script
# =============================================================================
#
# This script helps you configure the workflow template for your project.
# Run it after cloning the template: ./scripts/init-project.sh
#
# Non-interactive use (CI, scripted setup):
#   ./scripts/init-project.sh --name "My App" --type web --frontend nextjs --no-scaffold
#   Options: --name --type --frontend --backend --mode (prototype|production) --no-scaffold
#

set -e

PROJECT_NAME=""
PROJECT_TYPE=""
FRONTEND_FRAMEWORK=""
BACKEND_FRAMEWORK=""
MODE="prototype"
NO_SCAFFOLD="n"

while [ $# -gt 0 ]; do
    case "$1" in
        --name)        PROJECT_NAME="$2"; shift 2 ;;
        --type)        PROJECT_TYPE="$2"; shift 2 ;;
        --frontend)    FRONTEND_FRAMEWORK="$2"; shift 2 ;;
        --backend)     BACKEND_FRAMEWORK="$2"; shift 2 ;;
        --mode)        MODE="$2"; shift 2 ;;
        --no-scaffold) NO_SCAFFOLD="y"; shift ;;
        -h|--help)     sed -n '3,12p' "$0"; exit 0 ;;
        *)             echo "Unknown option: $1" >&2; exit 1 ;;
    esac
done

case "$MODE" in
    prototype|production) ;;
    *) echo "Invalid mode: $MODE (use prototype or production)" >&2; exit 1 ;;
esac

# Replace a literal string in a file. Safe for any characters in the
# replacement (/, &, |, quotes), unlike sed.
replace_in_file() {
    local file="$1" search="$2" replacement="$3" content
    shopt -u patsub_replacement 2>/dev/null || true
    content=$(<"$file")
    local updated="${content//"$search"/$replacement}"
    printf '%s\n' "$updated" > "$file"
}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Iggy - Project Initialization                         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# -----------------------------------------------------------------------------
# Project Name
# -----------------------------------------------------------------------------
echo -e "${YELLOW}Step 1: Project Name${NC}"
[ -n "$PROJECT_NAME" ] || read -r -p "Enter your project name: " PROJECT_NAME

if [ -z "$PROJECT_NAME" ]; then
    echo -e "${RED}Error: Project name cannot be empty${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Project name: $PROJECT_NAME${NC}"
echo ""

# -----------------------------------------------------------------------------
# Project Type
# -----------------------------------------------------------------------------
echo -e "${YELLOW}Step 2: Project Type${NC}"
if [ -z "$PROJECT_TYPE" ]; then
    echo "  1) web       - Web application (React, Vue, etc.)"
    echo "  2) mobile    - Mobile application"
    echo "  3) backend   - Backend service / API"
    echo "  4) fullstack - Full-stack application"
    echo "  5) cli       - Command-line tool"
    read -r -p "Select project type (1-5): " TYPE_CHOICE

    case $TYPE_CHOICE in
        1) PROJECT_TYPE="web" ;;
        2) PROJECT_TYPE="mobile" ;;
        3) PROJECT_TYPE="backend" ;;
        4) PROJECT_TYPE="fullstack" ;;
        5) PROJECT_TYPE="cli" ;;
        *) echo -e "${RED}Invalid choice${NC}"; exit 1 ;;
    esac
fi

case "$PROJECT_TYPE" in
    web|mobile|backend|fullstack|cli) ;;
    *) echo -e "${RED}Invalid project type: $PROJECT_TYPE${NC}"; exit 1 ;;
esac

echo -e "${GREEN}✓ Project type: $PROJECT_TYPE${NC}"
echo ""

# -----------------------------------------------------------------------------
# Frontend Framework (if applicable)
# -----------------------------------------------------------------------------
if [ -z "$FRONTEND_FRAMEWORK" ] && { [ "$PROJECT_TYPE" = "backend" ] || [ "$PROJECT_TYPE" = "cli" ]; }; then
    FRONTEND_FRAMEWORK="null"
fi
if [ -z "$FRONTEND_FRAMEWORK" ] && { [ "$PROJECT_TYPE" = "web" ] || [ "$PROJECT_TYPE" = "mobile" ] || [ "$PROJECT_TYPE" = "fullstack" ]; }; then
    echo -e "${YELLOW}Step 3: Frontend Framework${NC}"
    echo "  1) nextjs        - Next.js (recommended — MOP foundation available)"
    echo "  2) react-native  - React Native / Expo (MOP foundation available)"
    echo "  3) react         - React"
    echo "  4) vue           - Vue.js"
    echo "  5) svelte        - Svelte"
    echo "  6) angular       - Angular"
    echo "  7) vanilla       - Vanilla JS"
    echo "  8) none          - No frontend"
    read -r -p "Select frontend framework (1-8): " FE_CHOICE

    case $FE_CHOICE in
        1) FRONTEND_FRAMEWORK="nextjs" ;;
        2) FRONTEND_FRAMEWORK="react-native" ;;
        3) FRONTEND_FRAMEWORK="react" ;;
        4) FRONTEND_FRAMEWORK="vue" ;;
        5) FRONTEND_FRAMEWORK="svelte" ;;
        6) FRONTEND_FRAMEWORK="angular" ;;
        7) FRONTEND_FRAMEWORK="vanilla" ;;
        8) FRONTEND_FRAMEWORK="null" ;;
        *) FRONTEND_FRAMEWORK="nextjs" ;;
    esac

    echo -e "${GREEN}✓ Frontend: $FRONTEND_FRAMEWORK${NC}"
    echo ""
fi

# Offer MOP foundation scaffolds
SCAFFOLD_MOP="n"
SCAFFOLD_MOP_RN="n"
if [ "$NO_SCAFFOLD" = "n" ]; then
    if [ "$FRONTEND_FRAMEWORK" = "nextjs" ]; then
        echo -e "${YELLOW}Scaffold from MOP Next.js foundation?${NC}"
        echo "  Pulls latest from github.com/ministryofprogramming/mop-foundation-nextjs"
        echo "  Workflow files (CLAUDE.md, .claude/, docs/, scripts/) are preserved."
        read -r -p "Scaffold now? (y/n): " SCAFFOLD_MOP
        echo ""
    fi

    if [ "$FRONTEND_FRAMEWORK" = "react-native" ]; then
        echo -e "${YELLOW}Scaffold from MOP React Native foundation?${NC}"
        echo "  Pulls latest from github.com/ministryofprogramming/mop-foundation-react-native"
        echo "  Workflow files (CLAUDE.md, .claude/, docs/, scripts/) are preserved."
        read -r -p "Scaffold now? (y/n): " SCAFFOLD_MOP_RN
        echo ""
    fi
fi

# -----------------------------------------------------------------------------
# Backend Framework (if applicable)
# -----------------------------------------------------------------------------
if [ -z "$BACKEND_FRAMEWORK" ] && { [ "$PROJECT_TYPE" = "web" ] || [ "$PROJECT_TYPE" = "mobile" ]; }; then
    BACKEND_FRAMEWORK="null"
fi
if [ -z "$BACKEND_FRAMEWORK" ]; then
    echo -e "${YELLOW}Step 4: Backend/Language${NC}"
    echo "  1) node      - Node.js"
    echo "  2) python    - Python"
    echo "  3) go        - Go"
    echo "  4) rust      - Rust"
    echo "  5) none      - No backend"
    read -r -p "Select backend (1-5): " BE_CHOICE

    case $BE_CHOICE in
        1) BACKEND_FRAMEWORK="node" ;;
        2) BACKEND_FRAMEWORK="python" ;;
        3) BACKEND_FRAMEWORK="go" ;;
        4) BACKEND_FRAMEWORK="rust" ;;
        5) BACKEND_FRAMEWORK="null" ;;
        *) BACKEND_FRAMEWORK="node" ;;
    esac

    echo -e "${GREEN}✓ Backend: $BACKEND_FRAMEWORK${NC}"
    echo ""
fi

# -----------------------------------------------------------------------------
# Update Configuration Files
# -----------------------------------------------------------------------------
echo -e "${YELLOW}Updating configuration files...${NC}"

# Update CLAUDE.md
if [ -f "CLAUDE.md" ]; then
    replace_in_file CLAUDE.md "[PROJECT_NAME]" "$PROJECT_NAME"
    replace_in_file CLAUDE.md "[web | mobile | backend | fullstack | cli]" "$PROJECT_TYPE"

    TECH_STACK=""
    if [ "$FRONTEND_FRAMEWORK" != "null" ]; then
        TECH_STACK="$FRONTEND_FRAMEWORK"
    fi
    if [ "$BACKEND_FRAMEWORK" != "null" ]; then
        if [ -n "$TECH_STACK" ]; then
            TECH_STACK="$TECH_STACK + $BACKEND_FRAMEWORK"
        else
            TECH_STACK="$BACKEND_FRAMEWORK"
        fi
    fi
    replace_in_file CLAUDE.md "[TECH_STACK]" "$TECH_STACK"
    echo -e "${GREEN}✓ Updated CLAUDE.md${NC}"
fi

# Update GitHub issue template config
if [ -f ".github/ISSUE_TEMPLATE/config.yml" ]; then
    # Get git remote URL to extract owner/repo
    REMOTE_URL=$(git config --get remote.origin.url 2>/dev/null || echo "")
    if [ -n "$REMOTE_URL" ]; then
        # Extract owner/repo from URL
        REPO_PATH=$(echo "$REMOTE_URL" | sed -E 's/.*github\.com[:/](.+)(\.git)?$/\1/' | sed 's/\.git$//')
        replace_in_file .github/ISSUE_TEMPLATE/config.yml "[OWNER]/[REPO]" "$REPO_PATH"
        echo -e "${GREEN}✓ Updated .github/ISSUE_TEMPLATE/config.yml${NC}"
    fi
fi

# -----------------------------------------------------------------------------
# MOP Next.js Foundation Scaffold (optional)
# -----------------------------------------------------------------------------
if [ "${SCAFFOLD_MOP:-n}" = "y" ] || [ "${SCAFFOLD_MOP:-n}" = "Y" ]; then
    echo ""
    echo -e "${YELLOW}Scaffolding MOP Next.js foundation...${NC}"
    if [ -x "./scripts/add-mop-foundation.sh" ]; then
        ./scripts/add-mop-foundation.sh || echo -e "${YELLOW}Foundation scaffold failed — re-run ./scripts/add-mop-foundation.sh manually.${NC}"
    else
        echo -e "${YELLOW}scripts/add-mop-foundation.sh not executable — skipping. Run: chmod +x scripts/add-mop-foundation.sh && ./scripts/add-mop-foundation.sh${NC}"
    fi
fi

if [ "${SCAFFOLD_MOP_RN:-n}" = "y" ] || [ "${SCAFFOLD_MOP_RN:-n}" = "Y" ]; then
    echo ""
    echo -e "${YELLOW}Scaffolding MOP React Native foundation...${NC}"
    if [ -x "./scripts/add-mop-foundation-rn.sh" ]; then
        ./scripts/add-mop-foundation-rn.sh || echo -e "${YELLOW}Foundation scaffold failed — re-run ./scripts/add-mop-foundation-rn.sh manually.${NC}"
    else
        echo -e "${YELLOW}scripts/add-mop-foundation-rn.sh not executable — skipping. Run: chmod +x scripts/add-mop-foundation-rn.sh && ./scripts/add-mop-foundation-rn.sh${NC}"
    fi
fi

# -----------------------------------------------------------------------------
# Rename CI Workflow
# -----------------------------------------------------------------------------
echo ""
echo -e "${GREEN}✓ CI: .github/workflows/quality-gates.yml runs lint, typecheck, tests and build${NC}"

# -----------------------------------------------------------------------------
# Initialize Workflow State
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}Initializing workflow state...${NC}"
mkdir -p .vibe
if [ ! -f ".vibe/state.json" ]; then
    cat > .vibe/state.json << 'STATEEOF'
{
  "version": 4,
  "active": null,
  "history": []
}
STATEEOF
    echo -e "${GREEN}✓ Created .vibe/state.json${NC}"
else
    echo -e "${GREEN}✓ .vibe/state.json already exists${NC}"
fi

# -----------------------------------------------------------------------------
# iggy.config.json: mode and language
# -----------------------------------------------------------------------------
LANGUAGE="node"
case "$BACKEND_FRAMEWORK" in
    python) LANGUAGE="python" ;;
    go)     LANGUAGE="go" ;;
    rust)   echo -e "${YELLOW}  Rust isn't supported by the CI gates yet. Keeping the Node defaults; set the commands in iggy.config.json yourself.${NC}" ;;
esac
if [ -f iggy.config.json ] && command -v node >/dev/null 2>&1; then
    # A non-Node language drops the npm commands, so its own defaults apply.
    MODE="$MODE" LANGUAGE="$LANGUAGE" node -e '
        const fs = require("fs");
        const config = JSON.parse(fs.readFileSync("iggy.config.json", "utf8"));
        config.mode = process.env.MODE;
        config.language = process.env.LANGUAGE;
        if (config.language !== "node") { delete config.commands; delete config.sourceDirs; }
        fs.writeFileSync("iggy.config.json", JSON.stringify(config, null, 2) + "\n");
    '
    echo -e "${GREEN}✓ iggy.config.json: $MODE mode, $LANGUAGE${NC}"
fi

# -----------------------------------------------------------------------------
# Template marker
# -----------------------------------------------------------------------------
# .iggy-template makes CI run the template's own fixture tests. A project made
# from the template doesn't need them.
if [ -f .iggy-template ]; then
    rm .iggy-template
    echo -e "${GREEN}✓ Removed .iggy-template (the template's fixture CI won't run here)${NC}"
fi

# -----------------------------------------------------------------------------
# Git hooks (lefthook)
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}Installing git hooks...${NC}"
if [ -f lefthook.yml ] && command -v lefthook >/dev/null 2>&1 && git rev-parse --git-dir >/dev/null 2>&1; then
    lefthook install >/dev/null && echo -e "${GREEN}✓ Git hooks installed (pre-commit: secrets, lint, typecheck; pre-push: tests)${NC}"
else
    echo -e "${YELLOW}  lefthook not found. Install it, then run: lefthook install${NC}"
    echo "  brew install lefthook   or   npm i -D lefthook && npx lefthook install"
fi

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    Setup Complete!                         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Project: $PROJECT_NAME${NC}"
echo -e "${GREEN}Type: $PROJECT_TYPE${NC}"
[ "$FRONTEND_FRAMEWORK" != "null" ] && echo -e "${GREEN}Frontend: $FRONTEND_FRAMEWORK${NC}"
[ "$BACKEND_FRAMEWORK" != "null" ] && echo -e "${GREEN}Backend: $BACKEND_FRAMEWORK${NC}"
echo ""

echo -e "${YELLOW}Quality gates are tier-based (MINIMAL → FULL).${NC}"
echo -e "${YELLOW}See CLAUDE.md for the gate table.${NC}"
echo ""

echo -e "${YELLOW}Tooling setup:${NC}"
echo "  Hooks      → .claude/settings.json (security guard, auto-lint + code scan after edits)"
echo "  Security   → hooks/security-guard.sh (blocks secrets files and dangerous commands; needs jq)"
echo "  MCP        → .mcp.json (context7, playwright, sequential-thinking, memory)"
echo "  GitHub MCP → requires: export GITHUB_TOKEN=ghp_your_token"
echo ""
echo -e "${YELLOW}Knowledge base:${NC}"
echo "  knowledge/CONVENTIONS.md   — Edit with your project's coding conventions"
echo "  knowledge/DEPENDENCIES.md  — Edit with your approved packages"
echo "  knowledge/ANTI-PATTERNS.md — UI anti-patterns checked during review"
echo ""
echo -e "${YELLOW}Personal preferences:${NC}"
echo "  cp CLAUDE.local.md.example CLAUDE.local.md"
echo "  # Edit CLAUDE.local.md — it is gitignored"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
if [ "$FRONTEND_FRAMEWORK" = "nextjs" ] && [ "${SCAFFOLD_MOP:-n}" != "y" ] && [ "${SCAFFOLD_MOP:-n}" != "Y" ]; then
    echo "  1. Scaffold foundation: ./scripts/add-mop-foundation.sh"
    echo "  2. npm install && npm run dev"
    echo "  3. Customize CLAUDE.md § Project Commands with your actual commands"
    echo "  4. Edit knowledge/CONVENTIONS.md and knowledge/DEPENDENCIES.md"
    echo "  5. Start your first feature: type /vibe feature in Claude Code"
elif [ "${SCAFFOLD_MOP:-n}" = "y" ] || [ "${SCAFFOLD_MOP:-n}" = "Y" ]; then
    echo "  1. npm install          # install foundation dependencies"
    echo "  2. npm run dev          # start dev server"
    echo "  3. Edit knowledge/CONVENTIONS.md and knowledge/DEPENDENCIES.md"
    echo "  4. Start your first feature: type /vibe feature in Claude Code"
    echo "  5. Re-pull latest foundation any time: ./scripts/add-mop-foundation.sh"
elif [ "$FRONTEND_FRAMEWORK" = "react-native" ] && [ "${SCAFFOLD_MOP_RN:-n}" != "y" ] && [ "${SCAFFOLD_MOP_RN:-n}" != "Y" ]; then
    echo "  1. Scaffold foundation: ./scripts/add-mop-foundation-rn.sh"
    echo "  2. pnpm install && pnpm start"
    echo "  3. Customize CLAUDE.md § Project Commands with your actual commands"
    echo "  4. Edit knowledge/CONVENTIONS.md and knowledge/DEPENDENCIES.md"
    echo "  5. Start your first feature: type /vibe feature in Claude Code"
elif [ "${SCAFFOLD_MOP_RN:-n}" = "y" ] || [ "${SCAFFOLD_MOP_RN:-n}" = "Y" ]; then
    echo "  1. pnpm install         # install foundation dependencies"
    echo "  2. pnpm start           # start Expo dev server"
    echo "  3. Edit knowledge/CONVENTIONS.md and knowledge/DEPENDENCIES.md"
    echo "  4. Start your first feature: type /vibe feature in Claude Code"
    echo "  5. Re-pull latest foundation any time: ./scripts/add-mop-foundation-rn.sh"
else
    echo "  1. Customize CLAUDE.md § Project Commands with your actual commands"
    echo "  2. Edit knowledge/CONVENTIONS.md and knowledge/DEPENDENCIES.md"
    echo "  3. Set GITHUB_TOKEN if you want GitHub MCP (issues, PRs, code search)"
    echo "  4. Start your first feature: type /vibe feature in Claude Code"
fi
echo ""
echo -e "${YELLOW}Available skills:${NC}"
echo "  /vibe feature  — Full workflow (scout → spec → implement → review)"
echo "  /prime         — Pre-load context before starting work"
echo "  /checkpoint    — Save/restore work-in-progress via git stash"
echo "  /retro         — Capture session learnings to memory"
echo "  /drift         — Detect spec-vs-implementation divergence"
echo "  /bug           — Structured bug analysis and fix"
echo ""
echo -e "${GREEN}Happy coding!${NC}"
