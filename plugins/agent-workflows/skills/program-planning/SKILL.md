---
name: program-planning
description: Use when work is larger than one pull request or one campaign, such as a feature program, an epic, a platform migration, or a rollout with several gates, and before minting its milestones or issues; also when an existing program's milestones or open issues need a review after a scope change.
argument-hint: [intent, epic link, or program name]
---

# Program Planning

Turn an intent into a ladder the human approves one rung at a time. Each rung is
short; the value is in the approval between rungs, not in the documents.

```
PRIMER      one page the team reads in five minutes: problem, end state, decision, alternatives, non-goals
PRD         features in value order, each as what a user or operator can do; scope; what done means
MILESTONES  shippable slices with a user-visible outcome, an estimate with its assumptions, and one gate each
ISSUES      minted per milestone when that milestone is approved: problem-first, one PR each, parallel by files
APPROVAL    the human ratifies each milestone and accepts or skips each issue before the first branch
BUILD       one PR per issue against the base branch; spec-best-practices and planout per issue; independent PRs, not a stack
```

Templates for each rung are in [references/templates.md](references/templates.md).
When the tracker is GitHub, [references/github.md](references/github.md) maps each
rung to one native object and lists the commands in ladder order.
A change the human asks for directly that fits one pull request skips the
ladder entirely; the ladder governs programs, not fixes.

## Primer

- Name the end state the program serves and the properties every later decision
  must keep (one address on every chain, the old model stays supported). A
  property nobody wrote down cannot be traded against, so it is decided by
  accident.
- Every load-bearing technical assumption is phrased against a named end-state
  property and either carries a spike whose exit is a decision record, or is
  labeled untested. The record states what the spike covered and what it did
  not; a spike narrower than the property leaves the assumption untested, and a
  milestone that depends on an untested assumption waits for the spike or for a
  dated decision record naming the human and the accepted risk. A spike is a
  day of disposable code on an existing harness, not a phase.
- List the alternatives considered and why they lost, in present tense, so a
  later reversal is a dated decision instead of a rediscovery. Keep the losing
  alternative's design findable; do not gate it behind a trigger clause.
- Share it where the team can comment. Durable decisions flow to the nearest
  `SPEC.md` Decisions. The primer is context, not law.

## PRD

- A feature is what a user or operator can do when it ships, in value order.
  Environment promotion, audits, dashboards, runbooks, and rollout ladders are
  steps inside a feature's milestone, never features or milestones of their own.
- Non-goals are explicit and name the tempting adjacent work.
- Done is a measurable outcome for users (n internal users on the new path, the
  first external cohort live), not artifacts deployed dark.
- Decide the economics and the ownership model before any contract is written:
  who pays, what bounds spend, who owns each deployed thing.
- No numeric operating constant without a named owner and a named consumer. A
  number nobody will measure is written as "decided by milestone N". A value
  called locked cites a closed decision record or a measurement whose harness
  is committed and whose artifact is pinned; a placeholder from an open ticket
  is not a lock.

## Milestones

- The first milestone is the thinnest end-to-end slice of the end state reaching
  real users, internal or external, named in the milestone, behind a flag. Migration machinery, hardening, and rollback come
  after a real user has used the new path, because the first real run is the
  design review.
- A milestone ends with something observable on the assembled surface, stated
  as the composed journey (a user sends on the old model, upgrades, then sends
  on the new one), not as layers that each pass alone. It names its verifier
  and an environment that can express its risk: a fee contract needs a
  production-shaped fee environment, a vendor constraint needs the vendor, a
  cross-package seam needs a test at the seam.
- A milestone carries an estimate with its assumptions and the inventory that
  produced it. The number the team hears is this number. An estimate that left
  the room before its inventory is withdrawn the same day by the person who
  gave it, in every channel it reached, and replaced by the milestone estimate
  with its assumptions. An externally
  scheduled step (an audit, a vendor, a signer) is named in the assumptions
  with its expected wait and its owner.
- A gate decides something (which of two branches, whether a measured number
  clears a floor). A gate that only confirms, or records a decision already
  made somewhere else, is folded into the milestone it protects; a decision
  record captures where the decision happened.
- A gate that can skip silently is not a gate. Before a milestone relies on a
  check, confirm the check executes on the artifact it claims to cover. A
  milestone whose named verifier is broken is blocked until the verifier is
  repaired or a substitute is named and ratified with the milestone; the repair
  has an owner named in the milestone.

## Issues

- Mint issues when their milestone is approved, never for milestones that are
  not. Issues minted months ahead become tracker debt the day the plan changes.
- Problem-first: what is wrong, the evidence, why it matters. No implementation
  contract, no mechanism, no constants copied from the PRD, no plural
  abstraction where the work needs one value. Acceptance is observable behavior
  an operator can produce. The implementation plan is a comment written when the
  issue is picked up.
- Parallel by construction: the issues of one milestone partition the files or
  packages they touch. A dependency edge exists only where one issue's output is
  another's input. Two issues that touch the same files are one issue, or are
  sequenced and say so.
- Small enough for one PR under the repository's size budget. When the smallest
  coherent deliverable exceeds it, split the issue, not the PR.
- Acceptance points at requirement ids in the nearest `SPEC.md` where one
  exists, so a design change moves the spec and not every issue that cites it.
  An issue closes on a prose evidence comment mapping each acceptance line to
  its proof; checkbox lists that nobody ticks are not acceptance.
- Every deliverable in an issue was asked for. A verifier, a screen, a
  reconciliation workflow, or a runbook that nobody named is a question to the
  human, not a build.

## Approval

- Before the first branch the human sees the milestone list with estimates, the
  issue list for the first milestone, and gives one line per issue: accept or
  skip. Skipped issues close on the day of the go, with the reason. A change to
  the accepted partition (issues merged, split, or resequenced) returns to the
  human for one line per affected issue.
- Before any tracker mutation of more than a few items, draft the bodies, hold
  them unposted, fact-check every claim in them against the tree, restate the
  plan, and wait for the go. Decide the identity scheme, the hierarchy, and the
  board layout before the first item exists; relabeling after creation costs a
  pass over every item. The GitHub mapping in the reference is the default
  scheme; a variant is ratified with the milestone list.
- After a reversal, and when adopting the ladder over an existing plan: write a
  dated decision record with its approvals, freeze the superseded plan in a
  collapsed block, re-derive the milestones, re-read every
  open issue, epic, and milestone description against the tree, adopt each
  survivor into an approved milestone with its body corrected to the current
  path, and close the rest on the day of the go with the reason. Never rewrite closed issues or comments.
- Re-read the plan at every milestone boundary. Acceptance criteria, dependency
  edges, and premises decay while the tree moves.

## Build

- One PR per issue against the base branch. A dependency edge between issues is
  executed by landing the producing PR on the base first, never by basing the
  consumer's packet on the producer's branch. When a stack is allowed, how
  large it may be, and when it merges is the `ship-stack` policy.
- The pre-merge drive and the bug bash run on a disposable integration branch
  merged from the milestone's open PRs and discarded afterwards. It is not a
  review target and never a packet base. The milestone's driver owns the drive;
  a fix lands in the PR that owns the file it touches.
- The executor packet carries the milestone's simplicity bar, the house style
  for comments, PR bodies, and issue tone (`writing-technical-english` where
  the repository states none), and the verifier. Taste stated in
  review is the expensive path; state it in the packet.
- A named unproven seam blocks promotion. An open issue that says the seam is
  unproven is not a risk row on a promotion; it is the gate. The block lifts
  only through a dated decision record naming the human, the accepted risk, and
  alternative evidence that was executed on the artifact the seam covers, with
  its output cited in the record.
- An unrequested deliverable already built is held out of the PR until the
  human answers; one that touches an authorization, safety, or emergency path
  is removed before review and re-enters only as its own problem-first issue
  under the high-risk gate.
- A human drives the assembled integration branch once before the milestone's
  PRs merge, in addition to each issue's bug bash.

## Red flags

- More than ten issues minted in one day.
- An issue body that locks a mechanism, or copies constants from the PRD.
- A milestone whose exit is an environment state, or a phase list that is an
  environment ladder.
- A stack outside the `ship-stack` policy.
- Parallel executors whose packets base on each other's branches.
- An estimate given to people before an inventory.
- A gate the plan names that runs on nothing (no CI on drafts, a matrix that
  reports skipped, a nightly suite red for weeks, a freeze on a moving branch).
- A deliverable nobody approved.
- Two tracker objects for one rung, or a board field that mirrors what the
  tracker derives.

## Handoff

Per accepted issue: `spec-best-practices` when the outcome needs
clarification, then `planout`, then build, then `bugbash` on the assembled
surface. Issue filing mechanics live in `create-github-issue`, the GitHub
object mapping in `references/github.md`, and flag detail in the `gh` skill;
durable requirements and decisions in `spec-best-practices`; the stack
exception in `ship-stack`. `create-github-issue` is user-invoked; a driver
filing without it applies the issue law in the Issues rung directly.
