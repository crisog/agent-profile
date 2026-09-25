import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { seededRandom } from '../src/motion.js';
import { SAMPLE_RATE, addInto, applyReverb, createStereo, dbToGain, highpassStereo, integratedLoudness, limit, reverbImpulse, samples, softClip } from './dsp.mjs';
import { renderMusic } from './music.mjs';
import { renderEffects } from './sfx.mjs';
import { writeWav24 } from './wav.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SEED = 128;
const TARGET_LUFS = -14;
const CEILING = dbToGain(-1.6);
const REVERB_RETURN = 0.32;
const BUS_DRIVE = 1.05;
const LOUDNESS_PASSES = 3;
const FADE_OUT_SECONDS = 0.45;
const FINAL_SILENCE_SECONDS = 0.05;

const cues = JSON.parse(readFileSync(path.join(ROOT, 'src/cues.json'), 'utf8'));
if (cues.sampleRate !== SAMPLE_RATE) {
  throw new Error(`cue sheet sample rate ${cues.sampleRate} does not match ${SAMPLE_RATE}`);
}
const length = samples(cues.durationSeconds);
const random = seededRandom(SEED);

const music = renderMusic({ cues, random, length });
const effects = { sfx: createStereo(length), send: createStereo(length), random, bpm: cues.bpm };
renderEffects(effects, cues.events);

const send = createStereo(length);
addInto(send, music.send);
addInto(send, effects.send);
const reverb = applyReverb(send, reverbImpulse({ seconds: 1.7, preDelay: 0.018, random, brightness: 6000 }));

function rmsDb(buffer) {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer.left[i] ** 2 + buffer.right[i] ** 2;
  }
  return Number((10 * Math.log10(sum / (2 * buffer.length) + 1e-12)).toFixed(1));
}

const stems = { drums: music.drums, bass: music.bass, pad: music.pad, plucks: music.plucks, sfx: effects.sfx, reverb };
console.log(JSON.stringify({ stemRmsDb: Object.fromEntries(Object.entries(stems).map(([name, stem]) => [name, rmsDb(stem)])) }));
const mix = createStereo(length);
for (const stem of [music.drums, music.bass, music.pad, music.plucks, effects.sfx]) {
  addInto(mix, stem);
}
addInto(mix, reverb, REVERB_RETURN);
highpassStereo(mix, 24);
for (let i = 0; i < length; i++) {
  mix.left[i] = softClip(mix.left[i], BUS_DRIVE);
  mix.right[i] = softClip(mix.right[i], BUS_DRIVE);
}

const fadeStart = length - samples(FADE_OUT_SECONDS);
const silenceStart = length - samples(FINAL_SILENCE_SECONDS);
function fadeTail(buffer) {
  for (let i = fadeStart; i < length; i++) {
    const gain = i >= silenceStart ? 0 : Math.exp(-6 * ((i - fadeStart) / (silenceStart - fadeStart)));
    buffer.left[i] *= gain;
    buffer.right[i] *= gain;
  }
}

let loudness = integratedLoudness(mix);
let reductionDb = 0;
for (let pass = 0; pass < LOUDNESS_PASSES; pass++) {
  const gain = dbToGain(TARGET_LUFS - loudness);
  for (let i = 0; i < length; i++) {
    mix.left[i] *= gain;
    mix.right[i] *= gain;
  }
  reductionDb = limit(mix, { ceiling: CEILING }).maxReductionDb;
  fadeTail(mix);
  loudness = integratedLoudness(mix);
}

let peak = 0;
for (let i = 0; i < length; i++) {
  peak = Math.max(peak, Math.abs(mix.left[i]), Math.abs(mix.right[i]));
}
const output = path.join(ROOT, 'out/audio/soundtrack.wav');
mkdirSync(path.dirname(output), { recursive: true });
writeWav24(output, mix);
console.log(JSON.stringify({ output: path.relative(ROOT, output), seconds: length / SAMPLE_RATE, integratedLufs: Number(loudness.toFixed(2)), samplePeakDb: Number((20 * Math.log10(peak)).toFixed(2)), limiterMaxReductionDb: Number(reductionDb.toFixed(2)) }));
