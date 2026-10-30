---
name: getting-started
description: 'Interactive onboarding that walks a new user through their first feature with the Iggy workflow. Use for /getting-started, "how does this workflow work" or when the user is clearly new.'
---

# Skill: Getting Started — Interactive Onboarding

Activate when: User says `/getting-started`, "how does this workflow work", "teach me the workflow", or is clearly new to the project.

## Purpose

Walk a new user through their first feature using the Iggy workflow, teaching by doing. This is NOT a documentation dump — it's a guided, interactive experience.

## Process

### Step 1: Welcome

```
WELCOME TO IGGY

This workflow adapts to your change. Small fix? Minimal ceremony.
New feature? Full spec-driven TDD. You're always in control.

Here's what we have:

  MINIMAL  — Typos, styling, config (just lint)
  LIGHT    — Bug fixes, small changes (test + fix)
  STANDARD — New features (spec → TDD → review)
  FULL     — Major features (all gates, full docs)
  EMERGENCY — Production fires (fix fast, postmortem later)

Let's try it. What's the first thing you want to build or fix?
```

### Step 2: Detect and Explain

When the user describes their task:

1. Run auto-detection (same as `/vibe`)
2. Explain the detection:

```
You said: "add a login form"

I detected: STANDARD tier
Why: New feature with UI, likely 3+ files, needs acceptance criteria

This means we'll go through:
  1. SPEC — I'll write acceptance criteria (Given/When/Then)
  2. TEST PLAN — We'll plan what to test before coding
  3. IMPLEMENT — TDD: failing test → code → refactor
  4. REVIEW — Run quality gates (lint, tests, responsive, etc.)
  5. PRESENT — Show you the result for approval

Each step, I'll explain what's happening and why. Ready?
```

### Step 3: Walk Through Each Phase

For each phase in the detected tier, provide a brief explanation BEFORE executing:

**Before Spec:**
```
PHASE: SPECIFICATION

We write acceptance criteria BEFORE coding. Each criterion uses
Given/When/Then format so there's zero ambiguity about what
"done" looks like.

Writing the spec now...
```

Then execute the `/spec` skill normally.

**Before Test Plan:**
```
PHASE: TEST PLANNING

Before writing code, we decide what tests we need. This prevents
thrashing — rewriting tests because we didn't think ahead.

Planning tests now...
```

Then execute the `/test-plan` skill normally.

**Before Implementation:**
```
PHASE: IMPLEMENTATION (TDD)

Now the fun part. For each acceptance criterion:
  RED   — Write a test that fails (proves we need the code)
  GREEN — Write minimum code to pass (no cleverness)
  BLUE  — Refactor (clean up while tests stay green)

Starting TDD cycle...
```

Then execute the `/implement` skill normally.

**Before Review:**
```
PHASE: QUALITY REVIEW

Before shipping, we run quality gates. These catch issues
before they reach users. Gates include: tests, lint,
responsiveness, and code review.

Running gates now...
```

Then execute the `/review` skill normally.

**Before Present:**
```
PHASE: PRESENT

Everything passed. Now I'll show you what was built,
how to test it, and ask for your approval. Only you
decide when it's ready to ship.
```

### Step 4: Wrap Up

After the user approves:

```
YOUR FIRST FEATURE IS COMPLETE!

Here's what we just did:
  1. Wrote a spec with clear acceptance criteria
  2. Planned our tests before coding
  3. Used TDD to implement each criterion
  4. Ran quality gates to verify everything
  5. Got your approval before finishing

Quick reference for future work:
  /vibe <description>  — Start any workflow (auto-detects tier)
  /fix <description>   — Quick fix (no spec needed)
  /status              — See where you are
  /spec                — Write a specification
  /review              — Run quality gates
  /ship                — Commit and create PR

Full cheat sheet: docs/GUIDE.md
```

## Rules

- Be encouraging but not patronizing. Explanations should be concise (2-3 sentences each).
- Execute real skills — don't simulate. The user should see actual output.
- If the user's first task is MINIMAL (typo fix), walk them through it but mention: "For bigger features, we'd use STANDARD tier with specs and TDD."
- Don't overwhelm. If the user seems confused, slow down and ask what they'd like clarified.
- This skill is for learning. After the first walkthrough, the user should use `/vibe` directly.

## Error Recovery

- If the user doesn't know what to build: Suggest a simple example ("How about we add a 'Hello World' component?")
- If the user wants to skip phases: Explain briefly why each phase exists, but respect their choice. Note which phases were skipped.
- If something fails during the walkthrough: Use it as a teaching moment. "This is exactly why we run gates — it caught [issue]."
