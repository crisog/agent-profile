# SPEC — agent-profile runtime and maintenance contracts

`missionctl` is a separately versioned PATH dependency. This repository owns
the shared doctrine, not the reducer, executable, or lifecycle adapter.

## Goal

The agent-profile repo is installable and usable as a pi package: `pi install git:...` (or `pi -e` for development) loads both plugins' skills and provides pi-native equivalents of the plugins' Claude/Codex hooks. No claude/codex manifests or hook scripts are modified — pi reads them; the shell scripts remain the single source of truth for hook policy.

## Context

- Repo layout: `plugins/engineering-practices/` and `plugins/agent-workflows/`, each with `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, and `skills/` (Agent Skills standard). `agent-workflows` additionally ships `hooks/hooks.json` + four scripts.
- Pi adapter hooks in scope: `SessionStart` (instruction-fingerprint → additionalContext) and `PreToolUse` on `Bash`/`shell` (verifier-bypass guard → deny JSON). `SubagentStart` has no pi analogue. The separately installed missionctl plugin owns its own `SessionStart` loop-context hook.
- pi's hook model: in-process extension events (`session_start`, `tool_call`, ...). There is no hooks.json consumer in pi core; the extension is the consumer.
- pi's skill loader accepts Claude Code skill frontmatter (upstream #7468), so skills load unmodified.

## Requirements

- REQ-PI-001 — **Manifest**: repo root `package.json` carries a `pi` key: `extensions: ["./extensions/pi-hooks.ts"]`, `skills: ["./plugins/engineering-practices/skills", "./plugins/agent-workflows/skills"]`, keyword `pi-package`. Every referenced path must resolve on disk (gate + test).
- REQ-PI-002 — **Fingerprint**: extension registers `session_start`; on each session it execs `instruction-fingerprint.sh SessionStart` and, on a `hookSpecificOutput.additionalContext` response, emits a custom message (`customType: "instruction-fingerprint"`, `display: true`) so transcripts stay bucketable by instruction version. Any failure degrades to silence — the event handler never throws into pi startup.
- REQ-PI-003 — **Verifier guard**: extension registers `tool_call`; for `bash` calls it execs `verifier-bypass-guard.sh` with stdin `{"tool_input":{"command": ...}}` (the script's own contract). A `permissionDecision: "deny"` response blocks the call (`{ block: true, reason }` with the script's reason). All other outcomes pass through; non-bash tools untouched.
- REQ-PI-004 — **Boundedness**: every hook subprocess runs with a timeout (fingerprint 10s, guard 5s — matching `hooks.json`), stdout is capped, spawn/exec errors are handled; hooks fail open (an error or timeout never blocks).
- REQ-PI-005 — **Parity**: the extension contains no inline copy of hook policy — it execs the canonical scripts. `scripts/validate.sh` carries a pi gate asserting manifest paths resolve and the extension references both scripts (a third implementation would drift).
- REQ-PI-006 — **Testability**: vitest floors execute the real scripts; floors are deterministic, use no network, no LLM, and no pi binary (host-independent).
- REQ-PI-007 — **Docs + E2E**: README documents the pi surface; a clean-host E2E (fresh VM, `pi install` from the default branch) shows the package skills in `get_commands`, the `instruction-fingerprint` custom message in `get_entries`, and no `extension_error` events.

## Invariants

- The extension never throws into pi startup or the agent loop; every handler path is caught.
- Hooks fail open; the guard blocks only the shapes the canonical script denies.
- The Pi adapter does not duplicate or reinterpret `.claude-plugin/`, `.codex-plugin/`, marketplace, or hook policy. Additive shared lifecycle hooks remain documented Pi skips when no analogue exists.
- No network calls and no credential access from the extension.
- `package.json` is additive: it must not interfere with existing release-please plugin versioning or `scripts/validate.sh` behavior.

## Non-goals

- The adapter/plugin-host extension — revisit only on the evidence trigger: bulk third-party plugin imports into pi.
- recall/silo/canton/infra/linear manifests, subagents, statusline, MCP, a `/plugin` review command, dedup machinery, dotfiles `pi/settings.json` retirement.

## Acceptance

1. `npm run check` green (tsc `--noEmit` + `vitest run`), floors exercising real hook scripts.
2. `./scripts/validate.sh` green including the pi gate.
3. Clean-host E2E: skills load, the fingerprint hook fires, no `extension_error` events (evidence in REQ-PI-007).
4. Claude/Codex parity gate still green after all changes (proof of invariant 3).

## Cross-harness skill usage census

### Requirements

- REQ-CENSUS-001 — **Recall ownership**: `scripts/skill-usage.sh` MUST obtain
  usage from `recall stats skills --json`; it MUST NOT parse transcripts or
  accept `--root`. Missing Recall, a failed Recall command, malformed output,
  or incomplete coverage MUST exit nonzero before emitting `never_fired`.
- REQ-CENSUS-002 — **Options**: the wrapper preserves `--since`, `--plugin`,
  and `--json`; adds repeatable `--source`, `--local`, and `--fleet-config`;
  and forwards every Recall-owned option without forwarding `--plugin`.
- REQ-CENSUS-003 — **Catalog**: declared skills are discovered from the current
  `plugins/*/skills/*/SKILL.md` catalog and represented as
  `<plugin>:<skill>`. `--plugin` limits only the declared report population.
- REQ-CENSUS-004 — **Canonicalization**: an exact declared
  `<plugin>:<skill>` name is accepted. A bare name maps only when exactly one
  skill in the complete catalog has that suffix. Any ambiguous bare name MUST
  fail before computing `never_fired`; unrelated names remain unmatched
  diagnostics and MUST NOT count as catalog coverage.
- REQ-CENSUS-005 — **Coverage**: local mode requires one complete local
  endpoint; default mode requires complete local-plus-fleet coverage. Expected
  and successful hosts MUST match, covered sources MUST equal the request (all
  five by default), population counters MUST be internally consistent, and the
  all-time control MUST contain both sessions and attributed invocations. Every
  invocation row MUST contain at least one distinct session and MUST fit inside
  the considered-session population. If multiple reported names canonicalize
  to one skill within the same source and host, invocation counts MUST aggregate
  exactly. The wrapper MUST emit an exact distinct-session count only when the
  union bounds collapse; otherwise it MUST emit explicit minimum/maximum bounds
  and MUST NOT claim an exact count.
- REQ-CENSUS-006 — **Report**: JSON preserves `window`, `control_total`,
  `fired`, and `never_fired`; replaces transcript metadata with Recall's
  structured `coverage`; and adds aggregated `unmatched` diagnostics. Fired
  rows aggregate invocation counts across Recall's source/host rows. `sessions`
  is an integer when the distinct-session union is provable; otherwise it is
  `null` and `session_bounds` carries inclusive `minimum` and `maximum` values.
- REQ-CENSUS-007 — **Decision boundary**: this census declares no skill dead
  and performs no archival, rename, catalog, or plugin-version mutation.
  `agent-workflows:afk` remains public and `agent-workflows:writing-plans`
  remains only a candidate pending complete-fleet evidence.
- REQ-CENSUS-008 — **Verification**: tests use a fake Recall executable and
  cover exact/bare canonicalization, ambiguity, unmatched names, filters and
  option forwarding, missing/failed Recall, malformed or incomplete coverage,
  and empty control. `npm run check` and `./scripts/validate.sh` are release
  gates.

### Invariants

- No incomplete or ambiguous result can produce a `never_fired` list.
- Recall remains the only owner of transcript formats and harness attribution.
- Unmatched Recall names are visible without reducing the declared catalog's
  never-fired population.

### Acceptance

1. Fake-Recall wrapper tests prove REQ-CENSUS-001..006 and fail closed on every
   incomplete-coverage class.
2. `npm run check` and `./scripts/validate.sh` pass without changing either
   plugin's `3.0.0` version.
3. A real all-time and recent-window query succeeds only after every configured
   host and all five sources report complete coverage.

## Decisions

Dated entries; provisional statuses ratify only with human confirmation at the publish boundary. D1 ratified in-session by the human.

- D1 2026-08-11 — **Direction: fleet-as-pi-packages, not an adapter.** Why: pi packages ARE pi's plugin system; a claude/codex adapter would duplicate install/enable/dedup/state/trust that `pi install` + `pi config` already own. **ratified (human)**
- D2 2026-08-11 — **Single source of truth for hook policy:** the extension execs the canonical shell scripts (same stdin/JSON contract), never an inline duplicate. Why: the repo's claude↔codex parity gate would otherwise have a third copy to drift. Enforced by the validate.sh pi gate. **provisional**
- D3 2026-08-11 — **Fingerprint is a display custom message** (`pi.sendMessage`, customType `instruction-fingerprint`); `SubagentStart` skipped (no pi analogue — no native subagents). **provisional**
- D4 2026-08-11 — **Hooks fail open:** script errors, timeouts, and parse failures never block a tool call or session start; the guard denies only the shapes the canonical script denies. **provisional**
- D5 2026-08-11 — **Pi package version is independent** of plugin versions (root `package.json` 1.0.0; plugins keep release-please 2.x lines). **provisional**
- D6 2026-08-11 — **Dotfiles `pi/settings.json` skills wiring retires** in favor of the pi package (overlap double-loads the same skills; pi first-wins dedups with warnings). Pending work — migrated to the continuation charter in the recall repo. **provisional**
- D7 2026-08-28 — **Missionctl owns its lifecycle adapter.** Its hooks-only plugin registers a single `SessionStart` hook that injects the bounded loop context; compaction is an agent-driven `missionctl compact` transition, not a hook. Pi still receives the portable mission-command skill. **ratified (human)** (hook set narrowed 2026-08-29 with the LOOP-first missionctl redesign — provisional (driver))
- D8 2026-08-28 — **Agent-profile does not vendor or register missionctl.** Dotfiles installs the independently versioned executable through mise and the lifecycle adapter through missionctl's marketplace. **ratified (human)**
- D9 2026-08-30 — **Skill usage is Recall-owned and fail-closed across the complete fleet.** The wrapper owns only current-catalog canonicalization and presentation; no skill is archived in this campaign. `afk` remains public and `writing-plans` remains a candidate only. **ratified (human)**

Campaign status: unit 1 shipped and E2E'd; this repo's LOOP.md dissolved into this SPEC and README (dissolve-docs, 2026-08-11).
- 2026-08-29 — SPEC.md D7 is amended in place to the single SessionStart hook instead of adding a superseding decision, because the compaction hooks never shipped. **provisional (driver)**
- 2026-08-29 — The stack diagram lists MISSION last as optional rather than removing it, so cross-campaign outcomes keep a named home. **provisional (driver)**
- 2026-08-30 — Keep afk public and make no archival or renaming changes in this campaign. **ratified (human)**
- 2026-08-30 — When exact and bare aliases overlap within one host/source, preserve exact invocation totals and report honest distinct-session union bounds unless the population proves an exact union. **provisional (driver)**
- 2026-09-16 — The four evidence-honesty laws (never bypass a required check, claims carry sources, a process is running only on current evidence, an empty query is not absence) are stated in `AGENTS.md` rather than only in `loop-brief/doctrine.md`, because a session that never loads `loop-brief` would otherwise miss them. The doctrine keeps no second copy. **ratified 2026-09-17**
- 2026-09-16 — The delegation default stands: fix-shaped work delegates. Only the independence sentence ("authoring and judging are separate concerns; direct implementation does not waive independence") is adopted; flipping the default is an operator call. **ratified 2026-09-17**
- 2026-09-16 — `AGENTS.md` carries no word cap, and any instruction validator carries only the link and catalog checks. A cap the repository's model cannot meet is a gate that gets disabled on its first red. **ratified 2026-09-17**

## Behavior-first verification profile

### Requirements

- REQ-BUGBASH-001 — **Evidence selection:** `AGENTS.md` starts verification
  from material user/operator risks and chooses the cheapest faithful evidence.
  Generic generative code review is not a default delivery gate. Specialized
  review is bounded to a named risk and severity floor; ADF high-risk classes
  receive the matching review by default unless the human records a PLAN waiver.
- REQ-BUGBASH-002 — **Real-use gate:** an operable application or system uses a
  task-based bug bash when lower-level checks cannot expose its assembled
  behavior. The charter names the exact artifact and environment, roles, tasks,
  expected outcomes, evidence, severity floor, budget, and boundaries.
- REQ-BUGBASH-003 — **Independent terminal:** author-run dogfood is discovery;
  an experiential terminal uses a fresh, disinterested participant when the
  path is automatable. A required device, biometric, live secret, or subjective
  human response remains a Boundary item.
- REQ-BUGBASH-004 — **Findings and boundedness:** findings are observable and
  reproducible through the public surface. A run terminates `green`, `findings`,
  `blocked`, or `budget-exhausted`; skipped tasks and unavailable environments
  cannot silently pass, and no loop runs "until approval."
- REQ-BUGBASH-005 — **Workflow coherence:** loop, brief, E2E, eval, planning,
  and plugin guidance route assembled-behavior verification to `bugbash` while
  retaining objective harnesses and explicitly selected specialist review.
- REQ-BUGBASH-006 — **Wiki deltas:** test planning maps risks and public
  contracts to evidence rather than tests per function; retry outcome does not
  classify flakes; legitimate production test seams remain allowed; applicable
  code properties are scoped to their failure modes; post-green refactoring and
  independently green prefactoring are represented in delivery guidance.
- REQ-BUGBASH-007 — **Codex self-hosting instructions:** when Codex project
  override semantics apply, working in this repository does not load the
  canonical global `AGENTS.md` body twice. The override points contributors
  without the installed profile back to the canonical file; it makes no
  fleet-wide deduplication claim for other harnesses.
- REQ-BUGBASH-008 — **Verification:** the skill catalog validates, fixed
  engineering and gate-routing scenarios have no material-or-higher gap in a
  fresh-context run, and `npm run check` plus `./scripts/validate.sh` pass.
- REQ-BUGBASH-009 — **Deslopify gate:** the ADF runs a `deslopify` pass over
  the branch diff after the objective checks are green and before a draft PR
  opens or the E2E/bug-bash gate runs; the objective checks rerun on the
  result. `create-pr` and `ship-stack` carry the pass as a step, `bugbash` and
  `e2e` state it as a precondition, and `deslopify` is model-invocable so the
  workflow can run it. A branch with no runtime code change records the skip.

### Invariants

- Dogfooding does not replace deterministic correctness, security, migration,
  or public-contract checks that a more faithful verifier already covers.
- Static review requested by the user or selected for a named non-executable
  risk remains supported; only the unconditional generic review loop is removed.
- No release version, tag, push, PR, merge, or marketplace publication occurs
  in this change.

### Decisions

- Replace the profile's default reviewer/fix-up terminal with a bounded bug bash
  focused on the application or system under test. (2026-09-03, ratified by the
  user's request; corroborated by Recall sessions
  `9987bea729a9d8bf310d2abbf35ba3ce` and
  `c92d7097a72be8b1e994391537ce94d3`)
- Preserve author dogfood as discovery while requiring fresh execution only for
  an independent experiential terminal. (2026-09-03, provisional)
- Preserve targeted specialist review for named trust-boundary risks: Recall
  session `7e2b9709083b760ab88e143f9530d1d8` found a real packet-boundary
  validation defect. (2026-09-03, provisional)
- Keep the existing August engineering-practices distillate and amend only the
  wiki gaps that change decisions; the runtime profile does not copy or depend
  on the wiki. (2026-09-03, provisional)
- Defer plugin version bumps and all publication to a separately authorized
  release action. (2026-09-03, provisional)
- A deslopify pass is a delivery gate between green objective checks and the
  draft PR or E2E/bug-bash gate, not an on-request cleanup. (2026-09-23,
  ratified by the user's request)

### Acceptance

1. `plugins/agent-workflows/skills/bugbash/SKILL.md` validates and produces a
   task charter plus behavior-evidence findings rather than a static diff review.
2. No always-loaded instruction requires generic reviewer approval to finish an
   ordinary operable-surface change.
3. Engineering-practice scenarios cover risk-driven QA, causal flake diagnosis,
   legitimate test seams, property applicability, and prefactoring.
4. Gate-routing scenarios distinguish harness-only, bug-bash, specialist-review,
   and human-boundary work, including exhausted task budgets.
5. `npm run check` and `./scripts/validate.sh` pass after the final mutation.

## Agentic engineering mechanics

### Requirements

- REQ-AGENTIC-001 — **Agent-operable surfaces:** a focused skill translates the
  existing deterministic, idempotent, observable, evented, contextual, and safe
  default laws into CLI/API/control-plane mechanics: inspectable state, stable
  machine-readable output, explicit targets, bounded waits, and independently
  verifiable effects.
- REQ-AGENTIC-002 — **Evidence freshness:** verifier guidance binds evidence to
  the revision, dirty state, artifact, environment, and task it observed; a
  mutation invalidates every downstream result it can affect.
- REQ-AGENTIC-003 — **Destructive boundary:** process cleanup remains interior
  only for attributed disposable processes and resources. Volume deletion,
  factory reset, or another data-bearing action is a separately inventoried and
  explicitly authorized operation; routine examples cannot imply otherwise.
- REQ-AGENTIC-004 — **Instruction epistemics:** model intuition may nominate a
  hypothesis, never serve as its evidence. Instruction changes distinguish
  coverage, compliance, over-strength, and tooling; cite observed behavior and a
  legitimate neighboring behavior before codification, then use fingerprints
  and post-rollout sessions to judge the result.
- REQ-AGENTIC-005 — **Portable verification:** fixed scenarios cover agent
  operability, stale evidence, destructive cleanup, direct secret requests,
  instruction activation, and weight-derived hypotheses across harness-neutral
  primitives. Existing check and validation gates remain green.

### Invariants

- The runtime profile does not depend on the engineering wiki at execution
  time; the wiki is provenance and synthesis, while this repository carries the
  smallest operational form.
- No new always-loaded law duplicates mechanics already owned by a skill.
- Direct secret values never enter scenario fixtures, transcripts, or docs.
- The post-v4 TDD-soak decision remains open and is not smuggled into this work.

### Decisions

- Treat the engineering wiki as the explanatory source layer and agent-profile
  as its compressed, versioned operational derivative. (2026-09-03, ratified by
  the user's request)
- Add `agent-operability` as the one new skill; extend `eval`,
  `writing-skills`, `testing-best-practices`, and `code-law` only with mechanics
  they already own. (2026-09-03, ratified by the user's request)
- Correct the `host-tidy` and OrbStack destructive examples in this release;
  defer the TDD policy choice until post-release soak evidence exists.
  (2026-09-03, ratified by the user)

### Acceptance

1. `tests/agentic-engineering-scenarios.md` receives a fresh-context run with no
   material-or-higher finding.
2. All skill descriptions use trigger-shaped `Use when...` language, while
   validated provenance metadata remains legal.
3. Ordinary cleanup examples contain no implicit volume deletion or factory
   reset path.
4. `npm run check` and `./scripts/validate.sh` pass after the final mutation.

## Program planning

### Requirements

- REQ-PLAN-001 — **Ladder:** work larger than one pull request or one campaign
  is planned as primer, PRD, milestones, issues, approval, build, and each rung
  is approved by the human before the next is minted. The `program-planning`
  skill owns the rungs and their templates.
- REQ-PLAN-002 — **End state and assumptions:** the primer states the
  properties every later decision must keep and lists each load-bearing
  technical assumption as proven by a spike with a decision record or as
  untested. A milestone that depends on an untested assumption is not approved
  unless a dated decision record names the human and the accepted risk.
- REQ-PLAN-003 — **Outcome milestones:** every milestone ends with an outcome a
  user or operator can observe on the assembled surface, names its verifier and
  the environment that can express its risk, and carries an estimate with its
  assumptions and inventory. Environment promotion, audits, and rollout ladders
  are steps inside a milestone, never milestones.
- REQ-PLAN-004 — **Just-in-time, problem-first issues:** issues are minted for
  an approved milestone only, state the problem, evidence, why it matters, and
  observable acceptance, carry no implementation contract or copied constants,
  and partition the files or packages they touch so accepted issues run in
  parallel without collision.
- REQ-PLAN-005 — **Independent PRs:** the default build shape is one PR per
  accepted issue against the base branch. A stack is used only when one issue's
  change must land as several reviewable steps of one atomic behavior change,
  and it merges the same day it goes green. Parallel work is never linearized
  into a stack afterwards; the pre-merge drive runs on a disposable integration
  branch that is neither a review target nor a packet base.
- REQ-PLAN-006 — **Approval before mutation:** the human sees the milestone
  list and the first milestone's issue list, accepts or skips each issue, and
  gives the go before more than a few tracker items are created or edited.
  Skipped issues close the same day with the reason.
- REQ-PLAN-007 — **Reversal and adoption protocol:** when a load-bearing
  decision reverses, or when the ladder is adopted over an existing plan, the
  driver writes a dated decision record with its approvals, freezes the
  superseded plan in a collapsed block, re-derives the milestones, re-reads
  every open issue, epic, and milestone description against the tree, adopts
  survivors into an approved milestone with corrected bodies, and closes the
  rest on the day of the go, without rewriting closed issues or comments.
- REQ-PLAN-008 — **Gates that run:** a milestone relies on a check only after
  confirming it executes on the artifact it claims to cover; a named unproven
  seam blocks promotion rather than appearing as a stated risk, and the block
  lifts only through a dated decision record naming the human, the accepted
  risk, and alternative evidence executed on the artifact the seam covers with
  its output cited.
- REQ-PLAN-009 — **Verification:** `tests/program-planning-scenarios.md`
  receives a fresh-context run with no material-or-higher finding, and
  `npm run check` plus `./scripts/validate.sh` pass.
- REQ-PLAN-010 — **GitHub mapping:** when the tracker is GitHub, the program
  is one epic issue, each ratified milestone is one repository Milestone, each
  accepted issue is an issue in that Milestone and a sub-issue of the epic, a
  split is sub-issues of the accepted issue, a dependency is a native
  blocked-by relationship, and the board derives progress from built-in
  fields. Nothing is tracked twice, no object exists before its rung is
  ratified, and every reported count is read back from the tracker.
  `references/github.md` in the skill owns the commands.

### Invariants

- The ladder never applies to a change the human asks for directly that fits
  one pull request; the skill's trigger excludes it.
- Primers and PRDs are shared context, not law; durable decisions live in the
  nearest `SPEC.md` Decisions, and plan documents remain uncommitted where the
  repository says so.
- No always-loaded law is added for planning; the skill carries the mechanics
  and points at the existing ADF gates.

### Non-goals

- Tracker integration beyond the GitHub mapping: board automation,
  custom-field schemes, and other trackers. The skill names artifacts and
  approvals; the reference maps each to one native object.
- Replacing `specout`, `planout`, or `create-github-issue`; the ladder hands
  each accepted issue to them.

### Decisions

- The planning ladder is primer, PRD, milestones, issues, approval, build, with
  human approval between rungs, per the operator's request on 2026-09-16 after
  a retrospective over an eight-week platform migration program. (2026-09-16,
  ratified by the user's request)
- Independent PRs per issue are the default build shape; stacks are the named
  exception. Evidence: in the same program, stacked PRs merged an order of
  magnitude slower than PRs cut from the base, every lower-layer fix cascaded
  a rebase and a paid re-review, and unrelated base changes reddened whole
  stacks. (2026-09-16, ratified 2026-09-17)
- Milestones are user outcomes, not environment stages. Evidence: most of the
  program's phases closed with zero users on the new path, and the first real
  user run found several blocking defects only after the milestone's PRs had
  merged. (2026-09-16, ratified 2026-09-17)
- Issues carry no implementation contract. Evidence: the cohort of issues
  written with locked contracts needed several times the body edits of every
  other cohort, and every contract line naming a mechanism was overturned
  within days. (2026-09-16, ratified 2026-09-17)
- Load-bearing assumptions get a spike before the dependent milestone is
  approved. Evidence: the program's migration strategy was reversed seven weeks
  after ratification on a one-day question the original spike never asked,
  retiring a month of merged work. (2026-09-16, ratified 2026-09-17)
- GitHub is the planning tracker, mapped one native object per rung with
  derived progress and the issue number as identity. Evidence: in the same
  program, custom board fields cost a pass over every item at each replan and
  a rename cleared one field on every item; a title tag scheme was mis-stamped
  and went stale at the first reversal; tracking issues that duplicated
  milestones drifted from the live plan. (2026-09-16, ratified by the user's
  request)

### Acceptance

1. `plugins/agent-workflows/skills/program-planning/SKILL.md` validates and its
   templates cover primer, PRD, milestone, issue, and the approval checklist.
2. `ship-stack`, `planout`, `create-github-issue`, and `writing-plans` point at
   the ladder where they touch PR topology or issue minting, without restating
   it.
3. `tests/program-planning-scenarios.md` runs green in a fresh context.
4. `npm run check` and `./scripts/validate.sh` pass after the final mutation.
5. `references/github.md` maps every rung to one GitHub object with its
   commands, and scenarios 13 through 16 in
   `tests/program-planning-scenarios.md` run green in a fresh context.
