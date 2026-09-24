# Program planning templates

Each template is the smallest shape that lets the human approve the rung. Fill
only what is known; an unknown is written as a question with an owner, not
guessed.

## Primer (one page, shared with the team)

```markdown
# <program name>

## Problem
What is wrong today, for whom, with evidence.

## End state
What is true when the program is done. Include the properties every later
decision must keep (for example: one address per user on every chain; the old
account model stays supported with no end date).

## Decision
The approach, in two or three sentences, and the one-line reason it beats the
alternatives.

## Alternatives
| Alternative | Why it lost | What would reopen it |
|---|---|---|

## Assumptions
Each assumption is phrased against one end-state property named above.
| Assumption (property it serves) | Spike or evidence | Covers / does not cover | Status: proven / untested |
|---|---|---|---|

## Not doing
The adjacent work this program does not include, by name.

## Open questions
| Question | Owner | Needed by |
|---|---|---|
```

## PRD (features and scope)

```markdown
# <program name>: features and scope

## Features, in value order
1. <user or operator> can <do what>. Done when <measurable outcome>.
2. ...

## Scope
In: ...
Out: ...

## Economics and ownership
Who pays for what; what bounds spend; who owns each deployed thing.

## Done
<n> users on the new path in production, or the first cohort live, with the
signals that prove it.

## Constants
| Constant | Owner | Consumer | Decided by |
|---|---|---|---|
```

## Milestone

```markdown
## M<n>: <outcome a user or operator can observe>

Outcome: what is true on the assembled surface when this milestone closes.
Verifier: what runs, where, and the environment that can express the risk.
Estimate: <days> assuming <assumptions>; inventory: <link>, the list of
surfaces, files, and external waits counted to produce the estimate.
External waits: <step>, <expected wait>, <owner>, or "none".
Gate: one gate, with its evidence, or "none".
Issues: minted when this milestone is approved.
```

## Issue (problem-first)

```markdown
## Problem
What is wrong, for whom, and how it was observed.

## Evidence
Dated, with links, counts, or file paths.

## Why it matters
The cost of leaving it.

## Acceptance
- Observable behavior an operator can produce, one line each. The issue closes
  on a prose evidence comment mapping each line to its proof, not on ticked
  boxes.

## Related
Links to issues, PRs, or the milestone. Omit when empty.
```

The implementation plan is a comment on the issue, written when the issue is
picked up, naming the PR, the requirement ids, and the verifier. For
multi-step work the comment is the `planout` plan.

## Approval checklist

Before the first branch of a milestone the human sees:

- The milestone list with estimates and assumptions.
- The issue list for this milestone, each with one line: accept or skip.
- The file or package partition of the accepted issues, so parallel work does
  not collide.
- Any deliverable that is not a direct consequence of an accepted issue, asked
  as a question.

An issue is skipped when its problem has no evidence, its acceptance is not
observable, it duplicates an existing issue, or its output is retired by the
milestone's own plan.
