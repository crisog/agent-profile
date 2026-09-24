---
name: ship
description: Use when the user wants the current work committed and pushed. Commits the current work as Conventional Commits and pushes to the remote branch.
disable-model-invocation: true
---

Commit the current work and push it to the remote. Load
`git-best-practices` first: it is the source of truth for commit rules.

## Steps

1. Run Branch Discovery in `git-best-practices`. If the current branch is a
   default or production branch it found, stop and ask the user to create a
   feature branch first.
2. Run `git status` and `git diff`. If there are no changes to commit, say so
   and stop.
3. Stage and commit per Commit Discipline and Conventional Commits in
   `git-best-practices`. One ship can make several commits.
4. Push the current branch with `git push`. If no upstream is set, use
   `git push -u origin HEAD`.
5. Show the final `git status`, list the uncommitted leftovers, and print
   each commit message used.
