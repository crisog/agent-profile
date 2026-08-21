# agent-profile

Portable agent runtime profile for Claude Code, Codex CLI, and pi: one
shareable instruction file (`AGENTS.md`) and two installable plugins —
`engineering-practices` (language, tooling, and quality skills) and
`agent-workflows` (reusable workflow skills) — shipped from a single tree
to every runtime.

`./install.sh --fix` wires a host; agents handle everything else, gated by
`./scripts/validate.sh` and `npm run check`.

Private notes do not belong in this repo. Keep them in a local-only
override file outside the repository.
