---
name: create-pr
description: Use when the user wants a pull request opened for the current branch. Creates clean git commits from the current changes and opens a PR on GitHub with a generated description.
disable-model-invocation: true
---

# Create Pull Request

Create clean git commits from the current changes (if needed), then create a Pull Request on GitHub with an auto-generated description.

## Steps

1. **Verify branch safety**
   - Determine the default and production branches with Branch Discovery in `agent-workflows:git-best-practices`
   - Read `git branch --show-current`, `git status --short`, the upstream (`git rev-parse --abbrev-ref --symbolic-full-name @{u}`), and `git log --oneline <default-branch>..HEAD`
   - If on a default or production branch that Branch Discovery found, STOP and ask the user to create a feature branch first
   - If no commits are ahead of the default branch and there are no local changes, STOP and report there is nothing to open as a PR

2. **Deslopify pass**
   - Run `agent-workflows:deslopify` over the branch diff against the default branch, then rerun the checks the touched areas own
   - Fold the result into the commits below; it is not a separate cleanup commit
   - A branch with no runtime code change skips the pass and says so in the report

3. **Create commits when local changes exist**
   - If working tree is clean, skip this step
   - Commit per Commit Discipline and Conventional Commits in `agent-workflows:git-best-practices`, split by logical concern

4. **Ensure branch is pushed**
   - If no upstream, push with tracking:

     ```bash
     git push -u origin <branch-name>
     ```

   - If upstream exists and local commits are ahead, push:

     ```bash
     git push
     ```

5. **Write the PR title and description**
   - Follow PR Creation in `agent-workflows:git-best-practices` for both and for an existing PR

6. **Create the PR**

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

- `agent-workflows:git-best-practices` is the source of truth for commit messages, PR titles, and PR descriptions; this command runs the workflow
- Never commit directly to a default or production branch
- Always output the PR URL
- Create the PR directly once checks are satisfied; do not wait for extra approval

## Error Handling

- If `gh` is not authenticated, report: `Run 'gh auth login' to authenticate`
- If push fails due to divergence or conflicts, report the failure and required resolution
