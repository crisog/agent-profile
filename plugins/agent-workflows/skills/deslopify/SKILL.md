---
name: deslopify
description: Use when the user wants the current branch simplified, and always as the delivery-flow gate after the objective checks are green and before a draft PR opens or the E2E/bug-bash gate runs. Removes vestigial code, unnecessary fallbacks, and test-driven runtime branches, and tightens weak boundaries.
---

# Simplify Current Changes

Simplify the current branch so the code is easier to understand and maintain. Preserve behavior unless a behavior change is explicitly required for correctness.

This pass is the DESLOPIFY gate of the delivery flow in `AGENTS.md`: it runs once the objective checks are green and before any draft PR or the E2E/bug-bash gate, and the objective checks rerun on its result. As a gate it always produces the summary below, including when nothing was removed. A branch with no runtime code change records that and skips the review passes.

## Context

Run these first and read the output:

- Current branch: `git branch --show-current`
- Base branch: the default branch from Branch Discovery in `agent-workflows:git-best-practices`, unless the caller names another base (a stack parent)
- Git status: `git status --short`
- Changed files vs base: `git diff --name-only <base-branch>...HEAD`
- Full diff vs base: `git diff --no-color <base-branch>...HEAD`

## Goal

Remove code that is not strictly necessary and tighten weak design boundaries.

## Required Review Passes

1. Vestigial code
   - Remove dead branches, unused helpers, stale flags, and obsolete compatibility paths.
   - Remove code that no longer has a caller.

2. Unnecessary fallbacks and defensive code
   - Remove fallback logic that hides real failures without a product requirement.
   - Delete defensive checks that protect impossible states already guaranteed upstream.
   - Keep only guards that enforce a real runtime contract.

3. Weak boundaries
   - Identify boundaries that are too permissive (input validation, nullability, type widening, leaky abstractions).
   - Tighten each boundary at the correct layer instead of spreading checks everywhere.

4. Runtime code weakened for tests
   - Find runtime branches added only to make tests pass.
   - Replace with better seams in tests (fixtures, factories, explicit test setup) while keeping production paths clean.

5. Simplicity and readability
   - Inline trivial abstractions with one caller.
   - Collapse unnecessary indirection.
   - Prefer straightforward control flow over cleverness.

## Constraints

- Do not add features.
- Do not change external behavior unless required to remove incorrect behavior; if that happens, call it out explicitly.
- Keep the smallest safe diff.
- Follow repository conventions in `AGENTS.md`.

## Execution Steps

1. Scan the current diff and list concrete simplification opportunities.
2. Apply minimal edits that improve clarity and remove unnecessary code.
3. Run relevant checks for touched areas (lint, typecheck, tests when practical).
4. Summarize:
   - What was removed or simplified.
   - Which weak boundaries were tightened.
   - Any behavior changes and why they were necessary.
   - What checks were run.

## Output Format

```text
Simplification summary:
- ...

Weak boundaries tightened:
- ...

Behavior changes:
- none

Validation:
- <command>: pass/fail
```
