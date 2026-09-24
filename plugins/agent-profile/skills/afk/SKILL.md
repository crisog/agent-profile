---
name: afk
description: Use when the user says they are stepping away and the agent should continue without interactive approvals
---

# AFK Work

The user is away: no interactive approval will arrive. Continue the authorized
work; presence changes neither its scope nor existing authorization. Do not
start a new campaign or manufacture documents solely because the user left.
Campaign protocol — scope derivation, the unblocking ladder, terminal states,
budgets — is the loop-brief skill's; when a `LOOP.md` exists, run its
iterations under the budget and terminal rules it already declares.
This skill adds the operational constraint: nothing you run may block on a
prompt.

## Allowed

- Read and edit files; run local tests, builds, typechecks, and linters.
- Commit local changes when commits do not require signing prompts.
- Read-only issue, PR, and CI commands with noninteractive auth already
  provisioned.

## Avoid — anything that can block on a human

- Push, force-push, deploy, publish, merge (the publish boundary,
  regardless of presence).
- Commands that trigger credential-manager, biometric, sudo, browser, or
  new auth flows; secret reads without a provisioned noninteractive path.
- Unbounded foreground processes.

## No loop?

A bounded task can finish in the current session on its existing plan and
checks. For wider work, derive scope from committed artifacts: `LOOP.md`,
specs, recent commit messages. Uncovered decisions climb the ladder —
reversible interior calls are made and logged as dated provisional Decisions,
not accumulated. Keep working independent items when a boundary blocks one
action. Terminate per the loop's terminal states (`done`, `blocked: needs N
decisions` with a numbered evidenced batch, or `budget-exhausted`), and before
stopping write back the loop, or save the outcomes and unfinished state to a
PR body, tracker comment, or persistent memory when no loop exists. Report the evidence,
remaining decisions, and proposed next steps at the stop.
