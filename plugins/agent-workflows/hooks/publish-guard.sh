#!/usr/bin/env bash
# PreToolUse hook: publish is the human's. Law (AGENTS.md, "Publish is the
# human's, per-artifact and per-ref"): merging a tracked ref publishes to that
# environment, so the approval must exist before the command runs.
#
# Weakest-valid scope: the shapes that publish, and nothing adjacent.
#   1. `gh pr merge` in any form, and the `gh api .../merge` equivalent.
#   2. `git push` whose target ref is a deploying branch (main/master/dev).
#   3. `git merge` while standing on a deploying branch.
# Named permitted neighbors: proposals and reads (`gh pr create`, `gh pr view`,
# other `gh api` paths), a push of any non-deploying branch — including names
# that merely contain a deploying name — and `git merge --abort/--continue`,
# which resolve a merge rather than publishing one.
#
# The push and merge rules share one deploying-ref set: `master` is a deploying
# ref for a push, so it is one for a merge too.
#
# Fail-open by design: outside a git repo, or on any parse failure, the command
# is allowed — a guard that blocks unrelated work gets disabled.
set -uo pipefail

input="$(cat 2>/dev/null)" || input=""

command=""
if command -v jq >/dev/null 2>&1; then
    command="$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)" || command=""
fi
# jq unavailable or unexpected payload shape: match the raw payload. Coarser,
# but the matcher already restricts this hook to shell tools, and a deny here
# still carries the escape hatch.
[[ -z "$command" ]] && command="$input"

deny() {
    printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"%s"}}\n' "$1"
    exit 0
}

readonly LAW="publishing a tracked ref is the human's; ask, then re-run with MERGE_APPROVED=1"

# Explicit, transcript-visible authorization escape hatch: only on the
# human's order, never self-granted.
if [[ "$command" == *"MERGE_APPROVED=1"* ]]; then
    exit 0
fi

# Shape 1: the merge commands.
if [[ "$command" =~ (^|[^A-Za-z0-9_.-])gh[[:space:]]+pr[[:space:]]+merge ]]; then
    deny "gh pr merge publishes the PR: $LAW."
fi
if [[ "$command" =~ (^|[^A-Za-z0-9_.-])gh[[:space:]]+api ]] \
    && [[ "$command" =~ /merge([^A-Za-z0-9_-]|$) ]]; then
    deny "this gh api call is a merge: $LAW."
fi

is_deploying_ref() {
    case "$1" in
        main | master | dev) return 0 ;;
        *) return 1 ;;
    esac
}

# The destination half of a refspec is what gets published: HEAD:dev -> dev.
refspec_is_deploying() {
    local ref="${1//\"/}"
    ref="${ref//\'/}"
    local dst="${ref##*:}"
    dst="${dst#+}"
    dst="${dst#refs/heads/}"
    is_deploying_ref "$dst"
}

# Only consulted when the command names no explicit ref. Empty outside a repo,
# which fails the guard open.
current_branch() {
    git rev-parse --abbrev-ref HEAD 2>/dev/null || true
}

# Shapes 2 and 3 need the git subcommand and its positional arguments, so the
# command is split into simple commands and each one parsed.
segments="${command//&&/$'\n'}"
segments="${segments//||/$'\n'}"
segments="${segments//;/$'\n'}"
segments="${segments//|/$'\n'}"

while IFS= read -r segment; do
    [[ -z "${segment// /}" ]] && continue
    words=()
    read -ra words <<<"$segment"
    count=${#words[@]}
    [[ $count -eq 0 ]] && continue

    # Skip leading VAR=value assignments, then require `git`.
    first=0
    while [[ $first -lt $count ]] && [[ "${words[$first]}" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; do
        first=$((first + 1))
    done
    [[ $first -ge $count ]] && continue
    [[ "${words[$first]}" != "git" ]] && continue

    # Walk past git's global options to the subcommand; -c/-C and friends take
    # a separate value.
    sub_index=$((first + 1))
    while [[ $sub_index -lt $count ]]; do
        case "${words[$sub_index]}" in
            -c | -C | --git-dir | --work-tree) sub_index=$((sub_index + 2)) ;;
            -*) sub_index=$((sub_index + 1)) ;;
            *) break ;;
        esac
    done
    [[ $sub_index -ge $count ]] && continue

    case "${words[$sub_index]}" in
        push)
            # Positionals after `push` are the remote, then refspecs.
            positional=0
            explicit_refs=0
            for ((i = sub_index + 1; i < count; i++)); do
                case "${words[$i]}" in
                    -*) continue ;;
                esac
                positional=$((positional + 1))
                [[ $positional -eq 1 ]] && continue
                # A bare HEAD names the current branch, not a ref of its own.
                if [[ "${words[$i]}" == "HEAD" ]]; then
                    continue
                fi
                explicit_refs=$((explicit_refs + 1))
                if refspec_is_deploying "${words[$i]}"; then
                    deny "this push targets a deploying ref: $LAW."
                fi
            done
            # No refspec at all (or only HEAD): the current branch is the target.
            if [[ $explicit_refs -eq 0 ]] && is_deploying_ref "$(current_branch)"; then
                deny "this push targets the current branch, a deploying ref: $LAW."
            fi
            ;;
        merge)
            # --abort/--continue/--quit resolve a merge; they publish nothing.
            resolving="no"
            for ((i = sub_index + 1; i < count; i++)); do
                case "${words[$i]}" in
                    --abort | --continue | --quit) resolving="yes" ;;
                esac
            done
            if [[ "$resolving" == "no" ]] && is_deploying_ref "$(current_branch)"; then
                deny "this merges into the current branch, a deploying ref: $LAW."
            fi
            ;;
    esac
done <<<"$segments"

exit 0
