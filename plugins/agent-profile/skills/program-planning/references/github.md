# The ladder on GitHub

The default mapping when the tracker is GitHub. The human ratifies it, or a
named variant, together with the milestone list, before the first tracker
object exists. This file says which object each rung becomes, in what order,
and how to read the result back. Flag detail, JSON fields, and pagination live
in the `gh` skill.

## One object per rung

| Rung | GitHub object | Exists when |
|---|---|---|
| Program | One epic issue. Type `Epic` where the organization defines it, else a label named in the ratified mapping and created with the milestone list when none exists. Body: primer link, end-state properties, the milestone list with status, links to decision records. | The primer is shared. |
| Milestone | One repository Milestone. Title `M<n> <outcome>`. Description: the milestone template. Due date from the estimate, set after the inventory. | The milestone list is ratified. |
| Issue | One issue in that Milestone, a sub-issue of the epic, type `Task` or `Bug`. The title names the problem. | The milestone's issues are accepted. |
| Split | Sub-issues of the accepted issue, one PR each. The parent closes on its children's evidence. | An accepted issue proves larger than one PR. |
| Dependency | A native blocked-by relationship from consumer to producer. | At minting, only where one issue's output is another's input; the producer issue is created first. |
| Board | One Project linked to the repository, built-in fields only until a view needs a filter no built-in carries. | Before the first issue; the epic joins it by `--project` or `item-add`. |
| Decision record | A comment on the epic; durable ones also enter the nearest `SPEC.md` Decisions. | At the go, and at a reversal. |
| Evidence | A prose comment on the issue, then close as completed. | At close. |
| Skip | An issue that already exists closes as not planned, reason in the closing comment; a drafted issue the human skips is never created. | On the day of the go. |

Rules that keep the mapping honest:

- Nothing is tracked twice. A milestone is a Milestone, not also a tracking
  issue; a program is an epic, not also a Milestone. Two bodies for one thing
  drift, and the stale one is the one that gets read.
- Progress is derived, never typed. Milestone progress comes from issue state,
  the epic's progress from its sub-issues, and the board's Milestone, Parent
  issue, and Sub-issues progress columns from the same. A custom field that
  mirrors what the tracker derives is a second copy.
- A custom single-select costs one edit per item at minting and at every
  replan, and renaming one of its options replaces the option set and clears
  the field on every item. Snapshot the item list before touching one.
- The issue number is the identity. Titles carry no tag scheme; a scheme has
  to be allocated, never reused, and goes stale at the first replan.
- Sub-issues split an issue. They never model the steps of one PR or the
  stages of an environment ladder.
- A dependency lives in the relationship, not in body text or a comment.
- No object exists before its rung is ratified. Drafts are held as files.

## Commands, in ladder order

Read what the organization offers before drafting, so the plan names real
types, labels, and projects:

```bash
gh api graphql -f query='query{repository(owner:"OWNER",name:"REPO"){issueTypes(first:20){nodes{name isEnabled}}}}'
gh api 'repos/OWNER/REPO/milestones?state=all' --jq '.[]|[.number,.title,.state,.open_issues,.closed_issues]|@tsv'
gh label list --repo OWNER/REPO
gh project list --owner OWNER
```

After the go, create in this order: the epic, the go's decision record as a
comment on the epic, the board, the milestones, the issues.

```bash
# program
gh issue create --repo OWNER/REPO --type Epic --title 'PROGRAM' --body-file epic.md
gh issue comment EPIC --body-file decision.md
# board; skip when the organization's existing project is the ratified board
gh project create --owner OWNER --title 'PROGRAM'
gh project link NUMBER --owner OWNER --repo OWNER/REPO
# milestone; there is no gh milestone command, so use the API
gh api repos/OWNER/REPO/milestones -f title='M1 OUTCOME' -F description=@m1.md -f due_on='2026-10-15T00:00:00Z'
# issue: in the milestone, under the epic, on the board
gh issue create --repo OWNER/REPO --type Task --milestone 'M1 OUTCOME' --parent EPIC --project 'PROGRAM' --title 'PROBLEM' --body-file issue.md
# the same issue when it consumes another issue's output
gh issue create ... --blocked-by PRODUCER
# a split, when an accepted issue proves larger than one PR
gh issue create ... --parent ISSUE --milestone 'M1 OUTCOME'
# an existing issue that must join the board
gh project item-add NUMBER --owner OWNER --url ISSUE_URL
```

Read the result back before reporting it. Counts and links in a report come
from this output, not from the plan:

```bash
gh issue view N --json number,title,milestone,parent,issueType,blockedBy,subIssuesSummary,projectItems
gh issue list --repo OWNER/REPO --milestone 'M1 OUTCOME' --state all --json number,title,state,parent
gh api repos/OWNER/REPO/milestones --jq '.[]|[.title,.open_issues,.closed_issues]|@tsv'
```

Each accepted issue shows its Milestone, the epic as parent, its type, a
blocked-by only where an output feeds an input, and exactly one project item.

Close with evidence, skip with a reason, and close a Milestone only after its
last issue:

```bash
gh issue comment N --body-file evidence.md
gh issue close N --reason completed
gh issue close N --reason 'not planned' --comment 'Skipped at the go on DATE: REASON'
gh api -X PATCH repos/OWNER/REPO/milestones/NUMBER -f state=closed
```

## A reversal on GitHub

The protocol is in the Approval rung; these are its tracker moves.

```bash
# every open issue of the superseded milestone, read in full
gh issue list --repo OWNER/REPO --milestone 'M3 OLD OUTCOME' --state open --json number,title,body,parent,blockedBy
# a survivor: adopted into the new milestone with a corrected body
gh issue edit N --milestone 'M3 NEW OUTCOME' --body-file corrected.md
# the rest, on the day of the go
gh issue close N --reason 'not planned' --comment 'Retired by the DATE decision: LINK'
# the superseded Milestone, after its issues moved or closed
gh api -X PATCH repos/OWNER/REPO/milestones/NUMBER -f state=closed
```

`gh issue edit --body` and a Milestone `PATCH` replace the text wholesale: read
the current body, then write. Closed issues and comments are never edited.

## Traps

- The board's auto-add workflow can race a manual `item-add`. Look the item up
  by content number before editing a field, or one of the two writes is lost.
- `gh project item-edit NUMBER --owner OWNER --url ISSUE_URL --field Status
  --value 'In Progress'` (2.97+) sets a board field by name, not by option id; one field per edit.
- `--type` fails when the organization does not define that type. The first
  command block lists what exists.
- A Milestone closes with open issues still in it. The board then shows those
  issues under a closed milestone, which reads as done. Close it last.
- A sub-issue list read through `--json` is capped; compare the node count
  with `totalCount` before reporting a milestone as fully read.
