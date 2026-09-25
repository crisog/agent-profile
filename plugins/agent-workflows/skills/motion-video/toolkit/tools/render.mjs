import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { DURATION_SECONDS, FAST_RANGES, FPS, HEIGHT, WIDTH } from '../src/timing.js';
import { PROJECT_ROOT, launchBrowser, openStage, startServer } from './stage.mjs';

const STATUS_INTERVAL_MS = 5_000;
const MAX_WORKERS = 14;
const MAX_SAMPLES = 48;
const CHUNK_FRAMES_MAX = 40;
const TIME_EPSILON = 1e-6;

const { values } = parseArgs({
  options: {
    scale: { type: 'string', default: '2' },
    samples: { type: 'string', default: '8' },
    'fast-samples': { type: 'string', default: '32' },
    shutter: { type: 'string', default: '180' },
    workers: { type: 'string', default: '10' },
    from: { type: 'string', default: '0' },
    to: { type: 'string', default: String(DURATION_SECONDS) },
    out: { type: 'string', default: 'out/master.mkv' }
  }
});

const scale = Number(values.scale);
const samples = Number(values.samples);
const fastSamples = Number(values['fast-samples']);
const shutterFraction = Number(values.shutter) / 360;
const workerCount = Number(values.workers);
for (const count of [samples, fastSamples]) {
  if (!Number.isInteger(count) || count < 1 || count > MAX_SAMPLES) {
    throw new Error(`sample counts must be integers 1..${MAX_SAMPLES}, got ${count}`);
  }
}
if (!(scale >= 1)) {
  throw new Error(`invalid scale ${scale}`);
}
if (!Number.isInteger(workerCount) || workerCount < 1 || workerCount > MAX_WORKERS) {
  throw new Error(`workers must be 1..${MAX_WORKERS}`);
}
if (!(shutterFraction >= 0 && shutterFraction <= 1)) {
  throw new Error(`shutter must be 0..360 degrees, got ${values.shutter}`);
}

const firstFrame = Math.round(Number(values.from) * FPS);
const endFrame = Math.round(Number(values.to) * FPS);
if (!(endFrame > firstFrame)) {
  throw new Error(`empty frame range ${firstFrame}..${endFrame}`);
}

function samplesFor(frame) {
  const time = frame / FPS;
  return FAST_RANGES.some(([start, end]) => time >= start && time <= end) ? Math.max(samples, fastSamples) : samples;
}

function subFrameTimes(frame, count) {
  const center = frame / FPS;
  const times = [];
  for (let sample = 0; sample < count; sample++) {
    const offset = count === 1 ? 0 : ((sample + 0.5) / count - 0.5) * (shutterFraction / FPS);
    times.push(Math.min(DURATION_SECONDS - TIME_EPSILON, Math.max(0, center + offset)));
  }
  return times;
}

function chunks() {
  const list = [];
  let start = firstFrame;
  while (start < endFrame) {
    const count = samplesFor(start);
    let end = start + 1;
    while (end < endFrame && samplesFor(end) === count && end - start < CHUNK_FRAMES_MAX) {
      end += 1;
    }
    list.push({ index: list.length, start, end, samples: count });
    start = end;
  }
  return list;
}

function segmentEncoder(file, count) {
  const filters = [
    `scale=${WIDTH}:${HEIGHT}:flags=lanczos`,
    'format=gbrp',
    count > 1 ? `tmix=frames=${count}` : null,
    count > 1 ? `select='eq(mod(n\\,${count})\\,${count - 1})'` : null,
    `setpts=N/(${FPS}*TB)`
  ].filter(Boolean);
  const encoder = spawn('ffmpeg', [
    '-v', 'error', '-y',
    '-f', 'image2pipe', '-c:v', 'png', '-framerate', String(FPS * count), '-i', '-',
    '-vf', filters.join(','),
    '-r', String(FPS),
    '-c:v', 'ffv1', '-level', '3', '-g', '1',
    file
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((resolve, reject) => {
    encoder.on('error', reject);
    encoder.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code} for ${file}`))));
  });
  const pipeFailure = new Promise((_, reject) => encoder.stdin.on('error', (error) => reject(new Error(`ffmpeg input for ${file} closed: ${error.message}`))));
  pipeFailure.catch(() => {});
  return { stdin: encoder.stdin, done, pipeFailure };
}

function write(encoder, buffer) {
  if (encoder.stdin.write(buffer)) {
    return Promise.resolve();
  }
  return Promise.race([new Promise((resolve) => encoder.stdin.once('drain', resolve)), encoder.pipeFailure]);
}

const segmentDir = path.join(PROJECT_ROOT, 'out/segments');
rmSync(segmentDir, { recursive: true, force: true });
mkdirSync(segmentDir, { recursive: true });

const server = await startServer();
const progress = { frames: 0 };
const startedAt = performance.now();
const totalFrames = endFrame - firstFrame;
const status = setInterval(() => {
  const seconds = (performance.now() - startedAt) / 1000;
  const rate = progress.frames / seconds;
  const remaining = rate > 0 ? (totalFrames - progress.frames) / rate : Infinity;
  console.log(JSON.stringify({ status: 'rendering', frames: progress.frames, total: totalFrames, framesPerSecond: Number(rate.toFixed(2)), etaSeconds: Math.round(remaining) }));
}, STATUS_INTERVAL_MS);

async function renderChunk(stage, chunk) {
  const file = path.join(segmentDir, `segment-${String(chunk.index).padStart(3, '0')}.mkv`);
  const encoder = segmentEncoder(file, chunk.samples);
  try {
    for (let frame = chunk.start; frame < chunk.end; frame++) {
      for (const time of subFrameTimes(frame, chunk.samples)) {
        await write(encoder, await stage.capture(time));
      }
      progress.frames += 1;
    }
  } finally {
    encoder.stdin.end();
  }
  await encoder.done;
  return file;
}

async function worker(queue, files) {
  const browser = await launchBrowser();
  const stage = await openStage({ browser, origin: server.origin, scale });
  try {
    for (let chunk = queue.shift(); chunk; chunk = queue.shift()) {
      files[chunk.index] = await renderChunk(stage, chunk);
    }
  } finally {
    await stage.close();
    await browser.close();
  }
}

const plan = chunks();
const queue = [...plan].sort((a, b) => (b.end - b.start) * b.samples - (a.end - a.start) * a.samples);
const segments = new Array(plan.length);
console.log(JSON.stringify({ status: 'plan', chunks: plan.length, fastFrames: plan.filter((chunk) => chunk.samples !== samples).reduce((sum, chunk) => sum + chunk.end - chunk.start, 0), subFrames: plan.reduce((sum, chunk) => sum + (chunk.end - chunk.start) * chunk.samples, 0) }));
try {
  await Promise.all(Array.from({ length: workerCount }, () => worker(queue, segments)));
} finally {
  clearInterval(status);
  await server.close();
}

const listFile = path.join(segmentDir, 'segments.txt');
writeFileSync(listFile, segments.map((file) => `file '${file}'`).join('\n'));
const output = path.resolve(PROJECT_ROOT, values.out);
await new Promise((resolve, reject) => {
  const concat = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', output], { stdio: 'inherit' });
  concat.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`concat exited ${code}`))));
});
const seconds = (performance.now() - startedAt) / 1000;
console.log(JSON.stringify({ status: 'done', output: path.relative(PROJECT_ROOT, output), frames: totalFrames, samples, fastSamples, scale, seconds: Number(seconds.toFixed(1)) }));
