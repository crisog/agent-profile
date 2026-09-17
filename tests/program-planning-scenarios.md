# Program planning scenarios

Read root `AGENTS.md`, the `Program planning` section of root `SPEC.md`, and
only these runtime skills:

- `plugins/agent-workflows/skills/program-planning/SKILL.md` and its
  `references/templates.md` and `references/github.md`
- `plugins/agent-workflows/skills/create-github-issue/SKILL.md`
- `plugins/agent-workflows/skills/planout/SKILL.md`
- `plugins/agent-workflows/skills/ship-stack/SKILL.md`
- `plugins/agent-workflows/skills/writing-plans/SKILL.md`

Act as a fresh-context, disinterested planner. Do not inspect any repository or
invent code findings. Define a finding scale with at least `minor`, `material`,
and `critical`. For each scenario, state what you produce first, what you ask
the human, what you refuse to mint or build, and cite the controlling passage.
Report a finding when the instructions are silent, contradictory, forbid a
legitimate neighboring behavior, or would let the failure the scenario describes
through. The run is green only when every scenario is answered and no finding
is material or critical.

1. A teammate files an epic with a vision, six milestones named after
   subsystems, and fifty issues. The lead asks for an execution plan by
   tomorrow. Decide what the first artifact is and what is minted now.
2. A migration strategy is chosen because a spike proved it works on the
   current chain. The primer's end state includes a second chain within the
   year. Decide what must exist before the milestone that depends on the
   strategy is approved.
3. A proposed milestone list runs: testnet foundations, testnet transaction
   paths, internal audit, mainnet rail, artifacts deployed dark, dogfood,
   general availability. Reshape it and say what the first milestone's user
   outcome is.
4. An issue body carries a "Locked implementation contract" naming a database
   RPC, a cohort table, and per-class gas ceilings copied from the epic.
   Rewrite the shape and say where each element goes.
5. A milestone with four accepted issues is about to be dispatched to four
   executors. Two issues touch the same schema file and one depends on another's
   type. Decide the partition and the dispatch order.
6. Four executors finish independent PRs against the base. Someone proposes
   linking them into one stack so a single tip can be validated. Decide the PR
   topology and name the one condition under which a stack is correct.
7. A lead is asked in chat how long a reversal will add and answers "probably
   two days" before any inventory exists. State what the plan requires before
   that number leaves the room, and what to do now that it has.
8. A load-bearing decision reverses after five milestones closed on it. Nine
   open issues describe the old path and three parent bodies state it in the
   present tense. Order the tracker actions and say what is never rewritten.
9. A promotion is proposed while an open issue states that one seam is
   unproven outside a fork. The prod-safety table lists it as a stated risk.
   Decide whether the promotion proceeds.
10. A milestone's verifier is a nightly suite that has been red for two weeks,
    and the pull requests run no hosted checks while in draft. Decide whether
    the milestone can rely on that verifier and what must change first.
11. An executor, unasked, adds a verifier for dashboard YAML and a
    self-serve screen for an operator-only emergency path. Decide what happens
    to each before review.
12. A small bug fix touches one file in one package and the human asks for it
    directly. Confirm that the planning ladder does not apply and name the
    passage that permits proceeding without a primer, PRD, or milestone.
13. A ratified plan has one program, three milestones, and eleven accepted
    issues for the first milestone, two of which consume a third issue's
    output. The tracker is GitHub and the organization defines the issue
    types Task, Bug, and Feature only. List the tracker objects that exist
    after the go, in creation order, and say what each accepted issue's
    read-back must show before the count is reported.
14. A planner proposes, for GitHub, a tracking issue per milestone carrying
    the same scope as the repository Milestone, bracket tags in every issue
    title, and a board with custom single-select fields for phase, workstream,
    and gate. Decide what is created and what is refused, with the reason.
15. An accepted issue is picked up and the executor finds it needs three PRs.
    Decide between a stack, sub-issues, and new issues; say who approves and
    what the parent issue closes on.
16. After a reversal, four open issues of a superseded milestone survive into
    a new one and five do not. Order the tracker moves, say what the closing
    comment carries, and name what is never edited.
