---
name: motion-video
description: Use when asked to make a motion graphics video, animated promo, showreel, product clip, or any rendered video file built from code, rather than motion inside a running interface.
---

# Motion Video

A code-rendered video is a pure function of time. One timing module drives picture and sound, the renderer samples that function frame by frame, and a verifier plus a readability floor decide when it is done. For motion inside a live interface, use the UI animation skill instead.

## Toolkit

Copy [toolkit/](toolkit/) into a scratch project and run `npm install`. It needs Node, ffmpeg, and a Playwright `chrome-headless-shell` (or `CHROMIUM_PATH`). The demo scene renders, encodes and verifies out of the box.

| File | Job |
| --- | --- |
| `src/timing.js` | size, BPM grid with an optional pickup, `CUE` times, `COPY` lines, `FAST_RANGES`; the single source of timing and size |
| `src/motion.js` | cubic-bezier eases, closed-form springs, sum-of-springs tracks, keyframes, seeded random |
| `src/dom.js`, `src/kinetic.js`, `src/headline.js`, `src/roller.js` | layers, measuring, feathered circle masks, masked letter rolls, multi-line headlines sized to fit, a word roller |
| `src/main.js`, `src/scenes/` | the stage: each scene exposes `render(time)`; the page exposes `window.renderFrame` |
| `tools/still.mjs`, `tools/video-sheet.mjs` | stills and labeled contact sheets, by time or exact frame index |
| `tools/render.mjs` | parallel capture with adaptive motion blur into lossless segments |
| `tools/finalize.mjs`, `tools/verify.mjs` | H.264 delivery encode and the objective floors |
| `tools/readability.mjs` | each `COPY` line's still window, measured from the roll timing against the reading floor |
| `tools/build-cues.mjs`, `audio/` | cue sheet generated from timing, and a dependency-free synth that reads it |
| `tools/study-reference.mjs` | studies an existing video: cuts and shot lengths, 1 fps sheet, 6 fps motion strips, loudness, tempo |

Mechanics and failure modes of each stage are in [pipeline.md](pipeline.md) and [audio.md](audio.md).

## Direction, in order

1. Establish direction in rounds (next section) until the direction tree is settled.
2. Research the product. Read its source and marketing assets for the vector logo, palette tokens, display and UI fonts, mascot and illustrations, its real objects (tickets, cards, maps) with exact strings, its value propositions as marketing states them, and its existing easing curves and keyframes. Recognizability comes from reusing these, not from invented style.
3. Write a short brief: format, the bar, objective floors (spec, readability, loudness), a never-list, and dated decisions. List every UI string on screen with where the product uses it, and name invented data (event names, dates, totals) as illustrative. Decide everything direction left open yourself and record it as a dated decision.
4. Fix format and pace (next section), then pick a tempo whose whole bars fill the duration (128 BPM: 8 bars = 15.000 s). Scene changes land on bar lines and hits land on beats; a two-beat pickup (`BAR_OFFSET_BEATS`) keeps them there when the opener runs a bar and a half. A licensed track reverses this: its measured tempo sets the duration as whole bars (8 bars at 125 BPM is 15.36 s).
5. Storyboard one message per scene. Give the piece a through-line (a mascot, a recurring object, a word roller). Make every scene change a continuity move: one object that transforms through several ideas, a shared element, a morph, an iris through a glyph, a flip, a pan, a whip, a burst. A plain crossfade is a defect. End on the logo, tagline and URL.
6. Build scene by scene. After each scene, render stills and a contact sheet and look at them; after wiring neighbors, render consecutive-frame strips around every seam.
7. Render the final and run the verifier. Build the review artifacts from that verified file, then run one independent review, reproduce and fix its findings, re-verify, deliver.

## Direction rounds

- Direction is a tree. Purpose and audience come first; where it plays (format, length) hangs off them; then the messages and call to action; then tone, style and prior art to match; then music (a licensed track or a synthesized score), copy lines and language. Each answer opens the branches under it.
- Ask in rounds. A round holds every open decision whose prerequisites are settled, numbered, each with your recommended answer and the options when they help. A question that depends on another open question waits for a later round. After each round, recompute what is open and ask again.
- Facts are yours to find, never the user's: brand assets, product strings, value propositions, whether prior art exists in the repo or shared files. Look them up before or while asking; only the questions that depend on a pending lookup wait for it.
- Prior art settles many branches at once. When the brand already owns a video, study it with `tools/study-reference.mjs` (its frames are how you watch) and recommend matching its format, pace, illustration language and sound.
- Decisions are the user's. Direction is settled when nothing is left open and the user confirms it. A request that delegates direction ("go all out", "surprise me") settles the tree up front: record your recommended answers as dated decisions and proceed.

## Format and pace

- Format follows the destination: vertical 9:16 for social feeds and phones, 16:9 for web pages, decks and screens. A brand's own paid spot for social ran 9:16 at about 40 s.
- On 1080x1920, keep key text, including UI labels and numbers inside the picture, between y 250 and y 1500 and 80 px in from the sides. Feed UI covers the rest.
- Feeds replay a video on loop. Decide in direction whether the last frame hands back to the first or the piece ends on a held end card. A loop takes time modulo the duration, includes the previous cycle's springs in every value so the last frame equals the first, and wraps sound tails to the start.
- Budget about 3 s per message and 2-3 s for the end card. That reference carried roughly a dozen messages in 40 s, held text cards 1.5-4 s, and ran its first 23 s as one continuous object journey with no hard cut. A 15-second spot holds about four messages; more than that reads as rushed.
- Lead with the product's value propositions in short, complete sentences ("Los únicos con 0% de comisión sobre tus ventas"). A verb per scene tells a journey but sells nothing. Conversational pairs (a question, then its answer) and word swaps ("Hazlo realidad" becoming "Hazlo Rápido") land a message twice in one beat.
- Simplified product UI beats device mockups: a logo header, a chip rail, one card at a time, big type. Typing a URL or search term letter by letter buys natural reading time.

## Motion law

- Motion is a pure function of time: closed-form springs and physics, seeded randomness, no state carried between frames.
- Reuse the product's easing tokens. Strong ease-out for entrances, ease-in-out for moves, ease-in cubic for exits (a mirrored strong ease-out hangs before it moves), ease-in-out sine for camera drift, springs at bounce 0.1-0.35.
- A held scene never reaches zero velocity; keep a slow drift through holds.
- Nothing moves under text while a viewer reads it; settle the background first.
- Fill the frame. A small object in empty space reads as unfinished.
- Size wipes and floods to the radius that covers the frame, and feather hard edges in proportion to their speed.
- Change a surface's color by flooding the new color from the point of action. Interpolated colors pass through grey, and an opaque shape faded over a contrasting background turns into translucent mud; collapse it into the next shape, slide it, or scale it away.
- A value that moves through several targets is a sum of springs, one per change (`track` in `src/motion.js`). It stays a pure function of time and keeps its velocity when a new target arrives before the last one settles.
- Move a selection or range by its two edges on separate springs, the leading edge stiffer, so it stretches in flight and settles.
- Anticipate on the grid: a press or wind-up starts a fraction of a beat early, so the contact lands on the beat.
- Fast moves get more motion-blur sub-frames (32 on fast ranges, 8 elsewhere); too few samples show as stacked ghost copies.

## Readability floors

The pace serves comprehension. These hold unless the user sets another bar:

- Key copy stays complete, still and unoccluded for at least about 1 s; size holds at roughly 15 characters per second plus 0.3 s. Numbers and UI labels meant to be read count as copy.
- Measure it before any render with `tools/readability.mjs`. A question and its answer each meet their own floor, and together they meet the combined floor.
- The opening line lands early, and the tagline returns on the end card.
- No text sits cut by the frame edge while it is readable; reframe push-ins.
- Busy backgrounds get a scrim behind text, and accent colors keep contrast against every scene.
- The outgoing word exits before a transition sweeps over it.
- When the chosen content does not fit the duration at this pace, show the user the arithmetic and let them choose a longer cut or less content. Never cut reading time.

## Sound

Music is a direction decision: a licensed track measured to a beat grid, or a score synthesized from the cue sheet. Effects always come from the cue sheet, each placed so its peak lands on its frame. Take tempo and energy from the brand's prior art when it exists (the reference sat near 103 BPM: a light first half, a fuller second half, and only a handful of accent hits). Accent the scene changes and key moments, not every event. You cannot hear the result: verify it by measurement and say so in the report. See [audio.md](audio.md).

## Verification and review

- Objective: `tools/verify.mjs` checks container, codec, color tags, frame count, duration, loudness and true peak. Add project checks, such as a logo mask IoU against the reference artwork.
- Visual: stills per scene, contact sheets selected by frame index, seam strips, and 1:1 crops of fast moves and flat backgrounds. Before a full render, a beat sheet (one still late in every beat) shows whether each state lands on the grid.
- Build review artifacts only from the file the verifier just passed, and check that it is newer than your last edit. A review of a stale render spends the round on defects you already fixed.
- Review once. Fresh reviewers get the brief and rendered artifacts only, never source or your reasoning; two reviewers on different model families, in parallel, are enough. Reproduce every finding before fixing it. Ask before paying for another review round.

## Delegation and budget

- Delegate only separable assets with measurable acceptance, such as vectorizing a logo against an IoU target. Keep the timing module and the choreography with the driver.
- A delegated job that writes no files and shows no progress for a long stretch has stalled; stop it and do the work.
- Run renders as background jobs and wait for their completion signal instead of polling.

## Red flags

| Thought | Reality |
| --- | --- |
| "The words appear, so they are readable" | Measure the still, complete window of every line against the floor |
| "A crossfade is fine here" | Find the shared element or shape that carries the viewer across |
| "8 blur samples everywhere" | Fast moves ghost; sample adaptively |
| "The review said X, fix it" | Reproduce X on the frame first; some reported issues are measurement artifacts |
| "The logo is navy, so threshold the alpha" | Sample the reference pixels; marks can carry white fills |
| "One more review round to be safe" | The user pays for it; verify objectively and ask first |
| "16:9 is the default" | Pick format from where it plays; phones and feeds are 9:16 |
| "Eight scenes in fifteen seconds shows range" | About 3 s per message; cut scenes, not reading time |
| "Type and UI carry the brand" | Use the mascot, the illustrations and motifs drawn from the logo |
| "Fade it out" | A fade over a contrasting background goes muddy; collapse, slide or flood |
| "The verdict says pass" | Check which tool printed it and that its file is newer than your last edit |
| "Trim the holds so the picks fit" | Show the arithmetic; the user chooses a longer cut or fewer messages |
