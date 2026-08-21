---
name: ship-stack
description: Use when the user wants a multi-PR stack shipped from an approved spec through automated review gates — e.g. "ship the N PRs in this spec", a Greptile score gate, a Codex/rl ultra-review gate, or stacked branches that must land in order.
argument-hint: "[spec path] [base branch, default: the repo's default branch]"
---

# Ship Stack

Ship the PR stack defined in the spec: $ARGUMENTS

The spec's own PR sections define the count and scope — one branch and one PR per section, in the spec's order. If no spec is given, use the one produced in this session; if there is none, stop and run `/specout` first.

## Fixed decisions (do not re-ask)

- **Topology:** PR 1 targets the base branch (the second argument, else the repo's default branch from `gh repo view --json defaultBranchRef` or the origin HEAD); PR N targets PR N-1's branch.
- **Strictly sequential:** PR N+1 starts only after PR N passes every gate. After a lower PR gains commits, rebase the stack above it.
- **Drafts:** every PR opens as a draft and stays a draft; the user flips them ready and merges.
- **Models:** implementers and fix subagents on Opus; task reviewers and the final whole-branch review on the most capable available model — unless the user names models.
- **Target score:** 5/5 unless the user names a different one.

## Per-PR pipeline

1. **Plan** — `/planout` the spec's PR(N) section. If execution disproves the plan (a task cannot go green as ordered), amend the plan file with a REPLANNED note and continue; record it in the ledger.
2. **Implement** — `superpowers:subagent-driven-development`, one reviewed task at a time. Every fix wave goes back to the reviewer that raised the findings until its verdict is clean.
3. **Ultra-review gate** — `rl:ultra-review` on the finished branch, from a detached worktree at the branch tip with the stack parent as the range base (satisfies the HEAD guard and sidesteps dirty-tree WIP). Retry once on an environmental failure (dead coordinator, detector shard error); a second environmental failure blocks the PR and is surfaced to the user. Findings are the normal outcome, not failure.
4. **Draft PR** — final-state narrative body per the repo's PR conventions. It must name every intentional behavior delta and each declined finding a reviewer would otherwise raise as a question.
5. **Score gate** — comment `@greptileai review`; poll the score comment (it edits in place). Repeat fix → reply → resolve → re-trigger until it shows the target score for the branch head. Real findings get a fix commit + a reply citing the SHA; false positives get an evidence reply. Resolve each thread either way.
6. **CI** — investigate failures; re-run once when flake-shaped (infra timeouts, unrelated packages). A real failure, or a flake that fails identically on the re-run, blocks the PR.

## Findings triage (both gates)

- **Fix** findings that are real and proportionate to the PR.
- **Decline** findings the spec explicitly overrules — with the spec citation recorded in the ledger and, when user-visible, in the PR body. The spec outranks the reviewer. When a declined finding is a stance the user might reverse (compatibility, product trade-offs), also list it in the closing summary for confirmation.
- **Escalate, don't block:** a finding the spec does not rule on and only the user can (new product trade-offs, external constraints) is recorded and surfaced in the closing summary while work continues.

## Durable progress

Keep a ledger file (`.superpowers/sdd/progress.md`) updated after every task, gate, and triage decision — it is the recovery map across context loss. Never commit spec or plan docs.

## Done

All PRs are drafts at the target score with CI green, the ledger records every declined finding with its grounding, and the closing summary lists the decisions reserved for the user, the merge order, and the follow-up queue.
