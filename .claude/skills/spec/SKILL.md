---
name: spec
description: 'Writes a feature specification in docs/specs/ with Given/When/Then acceptance criteria, then stops for approval. Use when the user asks to build a new feature or for /spec.'
---

# Skill: Specification Writing

Activate when: User asks to build a feature, add functionality, or create something new.

## Process

1. Create `docs/specs/[feature-name].md` using the format below
2. FULL tier: also fill in § Production Readiness from `docs/SPEC_TEMPLATE.md` (threat model, data model and migrations, rollback, observability, configuration). Write an ADR in `docs/adr/` (from `0000-template.md`) for every architecture decision.
3. Present the spec to the user
4. **STOP. Wait for explicit approval before writing any code.**

## Spec Format

```markdown
# [Feature Name]

## Goal
One sentence. What does this feature do and why.

## Non-Goals
What this feature explicitly does NOT do.

## Acceptance Criteria

### AC-001: [Short description]
GIVEN [precondition]
WHEN [user action]
THEN [expected outcome]

### AC-002: [Short description]
GIVEN [precondition]
WHEN [user action]
THEN [expected outcome]

(continue for each criterion)

## Edge Cases
- [What happens when X]
- [What happens when Y]

## Error Scenarios
- [Invalid input] → [Expected behavior]
- [Network failure] → [Expected behavior]

## Traceability Matrix

| Criterion | Test File | Test Name | Status |
|-----------|-----------|-----------|--------|
| AC-001    |           |           |        |
| AC-002    |           |           |        |

## Technical Notes
Architecture decisions, component structure, data flow — only if non-obvious.
```

## State Tracking

On start: `node scripts/vibe.mjs phase spec`. Once the spec file exists: `node scripts/vibe.mjs spec docs/specs/[feature-name].md`, so the user's approval is tied to this exact version of the file. Editing the spec after approval needs a new approval.
On completion: present the spec and wait. The phase stays `spec` until the user approves, and the approval hook records it.

## Rules
- Every criterion MUST use Given/When/Then. No exceptions.
- Keep specs short. If a spec exceeds 100 lines, the feature is too big — use `/plan` to split it into smaller features.
- Non-goals are mandatory. They prevent scope creep.
- The traceability matrix starts empty. It gets filled during implementation.

## Error Recovery
- **User rejects spec:** Ask what needs to change. Revise the specific sections. Re-present. Don't rewrite from scratch unless asked.
- **Spec exceeds 100 lines:** The feature is too big. Suggest running `/plan` to decompose it into 2-3 smaller features. Present the plan for approval before writing specs.
- **ACs are ambiguous:** Ask clarifying questions before finalizing. "For AC-003, what should happen when the input is empty?"
- **Can't determine non-goals:** Ask directly: "What should this feature NOT do?" Non-goals are mandatory.
- **User wants to skip spec:** If tier is LIGHT or MINIMAL, that's fine — redirect to `/fix`. If STANDARD+, explain why specs matter but respect the user's choice.
- **Similar spec exists:** Check `docs/specs/` for existing specs. If found, ask: "A spec for [similar feature] already exists. Should we extend it or create a new one?"
