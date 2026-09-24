---
name: ship-stack
description: Use when the user wants a multi-PR stack shipped from an approved spec through automated review gates — e.g. "ship the N PRs in this spec", a whole-branch review gate, or stacked branches that must land in order.
argument-hint: "[spec path] [base branch, default: the repo's default branch]"
---

# Ship Stack

Ship the PR stack defined in the spec: $ARGUMENTS

A stack is the exception, not the default shape. The default for work that
came through `program-planning` is one independent PR per accepted issue
against the base branch. Use this skill only when one change must land as
several reviewable steps of one atomic behavior change, and plan to merge the
whole stack the same day it goes green: a stack held open pays a rebase and a
review round for every unrelated change on the base. A stack of more than
three PRs, or a stack held open while the base moves, is a red flag. Work
fanned out to parallel executors is never linearized into a stack afterwards.

The spec's own PR sections define the count and scope — one branch and one PR per section, in the spec's order. If no spec is given, use the one produced in this session; if there is none, stop and report that an approved spec is required (`agent-workflows:spec-best-practices` governs how to write one).

## Fixed decisions (do not re-ask)

- **Topology:** PR 1 targets the base branch (the second argument, else the repo's default branch from Branch Discovery in `agent-workflows:git-best-practices`); PR N targets PR N-1's branch.
- **Strictly sequential:** PR N+1 starts only after PR N passes every gate. After a lower PR gains commits, rebase the stack above it with `agent-workflows:git-rebase-sync`.
- **Drafts:** every PR opens as a draft and stays a draft; the user flips them ready and merges.
- **Execution tier:** implementation, fixes, and exploration run on the executor tier (in Claude Code, the `Agent` tool with `model: opus`). The session model is reserved for review gates and judgment: task reviewers and the final whole-branch review run on the most capable available model. The user overrides this per run.

## Per-PR pipeline

1. **Plan** — run `agent-workflows:planout` on the spec's PR(N) section. If execution disproves the plan (a task cannot go green as ordered), amend the plan file with a REPLANNED note and continue; record it in the ledger.
2. **Implement** — one reviewed task at a time. Every fix wave goes back to the reviewer that raised the findings until its verdict is clean.
3. **Deslopify pass** — `agent-workflows:deslopify` on the branch diff against the stack parent, then rerun the objective checks and commit the result. Runs before the review gate so reviewers grade the code that ships.
4. **Whole-branch review gate** — the final whole-branch review on the finished branch, run on the most capable available model from a detached worktree at the branch tip with the stack parent as the range base (sidesteps dirty-tree WIP). Retry once on an environmental failure; a second environmental failure blocks the PR and is surfaced to the user. Findings are the normal outcome, not failure.
5. **Draft PR** — final-state narrative body per PR Creation in `agent-workflows:git-best-practices` and the repo's PR conventions. It must name every intentional behavior delta and each declined finding a reviewer would otherwise raise as a question.
6. **CI** — confirm the checks execute on a draft in this repository before treating CI as a gate; where they do not, run them on the branch tip and cite the output. Investigate failures; re-run once when flake-shaped (infra timeouts, unrelated packages). A real failure, or a flake that fails identically on the re-run, blocks the PR.

## Findings triage (review gate)

- **Fix** findings that are real and proportionate to the PR.
- **Decline** findings the spec explicitly overrules — with the spec citation recorded in the ledger and, when user-visible, in the PR body. The spec outranks the reviewer. When a declined finding is a stance the user might reverse (compatibility, product trade-offs), also list it in the closing summary for confirmation.
- **Escalate, don't block:** a finding the spec does not rule on and only the user can (new product trade-offs, external constraints) is recorded and surfaced in the closing summary while work continues.

## Durable progress

Keep a ledger file (`.ship-stack/progress.md`) updated after every task, gate, and triage decision — it is the recovery map across context loss. Never commit plan docs.

## Done

All PRs are drafts with the whole-branch review clean and CI green, the ledger records every declined finding with its grounding, and the closing summary lists the decisions reserved for the user, the merge order, and the follow-up queue.
