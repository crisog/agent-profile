export const SAMPLE_RATE = 48_000;
const TWO_PI = Math.PI * 2;

export function samples(seconds) {
  return Math.round(seconds * SAMPLE_RATE);
}

export function createStereo(length) {
  if (!Number.isInteger(length) || length <= 0) {
    throw new Error(`invalid buffer length ${length}`);
  }
  return { left: new Float64Array(length), right: new Float64Array(length), length };
}

export function midiToHz(note) {
  return 440 * 2 ** ((note - 69) / 12);
}

export function dbToGain(db) {
  return 10 ** (db / 20);
}

export function equalPowerPan(pan) {
  const angle = ((Math.max(-1, Math.min(1, pan)) + 1) * Math.PI) / 4;
  return { left: Math.cos(angle), right: Math.sin(angle) };
}

export function mixMono(target, source, { at, gain = 1, pan = 0 }) {
  const start = samples(at);
  const { left, right } = equalPowerPan(pan);
  for (let i = 0; i < source.length; i++) {
    const index = start + i;
    if (index < 0 || index >= target.length) {
      continue;
    }
    target.left[index] += source[i] * gain * left;
    target.right[index] += source[i] * gain * right;
  }
}

export function mixStereo(target, source, { at, gain = 1 }) {
  const start = samples(at);
  for (let i = 0; i < source.length; i++) {
    const index = start + i;
    if (index < 0 || index >= target.length) {
      continue;
    }
    target.left[index] += source.left[i] * gain;
    target.right[index] += source.right[i] * gain;
  }
}

export function addInto(target, source, gain = 1) {
  if (target.length !== source.length) {
    throw new Error(`length mismatch ${target.length} vs ${source.length}`);
  }
  for (let i = 0; i < target.length; i++) {
    target.left[i] += source.left[i] * gain;
    target.right[i] += source.right[i] * gain;
  }
}

export function noiseSource(random) {
  return () => random() * 2 - 1;
}

export function fadeEdges(buffer, { fadeIn = 0.002, fadeOut = 0.004 } = {}) {
  const inCount = Math.min(buffer.length, samples(fadeIn));
  const outCount = Math.min(buffer.length, samples(fadeOut));
  for (let i = 0; i < inCount; i++) {
    buffer[i] *= i / inCount;
  }
  for (let i = 0; i < outCount; i++) {
    buffer[buffer.length - 1 - i] *= i / outCount;
  }
  return buffer;
}

export class Biquad {
  constructor() {
    this.b0 = 1;
    this.b1 = 0;
    this.b2 = 0;
    this.a1 = 0;
    this.a2 = 0;
    this.x1 = 0;
    this.x2 = 0;
    this.y1 = 0;
    this.y2 = 0;
  }

  set(kind, frequency, q = Math.SQRT1_2, gainDb = 0) {
    const f = Math.min(Math.max(frequency, 10), SAMPLE_RATE * 0.45);
    const omega = (TWO_PI * f) / SAMPLE_RATE;
    const cos = Math.cos(omega);
    const alpha = Math.sin(omega) / (2 * q);
    let b0;
    let b1;
    let b2;
    let a0;
    let a1;
    let a2;
    if (kind === 'lowpass') {
      b0 = (1 - cos) / 2;
      b1 = 1 - cos;
      b2 = (1 - cos) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cos;
      a2 = 1 - alpha;
    } else if (kind === 'highpass') {
      b0 = (1 + cos) / 2;
      b1 = -(1 + cos);
      b2 = (1 + cos) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cos;
      a2 = 1 - alpha;
    } else if (kind === 'bandpass') {
      b0 = alpha;
      b1 = 0;
      b2 = -alpha;
      a0 = 1 + alpha;
      a1 = -2 * cos;
      a2 = 1 - alpha;
    } else if (kind === 'peaking') {
      const amplitude = 10 ** (gainDb / 40);
      b0 = 1 + alpha * amplitude;
      b1 = -2 * cos;
      b2 = 1 - alpha * amplitude;
      a0 = 1 + alpha / amplitude;
      a1 = -2 * cos;
      a2 = 1 - alpha / amplitude;
    } else {
      throw new Error(`unknown biquad kind ${kind}`);
    }
    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = a1 / a0;
    this.a2 = a2 / a0;
    return this;
  }

  process(input) {
    const output = this.b0 * input + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = input;
    this.y2 = this.y1;
    this.y1 = output;
    return output;
  }
}

export function filterBuffer(buffer, kind, frequency, q) {
  const filter = new Biquad().set(kind, frequency, q);
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = filter.process(buffer[i]);
  }
  return buffer;
}

export function softClip(value, drive = 1) {
  return Math.tanh(value * drive) / Math.tanh(drive);
}

export function polyBlepSaw(phase, increment) {
  let value = 2 * phase - 1;
  if (phase < increment) {
    const t = phase / increment;
    value -= t + t - t * t - 1;
  } else if (phase > 1 - increment) {
    const t = (phase - 1) / increment;
    value -= t * t + t + t + 1;
  }
  return value;
}

function fftInPlace(real, imag, inverse) {
  const size = real.length;
  for (let i = 1, j = 0; i < size; i++) {
    let bit = size >> 1;
    for (; j & bit; bit >>= 1) {
      j ^= bit;
    }
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }
  for (let length = 2; length <= size; length <<= 1) {
    const angle = ((inverse ? 2 : -2) * Math.PI) / length;
    const stepReal = Math.cos(angle);
    const stepImag = Math.sin(angle);
    for (let start = 0; start < size; start += length) {
      let wReal = 1;
      let wImag = 0;
      for (let k = 0; k < length / 2; k++) {
        const evenIndex = start + k;
        const oddIndex = evenIndex + length / 2;
        const oddReal = real[oddIndex] * wReal - imag[oddIndex] * wImag;
        const oddImag = real[oddIndex] * wImag + imag[oddIndex] * wReal;
        real[oddIndex] = real[evenIndex] - oddReal;
        imag[oddIndex] = imag[evenIndex] - oddImag;
        real[evenIndex] += oddReal;
        imag[evenIndex] += oddImag;
        const nextReal = wReal * stepReal - wImag * stepImag;
        wImag = wReal * stepImag + wImag * stepReal;
        wReal = nextReal;
      }
    }
  }
  if (inverse) {
    for (let i = 0; i < size; i++) {
      real[i] /= size;
      imag[i] /= size;
    }
  }
}

export function convolve(signal, impulse) {
  const outputLength = signal.length + impulse.length - 1;
  let size = 1;
  while (size < outputLength) {
    size <<= 1;
  }
  const signalReal = new Float64Array(size);
  const signalImag = new Float64Array(size);
  const impulseReal = new Float64Array(size);
  const impulseImag = new Float64Array(size);
  signalReal.set(signal);
  impulseReal.set(impulse);
  fftInPlace(signalReal, signalImag, false);
  fftInPlace(impulseReal, impulseImag, false);
  for (let i = 0; i < size; i++) {
    const real = signalReal[i] * impulseReal[i] - signalImag[i] * impulseImag[i];
    const imag = signalReal[i] * impulseImag[i] + signalImag[i] * impulseReal[i];
    signalReal[i] = real;
    signalImag[i] = imag;
  }
  fftInPlace(signalReal, signalImag, true);
  return signalReal.subarray(0, signal.length);
}

export function reverbImpulse({ seconds, preDelay, random, brightness }) {
  const length = samples(seconds);
  const delay = samples(preDelay);
  const impulse = { left: new Float64Array(length + delay), right: new Float64Array(length + delay) };
  const decay = Math.log(1000) / seconds;
  for (const channel of ['left', 'right']) {
    const damping = new Biquad();
    for (let i = 0; i < length; i++) {
      const time = i / SAMPLE_RATE;
      const cutoff = brightness * Math.exp(-time * 2.2) + 700;
      if (i % 64 === 0) {
        damping.set('lowpass', cutoff, 0.6);
      }
      impulse[channel][delay + i] = damping.process((random() * 2 - 1) * Math.exp(-decay * time));
    }
    let energy = 0;
    for (const value of impulse[channel]) {
      energy += value * value;
    }
    const normalize = 1 / Math.sqrt(energy);
    for (let i = 0; i < impulse[channel].length; i++) {
      impulse[channel][i] *= normalize;
    }
  }
  return impulse;
}

export function applyReverb(send, impulse) {
  return { left: convolve(send.left, impulse.left), right: convolve(send.right, impulse.right), length: send.length };
}

export function limit(buffer, { ceiling, lookahead = 0.004, release = 0.08 }) {
  const window = samples(lookahead);
  const releaseCoefficient = Math.exp(-1 / (release * SAMPLE_RATE));
  const required = new Float64Array(buffer.length);
  for (let i = 0; i < buffer.length; i++) {
    const peak = Math.max(Math.abs(buffer.left[i]), Math.abs(buffer.right[i]));
    required[i] = peak > ceiling ? ceiling / peak : 1;
  }
  const minimum = new Float64Array(buffer.length);
  const deque = [];
  for (let i = 0; i < buffer.length + window; i++) {
    if (i < buffer.length) {
      while (deque.length > 0 && required[deque[deque.length - 1]] >= required[i]) {
        deque.pop();
      }
      deque.push(i);
    }
    const outputIndex = i - window;
    if (outputIndex >= 0) {
      while (deque[0] < outputIndex - window) {
        deque.shift();
      }
      minimum[outputIndex] = required[deque[0]];
    }
  }
  let gain = 1;
  let reduction = 0;
  for (let i = 0; i < buffer.length; i++) {
    const target = minimum[i];
    gain = target < gain ? target : target + (gain - target) * releaseCoefficient;
    reduction = Math.max(reduction, 1 - gain);
    buffer.left[i] *= gain;
    buffer.right[i] *= gain;
  }
  return { maxReductionDb: 20 * Math.log10(1 - reduction) };
}

export function integratedLoudness(buffer) {
  const shelf = () => {
    const filter = new Biquad();
    Object.assign(filter, { b0: 1.53512485958697, b1: -2.69169618940638, b2: 1.19839281085285, a1: -1.69065929318241, a2: 0.73248077421585 });
    return filter;
  };
  const highpass = () => {
    const filter = new Biquad();
    Object.assign(filter, { b0: 1, b1: -2, b2: 1, a1: -1.99004745483398, a2: 0.99007225036621 });
    return filter;
  };
  const squares = [];
  for (const channel of [buffer.left, buffer.right]) {
    const first = shelf();
    const second = highpass();
    const weighted = new Float64Array(channel.length);
    for (let i = 0; i < channel.length; i++) {
      const value = second.process(first.process(channel[i]));
      weighted[i] = value * value;
    }
    squares.push(weighted);
  }
  const block = samples(0.4);
  const hop = samples(0.1);
  const powers = [];
  for (let start = 0; start + block <= buffer.length; start += hop) {
    let sum = 0;
    for (const channel of squares) {
      for (let i = start; i < start + block; i++) {
        sum += channel[i];
      }
    }
    powers.push(sum / block);
  }
  const loudness = (power) => -0.691 + 10 * Math.log10(power);
  const absolute = powers.filter((power) => loudness(power) > -70);
  const mean = (list) => list.reduce((total, value) => total + value, 0) / list.length;
  const relativeGate = loudness(mean(absolute)) - 10;
  const gated = absolute.filter((power) => loudness(power) > relativeGate);
  return loudness(mean(gated));
}

export function highpassStereo(buffer, frequency) {
  filterBuffer(buffer.left, 'highpass', frequency, Math.SQRT1_2);
  filterBuffer(buffer.right, 'highpass', frequency, Math.SQRT1_2);
  return buffer;
}
