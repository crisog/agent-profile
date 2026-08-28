#!/usr/bin/env bash
# PreToolUse hook: keep secret values out of the transcript. Law (AGENTS.md,
# "Secrets never enter the loop"): all chat and tool traffic is persisted, so a
# secret in argv, in a printed file, or in an environment dump is already
# leaked the moment the tool call is logged.
#
# Weakest-valid scope: three observed shapes only.
#   1. A secret literal in argv: the fixed vendor key formats, plus a 64-hex
#      value only where a key-shaped flag or assignment names it.
#   2. A reader command applied to a secret-bearing file.
#   3. A whole-environment dump, or a secret manager asked to print a value.
# Named permitted neighbors that must keep working: env templates
# (.env.example/.sample/.local.template) and .envrc; ls/stat/test on env files;
# direnv; `env`/`printenv`/`set` with arguments; `op read ... | cmd` and
# `op run -- cmd`, which hand the value to a consumer instead of the transcript.
#
# Fail-open by design: this is a habit floor, not a sandbox; a parse failure
# must never block unrelated commands.
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

readonly HATCH="If the human explicitly ordered this, re-run the command prefixed with SECRET_GUARD_APPROVED=1 to record the authorization."
readonly FIX="Pipe the value from the secret manager into the consumer on stdin (op read ... | cmd, or op run -- cmd), or use the already-loaded environment variable by name without printing it."

# Explicit, transcript-visible authorization escape hatch: only on the
# human's order, never self-granted.
if [[ "$command" == *"SECRET_GUARD_APPROVED=1"* ]]; then
    exit 0
fi

# Shape 1: a secret literal anywhere in the command. Fixed vendor formats only
# — an entropy heuristic would deny hashes, SHAs, and base64 payloads.
literals=(
    '(^|[^A-Za-z0-9_-])sk-ant-'
    '(^|[^A-Za-z0-9_-])sk-[A-Za-z0-9_-]{20,}'
    'ghp_[A-Za-z0-9]{36}'
    'github_pat_'
    'AKIA[0-9A-Z]{16}'
    'xox[abprs]-[A-Za-z0-9-]{10,}'
    '-----BEGIN [A-Z ]*PRIVATE KEY-----'
    'eyJ[A-Za-z0-9_-]{10,}\.eyJ'
)
for pattern in "${literals[@]}"; do
    if [[ "$command" =~ $pattern ]]; then
        deny "this command carries a secret literal in argv, and every tool call is persisted. $FIX $HATCH"
    fi
done

# A 64-hex value is a secret only where a key-shaped flag or assignment puts it.
# Lowercased first so the assignment names match in either case.
lowered="$(printf '%s' "$command" | tr '[:upper:]' '[:lower:]')"
# Quoting the value hides none of it, so the quotes come off before matching.
lowered="${lowered//\"/}"
lowered="${lowered//\'/}"
key_flag_pattern='(^|[[:space:]])(--private-key|--pk|-k)[[:space:]=]+(0x)?[0-9a-f]{64}([^0-9a-f]|$)'
key_assign_pattern='(^|[^a-z0-9_])[a-z0-9_]*(private_key|priv_key|secret|mnemonic|seed)[a-z0-9_]*=(0x)?[0-9a-f]{64}([^0-9a-f]|$)'
if [[ "$lowered" =~ $key_flag_pattern ]] || [[ "$lowered" =~ $key_assign_pattern ]]; then
    deny "this command carries a private key in argv, and every tool call is persisted. $FIX $HATCH"
fi

# Shape 3a: a secret manager asked to print a value. `op read` writes the
# secret to stdout, so it is safe only when piped into a consumer; `op run`
# never prints one.
op_segments="${command//&&/$'\n'}"
op_segments="${op_segments//||/$'\n'}"
op_segments="${op_segments//;/$'\n'}"
while IFS= read -r op_segment; do
    if [[ "$op_segment" =~ (^|[^A-Za-z0-9_.-])op[[:space:]]+read[[:space:]] ]] \
        && [[ ! "$op_segment" =~ op[[:space:]]+read[^|]*\| ]]; then
        deny "a bare op read prints the secret into the transcript. $FIX $HATCH"
    fi
done <<<"$op_segments"
if [[ "$command" =~ (^|[^A-Za-z0-9_.-])op[[:space:]]+item[[:space:]]+get[^|]*--reveal ]]; then
    deny "op item get --reveal prints the secret into the transcript. $FIX $HATCH"
fi

# A secret-bearing path, judged on the basename so directories never matter.
is_secret_path() {
    local token base
    token="${1//\"/}"
    token="${token//\'/}"
    base="${token##*/}"
    case "$base" in
        # Templates and samples carry placeholders, not values.
        *.example | *.sample | *.template) return 1 ;;
        *.pem | .npmrc | .netrc | id_rsa | id_ed25519) return 0 ;;
    esac
    # Any file whose name ends in .env, with an optional suffix: .env,
    # prod.env, .env.local. Not .envrc, which direnv owns, and not env.ts,
    # which has no dot before env.
    [[ "$base" =~ \.env(\.[A-Za-z0-9_-]+)?$ ]]
}

# Shapes 2 and 3b are per-simple-command: the command word decides whether the
# rest of the segment is being read into the transcript. Splitting on shell
# separators keeps `cat .env | grep KEY` a deny and `git log | head` an allow.
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

    # Skip leading VAR=value assignments so `FOO=1 cat .env` is still a `cat`.
    first=0
    while [[ $first -lt $count ]] && [[ "${words[$first]}" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; do
        first=$((first + 1))
    done
    [[ $first -ge $count ]] && continue
    argc=$((count - first - 1))

    case "${words[$first]}" in
        # Shape 3b: a bare environment dump. With arguments these print no
        # secret: `env FOO=1 cmd`, `printenv PATH`, `set -euo pipefail`.
        env | printenv | set)
            if [[ $argc -eq 0 ]]; then
                deny "dumping the environment puts every loaded secret into the transcript. Name the single variable you need without printing its value. $HATCH"
            fi
            ;;
        # Shape 2: a reader applied to a secret-bearing file.
        cat | less | more | head | tail | bat | grep | sed | awk | source | .)
            for ((i = first + 1; i < count; i++)); do
                if is_secret_path "${words[$i]}"; then
                    deny "this command prints a secret-bearing file into the transcript. $FIX $HATCH"
                fi
            done
            ;;
    esac
done <<<"$segments"

exit 0
