---
name: create-github-issue
description: Create a GitHub issue from the current conversation context using the gh CLI. Use when the user wants to file a GitHub issue, track follow-up work discovered mid-task, or capture a problem before switching contexts.
argument-hint: [optional extra context]
disable-model-invocation: true
---

# Create GitHub Issue from Context

File the problem found in the current session as a GitHub issue.

## Issue law

An issue states a problem. It never prescribes an implementation.

- Problem-first: what is wrong, who it hurts, and the evidence that it is real.
- A solution may appear as a single hinted line at most. A plan, a task list, a file-by-file breakdown, or a code sketch belongs in the PR, not the issue.
- No references to anything outside the repository's own organization: no other companies, no cross-company links.
- Draft the full issue text and show it to the user before publishing. Never publish an issue the user has not seen.

## Steps

1. **Gather context**

   - Review open files and recent edits in the session
   - Check conversation history for the observed failure and how it surfaced
   - Use any extra context passed to the skill: $ARGUMENTS
   - Identify who is affected and what evidence proves the problem is real

2. **Confirm the target repository**

   - Default to the repo of the current working directory (`gh` infers it from the git remote)
   - If the user named a different repo, pass it with `--repo owner/name`
   - If `gh auth status` fails, tell the user to run `gh auth login` and stop

3. **Draft the issue and show it to the user**

   **Title**: one line naming the problem, not the fix. "Address monitoring drops errors silently", not "Add error handling to address monitoring".

   **Body**:

   ```markdown
   ## Problem

   What is wrong, for whom, and the evidence. Name the observed behavior and
   how it was seen.

   ## Why it matters

   The cost of leaving it: who is blocked, what breaks, what it risks.

   ## Related

   Links to related issues, PRs, or discussions. Omit the section when there
   are none.
   ```

   Print the title and body to the user and wait for approval or edits.

4. **Publish with `gh issue create`**

   **Labels**: only labels that already exist on the repo. Check with `gh label list` when unsure, and pass none rather than inventing one.

   **Assignee**: `--assignee @me` unless the user says otherwise.

   Pass the body via a heredoc to keep Markdown intact:

   ```bash
   gh issue create --title "the problem in one line" --assignee @me --label bug --body "$(cat <<'EOF'
   ## Problem

   ...

   ## Why it matters

   ...

   ## Related

   ...
   EOF
   )"
   ```

5. **Report back** using this format:

   ```text
   Created <issue-url>: <Issue title>
     - Labels: <labels or "none">
     - Assigned to: <user or "none">
   ```
