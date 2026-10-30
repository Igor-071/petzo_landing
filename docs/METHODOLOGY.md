# Iggy Methodology

Why Iggy works the way it does. For how to use it day to day, read the [Guide](./GUIDE.md).

> **"Precision through specification. Quality through discipline. Control through process."**

Iggy is built for AI-assisted development where the human stays in control and the AI does the heavy lifting. Every practice below answers a specific way AI-assisted work goes wrong.

---

## Why each practice exists

### Right-sized ceremony (tiers)

**Problem:** One process for everything fails both ways. A typo forced through spec, test plan and review is friction people route around. A feature built with no spec is guesswork.

**Approach:** Five tiers, from MINIMAL (change and lint) to FULL (design, security and every gate). Claude proposes a tier, and you confirm or change it. *Not every change deserves a spec. But every feature does.*

### Specs before code

**Problem:** AI writes code fast, and often the *wrong* code, because the requirement was vague.

**Approach:** For features, a spec comes first and you approve it. Changing a spec is cheap; changing code is expensive. The spec is also the documentation that exists before the feature does.

### Given/When/Then criteria

**Problem:** "Make login secure" means something different to everyone, including the AI.

**Approach:** Each acceptance criterion describes exact behaviour with concrete values:

```gherkin
GIVEN a user who has failed login 3 times
WHEN they attempt a 4th login
THEN the account is locked for 15 minutes
AND they see "Account locked. Try again in 15 minutes."
```

Each one is testable, and edge cases (errors, empty states, limits, permissions) are written down instead of discovered in production.

### Tests first (TDD)

**Problem:** Tests written after the code tend to confirm what the code does, not what it should do.

**Approach:** Write the test, watch it fail (RED), write the minimum code to pass (GREEN), then refactor. A test that never failed proves nothing.

### Traceability

**Problem:** Requirements and tests drift apart, and features ship with criteria nobody tested.

**Approach:** Every criterion maps to a named test in the spec's traceability matrix. A feature isn't done until every row passes, and `/drift` checks that the code still matches.

### Quality gates

**Problem:** "It works on my machine." The AI reports success; the real checks were never run.

**Approach:** Up to ten gates, scaled by tier and defined once in [gates.md](../.claude/skills/review/gates.md). A gate that couldn't run is reported as skipped, never as passed. CI runs the same commands on every PR.

### The human approves

**Problem:** An AI can run ahead: building past an unapproved spec, or declaring victory early.

**Approach:** Claude stops at every phase gate and waits. Only your own message counts as approval, and nothing is committed or pushed without your instruction.

### Rules enforced, not just written

**Problem:** Instructions in a prompt are suggestions. Under pressure, or deep in a long session, an AI skips steps.

**Approach:** The rules that matter most are hooks: code is blocked until the tier is confirmed, the spec approved and a failing test logged, and completion claims are blocked while tests or lint fail. CI and git hooks back them up, so the guarantees don't depend on the AI remembering.

### Learning from bugs

**Problem:** The same classes of bug keep coming back.

**Approach:** Every bug gets a root cause (Five Whys), a regression test written before the fix, and a post-mortem. With the memory server, the lessons carry into later sessions.

### Documentation as a deliverable

**Problem:** Documentation gets skipped, or goes stale the week after it's written.

**Approach:** The spec comes before the code, the review report after it, and the feature docs and evidence trail are written when you approve. They're part of the feature, not an afterthought.

### Prototype first

**Problem:** Building the backend before the product is validated wastes the most expensive work.

**Approach:** Prototypes start from the MOP foundations and run on mock data, so the whole UI can be validated before an API exists. When the prototype is approved, `/mock-data-doc` hands the backend team every entity, operation and assumption. `mode: production` then turns on the full gates.

---

## Guiding principles

1. **Precision over speed.** Build the right thing slowly rather than the wrong thing quickly.
2. **Quality is not negotiable.** The active tier's gates pass, or the work isn't done.
3. **Human control.** The AI proposes; the human decides.
4. **Documentation is part of the feature.** Spec before code, review after, docs on approval.
5. **Learn from every bug.** Root cause, regression test, prevention.
6. **Simple before complex.** The simplest solution that works; no speculative abstraction.
7. **Honest recovery.** After any fix, re-run every check. When stuck, say so and ask. Never guess.
8. **Visual truth.** For UI, screenshots show what code review can't.

---

## You're using it well when

- Every feature has an approved spec before any code
- Every acceptance criterion has a passing test
- The gates pass before you see the feature
- Bugs have post-mortems and regression tests
- The commit history is clean, and nothing was committed without you
- You always know what's happening, and nothing surprises you
