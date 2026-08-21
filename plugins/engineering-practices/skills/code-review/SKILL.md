---
name: code-review
description: Conduct solution-oriented code reviews that evaluate whether changes represent the best approach to the problem, not just whether they work. Use when reviewing PRs, diffs, or code changes.
---

# Code Review

## Philosophy

Code review is stewardship. The decisions made today—the patterns established, the shortcuts taken, the standards upheld or relaxed—compound over time. Future contributors will look at what exists and assume it's the way things are done here.

Your job isn't just to catch bugs. It's to ask whether each change leaves the codebase in a better state than before. The primary question for every review is: **"Is this the best way to solve this problem?"**

This is fundamentally different from "does this code work?" or "does it follow style guidelines?" Those are necessary but insufficient. You're evaluating whether the solution itself is sound—and whether you'd want someone to copy it.

## Review Process

### 1. Understand the Problem First

Before examining any code, understand what problem is being solved.

- Read the PR description, linked issues, or commit messages
- If the problem isn't clear, ask for clarification before reviewing
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

Does the abstraction serve a real need, or is it speculative?

### Under-Engineering

Is this a quick fix for something that will recur? Will the next person copy this shortcut?

### Broken Windows

Does this change normalize something that shouldn't be normal?

## Output Format

Structure your review as:

1. **Summary** (1-2 sentences): Your overall assessment
2. **Approach** (if concerns): High-level questions about the solution direction
3. **Implementation** (if concerns): Specific issues with blocking vs non-blocking clearly marked
4. **Precedent** (if relevant): Whether this establishes patterns worth following
5. **Verdict**: Approve, Request Changes, or Comment
