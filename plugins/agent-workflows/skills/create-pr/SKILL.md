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

2. **Create commits when local changes exist**
   - If working tree is clean, skip this step
   - Analyze the diff and split by logical concern when needed
   - Follow the `agent-workflows:ship` skill for commit formatting (Conventional Commits spec, types, scopes, and rules)

3. **Ensure branch is pushed**
   - If no upstream, push with tracking:

     ```bash
     git push -u origin <branch-name>
     ```

   - If upstream exists and local commits are ahead, push:

     ```bash
     git push
     ```

4. **Determine the PR title**
   - Use Conventional Commits format (per the `agent-workflows:ship` skill, the source of truth for that format)
   - Infer type and scope from the full branch diff
   - Keep it concise and action-oriented
   - If branch name includes a ticket key (example: `feat/PROJ-123-add-sso`), include that ticket in the scope when natural
   - Examples:
     - `feat(auth): add sso login support`
     - `fix(PROJ-123): resolve race condition in queue processor`

5. **Generate the PR description**
   - Analyze `git diff <default-branch> --no-color`
   - Write this exact structure:

     ```markdown
     [1-2 sentences: Why was this change needed?]

     This PR [main change in one sentence].

     [Optional: 1-3 bullets for complex PRs with multiple distinct aspects]

     ## Breaking Change

     [If applicable: before/after usage example]
     [If none: omit this section]
     ```

   - Required writing rules:
     - Lead with motivation
     - State user or developer outcome
     - Keep implementation detail high-level
     - Use bullets only for distinct multi-part changes
     - Maximum 3 bullets, no nested bullets
     - No sections except optional `## Breaking Change`
   - Forbidden content:
     - sections like `## Problem`, `## Solution`, `## Changes`, `## Testing`, `## Impact`
     - changelog-style file-by-file summaries
     - file paths or package names
     - low-level code narration
     - emoji

6. **Create or reuse the PR**
   - If a PR already exists for the branch, output that URL instead of creating a new one
   - Otherwise create it:

     ```bash
     gh pr create \
       --title "<conventional-commit-title>" \
       --body "<generated-description>" \
       --base <default-branch>
     ```

7. **Report the result**

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
2. Creates clean conventional commit(s) for unstaged changes
3. Pushes branch with upstream tracking
4. Generates PR title and description from diff
5. Creates PR with gh
6. Reports:
   Created PR: feat(settings): add user preferences page
   https://github.com/org/repo/pull/123
   Base: main
```
