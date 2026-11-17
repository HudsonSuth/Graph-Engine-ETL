// Finds a Chromium-family browser for the optional screenshot scripts. Returns null if none (scripts then skip).
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
export async function launchBrowser() {
  let chromium;
  try { ({ chromium } = await import('playwright-core')); } catch { return skip('playwright-core is not installed (npm install --include=dev)'); }
  const caches = [process.env.PLAYWRIGHT_BROWSERS_PATH, process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'ms-playwright'),
    join(homedir(), '.cache', 'ms-playwright'), join(homedir(), 'Library', 'Caches', 'ms-playwright')].filter(Boolean);
  const bins = [['chrome-linux64', 'chrome'], ['chrome-linux', 'chrome'], ['chrome-win64', 'chrome.exe'], ['chrome-win', 'chrome.exe'], ['chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium']];
  const found = [process.env.CHROME];
  for (const c of caches) { if (!existsSync(c)) continue; for (const d of readdirSync(c).filter(d => /^chromium-\d+$/.test(d))) for (const b of bins) found.push(join(c, d, ...b)); }
  const exe = found.find(f => f && existsSync(f));
  const opts = { args: ['--no-sandbox'] };
  for (const o of [exe && { executablePath: exe }, { channel: 'chrome' }, { channel: 'msedge' }].filter(Boolean)) {
    try { return await chromium.launch({ ...opts, ...o }); } catch { /* try the next one */ }
  }
  return skip('no Chrome, Edge or Playwright Chromium found (set CHROME=path\\to\\chrome.exe)');
}
function skip(why) { console.log(`Screenshots skipped: ${why}.`); return null; }
