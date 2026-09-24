# agent-profile

Portable agent runtime profile for Claude Code and Codex CLI: one
shareable instruction file (`AGENTS.md`) and one installable plugin,
`agent-profile`, carrying the engineering-practice and workflow skills and
the PreToolUse guard hooks.

`./install.sh --fix` wires a host; agents handle everything else, gated by
`./scripts/validate.sh` and `npm run check`.

Private notes do not belong in this repo. Keep them in a local-only
override file outside the repository.


---

Originally derived from [alleneubank/agent-profile](https://github.com/alleneubank/agent-profile).
