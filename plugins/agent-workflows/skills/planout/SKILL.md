---
name: planout
description: Use when the user explicitly wants an implementation plan for approved work that requires coordinated changes.
argument-hint: [spec file or path]
---

# Planout

Write the smallest implementation plan that achieves the approved outcome in `$ARGUMENTS` or the current conversation.

## Before planning

Read the specification or approved brief and inspect the actual code. Identify the existing flow to extend. Do not invent requirements to fill gaps; surface only ambiguities that block the first working result.

## Plan contract

Produce these sections:

```markdown
## Goal
The approved primary outcome.

## Existing flow
The current path being extended or corrected.

## First working milestone
The smallest end-to-end result and how it will be observed.

## Tasks
For each task:
- Requirement: the approved outcome or constraint requiring it
- Reuse: existing code and behavior it builds on
- Change: the minimal change
- Proof: the failing test or observable validation that demonstrates it

## Final verification
How to demonstrate the primary outcome end to end.

## Deferred work
Related improvements that are not part of this implementation.
```

Plan the first working vertical slice before hardening or optimization. Organize tasks around observable behavior, not technical layers. A task without an approved requirement does not belong in the plan.

Use one PR by default. Split only when the approved work contains independently shippable outcomes that genuinely need separate review or rollback.

Do not pre-write implementation code in the plan unless an interface must be fixed for coordination.

## Execution shape

By default, implementation and exploration run on the executor tier: dispatch them to subagents (in Claude Code, the `Agent` tool with `model: opus`). The session model is reserved for review gates and judgment. The user overrides this per run when a task needs the session model directly.

Each dispatched task carries the convention skills for the code it is about to write:

- `engineering-practices:code-law` for any code change
- `engineering-practices:typescript-best-practices`, `engineering-practices:typescript-clean-code`, or the matching language skill
- `engineering-practices:typescript-backend-architecture` for services and modules that own persistence or external I/O
- `engineering-practices:testing-best-practices` for tests and verifiers
- `engineering-practices:react-best-practices` for components, plus `vercel:react-best-practices` on Next.js and Vercel surfaces
- `engineering-practices:logging-best-practices` for log statements and instrumentation

## Complexity check

State which systems the plan touches, any new infrastructure it introduces, the requirement supporting each addition, and why the existing flow is insufficient. Unsupported additions move to **Deferred work**.

## Artifact and handoff

Follow the user's and repository's artifact policy; keep plans local and uncommitted unless explicitly asked to commit them. Present the plan for approval before implementation.
