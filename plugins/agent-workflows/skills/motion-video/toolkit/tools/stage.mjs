import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright-core';

export const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PLAYWRIGHT_CACHES = [path.join(os.homedir(), 'Library/Caches/ms-playwright'), path.join(os.homedir(), '.cache/ms-playwright')];

function resolveChromium() {
  if (process.env.CHROMIUM_PATH) {
    return process.env.CHROMIUM_PATH;
  }
  for (const cache of PLAYWRIGHT_CACHES) {
    if (!existsSync(cache)) {
      continue;
    }
    const shells = readdirSync(cache).filter((name) => name.startsWith('chromium_headless_shell-')).sort().reverse();
    for (const shell of shells) {
      for (const platform of readdirSync(path.join(cache, shell))) {
        const binary = path.join(cache, shell, platform, 'chrome-headless-shell');
        if (existsSync(binary)) {
          return binary;
        }
      }
    }
  }
  throw new Error('no chrome-headless-shell found: run `npx playwright install chromium-headless-shell` or set CHROMIUM_PATH');
}

const CHROMIUM = resolveChromium();
const STAGE_WIDTH = 1920;
const STAGE_HEIGHT = 1080;
const READY_TIMEOUT_MS = 60_000;
const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.otf': 'font/otf'
};

export function startServer(root = PROJECT_ROOT) {
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const filePath = path.join(root, pathname);
    if (!filePath.startsWith(root)) {
      response.writeHead(403).end();
      return;
    }
    let stats;
    try {
      stats = statSync(filePath);
    } catch {
      response.writeHead(404).end(`not found: ${pathname}`);
      return;
    }
    if (!stats.isFile()) {
      response.writeHead(404).end(`not a file: ${pathname}`);
      return;
    }
    const contentType = CONTENT_TYPES[path.extname(filePath)] ?? 'application/octet-stream';
    response.writeHead(200, { 'content-type': contentType, 'cache-control': 'no-store' });
    createReadStream(filePath).pipe(response);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ origin: `http://127.0.0.1:${port}`, close: () => new Promise((done) => server.close(done)) });
    });
  });
}

export async function launchBrowser() {
  return chromium.launch({ executablePath: CHROMIUM, args: ['--font-render-hinting=none', '--disable-lcd-text'] });
}

export async function openStage({ browser, origin, scale }) {
  const context = await browser.newContext({
    viewport: { width: STAGE_WIDTH * scale, height: STAGE_HEIGHT * scale },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  await page.goto(`${origin}/src/index.html?scale=${scale}`);
  try {
    await page.waitForFunction(() => window.stageReady === true, null, { timeout: READY_TIMEOUT_MS });
  } catch (error) {
    throw new Error(`stage never became ready: ${errors.join(' | ') || error.message}`);
  }
  if (errors.length > 0) {
    throw new Error(`stage reported errors: ${errors.join(' | ')}`);
  }
  const cdp = await context.newCDPSession(page);
  async function capture(time) {
    await page.evaluate((t) => window.renderFrame(t), time);
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true });
    if (errors.length > 0) {
      throw new Error(`render at ${time}s failed: ${errors.join(' | ')}`);
    }
    return Buffer.from(shot.data, 'base64');
  }
  return { page, capture, close: () => context.close() };
}
