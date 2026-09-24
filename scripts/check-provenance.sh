#!/usr/bin/env bash
# Reports drift between a pinned provenance snapshot and the source's current
# main. Network-bound and on demand: never wired into validate.sh. Exit 0 when
# the source still matches the snapshot, 1 on drift (diff printed), 2 on a
# fetch failure.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PIN="${1:-$ROOT/tests/provenance/ponytail.pin}"

[ -f "$PIN" ] || { echo "no pin file at $PIN" >&2; exit 2; }
repo=""; path=""; commit=""; version=""; snapshot=""
while IFS='=' read -r key value; do
  case "$key" in
    repo) repo="$value" ;;
    path) path="$value" ;;
    commit) commit="$value" ;;
    version) version="$value" ;;
    snapshot) snapshot="$value" ;;
  esac
done < "$PIN"
[ -n "$repo" ] && [ -n "$path" ] && [ -n "$snapshot" ] || { echo "pin is missing repo, path, or snapshot" >&2; exit 2; }
[ -f "$ROOT/$snapshot" ] || { echo "snapshot missing: $snapshot" >&2; exit 2; }

current="$(mktemp)"; trap 'rm -f "$current"' EXIT
url="https://raw.githubusercontent.com/$repo/main/$path"
curl -fsSL "$url" -o "$current" || { echo "fetch failed: $url" >&2; exit 2; }

if diff -q "$ROOT/$snapshot" "$current" >/dev/null; then
  echo "provenance ok: $repo/$path unchanged since ${commit:0:12} (v$version)"
  exit 0
fi

echo "provenance drift: $repo/$path changed since ${commit:0:12} (v$version)"
echo "review the diff, re-distill what changes a decision, then refresh the snapshot and pin:"
diff -u "$ROOT/$snapshot" "$current" || true
exit 1
