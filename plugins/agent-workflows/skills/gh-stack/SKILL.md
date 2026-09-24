---
name: gh-stack
description: Use when working with stacked branches and pull requests through the gh stack CLI extension, including creating, navigating, rebasing, syncing, submitting, and merging a stack.
---

# gh-stack

`gh stack` is a [GitHub CLI](https://cli.github.com/) extension for managing **stacked branches and pull requests**. A stack is an ordered list of branches where each branch builds on the one below it, rooted on a trunk branch (typically the repo's default branch). Each branch maps to one PR whose base is the branch below it, so reviewers see only the diff for that layer.

```
main (trunk)
 └── auth-layer     → PR #1 (base: main)            - bottom (closest to trunk)
  └── api-endpoints → PR #2 (base: auth-layer)
   └── frontend     → PR #3 (base: api-endpoints)   - top (furthest from trunk)
```

Navigation commands follow this model: `up` moves away from trunk, `down` moves toward it.

## Prerequisites

The GitHub CLI (`gh`) v2.0+ must be installed and authenticated. Install the extension with `gh extension install github/gh-stack`. Before using `gh stack`, configure git to prevent interactive prompts:

```bash
git config rerere.enabled true           # remember conflict resolutions (skips prompt on init)
git config remote.pushDefault origin     # if multiple remotes exist (skips remote picker)
```

## Agent rules

**All `gh stack` commands must be run non-interactively.** If a command would prompt for input, it will hang indefinitely.

1. **Always supply branch names as positional arguments** to `init`, `add`, and `checkout`. Branch names are used exactly as given.
2. **Always use `--auto` with `gh stack submit`.** Without `--auto`, `submit` prompts for a title for each new PR. After `submit --auto`, set each PR title and body per PR Creation in `git-best-practices` with `gh pr edit`.
3. **Always use `--json` with `gh stack view`.** Without `--json` (including with `--short`), the command launches an interactive TUI.
4. **Handle multiple remotes.** Pre-configure `git config remote.pushDefault origin`, or pass `--remote <name>` to `push`, `submit`, `sync`, `rebase`, and `link`. `checkout`, `modify`, and `trunk` have **no `--remote` flag** — they rely on `remote.pushDefault`. With multiple remotes and no configured default, these commands exit with an error in non-interactive mode.
5. **Avoid branches shared across multiple stacks.** If a branch belongs to multiple stacks, commands exit with code 6. Check out a non-shared branch first.
6. **Plan your stack layers by dependency order before writing code.** When a stack is allowed is the `ship-stack` policy. Foundational changes go in lower branches; dependent changes go in higher branches. Don't mix unrelated work into a single stack; start a new stack for each distinct effort.
7. **Use standard `git add` and `git commit` for staging and committing.**
8. **Use `gh stack link` for external tool workflows** (jj, Sapling, etc.). `link` does not create or modify any local state.
9. **Merging is the user's publish action.** Run `gh stack merge --yes` only on the user's order for that stack, never on the agent's initiative. `gh pr merge` does not work with stacked PRs. `gh stack merge` merges the entire stack (bottom to top) atomically. Scope the merge by passing a pull request number (`gh stack merge 42 --yes` merges everything up to and including PR #42) or a stack number (`gh stack merge 7 --yes`, which needs no local checkout). Without a method flag (`--squash`, `--rebase`, `--merge`), the last-used method is used. The merge is all-or-nothing — if any PR can't be merged, none are. Only basic pull request state is checked before merging (open and not a draft); bypassing merge requirements is not supported for stacks. If the base branch uses a merge queue, the stack is added to the queue instead: the queue chooses the merge method, and the pull requests may land in separate groups rather than all at once.
10. **Never run `gh stack checkout <pr-number>` when a different local stack already exists on those branches** — this triggers an unbypassable conflict resolution prompt. Use `gh stack unstack --local` first (this keeps the stack on GitHub intact), then retry the checkout.

## Workflows

### Create a stack from scratch

```bash
gh stack init auth                  # creates auth and checks it out
git add auth.go auth_test.go
git commit -m "feat(auth): add auth middleware"
gh stack add api-routes             # next concern, next branch
git add api.go
git commit -m "feat(api): add api routes"
gh stack submit --auto              # push everything and create PRs (drafts by default)
gh pr edit <number> --title "<title>" --body "<body>"   # per PR, per git-best-practices
gh stack view --json                # verify the stack
```

Use `gh stack init --base develop branch-a` for a different trunk. `gh stack add -Am "message" branch-name` combines staging, committing, and branch creation, but bypasses deliberate staging.

### Change a lower layer

When you need to change a lower layer (including review feedback), **navigate down to the correct branch, make the change there, and rebase**. Changes made on a higher branch end up in the wrong PR.

```bash
gh stack down                       # or: gh stack checkout api-routes / gh stack checkout 42
git add users_api.go
git commit -m "feat(api): add get-user endpoint"
gh stack rebase --upstack           # rebase everything above this branch
gh stack push                       # push the updated stack
gh stack top                        # navigate back to where you were working
```

### Routine sync after merges

```bash
gh stack sync            # fetch, rebase, push, sync PR and stack state
gh stack sync --prune    # also delete local branches for merged PRs
```

- In non-interactive environments, the prune prompt is not shown. Use `--prune` explicitly.
- If PRs were added to the stack on github.com, `sync` pulls their branches down and appends them to the local stack. If the local and remote stacks have **diverged**, in non-interactive environments sync aborts (nothing is pushed or updated) and exits successfully with `ℹ Sync aborted`. Resolve a divergence by unstacking and recreating the stack.
- Squash-merged PRs are detected automatically (by `sync` and `rebase`); remaining commits are replayed with `git rebase --onto`.
- `sync` fast-forwards trunk (warns if diverged), then cascade-rebases only if trunk moved. On a rebase conflict, it restores all branches to their pre-rebase state and exits with code 3.
- `sync` pushes all active branches atomically, and links the open PRs into a stack on GitHub only when two or more PRs exist. Sync **never opens PRs** — use `gh stack submit` for that.

### Handle rebase conflicts (agent workflow)

```bash
gh stack rebase
# If exit code 3 (conflict):
#   - Parse stderr for conflicted file paths
#   - Edit files to resolve conflicts, then stage them:
git add path/to/resolved-file.go
gh stack rebase --continue          # repeat for each further conflict
gh stack rebase --abort             # if unable to resolve, restore everything
```

### Restructure a stack (remove a branch, reorder, or rename)

```bash
gh stack unstack                    # removes local tracking and the GitHub grouping (PRs are NOT deleted)
git branch -m old-branch-1 new-branch-1
gh stack init --base main new-branch-1 new-branch-2 new-branch-3
```

## Command behavior

### `init`

- Existing branches are adopted automatically; missing branches are created from the trunk. Checks out the last branch in the list.

### `add`

- Must be run on the topmost branch (or the trunk if the stack has no branches yet); otherwise exits with code 5. Use `gh stack top` to switch first.
- When the current branch has no commits (e.g., right after `init`), `add -Am` commits directly on the current branch instead of creating a new one.
- When `-m` is given without a branch name, the name is auto-generated from the commit message (e.g., `03-24-add_api_routes`).
- Without `-Am`, uncommitted changes carry over to the new branch.

### `push` and `submit`

- `push` pushes all active (non-merged, non-queued) branches in one non-atomic multi-ref push with per-branch `--force-with-lease`. Some branches may update if another is rejected; fix the rejected branch and rerun. It does **not** create or update pull requests.
- `submit` pushes each active branch sequentially with per-branch `--force-with-lease`; it is not atomic. If a later push is rejected, earlier pushes and PR updates remain; fix the rejection and rerun.
- `submit` creates a PR for each branch without one (base set to the first non-merged ancestor branch) and links them as a **Stack** on GitHub. `--open` marks new and existing PRs as ready for review.
- If every PR in the stack is merged, `submit` forks your unmerged branches into a **new** stack rooted at the trunk.
- If the repository does not have stacked PRs enabled, `submit` exits with code 9 in non-interactive mode.
- `--auto` titles: a single commit gives the commit subject as title and body as PR body; multiple commits humanize the branch name. There is no flag to set a custom title or body; use `gh pr edit` after creation.

### `link`

- Arguments are in stack order (bottom to top). Numeric arguments are tried as PR numbers first, then as branch names.
- When the first argument matches an existing stack number, the remaining arguments are appended to the top of that stack (`gh stack link 7 48 feature-auth`). Arguments already in the stack are skipped; arguments in a different stack are rejected.
- Branch arguments are pushed automatically (non-force, atomic). Mismatched PR bases are corrected automatically.
- Stack updates are additive — existing PRs are never removed.

### `rebase`

- Use when `sync` reports a conflict or you need finer control: `--upstack` (current branch to top), `--downstack` (trunk to current branch), or an optional `[branch]` target.
- `--no-trunk` skips fetching and rebasing with the trunk; only inter-branch rebases are performed.

### `view --json`

Top-level keys: `trunk`, `currentBranch`, `branches[]`. Fields per branch:

- `name`, `head` (HEAD SHA), `base` (parent branch's HEAD SHA at last sync)
- `isCurrent`, `isMerged`, `isQueued` (in a merge queue)
- `needsRebase` — whether the base branch is not an ancestor (non-linear history)
- `pr` — `number`, `url`, `state` (`"OPEN"`, `"MERGED"`, or `"QUEUED"`); omitted if no PR exists

### Navigation and `checkout`

- `gh stack up [n]`, `down [n]`, `top`, `bottom`, and `trunk` are fully non-interactive. Navigation clamps to stack bounds and skips merged branches when navigating from active branches. `bottom` is the first non-merged branch above trunk.
- `checkout` accepts a stack number, PR number, PR URL, or branch name. A bare number is tried as a **stack number first**, then a PR number, then a branch name.
- A stack or PR number (or URL) fetches the stack from GitHub and sets it up locally. A branch name resolves against locally tracked stacks only.

### `unstack`

- Removes only the stack grouping; it never deletes the underlying pull requests or branches.
- With no argument, it unstacks the active stack on GitHub and removes local tracking.
- With a stack number, it unstacks on GitHub from anywhere in the repo, tracked locally or not. An unknown number exits with code 2.
- `--local` never contacts GitHub; combining it with a number that isn't tracked locally is an error.

## Output conventions

Status messages go to stderr with prefixes `✓` (success), `✗` (error), `⚠` (warning), `ℹ` (info). Data output (e.g., `view --json`) goes to stdout.

## Exit codes and error recovery

| Code | Meaning | Agent action |
|------|---------|-------------|
| 1 | Generic error | Read stderr; may indicate commit/push failure |
| 2 | Not in a stack | Run `gh stack init` first |
| 3 | Rebase conflict | Resolve conflicts, run `gh stack rebase --continue` |
| 4 | GitHub API failure | Check `gh auth status`, retry |
| 5 | Invalid arguments | Fix the command invocation |
| 6 | Disambiguation required | Check out a non-shared branch first |
| 7 | Rebase already in progress | `gh stack rebase --continue` or `--abort` |
| 8 | Stack is locked | Another `gh stack` process holds the lock. Retry; it times out after 5 seconds |
| 9 | Stacked PRs unavailable | Tell the user that stacks must be enabled on the repository |
| 10 | Modify recovery required | Run `gh stack modify --abort` to restore the pre-modify state |

## Known limitations

**Stacks are strictly linear.** Each branch has exactly one parent and at most one child. Use separate stacks for parallel workstreams.
