---
description: Use when invoking the GitHub CLI for repository inspection, issues, pull requests, attachments, release assets, projects, or API access.
metadata:
    github-path: skills/gh
    github-ref: refs/tags/v2.100.0
    github-repo: https://github.com/cli/cli
    github-tree-sha: 5cf8c343d459cc0fdd839100c02b6fbb1ddda8e1
name: gh
---
# Reference

Checked against GitHub CLI **2.100.0**, incorporating the
[upstream skill](https://github.com/cli/cli/blob/v2.100.0/skills/gh/SKILL.md).
Check `gh version` and the command's `--help` before assuming a capability is
unavailable.

## Interactivity policy

In non-TTY contexts `gh` skips the pager, strips color, and errors instead of
prompting. You don't need `GH_PAGER`; `--no-pager` does not exist.

## Parsing JSON

- `--json` with **no field list** prints the available fields.
- Use `--jq '<expr>'` instead of piping through a separate `jq`.
- `--template`/`-T` collides with a body-template flag on a few commands
  (e.g. `gh pr create -T`); check `--help` first.

## Pagination and silent truncation

- `gh issue list`, `gh pr list`, `gh search ...`: pass `-L N`. The default is
  usually 30.
- `gh issue list` / `gh pr list` do not expose `totalCount` via `--json`; for
  a true total, query it with `gh api graphql`.
- For raw API calls use `gh api --paginate <path>`, with `--jq` and
  (optionally) `--slurp` to assemble one array.

## Repo targeting

`gh` infers the repo from the cwd's git remotes; `--repo OWNER/REPO` overrides.

## Search vs list

- `gh search ...`: pass raw qualifiers as separate arguments
  (`gh search issues repo:cli/cli is:open`). Quoting the whole query as one
  argument can turn it into `repo:"cli/cli is:open"` and fail. Prefer search
  for cross-repo or author/label filters.
- For GitHub App authors use `--app dependabot` or
  `--author 'dependabot[bot]'`; `--author dependabot` is a different identity.
- `--search-type semantic|hybrid` returns one page and is not an exhaustive
  inventory; use lexical queries when counting.

## Issue types, sub-issues, and relationships

- `subIssues`, `blockedBy`, and `blocking` `--json` fields are shaped
  `{"nodes": [...], "totalCount": N}`, and `nodes` is capped (`subIssues` at
  100, `blockedBy`/`blocking` at 50); compare against `totalCount` to detect
  truncation.
- Relationship refs may be URLs to another repo on the same host, not another
  host. GHES: types and sub-issues need 3.17+; blocked-by/blocking 3.19+.

## Attachments and evidence archives

### Images and videos (`--attach`, 2.99+)

`--attach` works on `gh issue` / `gh pr` **create, edit, and comment**:

```sh
gh issue comment 12 --body-file comment.md --attach './before.png#Before the fix'
```

- Accepts `png`, `jpg`, `jpeg`, `gif`, `webp`, `svg`, `mp4`, `mov`, `webm`.
  **ZIP, JSON, text, and PDF are not accepted**, even though the web uploader
  takes them.
- A matching local Markdown path in the body is replaced with its uploaded
  URL; otherwise the attachment is appended.
- Requires GitHub.com/GHEC, an OAuth token or PAT, and repository write
  permission; GHES and GitHub App tokens are unsupported. Do not change
  credential configuration to work around this.
- A later upload failure can leave earlier attachments **posted despite a
  non-zero exit**. Inspect the issue/PR before retrying.

### ZIPs and other files (release assets)

`gh release create` / `gh release upload` accept ZIPs and other files. A
release asset is not an issue attachment; for that, use the web uploader. A
**draft** preserves evidence without publishing, but needs **push access** to
view.

```sh
gh release create "$archive_tag" evidence.zip evidence.zip.sha256 \
  --repo OWNER/REPO --draft --latest=false --target "$source_commit" \
  --title 'Evidence archive (keep unpublished)' --notes-file archive-notes.md
```

- Draft URLs can contain `untagged-…`; use the returned `url`, and verify
  `isDraft` and assets with `gh release view --json url,isDraft,assets`.
- Without `--draft`, creation publishes; a missing tag can be created from
  `--target` or the default branch. Inspect tag/deploy triggers first.
  `--latest=false` alone does not prevent publication.
- `--clobber` deletes the old asset before uploading and can lose it if the
  upload fails; prefer a new name.
- Linking a release proves location, not byte integrity; compare a fresh
  download's digest against the local one.

## Discussions (`gh discussion`)

Preview, subject to change. To list a comment's replies, pass the comment
ID/URL to `view` (no `--replies` flag). `--json` works on `list` and `view`
only.

## Read repository contents without cloning (2.95+)

- `gh repo read-file --json` returns base64 `content`; use `--output PATH`
  when exact bytes matter.
- `gh repo read-dir --json` returns an object; use `.entries[]` with `--jq`.

## Projects by field name (2.97+)

- `gh project item-edit 1 --owner OWNER --url ISSUE_OR_PR_URL --field Status
  --value 'In Progress'` edits one field per call; the URL is the item's, not
  the project's.
- Projects use `--format json`, not `--json`.

## Fall back to `gh api` for anything `--json` doesn't expose

- PR review-thread comments: `gh api repos/{owner}/{repo}/pulls/{n}/comments`
  (`gh pr view --comments` shows issue-level comments only).
- GraphQL: `gh api graphql -f query='...' -F var=value`.
- `{owner}/{repo}` is filled from detected remotes; pass literals for
  determinism.

## Authentication

- `gh auth status` shows host(s), user, and honored env var.
- `api_host` routing (2.100+, experimental) is not a security boundary and not
  an authentication repair.

## PR state and destructive edits

- A PR is not mergeable while unresolved review threads remain, whatever the
  checks say. `gh pr view --json` does not expose thread resolution — query it
  before claiming a PR is ready:

  ```bash
  gh api graphql -F owner='{owner}' -F repo='{repo}' -F pr=<n> -f query='
    query($owner:String!,$repo:String!,$pr:Int!){
      repository(owner:$owner,name:$repo){
        pullRequest(number:$pr){
          reviewThreads(first:100){nodes{isResolved}}}}}' \
    --jq '[.data.repository.pullRequest.reviewThreads.nodes[]|select(.isResolved|not)]|length'
  ```
- Never volunteer `gh pr merge --admin` (or any protection bypass) as a way
  past failing checks or branch rules; use it only when the human explicitly
  orders the bypass.
- `gh pr edit --body` replaces the description wholesale — treat it as
  destructive. Fetch the current body (`gh pr view --json body`), merge your
  change additively, and show the proposed body before writing.

## Outward text discipline

Issue bodies, PR descriptions, review comments, and release notes are published
claims. Every factual statement must come from a source verified this session
or be labeled as inference. Verify referenced issue/PR numbers and SHAs
resolve before linking them.

## Other notes

- `gh pr checkout <n>` switches branches; use `gh pr diff <n>` or
  `gh pr view <n>` to only read, or `gh pr checkout <n> --worktree <path>`
  (2.98+) to check out without switching.
- `GH_FORCE_TTY=1` forces TTY-style output; leave it unset unless needed.
