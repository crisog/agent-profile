import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { writeSheet } from './sheet.mjs';
import { PROJECT_ROOT, launchBrowser, openStage, startServer } from './stage.mjs';

const MAX_STILLS = 400;

const { values } = parseArgs({
  options: {
    times: { type: 'string' },
    from: { type: 'string' },
    to: { type: 'string' },
    step: { type: 'string' },
    scale: { type: 'string', default: '1' },
    out: { type: 'string', default: 'out/stills' },
    sheet: { type: 'string' },
    columns: { type: 'string', default: '6' },
    tile: { type: 'string', default: '480' }
  }
});

function requestedTimes() {
  if (values.times) {
    return values.times.split(',').map(Number);
  }
  const from = Number(values.from);
  const to = Number(values.to);
  const step = Number(values.step);
  if (!(step > 0) || !(to >= from)) {
    throw new Error('pass --times a,b,c or --from --to --step');
  }
  const times = [];
  for (let time = from; time <= to + 1e-9 && times.length < MAX_STILLS; time += step) {
    times.push(Math.round(time * 1_000_000) / 1_000_000);
  }
  return times;
}

const times = requestedTimes();
const outDir = path.resolve(PROJECT_ROOT, values.out);
mkdirSync(outDir, { recursive: true });

const server = await startServer();
const browser = await launchBrowser();
const stage = await openStage({ browser, origin: server.origin, scale: Number(values.scale) });
const stills = [];
for (const time of times) {
  const file = path.join(outDir, `t${time.toFixed(3).padStart(6, '0')}.png`);
  writeFileSync(file, await stage.capture(time));
  stills.push({ file, time });
}
await stage.close();
if (values.sheet) {
  await writeSheet({ browser, origin: server.origin, stills, sheetPath: path.resolve(PROJECT_ROOT, values.sheet), columns: Number(values.columns), tileWidth: Number(values.tile) });
  console.log(`sheet ${values.sheet}`);
}
await browser.close();
await server.close();
console.log(`stills ${stills.length} -> ${path.relative(PROJECT_ROOT, outDir)}`);
