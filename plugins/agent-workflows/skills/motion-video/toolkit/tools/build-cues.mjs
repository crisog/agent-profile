import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { BPM, CUE, DURATION_SECONDS, beat } from '../src/timing.js';

function round(seconds) {
  return Math.round(seconds * 100_000) / 100_000;
}

const events = [
  { type: 'hit', t: CUE.titleIn, kind: 'soft' },
  { type: 'hit', t: CUE.hit, kind: 'instant' },
  { type: 'riser', t0: CUE.hit + 0.02, t1: beat(4), intensity: 0.8 },
  { type: 'hit', t: beat(4), kind: 'drop' },
  { type: 'whoosh', t0: CUE.moveStart, t1: CUE.moveEnd, panFrom: -0.8, panTo: 0.8, intensity: 0.8, character: 'zoom' },
  { type: 'riser', t0: beat(19), t1: beat(19.75), intensity: 1 },
  { type: 'hit', t: beat(20), kind: 'big' },
  { type: 'crash', t: beat(20), gain: 1 },
  { type: 'hit', t: beat(28), kind: 'logo' }
];

const cues = {
  bpm: BPM,
  beatsPerBar: 4,
  durationSeconds: DURATION_SECONDS,
  sampleRate: 48_000,
  sections: [
    { name: 'intro', t0: 0, t1: beat(4) },
    { name: 'grooveA', t0: beat(4), t1: beat(19) },
    { name: 'build', t0: beat(19), t1: beat(19.75) },
    { name: 'gap', t0: beat(19.75), t1: beat(20) },
    { name: 'grooveB', t0: beat(20), t1: beat(27) },
    { name: 'break', t0: beat(27), t1: beat(28) },
    { name: 'outro', t0: beat(28), t1: DURATION_SECONDS }
  ].map((section) => ({ ...section, t0: round(section.t0), t1: round(section.t1) })),
  chords: [
    { t0: 0, t1: beat(8), chord: 'Am' },
    { t0: beat(8), t1: beat(12), chord: 'F' },
    { t0: beat(12), t1: beat(16), chord: 'C' },
    { t0: beat(16), t1: beat(20), chord: 'G' },
    { t0: beat(20), t1: beat(24), chord: 'Am' },
    { t0: beat(24), t1: beat(27), chord: 'F' },
    { t0: beat(28), t1: DURATION_SECONDS, chord: 'Cadd9' }
  ].map((chord) => ({ ...chord, t0: round(chord.t0), t1: round(chord.t1) })),
  events: events.map((event) => ({ ...event, ...(event.t === undefined ? { t0: round(event.t0), t1: round(event.t1) } : { t: round(event.t) }) }))
};

const output = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/cues.json');
writeFileSync(output, `${JSON.stringify(cues, null, 2)}\n`);
console.log(JSON.stringify({ output, events: cues.events.length }));
