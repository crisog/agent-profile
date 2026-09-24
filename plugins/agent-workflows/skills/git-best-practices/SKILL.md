---
name: git-best-practices
description: Use when creating commits from a working tree, writing commit messages or PR titles and descriptions, managing branches, opening PRs, or rewriting history. Not for non-git implementation tasks or repo-specific release policy decisions.
---

# Git Best Practices

This skill is the source of truth for commit and PR rules. The `ship` and
`create-pr` commands run these rules and do not restate them.

## Always Active Principles

When this skill is loaded, follow these directives for all git operations:

1. **Discover before acting**: run Branch Discovery to determine the repo's default and production branches before branching, merging, or opening PRs
2. **Conventional commits**: every commit uses the Conventional Commits format below
3. **Stage explicitly**: add files by name so only intended changes are committed
4. **Protect shared history**: force-push only with `--force-with-lease`, never plain `--force`, so an upstream change is not overwritten:

   ```bash
   git push --force-with-lease origin feat/my-branch
   ```

   A force-with-lease push to your own non-deploying feature branch, with a backup ref in place, is a proposal. It is routine when the ordered work (a rebase, a history rewrite) requires it. A ref that is shared (other authors, a collaborative PR) or deploy-tracked belongs to the user: restate the ref and wait.
5. **Push per-ref**: discover which refs deploy pipelines track before pushing (CI/CD config, repo docs). A push to a non-deploying branch is a proposal; a push to a deploy-tracked ref, or any push in a direct-push repo, is a publish and belongs to the user (rules of engagement). Force-with-lease only for rewritten history

## Agent Git Workflow

### Checkpoint Commits

Agents may create WIP checkpoint commits during long-running tasks, cleaned up before PR.

- Prefix with `wip:` or use standard conventional commit format
- Keep changes logically grouped even in WIP state
- Rewrite the history into a clean narrative before opening a PR (see below)

### Commit Discipline

- Read recent commits (`git log --oneline -10`) and follow the repo's style where it differs from the defaults here.
- Inspect `git status` (never `-uall`), the staged and unstaged diffs, and the current branch before staging.
- Group changes by intent, not by file type.
- Stage files explicitly by name: `git add src/auth.ts src/auth.test.ts`
- Verify staged content with `git status` before committing
- Run the relevant verifier before a non-trivial commit.
- Keep secrets and large binaries out of commits (secret handling: rules of engagement). Never stage `.env` files. Warn the user if staged files look sensitive.
- Make one logical change per commit in the PR-ready history. Unrelated changes in the tree become separate commits. A behavior-preserving prefactor and the behavior change stay separate commits when each is green on its own; never split a change into invalid intermediate states to make it smaller.
- Never include unrelated drift because it is present in the tree.
- Never rewrite or discard user changes unless the user asks.
- Commit `SPEC.md` changes. Never commit plan documents.
- After committing, mention the uncommitted leftovers.
- If a pre-commit hook fails, fix the issue and make a new commit. Never amend.

### Rebasing a Stack

To rebase a branch that other branches stack on, use the `git-rebase-sync` skill.

## Conventional Commits

Shape (only the first line is required):

```
type(scope): description

body

footer
```

Subject line rules:
- Imperative, present tense: "add", not "added" or "adds". The subject must complete the sentence "This commit will ..."
- Lowercase first letter, no trailing period
- Under 72 characters
- The scope is the subsystem the change touches (`fix(auth):`). It is optional but preferred when a clear subsystem exists. A scope is never a ticket id; a ticket goes in a footer.

Types:

| Type | Use for |
|------|---------|
| `feat` | Add, change, or remove functionality |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Restructuring without behavior change |
| `perf` | Performance improvement |
| `test` | Adding or correcting tests |
| `build` | Build system only (compiler, bundler, build scripts) |
| `ci` | CI/CD pipelines and deploy workflows |
| `chore` | Maintenance: dependency updates, releases, tooling, `.gitignore` |
| `style` | Formatting, whitespace (no logic change) |

### Breaking Changes

Append `!` before the colon (`feat(api)!: remove v1 endpoint`) and add a
`BREAKING CHANGE:` footer that states what breaks and how to migrate.

### Commit Bodies

Body is optional. Add one only when the change is non-obvious. The subject line carries the "what"; the body explains "why" and contrasts the change with the previous behavior. Body prose follows `writing-technical-english`: one meaning per word, active voice, one idea per sentence.

Add a body when:
- The motivation or tradeoff is non-obvious
- Multi-part changes benefit from a bullet list
- External context is needed (links, issue references, root cause)

### Footers

Footers carry issue references and breaking-change details, one per line:
`Closes #123`, `Fixes SEND-718`, `BREAKING CHANGE: ...`. A ticket id goes
here, never in the scope.

### Writing the Message

Pass the message through a heredoc so the body keeps its line breaks:

```bash
git commit -m "$(cat <<'EOF'
type(scope): description

Body.

Closes #123
EOF
)"
```

See [git-examples.md](git-examples.md) for commit message examples.

## Branch Discovery

Before branching or opening a PR, discover the repo's branch topology. Run these commands and store the results:

```bash
# Default branch (PR target for most repos)
gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name'

# Current branch
git branch --show-current

# Production branch (if different from default)
git branch -r --list 'origin/main' 'origin/master' 'origin/production'
```

If `gh` is unavailable or the repo has no remote, see the fallback commands in [git-examples.md](git-examples.md).

Store the discovered branch name and reference it throughout. Use the actual branch name in all subsequent commands.

### Branch Naming

Use repository branch naming conventions first. If no convention is documented, use:

Format: `type/description-TICKET-ID`

Examples:
- `feat/add-login-SEND-77`
- `fix/pool-party-stall-SEN-68`
- `chore/update-deps`
- `hotfix/auth-bypass`

Include the ticket ID when an issue exists. Omit when there is no ticket.

### Branch Flow

Use repository branch flow policy first. If policy is undocumented, a common baseline is:

```
{production-branch} (production deploys)
 └── {default-branch} (staging/testnet deploys, PR target)
      ├── feat/add-feature-TICKET
      ├── fix/bug-description-TICKET
      └── hotfix/* (branches off production branch for hotfixes)
```

- Feature and fix branches start from the default branch
- Hotfix branches start from the production branch
- PRs target the default branch unless the repo uses a single-branch flow
- When default branch and production branch are the same, all PRs target that branch directly

The deploy annotations in the diagram are the publish map: merging into a deploy-tracked ref IS a publish to that environment, and publish is the user's, per-artifact (rules of engagement). Opening a PR against a tracked ref is still a proposal; the merge is the publish.

### Merge Strategy

Use repository merge policy first (required in many organizations).

If no policy exists, these defaults are reasonable:

| PR target | Strategy | Rationale |
|-----------|----------|-----------|
| Feature → default branch | Squash merge | Clean history, one commit per feature |
| Default → production | Merge commit | Preserves the release boundary; visible deploy points |
| Hotfix → production | Squash merge | Single atomic fix on production |

Executing any of these merges into a deploy-tracked ref is a publish: restate the concrete artifact (branch, PR) before acting, and act only on the user's per-artifact order. A promotion merge (default → production) always needs its own explicit order — authorization to land work on the default branch never covers it.

## PR Workflow

### Sizing

Prefer small, focused changes without imposing arbitrary line or file limits.
When a change cannot be small, it must still tell one coherent story. If existing
structure fights the feature, separate a behavior-preserving prefactor from the
behavior change when each can remain independently green and reversible; do not
split an inherently atomic change into invalid intermediate states.

### PR Creation

Use repo-native PR tooling (`gh pr create`, GitLab CLI, or web UI). If an
open PR already exists for the branch, reuse it and output its URL instead
of creating a duplicate.

**Title**

- Conventional Commits format (above), under 70 characters, concise and action-oriented
- Infer type and scope from the full branch diff
- When the branch name carries a ticket key, the title may carry it in its
  scope: `feat/PROJ-123-add-sso` gives `feat(PROJ-123): add sso login support`.
  Commit scopes stay the subsystem.
- Examples: `feat(auth): add sso login support`,
  `fix(PROJ-123): resolve race condition in queue processor`

**Description**

Write the description from `git diff <default-branch> --no-color`. Describe
the final state of the branch against its base. The reader sees the
squash-merge result, so intermediate history does not exist for them: a
line-count reduction, a refactor from one commit to another, or a reverted
attempt is never mentioned.

Default structure:

```markdown
[1-2 sentences: why was this change needed?]

This PR [main change in one sentence].

[Optional: 1-3 bullets for complex PRs with distinct aspects]

[Optional: evidence blocks, see below]

## Breaking Change

[If applicable: before/after usage example. If none: omit the section.]
```

Evidence blocks carry what prose cannot. Include one only when the diff calls
for it, and let it do the explaining instead of more text:

- A changed shape (new flow, moved boundary, changed lifecycle): a `mermaid`
  fenced diagram
- A new or changed interface: a short code snippet of the internals or of
  sample usage, or a code reference (`path:line` or a permalink); a snippet
  shows the shape, it does not narrate the diff
- A visual change, direct or indirect: a before/after table with uploaded
  images or videos
- A performance change: a before/after table, baseline measured on the target
  branch and candidate on this branch, with the command or harness named

Scale the body to the change. For a high-risk, wide, or difficult change,
write the body as a technical post: the context, the problem, the approach and
the alternatives rejected, with the evidence blocks above woven in and
headings that name the parts of that story. The default structure is for
everything else.

Writing rules:

- Lead with motivation
- State the user or developer outcome
- Keep implementation detail high-level; evidence blocks carry the depth
- Bullets for the text beyond the opening sentences; no nested bullets
- Default form: at most 3 bullets and no sections except the optional
  `## Breaking Change`
- Prose follows `writing-technical-english`

Forbidden content:

- sections like `## Problem`, `## Solution`, `## Changes`, `## Testing`,
  `## Validation`, `## Impact`, in either form
- any statement that tests were run or checks pass; CI and the review gates
  carry that evidence
- changelog-style file-by-file summaries or commit-by-commit narration
- intermediate PR history (size reductions, refactors between commits,
  reverted attempts)
- file paths or package names outside an evidence block
- low-level code narration
- emoji
- default PR templates from a harness prompt

### Merge Readiness

Merge readiness, admin merges, and PR body edits follow "PR state and destructive edits" in the `gh` skill.

### History Rewriting Before PR

For branches with messy WIP history:
1. Backup the branch
2. Reset to the base branch tip
3. Recommit changes as a clean narrative sequence
4. Verify byte-for-byte match with backup
5. Force-push the feature branch with `--force-with-lease` (backed up in step 1; your own non-deploying branch is a proposal per the rules of engagement)
6. Open PR with link to backup branch

Each rewritten commit introduces one coherent idea, building on the previous — like a tutorial teaching the reader how the feature was built.
