---
name: planout
description: Use when approved work spans several steps, files, or verification stages and needs an implementation plan, either because the user asks for one or because the delivery flow reaches its PLAN gate.
argument-hint: [spec file or path]
---

# Planout

Write the smallest implementation plan that achieves the approved outcome in `$ARGUMENTS` or the current conversation. Every task is specific enough that an engineer can execute it without inventing missing requirements.

Do not use this skill when:

- The change is small enough to track directly in your harness's plan or progress mechanism, when one exists.
- Requirements are still ambiguous.
- The user asked to implement immediately and the work is trivial.

## Before planning

Read the specification or approved brief and inspect the actual code. Identify the existing flow to extend. Do not invent requirements to fill gaps; surface only ambiguities that block the first working result.

Confirm the scope is one coherent unit of work. If the request covers several independent changes, split it into separate plans or clearly separated task groups.

## Plan contract

Produce these sections:

```markdown
## Goal
The approved primary outcome.

## Scope
What this plan covers.

## Non-goals
What this plan intentionally avoids.

## Risks
Key technical or rollout risks.

## QA design
Each material risk mapped to its cheapest faithful evidence, instead of every test layer by habit.

## Existing flow
The current path being extended or corrected.

## First working milestone
The smallest end-to-end result and how it will be observed.

## Files
- Create: `path/to/new_file`
- Modify: `path/to/existing_file`
- Test: `path/to/test_file`

## Tasks
For each task:
- Targets: the REQ-* ids or BRIEF floors it advances
- Risk class: whether it falls in an ADF high-risk class
- Reuse: existing code and behavior it builds on
- Change: the minimal change
- Steps, for a runtime behavior change:
  - Write the failure modes the change must handle
  - Run the E2E flow, or the failure-first isolation test for an isolated unit, and observe it red
  - Make the minimal change
  - Rerun the same check and observe it green
  - Refactor while green with `code-law`, then rerun
- Verification: the exact command, the revision and environment it runs against, and the expected output; for an E2E run these are the fields of its artifact
- Dependencies: `Task N-1` or `none`

## PR sequencing
Only when the work ships as a stack: one section per PR in merge order, each with its scope and its tasks. `ship-stack` reads this section.

## Final verification
How to demonstrate the primary outcome end to end.

## Deferred work
Related improvements that are not part of this implementation.
```

## Planning rules

- A task that advances no REQ-* id or BRIEF floor is omitted unless a SPEC invariant or safety requirement makes it necessary; the task cites that requirement.
- Use exact file paths.
- Plan the first working vertical slice before hardening or optimization. Organize tasks around observable behavior, not technical layers.
- When the existing structure fights the feature, put a behavior-preserving prefactor task first when it can be independently green. Keep the behavior change in the following task so either step is understandable and reversible.
- Include commands that can actually be run from the repo.
- Keep steps concrete: "add parser for X in `foo.ts`", not "improve parsing".
- Keep unrelated refactors out unless they are required to make the change safe.
- The ADF law defines the high-risk set; a high-risk task requires approval.
- Data-plane work (per-request or per-item hot paths) carries a back-of-envelope resource sketch.
- For an operable surface, name the bug-bash artifact, environment, task or time budget, and severity floor. High-risk ADF classes default to a matching bounded specialist review unless the human records a PLAN waiver; other classes add one only for a named risk that execution cannot decide. Put the selected review before the terminal bug bash, and never plan an open-ended review loop.

Use one PR by default, against the base branch. Split only when the approved work contains independently shippable outcomes that genuinely need separate review or rollback, and then prefer independent PRs over a stack; `ship-stack` names the one case a stack is right. When the work came through `program-planning`, the plan covers exactly one accepted issue, or one sub-issue of a ratified split.

Do not pre-write implementation code in the plan unless an interface must be fixed for coordination.

## Execution shape

Dispatch follows "Model tiering" in `AGENTS.md`. Each candidate runs the delivery-flow order in `AGENTS.md`: the objective checks, then the `deslopify` pass and the objective checks again, then the `code-review` Shape Pass and any selected specialist review, then the terminal bug bash on the rebuilt artifact.

Independent sidecar work may run as parallel bounded subagents with non-overlapping ownership; the critical path defaults to the packetized delegation stream of the delivery flow. Revise the plan when implementation reveals a real gap.

Each dispatched task carries the convention skills for the code it is about to write:

- `agent-workflows:code-law` for any code change
- `agent-workflows:typescript-clean-code` for TypeScript; other languages carry `code-law` alone
- `agent-workflows:typescript-backend-architecture` for services and modules that own persistence or external I/O
- `agent-workflows:testing-best-practices` for tests and verifiers
- `agent-workflows:react-best-practices` for components, plus `vercel:react-best-practices` on Next.js and Vercel surfaces
- `agent-workflows:logging-best-practices` for log statements and instrumentation

## Complexity check

State which systems the plan touches, any new infrastructure it introduces, the requirement supporting each addition, and why the existing flow is insufficient. Unsupported additions move to **Deferred work**.

## Artifact and handoff

Commit Discipline in `git-best-practices` governs plans. Use a concise session plan or your harness's plan mechanism for bounded attended work; save a plan file only when the user asks for one or unattended multi-session execution or recovery needs it. For a tracked issue, post the plan as a comment on the issue. Absorb durable decisions into the `SPEC.md`.

Present the plan for approval when the user asked for the plan or a task is high-risk. Otherwise proceed on the existing approval and do not request it again.

## Red flags

- Plans that rely on tool names from another harness
- Tasks that touch the same files from multiple parallel workers
- Parallel workers whose packets base on each other's branches (sequencing dressed as parallelism)
- Missing verification steps
- Hidden migrations, schema changes, or contract changes buried in generic wording
- Placeholder language like "update as needed" or "handle edge cases"
