---
name: writing-technical-english
description: Use when writing prose someone else acts on, such as a report, a finding, a PR description, a commit message, an issue body, an instruction or prompt for another agent, a tool description, an error message, or a status line; also when asked to simplify, shorten, or make text readable.
---

# Writing technical English

A reader who cannot ask the author must not be able to misread the text. The
rules below come from ASD-STE100, the controlled language written for aircraft
maintenance manuals, cut to what changes agent prose. They remove the two
sources of misreading: a word that carries more than one meaning, and a
sentence that supports more than one structure.

Apply them while writing your own text. Use the rewriting steps for text you
did not write.

## Scope

Use the rules for text a person or an agent acts on: reports, findings,
summaries, PR descriptions, commit messages, code comments, issue bodies,
instructions and prompts handed to another agent, tool descriptions, error
messages, log lines you write, and status updates. Whether you compose or
rewrite, state only what the source or the situation gives you.

Do not use them where voice is the point, such as marketing or persuasion.
When a request to simplify arrives for text of that kind, say the rules do not
apply, fix only a typo or a repeated word, and report any other error instead
of changing it. Quoted text stays as it is: a user, a log, or a document is
quoted exactly, an error inside the quote is noted in the text around it, and
no rule in this skill, in the repository, or in the always-loaded instructions
changes a quotation. The
repository's own style rules and the always-loaded instructions win where they
disagree with this skill, and where one of them is narrower than this skill,
its limit is a floor, not a license.

## Rules

| Rule | Do | Do not |
|---|---|---|
| One meaning per word | Pick one verb per action and reuse it every time | Rotate "check", "verify", and "confirm" for one action |
| One part of speech per word | Use a word as one part of speech within a text: "apply oil to the valve" | The same text also saying "oil the valve" |
| Active voice | "The worker deletes the file." Name the actor the source gives; when it gives none, keep the passive and mark the gap. In your own report you are the actor. | "The file is deleted.", or an actor the source never named |
| Simple tenses | "We received the report." | "We have received the report." |
| One idea per sentence | "Open the file. Read line 3." | "Open the file and read line 3, then check it matches." |
| Sentence length | 20 words or fewer for an instruction, 25 for a description; a text that mixes both takes 20 | Chains of subordinate clauses |
| Noun clusters | 3 words or fewer ("fuel pump valve") | "high pressure fuel pump inlet valve assembly" |
| No missing words | Keep the subject, the verb, and the article: "`reset.sh` deletes every file in `/var/data` when it runs." | "Files not backed up will be lost", which hides which files and who loses them |
| One hedge at most | One hedge in a passage, on the claim about the world: "The client version is probably out of date. Update it." | "An error may have occurred which could be caused by...", or a hedge on the recommendation |
| Paragraphs | One topic, 6 sentences or fewer | Multi-topic paragraphs |
| Lists | A list for two or more conditions, or three or more steps | A sequence buried in one sentence |
| Jargon | Keep the term the reader needs and define it once | An internal name the reader has never seen |
| Risk first | Open with the condition or the command; an error message states the failure, then the cause, then the action the reader takes | A risk buried mid-sentence |

Precision beats brevity. When a shorter sentence would drop a condition, a
scope qualifier, or a number, keep the longer sentence. A condition keeps its
connective: when a sentence with two or more conditions splits, the lead
sentence states the outcome and the relation, such as "both must hold" or
"either is enough", and the conditions follow. A hedge the source puts on a
claim stays; the hedge rule removes stacked hedges on one claim, never honest
uncertainty about several.

## Rewriting

1. Read the text once for meaning before changing anything.
2. Go sentence by sentence and name the rule each one breaks.
3. Rewrite to fix that break. Keep every fact, number, condition, and
   qualifier. Add no fact the source does not contain, and do not raise the
   confidence of a claim; when a rule needs a fact the source lacks, mark the
   gap or ask.
4. Check the result against the rules again; a rewrite often adds a new long
   sentence.

Text that already follows the rules is left as it is, and the answer says so
and names the table rows it checked.

## Self-check

Read the text once against the table, then ask:

- Does any sentence pass its limit, 20 words for an instruction or 25 for a
  description, or carry two instructions?
- Does one action appear under two verbs?
- Does any passive sentence hide an actor the source names?
- Would a reader who joins here, with no context, know what to do next?

## Example

Before:

> It looks like the deploy might have possibly failed due to what appears to be
> a config issue which we should probably look into, having verified the logs
> and checked the manifests, the service isn't coming up, the logs mention
> DATABASE_URL and the manifests don't set it, so we should probably add it and
> redeploy.

After:

> The service does not start after the deploy. The logs name the config key
> `DATABASE_URL`, and the manifests do not set it. We read the logs and the
> manifests. The cause is probably that missing key. The next step is to add
> the key to the manifest and deploy again.

## Provenance

Distilled from the `writing-simplified-technical-english` skill in PostHog's
agent plugin, itself adapted from
[danyuchn/asd-ste100-skill](https://github.com/danyuchn/asd-ste100-skill)
under the MIT license. The standard is
[ASD-STE100](https://www.asd-ste100.org/), Issue 9, 2025. This skill does not
reproduce the approved dictionary and certifies nothing as compliant.
