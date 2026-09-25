import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { FPS } from '../src/timing.js';
import { writeSheet } from './sheet.mjs';
import { PROJECT_ROOT, launchBrowser, startServer } from './stage.mjs';

const { values } = parseArgs({
  options: {
    video: { type: 'string', default: 'out/video.mp4' },
    every: { type: 'string', default: '0.25' },
    'step-frames': { type: 'string' },
    from: { type: 'string', default: '0' },
    to: { type: 'string', default: '15' },
    out: { type: 'string', default: 'out/video-sheet.png' },
    columns: { type: 'string', default: '8' },
    tile: { type: 'string', default: '300' }
  }
});

const every = values['step-frames'] ? Number(values['step-frames']) / FPS : Number(values.every);
const from = Number(values.from);
const to = Number(values.to);
const frameDir = path.join(PROJECT_ROOT, 'out/video-sheet-frames');
rmSync(frameDir, { recursive: true, force: true });
mkdirSync(frameDir, { recursive: true });
const stepFrames = values['step-frames'] ? Number(values['step-frames']) : Math.round(every * FPS);
const firstFrame = Math.round(from * FPS);
const lastFrame = Math.round(to * FPS);
if (!Number.isInteger(stepFrames) || stepFrames < 1 || Math.abs(stepFrames / FPS - every) > 1e-9) {
  throw new Error(`--every must be a whole number of frames at ${FPS} fps`);
}
const selection = `select='between(n\\,${firstFrame}\\,${lastFrame})*not(mod(n-${firstFrame}\\,${stepFrames}))'`;
const result = spawnSync('ffmpeg', ['-v', 'error', '-i', path.resolve(PROJECT_ROOT, values.video), '-vf', selection, '-fps_mode', 'passthrough', path.join(frameDir, 'frame-%04d.png')], { stdio: 'inherit' });
if (result.status !== 0) {
  throw new Error(`ffmpeg exited ${result.status}`);
}
const stills = readdirSync(frameDir)
  .filter((name) => name.endsWith('.png'))
  .sort()
  .map((name, index) => ({ file: path.join(frameDir, name), time: from + index * every }));
const server = await startServer();
const browser = await launchBrowser();
await writeSheet({ browser, origin: server.origin, stills, sheetPath: path.resolve(PROJECT_ROOT, values.out), columns: Number(values.columns), tileWidth: Number(values.tile) });
await browser.close();
await server.close();
console.log(`sheet ${values.out} (${stills.length} frames)`);
