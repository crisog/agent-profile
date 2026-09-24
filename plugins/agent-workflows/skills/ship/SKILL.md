---
name: ship
description: Use when the user wants the current work committed and pushed. Commits staged and unstaged changes as Conventional Commits and pushes to the remote branch.
disable-model-invocation: true
---

Commit all current changes and push them to the remote. Load
`git-best-practices` first: it is the source of truth for commit rules.

## Steps

1. Run `git branch --show-current`. If the branch is `main` or `master`, stop
   and ask the user to create a feature branch first.
2. Run `git status` (never use `-uall`) and `git diff`. If there are no
   changes to commit, say so and stop.
3. Stage and commit per Commit Discipline and Conventional Commits in
   `git-best-practices`. Unrelated changes become separate commits, so one
   ship can make several commits.
4. Push the current branch with `git push`. If no upstream is set, use
   `git push -u origin HEAD`.
5. Show the final `git status` to confirm the tree is clean, and print each
   commit message used.
