---
name: web-design-guidelines
description: Use when reviewing UI code against the Web Interface Guidelines, auditing a design or UX, or checking accessibility of a page or component.
argument-hint: [file or glob pattern]
---

# Web Interface Guidelines

Review UI files for compliance with the Web Interface Guidelines.

## Steps

1. Fetch the current guidelines before every review, from
   `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`.
   Use `engineering-practices:web-fetch` when the harness has no fetch tool of
   its own. The fetched document carries the rules and the output format.
2. Read the files named by `$ARGUMENTS`. If none are named, ask the user which
   files to review.
3. Check each file against every rule in the fetched guidelines.
4. Report findings in the terse `file:line` format the guidelines specify, one
   finding per line, with the rule that failed.

A review that could not fetch the guidelines reports that and stops. Stale
remembered rules are not a substitute.
