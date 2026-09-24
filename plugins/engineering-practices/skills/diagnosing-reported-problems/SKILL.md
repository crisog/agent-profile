---
name: diagnosing-reported-problems
description: Use when diagnosing a failure known only through someone's report — a forum or support question, a bug report, an incident ticket, a teammate's account — where the failing system cannot be observed directly and any reproduction is a model of it, not the system itself.
---

# Diagnosing Reported Problems

Direct debugging converges by observing the real system. Here every
conclusion routes through two lossy artifacts: the reporter's account and
your reproduction of it. Both mislead in characteristic ways, and each law
below closes one of those ways.

- **The report is a hypothesis, not the problem statement.** The reporter
  hands you facts wrapped in a frame ("my replication is broken"). Take the
  facts; treat the frame as one candidate branch. The strongest anchoring is
  the frame you never noticed adopting.

- **Enumerate the cause space from the mechanism.** A symptom names the
  check that failed, never the cause; most checks have several inputs that
  can fail them. Read the code or spec that emits the symptom and list every
  such input. That list is the differential; the diagnosis picks from it by
  elimination, not by first match.

- **Reproduction proves sufficiency, never necessity.** Reproducing the
  symptom shows a candidate cause *can* produce it, not that it did. Run the
  discriminating matrix to completion, varying every axis — the system's
  state and the input driving it — instead of stopping at the first branch
  that matches. Stopping early is premature closure with lab notes.

- **Contradicting evidence is the most valuable line in the report.** Every
  reporter observation gets incorporated or explicitly challenged. Evidence
  against the favored theory is never silently explained away; surface it as
  a fork: "if that query really shows X, this theory is dead and the next
  suspect is Y."

- **Cross layers before committing.** The load-bearing fact usually lives
  one layer away from the reported one. Ask for the artifact that generates
  the requirement — the exact command, the schema, the template, the
  config — before naming a cause at the layer the reporter chose.

- **Answer as a decision tree, not a verdict.** Cheapest discriminating
  checks first; candidate causes ranked behind them; every cause with all
  its exits, including the exit that removes the requirement instead of
  satisfying it. Calls that depend on the reporter's intent are surfaced as
  forks, never made for them.

- **Assume staleness.** An async report describes a past state, and the
  reporter may have moved on before the answer lands. Decision trees survive
  staleness; verdicts don't.

## Worked example

A reporter's multi-party submission failed with an error meaning "no node
may act for every required party," framed as a replication problem. A
reproduction of broken replication matched the symptom exactly — including a
secondary asymmetry the reporter had observed — and the answer committed to
it. The real cause sat one layer up: their record type required every party
to co-sign at creation, so no single node could ever hold the full set. The
fix was demoting parties that needed visibility but not authority.

The one-shot answer was writable from the same evidence: the failed check
has exactly two exits (make one node host every required party, or shrink
the required set), and one question — "what does the failing command
actually require?" — discriminates between them. The verdict-shaped answer
cost a round trip and was wrong about the history; the tree-shaped answer
would have been right under every history.

## Red flags

- The answer commits to one cause while the symptom's cause space has
  several live candidates.
- A reporter observation appears nowhere in the answer, neither used nor
  challenged.
- The repro matrix only varied the axis the reporter's frame pointed at.
- A fix is named at one layer without having seen the input that layer
  receives from the one above.
- Confidence rose after the repro by more than the repro's logic justifies.
