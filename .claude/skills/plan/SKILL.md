---
name: plan
description: 'Decomposes a product idea, epic, or document into ordered STANDARD-tier features with dependency order and scope boundaries. Use for /plan or when a request is too large for a single /vibe workflow.'
---

# Skill: Plan — Feature Decomposition

Activate when: User says `/plan`, or when a request is too large for a single `/vibe` workflow.

## Purpose

Break a product idea, epic, or document into ordered, independently deliverable features. Each feature is sized for a single `/vibe feature` workflow (STANDARD tier). The output is a plan document in `docs/plans/` that the user approves before starting any `/vibe` workflow.

## Process

### Step 1: Understand the Input

Read any linked documents, product briefs, or the user's description. Search memory for related context. Run `/scout` if the project has existing code.

Ask clarifying questions if the input is vague:
- "What's the core user flow?"
- "Who is the user?"
- "What's the MVP — what can we cut?"

### Step 2: Identify Features

Break the idea into self-contained features. Each feature must be:
- Deliverable in one `/vibe feature` workflow (3-10 files, under 100-line spec)
- Independently testable
- Shippable on its own (the app works after each feature lands)

### Step 3: Order by Dependency

Sort features so each builds on what came before. Mark which features can run in parallel (no dependency between them).

### Step 4: Write the Plan Document

Create `docs/plans/[name].md` using the format from [PLAN_TEMPLATE.md](../../../docs/PLAN_TEMPLATE.md):

```markdown
# Plan: [Name]

## Goal
One paragraph: what the product idea achieves and who it's for.

## Features (in order)

### 1. [feature-name-1]
**Tier:** STANDARD
**What:** One sentence.
**Why first:** Dependency reason or "foundation layer".
**Inputs:** What it needs (API, design, data).
**Outputs:** What it produces (component, endpoint, schema).

### 2. [feature-name-2]
**Tier:** STANDARD
**What:** One sentence.
**Depends on:** feature-name-1
**Inputs/Outputs:** ...

(continue)

### Parallel Groups
Features [3] and [4] have no dependency — they can run in parallel with `/worktree`.

## Out of Scope
What this plan explicitly does NOT cover.

## Open Questions
Decisions the user needs to make before starting.
```

### Step 5: Present and STOP

Show the plan summary. **STOP and WAIT for explicit approval.** The user may reorder, drop features, split further, or merge.

### Step 6: After Approval

The user starts each feature with `/vibe feature <name>`. The plan doc is a reference, not state — there's no automated tracking of which features are done. (The user can check by looking at `docs/specs/` and `docs/evidence/`.)

## Rules

- Each feature name must be a valid feature identifier (`[A-Za-z0-9._-]+`).
- Target 3-7 features. Fewer than 3 means it's probably just a STANDARD feature. More than 7 means the plan itself should be split into phases.
- LIGHT-tier items (bug fixes, config changes) should be called out but not numbered as features — list them as "Prep work" at the top.
- Don't write specs — `/spec` does that. The plan describes *what* each feature does, not its ACs.
- If the input is small enough for one STANDARD feature, say so and redirect to `/vibe feature`.

## Error Recovery

- **Input too vague:** Ask clarifying questions. "What's the core user flow?" "Who is the user?"
- **Can't determine order:** Ask the user which feature is most valuable — that goes first.
- **Features too coupled:** Merge them. Two features that can't be tested independently are one feature.
- **User disagrees with split:** Adjust. The plan is a proposal, not a mandate.
