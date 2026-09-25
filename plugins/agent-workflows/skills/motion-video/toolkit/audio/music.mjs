import { Biquad, SAMPLE_RATE, createStereo, mixMono, mixStereo, samples } from './dsp.mjs';
import { bassNote, clap, hat, kick, padChord, pluck, shaker, snare } from './instruments.mjs';

const CHORD_VOICINGS = {
  Am: [57, 60, 64, 69],
  F: [57, 60, 65, 69],
  C: [55, 60, 64, 67],
  G: [55, 59, 62, 67],
  Cadd9: [48, 55, 60, 62, 64, 67, 72]
};
const CHORD_ROOTS = { Am: 33, F: 29, C: 36, G: 31, Cadd9: 36 };
const GROOVES = new Set(['grooveA', 'grooveB']);
const STEPS_PER_BAR = 16;
const DEMBOW_STEPS = new Set([3, 6, 11, 14]);
const BASS_STEPS = [0, 3, 6, 8, 11, 14];
const HAT_STEPS = new Set([2, 6, 10, 14]);
const CLAP_STEPS = new Set([4, 12]);
const SHAKER_ACCENTS = [0.5, 0.25, 1, 0.3];
const PLUCK_MOTIFS = {
  Am: { 0: 76, 3: 81, 6: 79, 8: 76, 11: 74, 14: 72 },
  F: { 0: 77, 3: 81, 6: 79, 8: 77, 11: 76, 14: 72 }
};
const LEVEL = { kick: 0.95, snare: 0.42, clap: 0.3, hat: 0.16, shaker: 0.09, bass: 0.4, pad: 0.34, pluck: 0.55 };
const SEND = { snare: 0.22, clap: 0.35, pad: 0.18, pluck: 0.32 };
const SIDECHAIN = { depth: 0.6, release: 0.13, attack: 0.004, bassDepth: 0.75, bassRelease: 0.08 };
const PLUCK_DELAY = { beats: 0.75, feedback: 0.34, wet: 0.28, damping: 3200 };
const ROLL_HITS = 6;
const OUTRO_SHAKER_BEATS = 3;

export function createTimeline(cues) {
  const beat = 60 / cues.bpm;
  const step = beat / 4;
  const sectionAt = (time) => cues.sections.find((section) => time >= section.t0 - 1e-6 && time < section.t1 - 1e-6)?.name ?? 'end';
  const chordAt = (time) => cues.chords.find((chord) => time >= chord.t0 - 1e-6 && time < chord.t1 - 1e-6)?.chord ?? null;
  const section = (name) => {
    const found = cues.sections.find((entry) => entry.name === name);
    if (!found) {
      throw new Error(`cue sheet has no ${name} section`);
    }
    return found;
  };
  return { beat, step, sectionAt, chordAt, section, totalSteps: Math.round(cues.durationSeconds / step) };
}

function sidechainGain({ length, kickTimes, depth, release }) {
  const gain = new Float64Array(length).fill(1);
  for (const time of kickTimes) {
    const start = samples(time);
    const end = Math.min(length, start + samples(release * 6));
    for (let i = start; i < end; i++) {
      const t = (i - start) / SAMPLE_RATE;
      const duck = Math.min(1, t / SIDECHAIN.attack) * Math.exp(-t / release);
      gain[i] = Math.min(gain[i], 1 - depth * duck);
    }
  }
  return gain;
}

function applyGain(buffer, gain) {
  for (let i = 0; i < buffer.length; i++) {
    buffer.left[i] *= gain[i];
    buffer.right[i] *= gain[i];
  }
}

function pingPongDelay(buffer, { seconds, feedback, wet, damping }) {
  const delay = samples(seconds);
  const out = createStereo(buffer.length);
  const filters = [new Biquad().set('lowpass', damping, 0.7), new Biquad().set('lowpass', damping, 0.7)];
  const lineLeft = new Float64Array(buffer.length);
  const lineRight = new Float64Array(buffer.length);
  for (let i = 0; i < buffer.length; i++) {
    const delayedLeft = i >= delay ? lineRight[i - delay] : 0;
    const delayedRight = i >= delay ? lineLeft[i - delay] : 0;
    lineLeft[i] = filters[0].process(buffer.left[i] + delayedLeft * feedback);
    lineRight[i] = filters[1].process(delayedRight * feedback);
    out.left[i] = buffer.left[i] + delayedLeft * wet;
    out.right[i] = buffer.right[i] + delayedRight * wet;
  }
  return out;
}

function padCutoff(name, introSeconds) {
  if (name === 'intro') {
    return (t) => 650 * (2200 / 650) ** Math.min(1, t / introSeconds);
  }
  if (name === 'outro') {
    return () => 3200;
  }
  if (name === 'grooveB') {
    return () => 2600;
  }
  return () => 2100;
}

export function renderMusic({ cues, random, length }) {
  const timeline = createTimeline(cues);
  const drums = createStereo(length);
  const bass = createStereo(length);
  const pad = createStereo(length);
  const plucks = createStereo(length);
  const send = createStereo(length);
  const kickTimes = [];

  for (let index = 0; index < timeline.totalSteps; index++) {
    const time = index * timeline.step;
    const name = timeline.sectionAt(time);
    const stepInBar = index % STEPS_PER_BAR;
    const chord = timeline.chordAt(time);
    if (GROOVES.has(name)) {
      if (stepInBar % 4 === 0) {
        mixMono(drums, kick({ random }), { at: time, gain: LEVEL.kick });
        kickTimes.push(time);
      }
      if (DEMBOW_STEPS.has(stepInBar)) {
        const hit = snare({ random });
        mixMono(drums, hit, { at: time, gain: LEVEL.snare, pan: 0.05 });
        mixMono(send, hit, { at: time, gain: LEVEL.snare * SEND.snare });
      }
      if (HAT_STEPS.has(stepInBar)) {
        mixMono(drums, hat({ random }), { at: time, gain: LEVEL.hat, pan: 0.25 });
      }
      if (name === 'grooveB' && CLAP_STEPS.has(stepInBar)) {
        const hit = clap({ random });
        mixMono(drums, hit, { at: time, gain: LEVEL.clap, pan: -0.08 });
        mixMono(send, hit, { at: time, gain: LEVEL.clap * SEND.clap });
      }
      mixMono(drums, shaker({ random }), { at: time, gain: LEVEL.shaker * SHAKER_ACCENTS[stepInBar % 4], pan: -0.3 });
      if (chord && BASS_STEPS.includes(stepInBar)) {
        const note = CHORD_ROOTS[chord] + (stepInBar === 14 ? 12 : 0);
        const nextIndex = BASS_STEPS.indexOf(stepInBar) + 1;
        const nextStep = nextIndex < BASS_STEPS.length ? BASS_STEPS[nextIndex] : STEPS_PER_BAR;
        const seconds = (nextStep - stepInBar) * timeline.step * 0.82;
        mixMono(bass, bassNote({ note, seconds }), { at: time, gain: LEVEL.bass });
      }
      const motif = name === 'grooveB' && chord ? PLUCK_MOTIFS[chord] : null;
      if (motif && motif[stepInBar] !== undefined) {
        const note = pluck({ note: motif[stepInBar], random });
        mixMono(plucks, note, { at: time, gain: LEVEL.pluck, pan: stepInBar % 2 === 0 ? -0.15 : 0.15 });
        mixMono(send, note, { at: time, gain: LEVEL.pluck * SEND.pluck });
      }
    } else if (name === 'intro' && index >= 4) {
      const swell = index / 16;
      mixMono(drums, shaker({ random }), { at: time, gain: LEVEL.shaker * SHAKER_ACCENTS[stepInBar % 4] * swell, pan: -0.3 });
    }
  }

  const build = timeline.section('build');
  for (let hit = 0; hit < ROLL_HITS; hit++) {
    const amount = hit / (ROLL_HITS - 1);
    const time = build.t0 + (build.t1 - build.t0) * (1 - (1 - amount) ** 1.4) * ((ROLL_HITS - 1) / ROLL_HITS);
    const roll = snare({ random, pitch: 1 + 0.35 * amount });
    mixMono(drums, roll, { at: time, gain: LEVEL.snare * (0.45 + 0.75 * amount), pan: amount * 0.2 - 0.1 });
    mixMono(send, roll, { at: time, gain: LEVEL.snare * SEND.snare });
  }

  const outro = timeline.section('outro');
  mixMono(drums, kick({ random }), { at: outro.t0, gain: LEVEL.kick });
  for (let index = 0; index < OUTRO_SHAKER_BEATS * 4; index++) {
    const fade = 1 - index / (OUTRO_SHAKER_BEATS * 4);
    mixMono(drums, shaker({ random }), { at: outro.t0 + index * timeline.step, gain: LEVEL.shaker * SHAKER_ACCENTS[index % 4] * fade, pan: -0.3 });
  }

  const gap = timeline.section('gap');
  const breakSection = timeline.section('break');
  for (const chord of cues.chords) {
    const name = timeline.sectionAt(chord.t0);
    let end = chord.t1;
    for (const silence of [gap, breakSection]) {
      if (chord.t0 < silence.t0 && end > silence.t0) {
        end = silence.t0;
      }
    }
    const isOutro = name === 'outro';
    const seconds = isOutro ? Math.min(end - chord.t0, 0.9) : end - chord.t0;
    const release = isOutro ? 0.9 : chord.t1 === end ? 0.25 : 0.06;
    const intro = timeline.section('intro');
    const cutoff = padCutoff(name, intro.t1 - intro.t0);
    const voiced = padChord({
      notes: CHORD_VOICINGS[chord.chord],
      seconds,
      release,
      attack: isOutro ? 0.012 : 0.06,
      cutoffAt: cutoff,
      random
    });
    mixStereo(pad, voiced, { at: chord.t0, gain: LEVEL.pad * (isOutro ? 1.25 : 1) });
    mixStereo(send, voiced, { at: chord.t0, gain: LEVEL.pad * SEND.pad });
  }

  applyGain(pad, sidechainGain({ length, kickTimes, depth: SIDECHAIN.depth, release: SIDECHAIN.release }));
  applyGain(bass, sidechainGain({ length, kickTimes, depth: SIDECHAIN.bassDepth, release: SIDECHAIN.bassRelease }));
  const delayedPlucks = pingPongDelay(plucks, { seconds: PLUCK_DELAY.beats * timeline.beat, feedback: PLUCK_DELAY.feedback, wet: PLUCK_DELAY.wet, damping: PLUCK_DELAY.damping });
  applyGain(delayedPlucks, sidechainGain({ length, kickTimes, depth: SIDECHAIN.depth * 0.6, release: SIDECHAIN.release }));
  return { drums, bass, pad, plucks: delayedPlucks, send, kickTimes };
}
