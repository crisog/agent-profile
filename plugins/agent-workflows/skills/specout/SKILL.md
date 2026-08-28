---
name: specout
description: Use when the user explicitly wants a written specification for a change whose outcome or scope needs clarification.
argument-hint: [idea, topic, or draft path]
disable-model-invocation: true
---

# Specout

Turn `$ARGUMENTS`, or the current conversation, into the smallest useful specification.

## Start with the existing flow

Inspect the relevant code and current behavior before asking questions. Establish what already works, whether the feature is in production, and the smallest observable change that would satisfy the request.

Ask only questions whose answers change that first working result. Find facts in the codebase yourself. Use `agent-workflows:grilling` only when the user explicitly asks to stress-test the idea.

## Specification contract

Produce these sections:

```markdown
## Problem
Why the change matters.

## Primary outcome
The single observable result required.

## Smallest working proof
The first end-to-end behavior that proves the outcome works.

## Known constraints
Only constraints supported by the user, deployed behavior, an observed failure, or a real trust boundary.

## Out of scope
Related work that is not needed for the first proof.

## Later questions
Potential follow-ups that do not become current requirements.
```

The primary goal is working software in the simplest way possible. Reuse the existing path. A concern belongs in the current specification only when it is necessary for the smallest working proof or supported by concrete evidence. Otherwise, record it under **Later questions**.

If the feature has not shipped, compatibility with experimental behavior is out of scope unless the user requires it.

## Complexity check

Before presenting the specification, state:

- the existing flow being reused;
- any new subsystem required and the approved requirement that demands it;
- the first end-to-end proof;
- the work intentionally deferred.

If a new subsystem has no concrete supporting requirement, defer it.

## Artifact and handoff

Present the specification for approval. Follow the user's and repository's artifact policy; keep specs local and uncommitted unless explicitly asked to commit them.

Bounded changes proceed directly to implementation after approval. Use `agent-workflows:planout` only when the user requests a plan or the approved work genuinely needs coordinated multi-step execution. PR sequencing is a planning decision, not part of the specification.
