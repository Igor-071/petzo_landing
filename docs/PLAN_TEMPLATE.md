# Plan Template

Copy this template to `docs/plans/[plan-name].md` when decomposing a product idea into features.

---

```markdown
# Plan: [Name]

## Goal
[One paragraph: what the product idea achieves and who it's for.]

## Prep Work
[Optional. LIGHT-tier items (bug fixes, config changes, dependency installs) that should happen before the features below. These don't get their own `/vibe feature` workflow.]

- [ ] [prep-item-1]: [description]
- [ ] [prep-item-2]: [description]

## Features (in order)

### 1. [feature-name-1]
**Tier:** STANDARD
**What:** [One sentence describing the feature.]
**Why first:** [Dependency reason or "foundation layer".]
**Inputs:** [What it needs — API, design, data, prior feature output.]
**Outputs:** [What it produces — component, endpoint, schema, hook.]

### 2. [feature-name-2]
**Tier:** STANDARD
**What:** [One sentence describing the feature.]
**Depends on:** [feature-name-1]
**Inputs:** [What it needs.]
**Outputs:** [What it produces.]

### 3. [feature-name-3]
**Tier:** STANDARD
**What:** [One sentence describing the feature.]
**Depends on:** [feature-name-1]
**Inputs:** [What it needs.]
**Outputs:** [What it produces.]

### 4. [feature-name-4]
**Tier:** STANDARD
**What:** [One sentence describing the feature.]
**Depends on:** [feature-name-2], [feature-name-3]
**Inputs:** [What it needs.]
**Outputs:** [What it produces.]

### Parallel Groups
[List features that have no dependency between them and can run in parallel with `/worktree`.]

- Features [3] and [4] can run in parallel.

## Out of Scope
[What this plan explicitly does NOT cover. Be specific.]

- [Out of scope item 1]
- [Out of scope item 2]

## Open Questions
[Decisions the user needs to make before starting.]

- [ ] [Question 1]
- [ ] [Question 2]
```

---

## Usage Notes

1. Copy this template to `docs/plans/[plan-name].md`
2. Target 3-7 features. Fewer than 3 — it's probably one STANDARD feature. More than 7 — split the plan into phases.
3. Each feature name must be a valid identifier (`[A-Za-z0-9._-]+`) usable with `/vibe feature <name>`
4. Each feature should be deliverable in one `/vibe feature` workflow (3-10 files, under 100-line spec)
5. Don't write specs here — `/spec` does that during the feature's workflow
6. Present the plan for approval before starting any feature
