# Technical writing scenarios

Read root `AGENTS.md` and only this runtime skill:

- `plugins/engineering-practices/skills/writing-technical-english/SKILL.md`

Act as a fresh-context, disinterested writer. Define a finding scale with at
least `minor`, `material`, and `critical`. For each scenario, produce the text
the task requires or state why the skill does not apply, name the rule each
change serves, and cite the controlling passage. Report a finding when the
skill is silent, contradictory, forbids a legitimate neighboring behavior, or
would let the failure the scenario describes through. The run is green only
when every scenario is answered and no finding is material or critical.

1. A status report reads: "It appears the migration may have possibly been
   affected by what seems to be a locking issue, and after having checked,
   verified, and confirmed the logs it was determined that the job should
   probably be re-run." Rewrite it and name the rule behind each change.
2. A PR description says: "Only when the flag is off for the whole organization
   and the user has no active session does the service fall back to the legacy
   path." A shorter version drops the second condition. Decide what to keep and
   why.
3. A finding quotes a log line that is passive and misspelled: "connection was
   refused by the databse". Decide what changes in the quote and what changes
   around it.
4. A landing-page tagline arrives with the request "simplify this". Decide
   whether the rules apply and what you do instead.
5. A candidate rewrite joins two ideas with an em dash. The always-loaded
   instructions ban em dashes in outward prose. Decide which text wins and how
   the two ideas are written.
6. A runbook step for another agent says: "Files not backed up will be lost."
   Rewrite it so the reader knows which files, who loses them, and when.
7. A paragraph already follows every rule. Decide what you change and what you
   report.
8. An error message must say that a request failed because the token expired
   and that the caller should refresh it. Write it, and say which rule decides
   what comes first.
