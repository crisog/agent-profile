# agent-profile

Portable agent runtime profile for Claude Code, Codex CLI, and pi: one
shareable instruction file and a marketplace of installable plugins, shipped
from a single tree to every runtime. `./install.sh --fix` wires a host;
agents handle installation and updates from there.

## Layout

- `AGENTS.md` — the canonical user-level instruction file. `~/.claude/CLAUDE.md`
  and `~/.codex/AGENTS.md` are symlinks to it.
- `plugins/engineering-practices` — language, tooling, and quality skills.
- `plugins/agent-workflows` — reusable workflow skills.
- `extensions/pi-hooks.ts` — pi-native equivalents of the plugins' Claude/Codex
  hooks. The repo doubles as an installable [pi](https://pi.dev) package:
  `package.json` exposes both plugins' skills, and the extension execs the
  canonical hook scripts in `plugins/agent-workflows/hooks/` with the same
  stdin/JSON contract Claude and Codex use, so hook policy has a single source
  of truth. Hooks fail open: script errors and timeouts never block a tool
  call or session start.

Private notes do not belong in this repo. Use `~/.codex/AGENTS.override.md`,
`~/.claude/CLAUDE.local.md`, or another local-only file outside this repository.

## Development

```bash
npm install
npm run check          # tsc --noEmit + vitest
./scripts/validate.sh  # parity + skill + pi package gates
pi -e extensions/pi-hooks.ts   # load the pi extension without installing
```

The root `package.json` version is independent of the per-plugin manifest
versions managed under Releasing.

## Releasing

Each plugin is versioned independently; the `version` field in its manifest is
the single source of truth. `scripts/validate.sh` enforces 3-way parity across
`plugins/<name>/.claude-plugin/plugin.json`, `plugins/<name>/.codex-plugin/plugin.json`,
and the plugin's entry in `.claude-plugin/marketplace.json` — `name`/`version`/`description`
must match. The root `marketplace.json` (Codex-style) carries no versions.

Semver, per plugin:

- `MAJOR` — breaking change to a skill's contract (a skill removed/renamed, or its
  invocation/behavior changed in a way callers depend on).
- `MINOR` — a new skill, or a new backward-compatible capability/section.
- `PATCH` — clarifications, fixes, or wording changes to existing guidance.

Release steps:

1. Bump `version` in all three manifests for the plugin (keep them identical).
2. Commit: `chore(release): <plugin> vX.Y.Z`.
3. Tag the release commit, namespaced per plugin:
   `git tag -a <plugin>-vX.Y.Z -m "<plugin> vX.Y.Z — <summary>"`.
4. Push commits and the tag.

Tags mirror the manifest version and are human-facing markers only — plugins
install by name from the marketplace, which reads the manifest, not git tags.
