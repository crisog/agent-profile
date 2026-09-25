import { SAMPLE_RATE, equalPowerPan, midiToHz, mixMono, samples, softClip } from './dsp.mjs';
import { bell, blip, boom, clap, kick, noiseBurst, noiseSweep } from './instruments.mjs';

const TWO_PI = Math.PI * 2;
const WHOOSH = {
  zoom: { fromHz: 500, toHz: 2400, q: 1.4, peak: 0.72, gain: 0.34, flutterHz: 0 },
  flip: { fromHz: 900, toHz: 3200, q: 1.8, peak: 0.6, gain: 0.3, flutterHz: 26 },
  down: { fromHz: 4200, toHz: 350, q: 1.2, peak: 0.55, gain: 0.3, flutterHz: 0 },
  whip: { fromHz: 1400, toHz: 6500, q: 1.6, peak: 0.62, gain: 0.36, flutterHz: 0 },
  air: { fromHz: 2200, toHz: 5200, q: 1.2, peak: 0.5, gain: 0.16, flutterHz: 0 }
};
const WHOOSH_TAIL_SECONDS = 0.18;
const CONFETTI_GRAINS = 170;
const SPARKLE_GRAINS = 14;
const CHORD_STAB = [72, 76, 79, 86];

function mixMovingPan(target, source, { at, gain, panFrom, panTo, panAt }) {
  const start = samples(at);
  for (let i = 0; i < source.length; i++) {
    const index = start + i;
    if (index < 0 || index >= target.length) {
      continue;
    }
    const p = i / source.length;
    const pan = panAt ? panAt(p) : panFrom + (panTo - panFrom) * p;
    const { left, right } = equalPowerPan(pan);
    target.left[index] += source[i] * gain * left;
    target.right[index] += source[i] * gain * right;
  }
}

function sineGlide({ seconds, fromHz, toHz, envelope, vibrato = () => 0 }) {
  const out = new Float64Array(samples(seconds));
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const p = i / out.length;
    const frequency = fromHz * (toHz / fromHz) ** p * (1 + vibrato(p, i / SAMPLE_RATE));
    phase += (TWO_PI * frequency) / SAMPLE_RATE;
    out[i] = Math.sin(phase) * envelope(p);
  }
  return out;
}

function stereoNoise(context, options, { at, gain }) {
  mixMono(context.sfx, noiseSweep({ ...options, random: context.random }), { at, gain, pan: -0.85 });
  mixMono(context.sfx, noiseSweep({ ...options, random: context.random }), { at, gain, pan: 0.85 });
}

function hit(context, { t, kind }) {
  const { random, sfx, send } = context;
  if (kind === 'soft') {
    mixMono(sfx, boom({ from: 72, to: 52, glide: 0.05, seconds: 0.5, random, noiseAmount: 0.2 }), { at: t, gain: 0.8 });
    mixMono(sfx, noiseBurst({ seconds: 0.03, kind: 'highpass', frequency: 3000, q: 0.7, decay: 0.003, random }), { at: t, gain: 0.15 });
    return;
  }
  if (kind === 'instant') {
    const snap = clap({ random });
    mixMono(sfx, snap, { at: t, gain: 0.85 });
    mixMono(send, snap, { at: t, gain: 0.25 });
    mixMono(sfx, boom({ from: 62, to: 40, glide: 0.06, seconds: 0.7, random, noiseAmount: 0.3, noiseCutoff: 300 }), { at: t, gain: 1 });
    for (const [frequency, decay, level] of [[2600, 0.4, 0.3], [3915, 0.25, 0.17], [5410, 0.15, 0.09]]) {
      const ping = blip({ frequency, seconds: decay * 3, decay });
      mixMono(sfx, ping, { at: t, gain: level, pan: 0.1 });
      mixMono(send, ping, { at: t, gain: level * 0.5 });
    }
    mixMono(sfx, noiseBurst({ seconds: 0.06, kind: 'highpass', frequency: 4000, q: 0.7, decay: 0.015, random }), { at: t, gain: 0.2 });
    return;
  }
  if (kind === 'drop') {
    mixMono(sfx, kick({ random }), { at: t, gain: 0.7 });
    mixMono(sfx, boom({ from: 55, to: 34, glide: 0.08, seconds: 1.1, random, noiseAmount: 0.5, noiseCutoff: 400 }), { at: t, gain: 0.75 });
    return;
  }
  if (kind === 'big') {
    mixMono(sfx, kick({ random }), { at: t, gain: 0.8 });
    mixMono(sfx, boom({ from: 58, to: 32, glide: 0.1, seconds: 1.5, random, noiseAmount: 0.7, noiseCutoff: 900 }), { at: t, gain: 0.95 });
    const blast = noiseBurst({ seconds: 0.9, kind: 'lowpass', frequency: 2500, q: 0.7, decay: 0.22, random });
    mixMono(sfx, blast, { at: t, gain: 0.35, pan: -0.2 });
    mixMono(sfx, noiseBurst({ seconds: 0.9, kind: 'lowpass', frequency: 2500, q: 0.7, decay: 0.22, random }), { at: t, gain: 0.35, pan: 0.2 });
    mixMono(send, blast, { at: t, gain: 0.3 });
    return;
  }
  if (kind === 'logo') {
    mixMono(sfx, boom({ from: 60, to: 33, glide: 0.1, seconds: 1.8, random, noiseAmount: 0.5, noiseCutoff: 600 }), { at: t, gain: 0.9 });
    CHORD_STAB.forEach((note, index) => {
      const tone = bell({ frequency: midiToHz(note), seconds: 2.2, brightness: 0.9 });
      mixMono(sfx, tone, { at: t + index * 0.004, gain: 0.085, pan: index % 2 === 0 ? -0.25 : 0.25 });
      mixMono(send, tone, { at: t, gain: 0.07 });
    });
    return;
  }
  throw new Error(`unknown hit kind ${kind}`);
}

function riser(context, { t0, t1, intensity }) {
  const seconds = t1 - t0;
  stereoNoise(context, { seconds, fromHz: 300, toHz: 6000, q: 2.5, envelope: (p) => p ** 2.2 }, { at: t0, gain: 0.3 * intensity });
  mixMono(context.sfx, sineGlide({ seconds, fromHz: 200, toHz: 1600, envelope: (p) => p ** 2 * (p > 0.98 ? (1 - p) / 0.02 : 1) }), { at: t0, gain: 0.06 * intensity });
}

function whoosh(context, { t0, t1, panFrom, panTo, intensity, character }) {
  const spec = WHOOSH[character];
  if (!spec) {
    throw new Error(`unknown whoosh character ${character}`);
  }
  const window = t1 - t0;
  const seconds = window + WHOOSH_TAIL_SECONDS;
  const peakAt = (window * spec.peak) / seconds;
  const envelope = (p) => (p < peakAt ? (p / peakAt) ** 2 : Math.exp(-((p - peakAt) * seconds) / 0.07));
  const sound = noiseSweep({ seconds, fromHz: spec.fromHz, toHz: spec.toHz, q: spec.q, envelope, random: context.random, flutterHz: spec.flutterHz });
  mixMovingPan(context.sfx, sound, { at: t0, gain: spec.gain * intensity, panFrom, panTo });
  mixMono(context.send, sound, { at: t0, gain: spec.gain * intensity * 0.15 });
}

function crash(context, { t, gain }) {
  for (const pan of [-0.5, 0.5]) {
    const wash = noiseBurst({ seconds: 1.8, kind: 'highpass', frequency: 3500, q: 0.6, decay: 0.42, random: context.random });
    mixMono(context.sfx, wash, { at: t, gain: 0.2 * gain, pan });
    mixMono(context.send, wash, { at: t, gain: 0.08 * gain });
  }
}

function tick(context, { t, gain, pitch }) {
  if (pitch === 'wheel') {
    mixMono(context.sfx, noiseBurst({ seconds: 0.05, kind: 'bandpass', frequency: 1250, q: 5, decay: 0.012, random: context.random }), { at: t, gain: 0.5 * gain, pan: 0.15 });
    mixMono(context.sfx, blip({ frequency: 1800, seconds: 0.02, decay: 0.005 }), { at: t, gain: 0.08 * gain, pan: 0.15 });
    return;
  }
  if (pitch === 'counter') {
    mixMono(context.sfx, noiseBurst({ seconds: 0.02, kind: 'bandpass', frequency: 4200, q: 4, decay: 0.004, random: context.random }), { at: t, gain: 0.3 * gain, pan: 0.2 });
    return;
  }
  throw new Error(`unknown tick pitch ${pitch}`);
}

function tap(context, { t }) {
  mixMono(context.sfx, blip({ frequency: 620, fromRatio: 1.45, seconds: 0.05, decay: 0.018 }), { at: t, gain: 0.3 });
  mixMono(context.sfx, noiseBurst({ seconds: 0.01, kind: 'highpass', frequency: 5000, q: 0.7, decay: 0.001, random: context.random }), { at: t, gain: 0.08 });
}

function pop(context, { t, note, gain }) {
  const sound = blip({ frequency: midiToHz(note), fromRatio: 1.5, seconds: 0.12, decay: 0.035 });
  mixMono(context.sfx, sound, { at: t, gain: 0.3 * gain, pan: (context.random() - 0.5) * 0.6 });
  mixMono(context.send, sound, { at: t, gain: 0.05 * gain });
}

function processing(context, { t0, t1 }) {
  const step = 60 / context.bpm / 4;
  for (let time = t0; time < t1 - 0.02; time += step) {
    mixMono(context.sfx, noiseBurst({ seconds: 0.02, kind: 'bandpass', frequency: 3000, q: 3, decay: 0.006, random: context.random }), { at: time, gain: 0.1 });
  }
}

function chime(context, { t }) {
  [[88, 0, -0.2], [93, 0.09, 0.2]].forEach(([note, delay, pan]) => {
    const tone = bell({ frequency: midiToHz(note), seconds: 1.1, brightness: 0.6 });
    mixMono(context.sfx, tone, { at: t + delay, gain: 0.13, pan });
    mixMono(context.send, tone, { at: t + delay, gain: 0.07 });
  });
}

function paper(context, { t0, t1 }) {
  const seconds = t1 - t0 + 0.08;
  const sound = noiseSweep({ seconds, fromHz: 1200, toHz: 4200, q: 1.3, envelope: (p) => p ** 1.5 * (p > 0.9 ? (1 - p) / 0.1 : 1), random: context.random, flutterHz: 32 });
  mixMono(context.sfx, sound, { at: t0, gain: 0.22, pan: 0.1 });
}

function scannerBlip(context, { t }) {
  mixMono(context.sfx, blip({ frequency: 1250, seconds: 0.05, shape: 'square', decay: 0.02 }), { at: t, gain: 0.08 });
}

function laser(context, { t0, t1 }) {
  const sound = sineGlide({ seconds: t1 - t0, fromHz: 600, toHz: 1400, envelope: (p) => Math.min(1, p / 0.1) * Math.min(1, (1 - p) / 0.1), vibrato: (_, time) => 0.01 * Math.sin(TWO_PI * 7 * time) });
  mixMono(context.sfx, sound, { at: t0, gain: 0.05 });
}

function beep(context, { t }) {
  const seconds = 0.13;
  const out = new Float64Array(samples(seconds));
  for (let i = 0; i < out.length; i++) {
    const time = i / SAMPLE_RATE;
    const envelope = Math.min(1, time / 0.004) * Math.min(1, (seconds - time) / 0.008);
    out[i] = softClip(Math.sin(TWO_PI * 2350 * time) + 0.25 * Math.sign(Math.sin(TWO_PI * 2350 * time)), 1.4) * envelope;
  }
  mixMono(context.sfx, out, { at: t, gain: 0.2 });
  mixMono(context.send, out, { at: t, gain: 0.04 });
}

function confetti(context, { t0, t1 }) {
  const span = t1 - t0;
  for (let grain = 0; grain < CONFETTI_GRAINS; grain++) {
    const offset = span * context.random() ** 2.2;
    const sound = blip({ frequency: 4000 + context.random() * 5500, seconds: 0.012, decay: 0.004 });
    mixMono(context.sfx, sound, { at: t0 + offset, gain: 0.06 * (1 - offset / span), pan: (context.random() - 0.5) * 1.6 });
  }
}

function stamp(context, { t }) {
  const { random, sfx, send } = context;
  mixMono(sfx, boom({ from: 95, to: 58, glide: 0.02, seconds: 0.3, random, noiseAmount: 0.6, noiseCutoff: 1500 }), { at: t, gain: 0.85 });
  const slap = noiseBurst({ seconds: 0.12, kind: 'bandpass', frequency: 1600, q: 0.9, decay: 0.035, random });
  mixMono(sfx, slap, { at: t, gain: 0.5 });
  mixMono(send, slap, { at: t, gain: 0.25 });
  mixMono(sfx, noiseBurst({ seconds: 0.15, kind: 'lowpass', frequency: 500, q: 0.7, decay: 0.05, random }), { at: t, gain: 0.4 });
}

function comet(context, { t0, t1 }) {
  const seconds = t1 - t0 + 0.04;
  const loopPan = (p) => (p < 0.35 ? 0.6 - 1.4 * (p / 0.35) : -0.8 + 1.1 * Math.sin(Math.PI * ((p - 0.35) / 0.65)));
  const rush = noiseSweep({ seconds, fromHz: 700, toHz: 5200, q: 1.6, envelope: (p) => p ** 1.6, random: context.random });
  mixMovingPan(context.sfx, rush, { at: t0, gain: 0.3, panAt: loopPan });
  const sing = sineGlide({ seconds, fromHz: 300, toHz: 1400, envelope: (p) => p ** 1.5, vibrato: (p, time) => (p > 0.35 ? 0.08 * Math.sin(TWO_PI * 5 * time) : 0) });
  mixMovingPan(context.sfx, sing, { at: t0, gain: 0.06, panAt: loopPan });
  const glint = bell({ frequency: 3520, seconds: 0.6, brightness: 0.8 });
  mixMono(context.sfx, glint, { at: t1, gain: 0.08, pan: -0.3 });
  mixMono(context.send, glint, { at: t1, gain: 0.06 });
}

function sparkle(context, { t }) {
  for (let grain = 0; grain < SPARKLE_GRAINS; grain++) {
    const sound = blip({ frequency: 3000 + context.random() * 5000, seconds: 0.08, decay: 0.022 });
    const at = t + context.random() * 0.4;
    const pan = (context.random() - 0.5) * 1.2;
    mixMono(context.sfx, sound, { at, gain: 0.05, pan });
    mixMono(context.send, sound, { at, gain: 0.04 });
  }
}

const RENDERERS = { hit, riser, whoosh, crash, tick, tap, pop, processing, chime, paper, blip: scannerBlip, laser, beep, confetti, stamp, comet, sparkle };

export function renderEffects(context, events) {
  for (const event of events) {
    const renderer = RENDERERS[event.type];
    if (!renderer) {
      throw new Error(`unknown cue type ${event.type}`);
    }
    renderer(context, event);
  }
}
