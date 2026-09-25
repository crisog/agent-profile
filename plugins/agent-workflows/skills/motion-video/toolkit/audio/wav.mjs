import { writeFileSync } from 'node:fs';

import { SAMPLE_RATE } from './dsp.mjs';

const BYTES_PER_SAMPLE = 3;
const CHANNELS = 2;
const FULL_SCALE_24 = 8_388_607;

export function writeWav24(file, buffer) {
  const dataBytes = buffer.length * CHANNELS * BYTES_PER_SAMPLE;
  const out = Buffer.alloc(44 + dataBytes);
  out.write('RIFF', 0);
  out.writeUInt32LE(36 + dataBytes, 4);
  out.write('WAVE', 8);
  out.write('fmt ', 12);
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(CHANNELS, 22);
  out.writeUInt32LE(SAMPLE_RATE, 24);
  out.writeUInt32LE(SAMPLE_RATE * CHANNELS * BYTES_PER_SAMPLE, 28);
  out.writeUInt16LE(CHANNELS * BYTES_PER_SAMPLE, 32);
  out.writeUInt16LE(BYTES_PER_SAMPLE * 8, 34);
  out.write('data', 36);
  out.writeUInt32LE(dataBytes, 40);
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (const channel of [buffer.left, buffer.right]) {
      const value = channel[i];
      if (!Number.isFinite(value)) {
        throw new Error(`non-finite sample at ${i}`);
      }
      const clamped = Math.max(-1, Math.min(1, value));
      out.writeIntLE(Math.round(clamped * FULL_SCALE_24), offset, BYTES_PER_SAMPLE);
      offset += BYTES_PER_SAMPLE;
    }
  }
  writeFileSync(file, out);
}
