# SPEC — engineering-practices doctrine

The engineering-practices plugin turns reusable engineering judgment into
portable skills. Blanket testing and code-health rules lose important context:
parameterized cases can hide distinct behaviors, mocks can replace higher-fidelity
contracts, happy-path-only E2E can miss critical failures, and absolute style rules
can forbid clear code. The solution is a compact distillate of settled
engineering guidance that preserves strong rules while naming the tradeoffs
and exceptions that change an agent's decision.

## Domain model

- A **skill contract** is the behavior implied by a skill's trigger and body.
- A **testing strategy** selects test scope and doubles by the contract being
  proven and the speed, maintainability, utilization, reliability, and fidelity
  tradeoffs.
- **Code law** is reusable craft judgment whose violations are caught by a
  harness or behavior-first gate; unrecoverable boundary law remains in
  `AGENTS.md`.
- A **scenario oracle** gives a fresh-context task runner fixed engineering
  choices and observes whether the skills produce the intended judgment without
  access to the author's reasoning.
- An **agent-operable surface** exposes a public inspect/plan/apply/verify loop
  whose effects and evidence remain safe, resumable, and attributable without
  prose scraping or private implementation access.

## Requirements

- **REQ-DOCTRINE-001 — Testing strategy:** `testing-best-practices` chooses test
  scope by explicit quality tradeoffs, favors the highest-fidelity practical
  dependency, and distinguishes homogeneous table cases from behaviorally
  distinct tests.
- **REQ-DOCTRINE-002 — Test integrity:** testing guidance requires actionable
  scenario/outcome tests, literal and discriminating expectations, narrow
  assertions, observed red for new tests, and deliberate red while refactoring
  test code.
- **REQ-DOCTRINE-003 — End-to-end scope:** E2E guidance covers important user
  workflows and important error classes while keeping the suite small; hermetic
  runs prefer ephemeral state and shared environments require idempotent,
  state-tolerant flows.
- **REQ-DOCTRINE-004 — Code structure:** `code-law` governs cognitive load,
  hard-to-misuse interfaces, safe defaults, narrow failure regions, precise
  naming and comments, and evidence-based abstraction.
- **REQ-DOCTRINE-005 — Portability and parsimony:** both skills remain
  harness-agnostic, self-contained, and concise; `eng-wiki` is provenance rather
  than a runtime dependency.
- **REQ-DOCTRINE-006 — Verification:** fixed scenarios are observed red against
  the prior skills and pass a fresh-context task run after the revision; the
  repository's mechanical gates remain green.
- **REQ-DOCTRINE-007 — Risk-driven QA:** test planning starts from public
  contracts and material product risks, maps them to the cheapest faithful
  evidence, treats coverage as a gap-discovery clue, and does not require a
  matrix per function or a ceremonial entry in every test layer.
- **REQ-DOCTRINE-008 — Causal diagnosis and seams:** retry outcome alone never
  classifies a flake; the owner of nondeterminism is located. Runtime test
  backdoors remain forbidden while explicit dependency injection,
  package-scoped seams, stable automation IDs, and behaviorally conformant fakes
  remain legitimate.
- **REQ-DOCTRINE-009 — Applicable law and incremental change:** code properties
  apply where their failure modes exist; configurable choices are distinguished
  from fixed invariants; plans include post-green refactoring and an independently
  green prefactor unit when existing structure fights the behavior change.
- **REQ-DOCTRINE-010 — Agent operability:** `agent-operability` defines the
  stable output, explicit targeting, precondition, retry, async-operation,
  authority, secret-channel, and evidence mechanics needed to operate a CLI,
  API, or control plane through its public surface.
- **REQ-DOCTRINE-011 — Evidence identity:** testing guidance binds results to
  source and dirty state, built artifact, target environment, and verifier task;
  affected downstream evidence becomes stale after a mutation while unchanged
  identity remains reusable.
- **REQ-DOCTRINE-012 — Destructive examples:** routine host and OrbStack
  guidance never treats volume deletion or factory reset as an inferred
  escalation; data-bearing targets require a separate inventory and explicit
  authorization.
- **REQ-DOCTRINE-013 — Trigger contracts:** every skill description starts with
  `Use when...`; portable provenance metadata remains legal when every target
  harness and repository validation accept it.
- **REQ-DOCTRINE-014 — Minimal construction:** `code-law` orders construction
  choices after the problem is understood — omit, reuse, standard library,
  platform, installed dependency, one line, minimum — governs how requested
  behavior is built rather than whether it is built, never cuts trust-boundary
  validation, data-loss handling, security, accessibility, or hardware
  calibration for size, records a deliberate ceiling as a harvestable waiver,
  and reports skipped rungs with the evidence that would add them.
- **REQ-DOCTRINE-015 — Complexity pass:** `code-review` offers a bounded review
  scoped to unnecessary complexity with a fixed finding vocabulary, a severity
  floor tied to the construction ladder, a line-count terminal, and no
  application of fixes; the minimal runnable check is never a finding.

- **REQ-DOCTRINE-016 — Technical prose:** `writing-technical-english` governs
  prose someone else acts on: one meaning per word, active voice, simple
  tenses, one idea per sentence, bounded sentence length, no dropped subject
  or article, at most one hedge, and the risk or command first. Precision
  outranks brevity, quoted text and voice-led copy are out of scope, and the
  repository's style rules and always-loaded instructions win on conflict.
  `AGENTS.md` names it for outward prose and code comments, and the skills
  that write commit bodies, code comments, review comments, PR bodies, and
  issue bodies name it at the point of writing.
- **REQ-DOCTRINE-017 — Human reader:** `code-law` names the reader as a human
  maintainer without the authoring conversation, sets the bar at prose-like
  readability with reviewer struggle as a code defect, and forbids task,
  conversation, history, or reasoning artifacts in names, comments, or
  structure.
- **REQ-DOCTRINE-018 — Bounds and assertions:** `code-law` requires a named
  bound on every input decided at design time, capacities derived from those
  bounds with exceedance handled as an operating error, assertions that stay
  on in production with the crash boundary at the smallest restartable unit
  sharing no mutable state, and branches that account for their complement.
- **REQ-DOCTRINE-019 — Checker placement:** checkable craft rules are enforced
  through the toolchain's own configuration or custom-rule engine; rules with
  no such checker are review-list items and recurring review comments are
  uplifted into the project style document; bespoke craft-rule checker scripts
  are not introduced, while the repository's own harness gates and provenance
  diffs remain legitimate.

## Invariants

- `AGENTS.md` continues to own only unrecoverable or always-loaded law.
- Tests assert observable contracts; call-sequence assertions remain valid only
  when the interaction is itself the contract.
- Guidance states the weakest rule that excludes the demonstrated failures and
  preserves named legitimate behavior.
- Coverage percentage is never completion evidence, and intermittent behavior is
  never classified solely from retry history.
- Skill names remain stable, descriptions are trigger-shaped, and discovery
  behavior remains portable.
- Release actions occur only under explicit per-artifact authorization.

## Non-goals

- Rewriting language-specific or workflow skills.
- Copying or citing private local paths from the wiki into runtime instructions.
- Building an LLM-backed test runner into the deterministic repository harness.
- Making the runtime skills depend on a reachable wiki checkout or service.

## Decisions

- Testing and code law form one campaign because the selected scope is the
  combined eng-wiki doctrine distillate. (2026-08-29, ratified)
- Existing skills are revised in place for mechanics they already own;
  agent-operability has one dedicated runtime skill. (2026-09-03, ratified;
  supersedes the 2026-08-29 no-new-skill decision on new field evidence)
- Behavioral scenario execution complements, rather than enters, the
  deterministic `npm` and validation gates. (2026-08-29, ratified)
- A new skill is a backward-compatible capability and releases as a minor
  version; publication still requires per-artifact authorization. (2026-09-03,
  ratified)
- The construction ladder and complexity pass are distilled from
  [Ponytail](https://github.com/DietrichGebert/ponytail) into the skills that
  already own construction and review judgment; the Ponytail plugin is not
  installed alongside, because its per-prompt injection duplicates always-loaded
  law, its intensity modes add mutable session state, and its ship-the-lazy-
  version stance conflicts with the no-shallow-requested-work law. The
  distilled ruleset is pinned at Ponytail 4.9.0, commit `974d940a1c53`, as
  `tests/provenance/ponytail-AGENTS.md`; `scripts/check-provenance.sh` diffs
  the source's current ruleset against that snapshot on demand and at each
  upstream sync, and a drift that changes a decision is re-distilled, never
  copied. (2026-09-04, ratified)

- `writing-technical-english` is distilled from the
  `writing-simplified-technical-english` skill of PostHog's agent plugin at
  version 1.1.63 (itself MIT, from danyuchn/asd-ste100-skill) rather than
  installed alongside, because that copy carries PostHog's house style and
  a reference file it does not ship, and the repository's prose law must win
  on conflict. The distinct name lets both coexist on a host without two
  behaviors under one name. (2026-09-16, ratified by the user's request)

- Assertions are never compiled out for production; what varies per system
  is the crash boundary, and the precondition for any boundary smaller than
  the process is state isolation. (2026-09-10, ratified 2026-09-17; from the
  eng-wiki TigerStyle/matklad ingest)
- Checkers for craft rules come from the toolchain's rule engine and
  configuration, never from hand-written scripts; a rule the toolchain cannot
  check is applied at review. Bespoke craft-rule scripts became change
  detectors and token sinks in practice. The repository's own harness gates and
  the Ponytail provenance diff check repository contracts rather than craft
  rules, so they are outside this decision. (2026-09-10, ratified 2026-09-17)

## Acceptance criteria

- [x] Fixed baseline scenarios reproduce every named guidance defect against the
      pre-change skills.
- [x] Revised testing guidance satisfies REQ-DOCTRINE-001 through
      REQ-DOCTRINE-003 without contradicting its hard rules.
- [x] Revised code law satisfies REQ-DOCTRINE-004 without duplicating `AGENTS.md`.
- [x] A fresh-context scenario runner reports no material-or-higher finding.
- [x] `npm run check` passes.
- [x] `./scripts/validate.sh` passes.
- [x] Fresh-context scenario execution covers REQ-DOCTRINE-007 through
      REQ-DOCTRINE-009 with no material-or-higher finding.
- [x] `tests/agentic-engineering-scenarios.md` covers REQ-DOCTRINE-010 through
      REQ-DOCTRINE-013 with no material-or-higher finding in fresh context.
- [x] Routine host cleanup and OrbStack troubleshooting contain no implicit
      data-deletion path.
- [x] The description-shape gate passes for every shipped skill.
- [x] Scenarios 11 through 14 in `tests/engineering-practices-scenarios.md`
      are observed red against the prior skills and green after the revision,
      covering REQ-DOCTRINE-014 and REQ-DOCTRINE-015 with no material-or-higher
      finding in fresh context.
- [x] `tests/technical-writing-scenarios.md` covers REQ-DOCTRINE-016 with no
      material-or-higher finding in fresh context.
- [x] Scenarios 15 and 16 in `tests/engineering-practices-scenarios.md` cover
      REQ-DOCTRINE-017 through REQ-DOCTRINE-019 with no material-or-higher
      finding in fresh context.

## Test traceability

- REQ-DOCTRINE-001 through REQ-DOCTRINE-005 — fixed behavioral cases in
  `tests/engineering-practices-scenarios.md`, independently approved with no
  findings.
- REQ-DOCTRINE-006 through REQ-DOCTRINE-009 — `npm run check`,
  `./scripts/validate.sh`, and the fixed scenario oracle.
- REQ-DOCTRINE-010 through REQ-DOCTRINE-013 —
  `tests/agentic-engineering-scenarios.md`, `./scripts/validate.sh`, and the
  fresh-context scenario oracle.
- REQ-DOCTRINE-014 and REQ-DOCTRINE-015 — scenarios 11 through 14 in
  `tests/engineering-practices-scenarios.md`, `./scripts/validate.sh`, and the
  fresh-context scenario oracle.
- Ponytail provenance — `tests/provenance/ponytail.pin` and
  `scripts/check-provenance.sh` (network-bound, on demand; not a validate gate).
- REQ-DOCTRINE-016 — `tests/technical-writing-scenarios.md`,
  `./scripts/validate.sh`, and the fresh-context scenario oracle.
- REQ-DOCTRINE-017 through REQ-DOCTRINE-019 — scenarios 15 and 16 in
  `tests/engineering-practices-scenarios.md`, `./scripts/validate.sh`, and the
  fresh-context scenario oracle.
