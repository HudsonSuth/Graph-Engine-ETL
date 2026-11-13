// Drives the guided UI end to end and saves screenshots/ui-*.png. Start a fresh server first:
//   node src/server.js --port 8090 --data <any empty folder>
// Only the Documents wizard step (screenshots/ui-documents.png):  node test/ui-screenshots.mjs http://localhost:8090 documents
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './browser.mjs';
const ROOT = fileURLToPath(new URL('..', import.meta.url)), OUT = join(ROOT, 'screenshots'); mkdirSync(OUT, { recursive: true });
const url = process.argv[2] || 'http://localhost:8090';
const b = await launchBrowser(); if (!b) process.exit(0);
const p = await b.newPage({ viewport: { width: 1320, height: 900 } });
const shot = async (name, full = true) => { await p.waitForTimeout(500); await p.screenshot({ path: join(OUT, `ui-${name}.png`), fullPage: full }); console.log('ui-' + name); };
p.on('dialog', d => d.accept());
// Documents wizard: upload the test fixtures (PDF, Word, Excel, old Excel, CSV) and show what was read and the suggested mappings.
async function documentsShot() {
  const dir = join(ROOT, 'test', 'fixtures', 'documents');
  await p.goto('about:blank'); await p.goto(url + '/#add'); await p.waitForSelector('.type[data-k=documents]'); await p.click('.type[data-k=documents]');
  await p.setInputFiles('#files', ['invoice.pdf', 'suppliers.docx', 'customers.xlsx', 'products.xls', 'orders.csv'].map(f => join(dir, f)));
  await p.waitForSelector('.msg.ok', { timeout: 30000 }); await p.click('#next'); await p.waitForSelector('.suggest'); await shot('documents');
  await p.click('#next'); await p.waitForSelector('[data-ent]'); await shot('documents-mapping');
}
if (process.argv[3] === 'documents') { await documentsShot(); await b.close(); process.exit(0); }
await p.goto(url + '/#home'); await p.waitForSelector('#demo'); await shot('home-first-run', false);
await p.click('#demo'); await p.waitForTimeout(7000); await p.goto(url + '/#home'); await p.waitForTimeout(1500); await shot('home');
await p.goto(url + '/#add'); await p.waitForSelector('.type'); await shot('wizard-1-pick-type', false);
await p.click('.type[data-k=csv]'); await p.setInputFiles('#file', join(ROOT, 'demo', 'samples', 'returns.csv')); await p.waitForSelector('.msg.ok'); await shot('wizard-2-connect', false);
await p.click('#next'); await p.waitForSelector('table'); await shot('wizard-3-preview', false);
await p.click('#next'); await p.waitForSelector('#ent'); await shot('wizard-4-about', false);
await p.click('#next'); await p.waitForSelector('#save'); await p.click('#save'); await p.waitForURL(/#link/);
await p.waitForSelector('#pv'); await p.click('#pv'); await p.waitForSelector('#sample h2'); await shot('link');
await p.click('#ok'); await p.waitForURL(/#explore/); await p.waitForTimeout(3000); await p.goto(url + '/#explore'); await p.waitForSelector('[data-idea]');
await p.click('[data-idea="0"]'); await p.waitForSelector('#cy canvas'); await p.waitForTimeout(800); await shot('explore');
await p.goto(url + '/#clean'); await p.waitForSelector('#src');
await p.selectOption('#src', { label: 'returns' }); await p.waitForTimeout(600);
await p.selectOption('#pre', 'trim'); await p.selectOption('#fld', 'reason'); await p.click('#add'); await p.waitForTimeout(400);
await p.selectOption('#pre', 'lowercase'); await p.selectOption('#fld', 'reason'); await p.click('#add'); await p.waitForTimeout(400);
await p.selectOption('#pre', 'parseDate'); await p.selectOption('#fld', 'returned_on'); await p.selectOption('#fmt', 'MM/DD/YYYY'); await p.click('#add'); await p.waitForTimeout(400);
await p.selectOption('#pre', 'keepIf'); await p.selectOption('#fld', 'reason'); await p.selectOption('#op', 'is not'); await p.fill('#val', 'changed mind'); await p.click('#add'); await p.waitForTimeout(800);
await shot('cleanup');
// Send data out: an embedded PostgreSQL (PGlite) output that works, and a Kafka output with no broker running (shows the error state).
await p.evaluate(async () => {
  const post = (path, body) => fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  await post('/api/studio/sinks', { name: 'Analytics warehouse', kind: 'postgres', settings: { driver: 'pglite' }, asUser: 'sync-service' });
  await post('/api/studio/sinks', { name: 'Orders live feed', kind: 'kafka', settings: { brokers: '127.0.0.1:9092', topic: 'shop.graph' }, asUser: 'sync-service' });
});
await p.waitForTimeout(9000); await p.goto(url + '/#syncout'); await p.waitForSelector('.dot'); await p.click('.type[data-kind=neo4j]'); await p.waitForSelector('#stest'); await shot('sync-out');
await p.goto(url + '/#access'); await p.waitForSelector('#asu'); await p.click('[data-why="Customer|read"]'); await p.waitForSelector('#why ol'); await shot('access-rules');
await p.click('#prev'); await p.waitForURL(/#explore/); await p.waitForSelector('[data-idea]'); await p.waitForSelector('#asbar');
await p.click('[data-idea="0"]'); await p.waitForSelector('#cy canvas'); await p.waitForTimeout(800); await shot('test-as');
await p.click('#asoff');
await documentsShot();
await b.close();

// Reset dialog (run last: it is opened but not confirmed)
{
  const b2 = await launchBrowser(); const q = await b2.newPage({ viewport: { width: 1320, height: 900 } });
  await q.goto(url + '/#settings'); await q.waitForSelector('#reset'); await q.click('#reset');
  await q.waitForSelector('#rc'); await q.fill('#rc', 'RESET'); await q.waitForTimeout(400);
  await q.screenshot({ path: join(OUT, 'ui-reset.png') }); console.log('ui-reset'); await b2.close();
}
