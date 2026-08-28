---
name: ship
description: Commit staged/unstaged changes and push to the remote branch
disable-model-invocation: true
---

Commit all current changes and push them to the remote.

## Steps

1. Run `git status` (never use `-uall`) and `git diff` to see what changed.
2. Draft a commit message following the Conventional Commits spec below.
3. Stage all modified and untracked files relevant to the change (prefer naming files explicitly over `git add -A`). Never stage `.env` files or secrets.
4. Commit using a HEREDOC for the message:
   ```
   git commit -m "$(cat <<'EOF'
   <message>
   EOF
   )"
   ```
5. Push to the current branch: `git push`. If no upstream is set, use `git push -u origin HEAD`.
6. Show the final `git status` to confirm everything is clean.
7. Print the commit message that was used.

## Conventional Commits Format

```
<type>(<optional scope>): <description>

<optional body>

<optional footer>
```

### Types

| Type       | Purpose                                            |
| ---------- | -------------------------------------------------- |
| `feat`     | Add, adjust, or remove a feature                   |
| `fix`      | Fix a bug                                          |
| `refactor` | Rewrite/restructure code without changing behavior |
| `perf`     | Performance improvement                            |
| `style`    | Formatting, whitespace — no behavior change        |
| `test`     | Add or correct tests                               |
| `docs`     | Documentation only                                 |
| `build`    | Build system, dependencies, project version        |
| `ops`      | Deployment, CI/CD, infrastructure                  |
| `chore`    | Misc tasks (.gitignore, initial commit, etc.)      |

### Description Rules

- Use imperative, present tense ("add" not "added" or "adds")
- Think: "This commit will …"
- Do not capitalize the first letter
- Do not end with a period

### Scope

Optional noun in parentheses after type, e.g. `fix(auth):`. Use project-specific scopes, not issue IDs.

### Breaking Changes

Append `!` before the colon: `feat(api)!: remove endpoint`. Add a `BREAKING CHANGE:` footer with details.

### Body & Footer

- Body: optional, explains motivation and contrasts with previous behavior.
- Footer: reference issues (`Closes #123`), breaking change details.

## Rules

- If there are no changes to commit, say so and stop.
- If a pre-commit hook fails, fix the issue and create a NEW commit (never amend).
