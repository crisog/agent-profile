import { Biquad, SAMPLE_RATE, fadeEdges, midiToHz, polyBlepSaw, samples, softClip } from './dsp.mjs';

const TWO_PI = Math.PI * 2;
const PAD_DETUNE_SEMITONES = [-0.13, -0.06, 0, 0.06, 0.13];
const PAD_VOICE_PANS = [-0.7, -0.35, 0, 0.35, 0.7];

function mono(seconds) {
  return new Float64Array(samples(seconds));
}

export function kick({ random }) {
  const out = mono(0.46);
  const click = new Biquad().set('highpass', 2500, 0.7);
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SAMPLE_RATE;
    const frequency = 47 + 108 * Math.exp(-t / 0.032);
    phase += (TWO_PI * frequency) / SAMPLE_RATE;
    const body = Math.sin(phase) * Math.exp(-t / 0.3) * Math.min(1, t / 0.0008);
    const transient = click.process(random() * 2 - 1) * Math.exp(-t / 0.0025) * 0.3;
    out[i] = softClip(body * 1.1 + transient, 1.6);
  }
  return fadeEdges(out, { fadeIn: 0, fadeOut: 0.02 });
}

export function snare({ random, pitch = 1 }) {
  const out = mono(0.22);
  const band = new Biquad().set('bandpass', 3400 * pitch, 0.9);
  const high = new Biquad().set('highpass', 1200, 0.7);
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SAMPLE_RATE;
    phase += (TWO_PI * (215 - 30 * Math.min(1, t / 0.03)) * pitch) / SAMPLE_RATE;
    const tone = Math.sin(phase) * Math.exp(-t / 0.045) * 0.55;
    const snap = Math.sin(TWO_PI * 1850 * pitch * t) * Math.exp(-t / 0.012) * 0.25;
    const noise = high.process(band.process(random() * 2 - 1)) * Math.exp(-t / 0.075) * 1.6;
    out[i] = (tone + snap + noise) * Math.min(1, t / 0.0005);
  }
  return fadeEdges(out, { fadeIn: 0, fadeOut: 0.01 });
}

export function clap({ random }) {
  const out = mono(0.32);
  const band = new Biquad().set('bandpass', 1500, 1.1);
  const bursts = [0, 0.011, 0.022];
  for (let i = 0; i < out.length; i++) {
    const t = i / SAMPLE_RATE;
    let envelope = 0;
    for (const offset of bursts) {
      if (t >= offset) {
        envelope = Math.max(envelope, Math.exp(-(t - offset) / 0.006));
      }
    }
    if (t >= bursts[2]) {
      envelope = Math.max(envelope, 0.6 * Math.exp(-(t - bursts[2]) / 0.09));
    }
    out[i] = band.process(random() * 2 - 1) * envelope * 2.2;
  }
  return fadeEdges(out, { fadeIn: 0, fadeOut: 0.02 });
}

export function hat({ random, decay = 0.035 }) {
  const out = mono(decay * 5);
  const high = new Biquad().set('highpass', 7200, 0.7);
  const metal = [3130, 4210, 5420, 6810, 8150, 9580];
  for (let i = 0; i < out.length; i++) {
    const t = i / SAMPLE_RATE;
    let ring = 0;
    for (const frequency of metal) {
      ring += Math.sign(Math.sin(TWO_PI * frequency * t));
    }
    const source = (random() * 2 - 1) * 0.8 + (ring / metal.length) * 0.35;
    out[i] = high.process(source) * Math.exp(-t / decay);
  }
  return fadeEdges(out, { fadeIn: 0.0005, fadeOut: 0.005 });
}

export function shaker({ random }) {
  const out = mono(0.09);
  const band = new Biquad().set('bandpass', 7000, 1.2);
  for (let i = 0; i < out.length; i++) {
    const t = i / SAMPLE_RATE;
    const envelope = Math.min(1, t / 0.004) * Math.exp(-t / 0.028);
    out[i] = band.process(random() * 2 - 1) * envelope * 1.8;
  }
  return fadeEdges(out);
}

export function bassNote({ note, seconds }) {
  const frequency = midiToHz(note);
  const out = mono(seconds + 0.05);
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SAMPLE_RATE;
    phase += (TWO_PI * frequency) / SAMPLE_RATE;
    const envelope = Math.min(1, t / 0.004) * (t < seconds ? 1 : Math.exp(-(t - seconds) / 0.012));
    const value = Math.sin(phase) + 0.2 * Math.sin(2 * phase) + 0.07 * Math.sin(3 * phase);
    out[i] = softClip(value * 0.9, 1.4) * envelope;
  }
  return fadeEdges(out, { fadeIn: 0, fadeOut: 0.004 });
}

export function padChord({ notes, seconds, release = 0.3, attack = 0.06, cutoffAt, random }) {
  const length = samples(seconds + release);
  const left = new Float64Array(length);
  const right = new Float64Array(length);
  const voices = [];
  for (const note of notes) {
    PAD_DETUNE_SEMITONES.forEach((detune, index) => {
      const pan = PAD_VOICE_PANS[index];
      const angle = ((pan + 1) * Math.PI) / 4;
      voices.push({ increment: midiToHz(note + detune) / SAMPLE_RATE, phase: random(), leftGain: Math.cos(angle), rightGain: Math.sin(angle) });
    });
  }
  const filters = [new Biquad(), new Biquad()];
  const normalize = 1 / Math.sqrt(voices.length);
  for (let i = 0; i < length; i++) {
    const t = i / SAMPLE_RATE;
    if (i % 32 === 0) {
      const cutoff = cutoffAt(t);
      filters[0].set('lowpass', cutoff, 0.8);
      filters[1].set('lowpass', cutoff, 0.8);
    }
    let sumLeft = 0;
    let sumRight = 0;
    for (const voice of voices) {
      voice.phase += voice.increment;
      if (voice.phase >= 1) {
        voice.phase -= 1;
      }
      const value = polyBlepSaw(voice.phase, voice.increment);
      sumLeft += value * voice.leftGain;
      sumRight += value * voice.rightGain;
    }
    const envelope = Math.min(1, t / attack) * (t < seconds ? 1 : Math.exp(-(t - seconds) / (release / 3)));
    left[i] = filters[0].process(sumLeft * normalize) * envelope;
    right[i] = filters[1].process(sumRight * normalize) * envelope;
  }
  fadeEdges(left, { fadeIn: 0, fadeOut: 0.01 });
  fadeEdges(right, { fadeIn: 0, fadeOut: 0.01 });
  return { left, right, length };
}

export function pluck({ note, random }) {
  const out = mono(0.5);
  const frequency = midiToHz(note);
  const increments = [midiToHz(note - 0.06) / SAMPLE_RATE, midiToHz(note + 0.06) / SAMPLE_RATE];
  const phases = [random(), random()];
  const filter = new Biquad();
  for (let i = 0; i < out.length; i++) {
    const t = i / SAMPLE_RATE;
    if (i % 16 === 0) {
      filter.set('lowpass', 900 + 4400 * Math.exp(-t / 0.09), 1.3);
    }
    let value = 0;
    phases.forEach((phase, index) => {
      const next = phase + increments[index];
      phases[index] = next >= 1 ? next - 1 : next;
      value += polyBlepSaw(phases[index], increments[index]);
    });
    value += 0.3 * Math.sin(TWO_PI * frequency * 0.5 * t);
    out[i] = filter.process(value * 0.5) * Math.min(1, t / 0.002) * Math.exp(-t / 0.2);
  }
  return fadeEdges(out, { fadeIn: 0, fadeOut: 0.02 });
}

export function bell({ frequency, seconds = 1.6, brightness = 2.2 }) {
  const out = mono(seconds);
  const ratio = 3.5;
  for (let i = 0; i < out.length; i++) {
    const t = i / SAMPLE_RATE;
    const index = brightness * Math.exp(-t / 0.3);
    const modulator = Math.sin(TWO_PI * frequency * ratio * t) * index;
    const carrier = Math.sin(TWO_PI * frequency * t + modulator);
    const partial = 0.25 * Math.sin(TWO_PI * frequency * 2 * t) * Math.exp(-t / (seconds * 0.15));
    out[i] = (carrier + partial) * Math.min(1, t / 0.002) * Math.exp(-t / (seconds * 0.3));
  }
  return fadeEdges(out, { fadeIn: 0, fadeOut: 0.05 });
}

export function boom({ from, to, glide, seconds, random, noiseAmount = 0.4, noiseCutoff = 500 }) {
  const out = mono(seconds);
  const low = new Biquad().set('lowpass', noiseCutoff, 0.7);
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SAMPLE_RATE;
    const frequency = to + (from - to) * Math.exp(-t / glide);
    phase += (TWO_PI * frequency) / SAMPLE_RATE;
    const body = Math.sin(phase) * Math.exp(-t / (seconds * 0.35));
    const rumble = low.process(random() * 2 - 1) * noiseAmount * Math.exp(-t / (seconds * 0.12));
    out[i] = softClip((body + rumble) * Math.min(1, t / 0.001), 1.3);
  }
  return fadeEdges(out, { fadeIn: 0, fadeOut: 0.08 });
}

export function noiseSweep({ seconds, fromHz, toHz, q, envelope, random, flutterHz = 0 }) {
  const out = mono(seconds);
  const band = new Biquad();
  for (let i = 0; i < out.length; i++) {
    const p = i / out.length;
    if (i % 16 === 0) {
      band.set('bandpass', fromHz * (toHz / fromHz) ** p, q);
    }
    const flutter = flutterHz > 0 ? 0.65 + 0.35 * Math.sin(TWO_PI * flutterHz * (i / SAMPLE_RATE)) : 1;
    out[i] = band.process(random() * 2 - 1) * envelope(p) * flutter * 2.5;
  }
  return fadeEdges(out, { fadeIn: 0.003, fadeOut: 0.01 });
}

export function blip({ frequency, seconds, fromRatio = 1, shape = 'sine', decay = seconds / 3 }) {
  const out = mono(seconds);
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SAMPLE_RATE;
    const current = frequency * (1 + (fromRatio - 1) * Math.exp(-t / 0.012));
    phase += (TWO_PI * current) / SAMPLE_RATE;
    const wave = shape === 'square' ? Math.tanh(4 * Math.sin(phase)) : Math.sin(phase);
    out[i] = wave * Math.min(1, t / 0.0015) * Math.exp(-t / decay);
  }
  return fadeEdges(out, { fadeIn: 0, fadeOut: 0.006 });
}

export function noiseBurst({ seconds, kind, frequency, q, decay, random }) {
  const out = mono(seconds);
  const filter = new Biquad().set(kind, frequency, q);
  for (let i = 0; i < out.length; i++) {
    const t = i / SAMPLE_RATE;
    out[i] = filter.process(random() * 2 - 1) * Math.exp(-t / decay);
  }
  return fadeEdges(out, { fadeIn: 0.0005, fadeOut: 0.004 });
}
