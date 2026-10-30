---
name: prime
description: 'Loads the files, types, tests and imports most relevant to the current task before work starts. Use for /prime, "load context" or "what files are relevant".'
---

# Skill: Prime — Context Pre-Loading

Activate when: User says `/prime`, "load context", "what files are relevant", or before starting any significant work where understanding existing code is critical.

This skill identifies and reads the files most relevant to the current task, building a focused context before implementation begins. Unlike `/scout` (which scans the whole codebase for conventions), `/prime` targets specific files related to the task at hand.

## Process

### Step 1: Parse the Task

Extract from the user's message or current workflow state:
- **Target**: What component, feature, or area is being worked on?
- **Action**: Creating new, modifying existing, or fixing a bug?
- **Keywords**: Component names, function names, file paths, error messages

### Step 2: Search for Relevant Files

Run these searches in parallel using Glob and Grep:

1. **Direct matches** — Files whose names match the target keywords
   ```
   Glob: **/*[keyword]*.{ts,tsx,js,jsx,py,go,rs}
   ```

2. **Import graph** — Files that import or are imported by direct matches
   ```
   Grep: import.*[matched filename] or require.*[matched filename]
   ```

3. **Test files** — Existing tests for the target area
   ```
   Glob: **/*[keyword]*.test.* or **/*[keyword]*.spec.*
   ```

4. **Type definitions** — Interfaces, types, schemas related to the target
   ```
   Grep: (interface|type|schema|enum).*[keyword]
   ```

5. **Configuration** — Config files that affect the target (routes, API definitions, etc.)

### Step 3: Prioritize and Read

Rank files by relevance:
1. **Core**: The file(s) being directly modified or created — READ FULLY
2. **Adjacent**: Files that import/export from core files — READ KEY SECTIONS
3. **Tests**: Existing tests for the area — READ to understand expected behavior
4. **Types**: Type definitions used by core files — READ FULLY
5. **Config**: Route definitions, API schemas, etc. — SCAN for relevant entries

Stop at ~15 files maximum. If more are found, present the list and ask the user which to prioritize.

### Step 4: Present Context Briefing

```
CONTEXT LOADED: [Task Description]

Core files (read fully):
- src/components/LoginForm.tsx (142 lines)
- src/services/auth.ts (89 lines)

Adjacent files (key sections read):
- src/hooks/useAuth.ts — exports useAuth, useSession
- src/api/endpoints.ts — auth endpoints at lines 45-67

Existing tests:
- src/components/__tests__/LoginForm.test.tsx (6 tests)

Types:
- src/types/auth.ts — User, Session, LoginCredentials interfaces

Key findings:
- [Pattern observed: e.g., "All forms use react-hook-form with zod validation"]
- [Dependency: e.g., "Auth service uses the apiClient wrapper, not raw fetch"]
- [Convention: e.g., "Components follow the Container/Presenter pattern"]

Ready to proceed with [task].
```

### Step 5: Check Memory for Prior Context

```
Use mcp__memory__search_nodes with query: "[task keywords]"
```

If relevant memories exist, append to briefing:
```
Prior context (from memory):
- "A similar auth feature was built last week — used JWT with httpOnly cookies"
```

## When to Auto-Invoke

The `/vibe` skill should auto-invoke `/prime` in these cases:
- LIGHT tier: Before reading code to understand the issue (Step 1)
- STANDARD+ tier: After `/scout` completes, before `/spec` starts

For MINIMAL tier: Skip — not needed for typos and config changes.

## State Tracking

Priming happens inside the current phase, so it doesn't change the workflow phase.
On completion: list the loaded files in your reply so later phases can refer to them.

## Rules

- Never modify files — this is a read-only skill
- Stop at 15 files. More than that means the task scope is too broad — suggest splitting
- Always include existing tests in the briefing — they reveal expected behavior
- If no relevant files are found, say so honestly: "No existing code found for [target]. This appears to be greenfield."
- Prefer reading real code over documentation — code is the source of truth

## Error Recovery

- **No matching files found:** Report honestly. Ask user for more specific file paths or component names. The task may be greenfield (new code with no existing context).
- **Too many matches (50+):** The search is too broad. Ask user to narrow the scope: "I found 73 files matching 'auth'. Can you specify which part — login, registration, or session management?"
- **Files are too large to read fully:** Read the first 100 lines + grep for relevant functions/exports. Report what was skimmed vs. fully read.
- **Memory MCP unavailable:** Skip Step 5. Proceed with file-based context only.
