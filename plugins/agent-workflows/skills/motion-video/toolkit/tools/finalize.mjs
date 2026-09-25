import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { DURATION_SECONDS, FPS } from '../src/timing.js';
import { PROJECT_ROOT } from './stage.mjs';

const { values } = parseArgs({
  options: {
    video: { type: 'string', default: 'out/master.mkv' },
    audio: { type: 'string', default: 'out/audio/soundtrack.wav' },
    out: { type: 'string', default: 'out/video.mp4' },
    crf: { type: 'string', default: '16' },
    grain: { type: 'string', default: '2' }
  }
});

const video = path.resolve(PROJECT_ROOT, values.video);
const audio = path.resolve(PROJECT_ROOT, values.audio);
const output = path.resolve(PROJECT_ROOT, values.out);
for (const file of [video, audio]) {
  if (!existsSync(file)) {
    throw new Error(`missing input ${path.relative(PROJECT_ROOT, file)}`);
  }
}

const filters = [
  `setpts=N/(${FPS}*TB)`,
  'scale=out_color_matrix=bt709:out_range=tv',
  'format=yuv420p',
  'setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv',
  Number(values.grain) > 0 ? `noise=c0s=${values.grain}:c0f=t+u` : null
].filter(Boolean);

const args = [
  '-v', 'error', '-y',
  '-i', video,
  '-i', audio,
  '-map', '0:v:0', '-map', '1:a:0',
  '-vf', filters.join(','),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', values.crf, '-profile:v', 'high', '-pix_fmt', 'yuv420p',
  '-x264-params', 'aq-mode=3:colorprim=bt709:transfer=bt709:colormatrix=bt709',
  '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
  '-c:a', 'aac', '-b:a', '256k', '-ar', '48000',
  '-t', String(DURATION_SECONDS),
  '-movflags', '+faststart', '-tag:v', 'avc1',
  output
];
const result = spawnSync('ffmpeg', args, { stdio: 'inherit' });
if (result.status !== 0) {
  throw new Error(`ffmpeg exited ${result.status}`);
}
console.log(JSON.stringify({ status: 'done', output: path.relative(PROJECT_ROOT, output) }));
