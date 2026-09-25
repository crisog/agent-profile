import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { DURATION_SECONDS, FPS, HEIGHT, WIDTH } from '../src/timing.js';
import { PROJECT_ROOT } from './stage.mjs';

const LOUDNESS_TARGET = -14;
const LOUDNESS_TOLERANCE = 1;
const TRUE_PEAK_MAX = -1;
const FRAME_SECONDS = 1 / FPS;

const { values } = parseArgs({ options: { file: { type: 'string', default: 'out/video.mp4' } } });
const file = path.resolve(PROJECT_ROOT, values.file);

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) {
    throw new Error(`${command} exited ${result.status}: ${result.stderr}`);
  }
  return result;
}

const probe = JSON.parse(run('ffprobe', ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', file]).stdout);
const video = probe.streams.find((stream) => stream.codec_type === 'video');
const audio = probe.streams.find((stream) => stream.codec_type === 'audio');
const loudnessLog = run('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-map', '0:a:0', '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr;
const summary = loudnessLog.slice(loudnessLog.lastIndexOf('Summary:'));
const integrated = Number(/I:\s+(-?[\d.]+) LUFS/.exec(summary)?.[1]);
const truePeak = Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(summary.slice(summary.indexOf('True peak')))?.[1]);

const checks = [
  ['video codec h264 high', video?.codec_name === 'h264' && video?.profile === 'High', `${video?.codec_name} ${video?.profile}`],
  ['codec tag avc1', video?.codec_tag_string === 'avc1', video?.codec_tag_string],
  ['resolution 1920x1080', video?.width === WIDTH && video?.height === HEIGHT, `${video?.width}x${video?.height}`],
  ['frame rate 60/1', video?.r_frame_rate === `${FPS}/1`, video?.r_frame_rate],
  ['frame count 900', Number(video?.nb_read_frames) === DURATION_SECONDS * FPS, video?.nb_read_frames],
  ['pixel format yuv420p', video?.pix_fmt === 'yuv420p', video?.pix_fmt],
  ['bt709 tags', video?.color_space === 'bt709' && video?.color_primaries === 'bt709' && video?.color_transfer === 'bt709', `${video?.color_space}/${video?.color_primaries}/${video?.color_transfer}`],
  ['duration 15 s within one frame', Math.abs(Number(probe.format.duration) - DURATION_SECONDS) <= FRAME_SECONDS, probe.format.duration],
  ['audio aac 48 kHz stereo', audio?.codec_name === 'aac' && audio?.sample_rate === '48000' && audio?.channels === 2, `${audio?.codec_name} ${audio?.sample_rate} ${audio?.channels}ch`],
  ['loudness -14 LUFS +/- 1', Math.abs(integrated - LOUDNESS_TARGET) <= LOUDNESS_TOLERANCE, `${integrated} LUFS`],
  ['true peak <= -1 dBTP', truePeak <= TRUE_PEAK_MAX, `${truePeak} dBTP`]
].map(([name, isPassing, observed]) => ({ name, pass: isPassing, observed }));

const report = { file: path.relative(PROJECT_ROOT, file), sizeBytes: Number(probe.format.size), bitRate: Number(probe.format.bit_rate), checks, pass: checks.every((check) => check.pass) };
writeFileSync(path.join(PROJECT_ROOT, 'out/verify.json'), `${JSON.stringify(report, null, 2)}\n`);
for (const check of checks) {
  console.log(`${check.pass ? 'PASS' : 'FAIL'}  ${check.name}  (${check.observed})`);
}
console.log(report.pass ? 'VERDICT pass' : 'VERDICT fail');
process.exitCode = report.pass ? 0 : 1;
