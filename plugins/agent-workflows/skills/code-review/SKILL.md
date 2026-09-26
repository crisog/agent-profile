---
name: code-review
description: Use when a PR or diff needs a review of its approach, precedent, fit with the codebase, or complexity, such as a human-facing design review for its author or the shape review gate of the delivery flow; not for a bug hunt.
---

# Code Review

## Scope

A bug hunt on a diff goes to the built-in `/code-review` command, not this skill.

This shape is the human-facing review written for a change's author. As a
delivery gate it is never generic: a gate is a bounded specialist review that
names one risk, a severity floor, and a round budget. The Shape Pass below is
one. Its terminal is findings at or above the floor, not an approval.

## Philosophy

Code review is stewardship. The decisions made today—the patterns established, the shortcuts taken, the standards upheld or relaxed—compound over time. Future contributors will look at what exists and assume it's the way things are done here.

Your job isn't just to catch bugs. It's to ask whether each change leaves the codebase in a better state than before. The primary question for every review is: **"Is this the best way to solve this problem?"**

This is fundamentally different from "does this code work?" or "does it follow style guidelines?" Those are necessary but insufficient. You're evaluating whether the solution itself is sound—and whether you'd want someone to copy it.

## Review Process

### 1. Understand the Problem First

Before examining any code, understand what problem is being solved.

- Read the PR description, linked issues, or commit messages
- If the problem isn't clear, locate it — description, issue, commits, tests — before reviewing; what stays unclear is a finding, not a question
- Identify: What behavior is changing? Why?

### 2. Evaluate the Approach

Once you understand the problem, assess whether this approach makes sense:

- Are there simpler ways to achieve this?
- Does this address the root cause or just a symptom?
- Will this scale with expected growth?
- Does this duplicate logic that exists elsewhere?
- Is this the right layer or component for this change?
- What are the tradeoffs of this approach vs alternatives?
- Does this establish a pattern others will follow? Is that pattern good?

Flag approach-level concerns before getting into implementation details. A perfectly implemented wrong approach is still wrong.

### 3. Review the Implementation

Only after you're satisfied the approach is sound:

- Correctness: Does it handle edge cases? Are there off-by-one errors, null checks, race conditions?
- Readability: Can someone unfamiliar with this code understand it in six months?
- Performance: Are there unnecessary allocations, N+1 queries, or blocking calls?
- Testing: Are the important behaviors covered? Are tests testing the right things?

### 4. Consider the Precedent

Every merged PR teaches the next contributor what's acceptable here. Ask:

- If someone copies this pattern, will that be good or bad?
- Does this raise or lower the bar for the codebase?
- Will this change be pointed to as an example of how to do things, or a cautionary tale?

## What "Best" Means

"Best" is contextual. Evaluate against:

| Criterion       | Question                                                                        |
| --------------- | ------------------------------------------------------------------------------- |
| Simplicity      | Is this the easiest solution to understand and maintain, given the constraints? |
| Fit             | Does it integrate well with existing patterns and architecture?                 |
| Proportionality | Does the complexity match the problem's importance?                             |
| Future cost     | What burden does this create for future changes?                                |
| Precedent       | If everyone did it this way, would that be good?                                |

A clever solution to a simple problem isn't "best." Neither is a quick hack for a recurring issue.

## Feedback Style

### Lead with Questions

Questions invite discussion; directives shut it down.

**Prefer:** "Have you considered using X here? It might simplify the error handling."

**Avoid:** "Change this to use X."

### Distinguish Blocking vs Non-Blocking

Be explicit about what must change vs what's a suggestion:

- **Blocking:** "This will fail silently if the connection drops—we need error handling here."
- **Non-blocking:** "Nit: I'd extract this into a helper, but fine either way."

### Explain Tradeoffs

When proposing alternatives, explain _why_, not just _what_:

**Weak:** "Use a map instead of a list here."

**Strong:** "A map would give O(1) lookups instead of O(n), which matters since this runs on every request. The tradeoff is slightly more memory, but that's negligible for this dataset size."

### Acknowledge Valid Alternatives

If the author's approach is reasonable even if you'd do it differently, say so:

"I'd probably have used X here, but your approach is equally valid. No change needed."

## When to Approve

Approve when you can say: "Given what we know today, this is a reasonable way to solve this problem, and it leaves the codebase no worse than before."

You don't need certainty it's optimal—just confidence it's sound and maintainable.

## When to Push Back

Some changes technically work but make the codebase worse. Push back when:

- A shortcut creates debt that others will pay
- A pattern is established that you wouldn't want copied
- The fix treats a symptom while ignoring the disease
- Complexity is added without proportional value

Be kind, but be honest. The future maintainer who inherits this code is counting on you.

## Common Patterns to Watch For

### Symptoms vs Root Causes

If a fix adds special-case handling, ask: should this be fixed at a higher level?

### Duplicated Logic

If similar code exists elsewhere, should this be unified?

### Wrong Layer

Is this business logic in a controller? UI logic in a model? Data access in a service?

### Over-Engineering

Does the abstraction serve a real need, or is it speculative? When the review
is scoped to fit and complexity alone, run the Shape Pass below.

### Under-Engineering

Is this a quick fix for something that will recur? Will the next person copy this shortcut?

### Broken Windows

Does this change normalize something that shouldn't be normal?

## Shape Pass

The Shape Pass is the SHAPE REVIEW gate of the delivery flow in `AGENTS.md`.
It is a bounded specialist review:

- Risk: code that does not fit the codebase. This covers written rules,
  layers, duplicate paths, unproven defenses, test bloat, and unnecessary
  complexity. The diff's best outcome is getting shorter.
- Severity floor: must-fix. A must-fix finding blocks the PR.
- Round budget: one round, plus a fix-up that confirms the findings.

Correctness, security, and performance belong to their own passes. Report a
bug you see, but do not hunt for one. The pass reports findings and applies
none.

### Tags

Each finding carries one tag and cites `file:line` at the PR head.

- `delete:` dead code, unused flexibility, a speculative feature. Replacement: nothing.
- `stdlib:` hand-rolled code the standard library ships. Name the function.
- `native:` a dependency or code doing what the platform already does. Name the feature.
- `yagni:` an abstraction with one implementation, configuration nobody sets, a layer with one caller.
- `shrink:` the same logic in fewer lines. Show the shorter form.
- `convention:` code that breaks a written repo rule or the sibling pattern. Cite both, each with `file:line`.
- `layer:` code in the wrong layer: a business rule, recovery, or math in data access, or protocol mechanics in a UI component. Cite the sibling that does it right.
- `duplicate:` two or more paths that give one outcome.
- `unproven:` a defensive branch that no observed failure supports, or that a named existing mechanism already covers.
- `test-bloat:` scaffolding tests, tests that exist only to reach a defensive branch, constants that name counts, and helpers larger than the behavior they set up.

### Severity

- must-fix: code the PR adds breaks a written rule or the layering, or adds complexity that no evidence supports.
- should-fix: the code reads worse than its siblings, but the harm stays contained.
- nit: style only.

`delete`, `stdlib`, `native`, and `yagni` findings are must-fix by default,
since each removes a dependency, abstraction, or layer that a higher rung of
the `code-law` ladder covers. A `shrink` finding is should-fix at most. The
smallest runnable check for new logic is required, never a finding. Do not
report a finding you cannot cite, or a "consider" item with no rule behind it.

A `layer:` or `convention:` finding on a shape the PR did not introduce is a
nit at most. Report it for a separate refactor. It is never must-fix, and the
PR never fixes it. Inside the diff, a `layer:` or `convention:` finding asks
for less code or an in-place change, not moved code.

### Reviewer discipline

- Read the repo instructions and two or three sibling files before you call anything off-style.
- The preferred fix for a shape finding is the smallest diff inside the file's existing structure. A suggestion that moves code across files or layers names its runtime diff size and justifies it.
- Read the whole issue: body, comments, and proposal. Scope and acceptance often live in comments.
- An "already covered" claim walks the concrete scenario through the named mechanism, with the values each side holds.
- A guard that protects a product-owner invariant is a contract, not a speculative defense. Examples: never charge twice, never lose data, never tell a user that something failed when it may have succeeded. Also check which side of an irreversible action the guard sits on.
- Documented platform behavior counts as evidence.
- Check a reference through the forge API. One failing CLI call is a tooling error, not proof of absence.
- An expected value you compute uses the fixture's units and the code's actual formula. Label it "unverified" unless you ran it.

### Output

This output replaces the Output Format below:

1. **Verdict**, in one line: `matches` when no finding reaches should-fix,
   `minor fixes` when each finding can be fixed in place, or `needs rework`
   when the PR must be redone with less code.
2. **Findings**: a table with severity, tag, `file:line`, the finding, and the
   rule it breaks.
3. **Deletion candidates**, each with its line count. End with
   `net: -<N> lines, -<M> dependencies possible`, or `Lean already.` when
   nothing can go.

## Output Format

Structure your review as:

1. **Summary** (1-2 sentences): Your overall assessment
2. **Approach** (if concerns): High-level questions about the solution direction
3. **Implementation** (if concerns): Specific issues with blocking vs non-blocking clearly marked
4. **Precedent** (if relevant): Whether this establishes patterns worth following
5. **Verdict**: Approve, Request Changes, or Comment — for the human-facing review; a gate reports findings against its floor instead

The summary and every comment follow `writing-technical-english`: the risk or
the requested change first, one idea per sentence, one hedge at most, and the
same verb for the same action across the review.
