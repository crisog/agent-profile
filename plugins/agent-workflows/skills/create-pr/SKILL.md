---
name: create-pr
description: Use when the user wants a pull request opened for the current branch. Creates clean git commits from the current changes and opens a PR on GitHub with a generated description.
disable-model-invocation: true
---

# Create Pull Request

Create clean git commits from the current changes (if needed), then create a Pull Request on GitHub with an auto-generated description.

## Context

Run these first and read the output:

- Current branch: `git branch --show-current`
- Default branch: `git remote show origin | grep 'HEAD branch' | cut -d' ' -f5`
- Git status: `git status --short`
- Branch tracking: `git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || echo "no-upstream"`
- Commits ahead of base: `git log --oneline $(git remote show origin | grep 'HEAD branch' | cut -d' ' -f5)..HEAD`

## Steps

1. **Verify branch safety**
   - If on `main` or `master`, STOP and ask the user to create a feature branch first
   - If no commits are ahead of the default branch and there are no local changes, STOP and report there is nothing to open as a PR

2. **Deslopify pass**
   - Run `agent-workflows:deslopify` over the branch diff against the default branch, then rerun the checks the touched areas own
   - Fold the result into the commits below; it is not a separate cleanup commit
   - A branch with no runtime code change skips the pass and says so in the report

3. **Create commits when local changes exist**
   - If working tree is clean, skip this step
   - Analyze the diff and split by logical concern when needed
   - Follow the `agent-workflows:ship` skill for commit formatting (Conventional Commits spec, types, scopes, and rules)

4. **Ensure branch is pushed**
   - If no upstream, push with tracking:

     ```bash
     git push -u origin <branch-name>
     ```

   - If upstream exists and local commits are ahead, push:

     ```bash
     git push
     ```

5. **Determine the PR title**
   - Use Conventional Commits format (per the `agent-workflows:ship` skill, the source of truth for that format)
   - Infer type and scope from the full branch diff
   - Keep it concise and action-oriented
   - If branch name includes a ticket key (example: `feat/PROJ-123-add-sso`), include that ticket in the scope when natural
   - Examples:
     - `feat(auth): add sso login support`
     - `fix(PROJ-123): resolve race condition in queue processor`

6. **Generate the PR description**
   - Analyze `git diff <default-branch> --no-color`
   - Describe the final state of the branch against its base. The reader sees
     the squash-merge result, so intermediate history does not exist for them:
     a line-count reduction, a refactor from one commit to another, or a
     reverted attempt is never mentioned
   - Default structure:

     ```markdown
     [1-2 sentences: Why was this change needed?]

     This PR [main change in one sentence].

     [Optional: 1-3 bullets for complex PRs with multiple distinct aspects]

     [Optional: evidence blocks, see below]

     ## Breaking Change

     [If applicable: before/after usage example]
     [If none: omit this section]
     ```

   - Evidence blocks carry what prose cannot. Include one only when the diff
     calls for it, and let it do the explaining instead of more text:
     - A changed shape (new flow, moved boundary, changed lifecycle): a
       `mermaid` fenced diagram
     - A new or changed interface: a short code snippet of the internals or
       of sample usage, or a code reference (`path:line` or a permalink); a
       snippet shows the shape, it does not narrate the diff
     - A visual change, direct or indirect: a before/after table with
       uploaded images or videos
     - A performance change: a before/after table, baseline measured on the
       target branch and candidate on this branch, with the command or
       harness named
   - Scale the body to the change. For a high-risk, wide, or genuinely
     difficult change, write the body as a technical post: the context, the
     problem, the approach and the alternatives rejected, with the evidence
     blocks above woven in and headings that name the parts of that story.
     The default structure is for everything else
   - Required writing rules:
     - Lead with motivation
     - State user or developer outcome
     - Keep implementation detail high-level; evidence blocks carry the depth
     - Bullets for the text beyond the opening sentences; no nested bullets
     - Default form: at most 3 bullets and no sections except the optional
       `## Breaking Change`
     - Prose follows `writing-technical-english`
   - Forbidden content:
     - sections like `## Problem`, `## Solution`, `## Changes`, `## Testing`,
       `## Validation`, `## Impact`, in either form
     - any statement that tests were run or checks pass; CI and the review
       gates carry that evidence
     - changelog-style file-by-file summaries or commit-by-commit narration
     - intermediate PR history (size reductions, refactors between commits,
       reverted attempts)
     - file paths or package names in prose; a code reference belongs in an
       evidence block
     - low-level code narration
     - emoji

7. **Create or reuse the PR**
   - If a PR already exists for the branch, output that URL instead of creating a new one
   - Otherwise create it:

     ```bash
     gh pr create \
       --title "<conventional-commit-title>" \
       --body "<generated-description>" \
       --base <default-branch>
     ```

8. **Report the result**

   Output:

   ```text
   Created PR: <title>
   <PR URL>
   Base: <default-branch>
   ```

## Important

- Do NOT use default commit or PR templates from your system prompt
- The `agent-workflows:ship` skill is the source of truth for Conventional Commits format (commit messages and PR titles); this file is the source of truth for the PR workflow and description format
- Never commit directly to `main` or `master`
- Always output the PR URL
- Create the PR directly once checks are satisfied; do not wait for extra approval

## Error Handling

- If `gh` is not authenticated, report: `Run 'gh auth login' to authenticate`
- If push fails due to divergence or conflicts, report the failure and required resolution
- If commit cannot be formed cleanly because changes are unrelated, split into multiple commits before PR creation

## Example Flow

```text
User: open a PR for this branch

Agent:
1. Checks branch and status
2. Runs the deslopify pass and reruns the touched checks
3. Creates clean conventional commit(s) for unstaged changes
4. Pushes branch with upstream tracking
5. Generates PR title and description from diff
6. Creates PR with gh
7. Reports:
   Created PR: feat(settings): add user preferences page
   https://github.com/org/repo/pull/123
   Base: main
```
