import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

const SCENE_THRESHOLD = 0.28;
const STRIP_SECONDS = 6;
const STRIP_FPS = 6;
const ANALYSIS_RATE = 11_025;
const HOP = 256;
const TEMPO_MIN = 70;
const TEMPO_MAX = 180;

const { values, positionals } = parseArgs({ allowPositionals: true, options: { out: { type: 'string', default: 'out/reference' } } });
const input = positionals[0];
if (!input) {
  throw new Error('usage: node tools/study-reference.mjs path/to/video --out out/reference');
}
const outDir = path.resolve(values.out);
mkdirSync(outDir, { recursive: true });

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (result.status !== 0) {
    throw new Error(`${command} exited ${result.status}: ${result.stderr}`);
  }
  return result;
}

const probe = JSON.parse(run('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', input]).stdout);
const video = probe.streams.find((stream) => stream.codec_type === 'video');
const duration = Number(probe.format.duration);
console.log(JSON.stringify({ size: `${video.width}x${video.height}`, fps: video.r_frame_rate, seconds: duration, audio: probe.streams.some((stream) => stream.codec_type === 'audio') }));

const cutLog = run('ffmpeg', ['-hide_banner', '-i', input, '-vf', `select='gt(scene,${SCENE_THRESHOLD})',showinfo`, '-an', '-f', 'null', '-']).stderr;
const cuts = [...cutLog.matchAll(/pts_time:([\d.]+)/g)].map((match) => Number(match[1]));
const shots = [0, ...cuts, duration].slice(1).map((time, index, list) => Number((time - (index === 0 ? 0 : list[index - 1])).toFixed(2)));
console.log(JSON.stringify({ hardCuts: cuts.length, cutTimes: cuts.map((time) => Number(time.toFixed(2))), shotSeconds: shots }));

run('ffmpeg', ['-v', 'error', '-y', '-i', input, '-vf', `fps=1,scale=180:-1,tile=10x${Math.ceil(duration / 10)}:padding=4:color=0x333333`, '-frames:v', '1', path.join(outDir, 'sheet-1fps.png')]);
for (let start = 0; start < duration; start += STRIP_SECONDS) {
  const name = `strip-${String(start).padStart(3, '0')}s.png`;
  run('ffmpeg', ['-v', 'error', '-y', '-ss', String(start), '-t', String(STRIP_SECONDS), '-i', input, '-vf', `fps=${STRIP_FPS},scale=150:-1,tile=12x3:padding=3:color=0x333333`, '-frames:v', '1', path.join(outDir, name)]);
}

if (probe.streams.some((stream) => stream.codec_type === 'audio')) {
  const loudness = run('ffmpeg', ['-hide_banner', '-nostats', '-i', input, '-map', '0:a', '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr;
  const summary = loudness.slice(loudness.lastIndexOf('Summary:'));
  const raw = path.join(outDir, 'mono.f32');
  run('ffmpeg', ['-v', 'error', '-y', '-i', input, '-map', '0:a', '-ac', '1', '-ar', String(ANALYSIS_RATE), '-f', 'f32le', raw]);
  const bytes = readFileSync(raw);
  rmSync(raw);
  const samples = new Float32Array(bytes.buffer, bytes.byteOffset, bytes.length / 4);
  const envelope = [];
  for (let i = 0; i + HOP <= samples.length; i += HOP) {
    let energy = 0;
    for (let j = 0; j < HOP; j++) {
      energy += samples[i + j] ** 2;
    }
    envelope.push(Math.log(1e-9 + energy));
  }
  const onsets = envelope.map((value, index) => (index === 0 ? 0 : Math.max(0, value - envelope[index - 1])));
  const framesPerSecond = ANALYSIS_RATE / HOP;
  const scores = [];
  for (let bpm = TEMPO_MIN; bpm <= TEMPO_MAX; bpm += 0.5) {
    const lag = (framesPerSecond * 60) / bpm;
    let score = 0;
    for (let i = Math.ceil(lag) + 1; i < onsets.length; i++) {
      const position = i - lag;
      const low = Math.floor(position);
      const weight = position - low;
      score += onsets[i] * (onsets[low] * (1 - weight) + onsets[low + 1] * weight);
    }
    scores.push([bpm, score]);
  }
  scores.sort((a, b) => b[1] - a[1]);
  console.log(JSON.stringify({
    integratedLufs: Number(/I:\s+(-?[\d.]+) LUFS/.exec(summary)?.[1]),
    loudnessRange: Number(/LRA:\s+([\d.]+) LU/.exec(summary)?.[1]),
    tempoCandidates: scores.slice(0, 4).map(([bpm]) => bpm)
  }));
  run('ffmpeg', ['-v', 'error', '-y', '-i', input, '-filter_complex', '[0:a]showwavespic=s=1600x240', '-frames:v', '1', path.join(outDir, 'waveform.png')]);
}
console.log(`frames and audio pictures in ${outDir}`);
