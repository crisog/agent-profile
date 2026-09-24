#!/usr/bin/env python3
"""Check that the runtime instruction catalog is populated and locally linked."""

import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parent.parent


def main() -> int:
    errors: list[str] = []
    skill_roots = sorted(ROOT.glob("plugins/*/skills"))
    if not skill_roots:
        errors.append("no plugins/*/skills directory found")
    runtime_docs = [ROOT / "AGENTS.md", ROOT / "README.md"]
    for skill_root in skill_roots:
        skills = sorted(skill_root.glob("*/SKILL.md"))
        if not skills:
            errors.append(f"empty skill catalog: {skill_root.relative_to(ROOT)}")
        runtime_docs.extend(
            sorted(
                path
                for path in skill_root.rglob("*.md")
                if "node_modules" not in path.parts
            )
        )

    for path in runtime_docs:
        text = path.read_text(encoding="utf-8")
        rel = path.relative_to(ROOT)
        # External URLs, anchors, and illustrative template placeholders are not
        # shipped local dependencies. Check actual Markdown link destinations.
        for match in re.finditer(r"\]\(([^\s)]+)(?:\s+\"[^\"]*\")?\)", text):
            target = match.group(1).strip("<>")
            url = urlsplit(target)
            if url.scheme or url.netloc or not url.path or "<" in target:
                continue
            if url.path.startswith(("/", "~")):
                continue
            if not (path.parent / unquote(url.path)).exists():
                errors.append(f"{rel}: broken local link: {target}")

    if errors:
        print("instruction catalog check FAILED:", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        return 1
    print(f"instruction catalog ok: {len(runtime_docs)} documents")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
