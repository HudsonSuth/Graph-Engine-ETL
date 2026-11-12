// Headless screenshots of the running app (start it first: npm run demo).
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './browser.mjs';
const ROOT = fileURLToPath(new URL('..', import.meta.url)), OUT = join(ROOT, 'screenshots'); mkdirSync(OUT, { recursive: true });
const url = process.argv[2] || 'http://localhost:8080/advanced';
const b = await launchBrowser(); if (!b) process.exit(0);
const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
await p.goto(url); await p.waitForTimeout(4000);
await p.locator('g.step', { hasText: 'normalize_ids' }).dispatchEvent('mousedown'); await p.evaluate(() => document.dispatchEvent(new MouseEvent('mouseup'))); await p.waitForTimeout(1200);
await p.screenshot({ path: join(OUT, 'app.png') });
await p.locator('#editor').screenshot({ path: join(OUT, 'editor.png') });
await p.locator('#inspector').screenshot({ path: join(OUT, 'step-schema.png') });
await p.locator('#schema').screenshot({ path: join(OUT, 'schema-viewer.png') });
await p.click('#runq'); await p.waitForTimeout(800);
await p.locator('#preview').screenshot({ path: join(OUT, 'graph-preview.png') });
await b.close(); console.log('saved screenshots/');
