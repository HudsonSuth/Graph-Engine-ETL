// Browser test of the Agents screen and the advanced flow editor (L6).
// Needs Chrome/Chromium (CHROME_PATH or the usual install paths); skipped otherwise.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const exe = process.env.CHROME_PATH || ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const skip = exe ? false : 'no Chrome/Chromium found (set CHROME_PATH)';
const { startServer } = await import('../src/app.js');
let S, dir, base, browser, page;
const errors = [];

test.before(async () => {
  if (skip) return;
  dir = mkdtempSync(join(tmpdir(), 'sg-agent-ui-'));
  S = await startServer({ port: 0, dataDir: dir, log: () => {}, syncIntervalMs: 100000 });
  base = `http://127.0.0.1:${S.app.port}`;
  const cfg = S.studio.llm.models();
  cfg.agents = { enabled: true, tracing: { local: true, langsmith: false } };
  S.studio.llm.saveModels(cfg, { isAdmin: true });
  const { chromium } = await import('playwright-core');
  browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
});
test.after(async () => {
  await browser?.close();
  await S?.close();
  if (!dir) return;
  // Windows keeps the temp directory locked for a moment after the server closes. The tests have already finished.
  for (let i = 0; i < 8; i++) {
    try { rmSync(dir, { recursive: true, force: true }); return; }
    catch { await new Promise(r => setTimeout(r, 250)); }
  }
});

test('Agents screen lists models, approvals, reviews, threads, schedules and traces', { skip, timeout: 60000 }, async () => {
  await page.goto(base + '/#agents');
  await page.waitForSelector('#models-panel');
  for (const id of ['#models-panel', '#pending-panel', '#review-panel', '#thread-panel', '#schedule-panel', '#trace-panel']) {
    assert.ok(await page.$(id), id);
  }
  await page.waitForSelector('text=local-llama');
  assert.match(await page.textContent('#pending-panel'), /Nothing waiting/);
  assert.match(await page.textContent('#review-panel'), /No generated items waiting/);
  await page.fill('#m-name', 'bad-key');
  await page.selectOption('#m-provider', 'openai');
  await page.fill('#m-model', 'gpt-test');
  await page.fill('#m-key', 'sk-test-LITERALKEY0123456789abcd');
  await page.click('#m-save');
  await page.waitForSelector('#m-msg .msg.err');
  assert.match(await page.textContent('#m-msg'), /literal keys are not allowed/);
  assert.deepEqual(errors, []);
});

test('advanced editor can switch to an agent flow and pick a model per node', { skip, timeout: 60000 }, async () => {
  await page.goto(base + '/advanced');
  await page.waitForSelector('#agentmode');
  await page.click('#agentmode');
  await page.waitForFunction(() => [...document.querySelectorAll('#addtype option')].some(o => o.value === 'retrieve'));
  const types = await page.$$eval('#addtype option', os => os.map(o => o.value));
  for (const t of ['model', 'tools', 'retrieve', 'branch', 'approve', 'sink']) assert.ok(types.includes(t), t);
  await page.selectOption('#addtype', 'model');
  await page.click('#add');
  await page.waitForSelector('#modelpick');
  const models = await page.$$eval('#modelpick option', os => os.map(o => o.value));
  assert.ok(models.includes('local-llama'));
  await page.selectOption('#modelpick', 'local-llama');
  await page.click('#apply');
  await page.waitForFunction(() => document.querySelector('#msgs')?.textContent === '');
  const saved = await page.evaluate(async () => (await fetch('/api/flow')).json());
  const node = saved.flow.nodes.find(n => n.type === 'model' && n.config?.model === 'local-llama');
  assert.ok(node, JSON.stringify(saved.flow.nodes));
  assert.equal(saved.flow.kind, 'agent');
});
