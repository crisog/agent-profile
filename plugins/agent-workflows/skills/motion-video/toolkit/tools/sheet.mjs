import { writeFileSync } from 'node:fs';
import path from 'node:path';

import { PROJECT_ROOT } from './stage.mjs';

const SHEET_GAP = 6;
const LABEL_HEIGHT = 26;

export async function writeSheet({ browser, origin, stills, sheetPath, columns, tileWidth }) {
  const tileHeight = Math.round((tileWidth * 1080) / 1920);
  const rows = Math.ceil(stills.length / columns);
  const width = columns * tileWidth + (columns + 1) * SHEET_GAP;
  const height = rows * (tileHeight + LABEL_HEIGHT) + (rows + 1) * SHEET_GAP;
  const tiles = stills
    .map(({ file, time }) => {
      const url = `${origin}/${path.relative(PROJECT_ROOT, file)}`;
      return `<figure><img src="${url}" width="${tileWidth}" height="${tileHeight}"><figcaption>${time.toFixed(3)} s</figcaption></figure>`;
    })
    .join('');
  const html = `<!doctype html><html><body style="margin:0;background:#2b2b2b"><div style="display:grid;grid-template-columns:repeat(${columns},${tileWidth}px);gap:${SHEET_GAP}px;padding:${SHEET_GAP}px">${tiles}</div>
<style>figure{margin:0}img{display:block}figcaption{height:${LABEL_HEIGHT}px;font:600 15px Menlo,monospace;color:#eee;line-height:${LABEL_HEIGHT}px}</style></body></html>`;
  const page = await browser.newPage({ viewport: { width, height } });
  await page.setContent(html);
  await page.waitForFunction(() => [...document.images].every((image) => image.complete && image.naturalWidth > 0));
  writeFileSync(sheetPath, await page.screenshot({ fullPage: true }));
  await page.close();
}
