// Build a snapshot by running the real StreamGraph engine (studio + explore) in node.
// Maritime AIS files are loaded through the studio API. Retail comes from the built-in demo loader.
// Responses are stored per principal (owner and analyst) so "view as" is precomputed.
import { mkdtemp, rm, cp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startCombined } from '../../explore/combined.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const MARITIME = join(ROOT, 'demo', 'maritime');
const DOCS = join(ROOT, 'test', 'fixtures', 'documents');

const CSVS = [
  { file: 'vessels.csv', entity: 'Vessel', key: 'mmsi' },
  { file: 'positions.csv', entity: 'Position', key: 'ping_id' },
  { file: 'ports.csv', entity: 'Port', key: 'port_id' },
  { file: 'vessel_types.csv', entity: 'VesselType', key: 'vessel_type' },
  { file: 'vessel_watchlist.csv', entity: 'Vessel', key: 'watchlist_id' },
];

const log = (...a) => console.log('[snapshot]', ...a);
process.on('unhandledRejection', e => { log('unhandled', e && e.stack || e); process.exit(1); });
process.on('uncaughtException', e => { log('uncaught', e && e.stack || e); process.exit(1); });

async function boot(opts) {
  const dataDir = await mkdtemp(join(tmpdir(), 'sg-vercel-'));
  const running = await startCombined({ port: 0, dataDir, log: m => log('engine', m), ...opts });
  const base = `http://127.0.0.1:${running.port}`;
  return { running, dataDir, base };
}

async function call(base, path, { method = 'GET', body, raw, headers = {}, ok = true } = {}) {
  const r = await fetch(base + path, {
    method,
    headers: { ...(body != null && !raw ? { 'content-type': 'application/json' } : {}), ...headers },
    body: raw ?? (body != null ? JSON.stringify(body) : undefined),
  });
  const text = await r.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  if (ok && !r.ok) throw new Error(`${method} ${path} ${r.status} ${text.slice(0, 400)}`);
  return { status: r.status, body: json, text };
}

const get = (base, path, headers) => call(base, path, { headers }).then(r => r.body);
const post = (base, path, body, headers) => call(base, path, { method: 'POST', body, headers }).then(r => r.body);

async function waitCounts(base, { min = 1, stableFor = 2, ticks = 80, ms = 500 } = {}) {
  let last = -1, stable = 0, state = null;
  for (let i = 0; i < ticks; i++) {
    try { state = await get(base, '/api/state'); }
    catch (e) { log('state retry', e.cause?.code || e.message); await new Promise(r => setTimeout(r, ms)); continue; }
    const n = state.counts?.nodes ?? 0;
    if (n === last && n >= min) { if (++stable >= stableFor) return state; }
    else stable = 0;
    last = n;
    await new Promise(r => setTimeout(r, ms));
  }
  throw new Error(`graph did not settle (nodes=${last})`);
}

async function capturePrincipal(base, as) {
  const headers = as ? { 'x-sg-as': as } : {};
  const soft = async (label, fn) => {
    try { return await fn(); }
    catch (e) { log('soft-fail', as || 'owner', label, e.message); return null; }
  };
  const home = await get(base, '/api/studio/home', headers);
  const workspace = await get(base, '/api/studio/workspace', headers);
  const explore = await get(base, '/api/studio/explore', headers);
  const graph = await get(base, '/api/graph', headers);
  const flow = await get(base, '/api/flow', headers);
  const state = await get(base, '/api/state', headers);
  const session = await post(base, '/api/explore/session', { follow: true }, headers);
  const core = await get(base, '/api/explore/core/config', headers);
  const geo = await get(base, '/api/explore/geo/config', headers);
  const views = await get(base, '/api/explore/views', headers);
  const processor = await soft('processor', () => get(base, '/api/explore/processor', headers));
  const er = await soft('er', () => get(base, '/api/explore/er/stats', headers));
  const cost = await post(base, '/api/explore/cost', { op: 'overview' }, headers);
  const processing = await soft('processing', () => get(base, '/api/explore/x/processing', headers));
  const me = await soft('me', () => get(base, '/api/explore/x/me', headers));
  const review = await soft('review', () => get(base, '/api/explore/x/er/review', headers));
  const metrics = await soft('metrics', () => get(base, '/api/explore/x/processing/metrics', headers));
  const meta = await soft('meta', () => get(base, '/api/explore/x/meta', headers));
  const nl = await soft('nl', () => get(base, '/api/explore/x/nl/settings', headers));
  const timeline = await soft('timeline', () => get(base, '/api/explore/x/history/timeline', headers));
  const notebooks = await soft('notebooks', () => get(base, '/api/explore/x/notebooks', headers));
  const searchStatus = await soft('search-status', () => get(base, '/api/studio/search/status', headers));
  const asks = [];
  for (const idea of (explore.ideas || []).slice(0, 4)) {
    const result = await soft('ask ' + idea.text, () => post(base, '/api/studio/ask', { question: idea.question, limit: 40 }, headers));
    if (result) asks.push({ question: idea.question, result });
  }
  const degree = await soft('degree', () => post(base, '/api/explore/algo/run', { algo: 'degree', params: {}, scope: { kind: 'all' }, values: true }, headers));
  const out = {
    home, workspace, explore, graph, flow, state, session, core, geo, views, processor, er, cost,
    processing, me, review, metrics, meta, nl, timeline, notebooks, searchStatus, asks, degree,
  };
  if (!as) {
    out.access = await get(base, '/api/studio/access');
    out.sinks = await get(base, '/api/studio/sinks');
    out.suggestions = await soft('suggestions', () => get(base, '/api/studio/suggestions'));
    out.cleanup = workspace.workspace.sources[0]
      ? await soft('cleanup', () => post(base, '/api/studio/cleanup-preview', { sourceId: workspace.workspace.sources[0].id, cleanup: [] }))
      : null;
    out.matrices = {};
    for (const user of ['owner', 'analyst', 'sync-service']) out.matrices[user] = await post(base, '/api/studio/access/matrix', { user });
    const cy = await call(base, '/api/export.cypher');
    out.cypher = cy.text;
  }
  return out;
}

async function loadMaritime(base, dataDir) {
  const wizard = { csv: {} };
  for (const spec of CSVS) {
    const buf = await readFile(join(MARITIME, spec.file));
    const up = await call(base, '/api/studio/upload?name=' + encodeURIComponent(spec.file), { method: 'POST', raw: buf, headers: { 'content-type': 'application/octet-stream' } });
    if (up.status !== 200) throw new Error('upload ' + spec.file + ' ' + up.text.slice(0, 200));
    const test = await post(base, '/api/studio/test', { kind: 'csv', settings: { path: up.body.path }, name: spec.file });
    if (!test.ok) throw new Error('test ' + spec.file + ' ' + test.message);
    wizard.csv[spec.file] = test;
    const fields = Object.fromEntries(test.columns.map(c => [c, c]));
    await post(base, '/api/studio/sources', {
      name: spec.file.replace(/\.csv$/, ''), kind: 'csv', settings: { path: up.body.path },
      entity: spec.entity, key: spec.key, fields, keepInSync: false,
    });
    log('source', spec.file, 'rows preview', test.preview?.length);
  }
  await post(base, '/api/studio/links', {
    matches: [],
    relationships: [
      { source: 'positions', field: 'mmsi', toEntity: 'Vessel', type: 'OF_VESSEL' },
      { source: 'vessels', field: 'vessel_type', toEntity: 'VesselType', type: 'OF_TYPE' },
      { source: 'positions', field: 'port_id', toEntity: 'Port', type: 'NEAR_PORT' },
    ],
  });
  const docDir = join(dataDir, 'doc-fixtures');
  await cp(DOCS, docDir, { recursive: true });
  const docTest = await post(base, '/api/studio/test', { kind: 'documents', settings: { folder: docDir }, name: 'documents' });
  if (!docTest.ok) throw new Error('documents test: ' + docTest.message);
  wizard.documents = docTest;
  const tables = (docTest.groups || []).filter(g => g.recommended).map(g => ({
    sig: g.sig, entity: g.suggestion.entity, key: g.suggestion.key, fields: g.suggestion.fields, label: g.sentence,
  }));
  await post(base, '/api/studio/sources', { name: 'Sample documents', kind: 'documents', settings: { folder: docDir }, tables, keepInSync: false });
  log('documents groups', docTest.groups?.length, 'tables saved', tables.length);
  const state = await waitCounts(base, { min: 4000, stableFor: 2, ticks: 90, ms: 400 });
  log('maritime nodes', state.counts.nodes, 'edges', state.counts.edges);
  const access = await get(base, '/api/studio/access');
  let tuned = 0;
  for (const e of access.entities) {
    for (const f of e.fields) {
      const high = e.label === 'Vessel' && (f.field === 'callsign' || f.field === 'imo');
      const sens = high ? 'high' : 'low';
      if (f.sensitivity !== sens) { await post(base, '/api/studio/access/field', { entity: e.label, field: f.field, sensitivity: sens }); tuned++; }
    }
  }
  log('field sensitivity updates', tuned);
  await post(base, '/api/studio/sinks', {
    name: 'Search index', kind: 'opensearch',
    settings: { url: 'http://127.0.0.1:9200', index: 'streamgraph-' }, asUser: 'owner',
  });
  return wizard;
}

export async function buildSnapshot() {
  if (MARITIME.includes('icij') || DOCS.includes('icij')) throw new Error('refusing to snapshot ICIJ paths');
  log('booting empty server');
  const emptyRun = await boot({});
  let empty;
  try { empty = { principals: { owner: await capturePrincipal(emptyRun.base) } }; }
  finally { await emptyRun.running.close(); await rm(emptyRun.dataDir, { recursive: true, force: true }); }

  log('booting maritime');
  const mar = await boot({});
  let maritime, wizard;
  try {
    wizard = await loadMaritime(mar.base, mar.dataDir);
    log('capturing owner');
    const owner = await capturePrincipal(mar.base);
    log('capturing analyst');
    const analyst = await capturePrincipal(mar.base, 'analyst');
    const ownerV = owner.graph.nodes.find(n => n.label === 'Vessel' && n.props?.callsign && n.props.callsign !== '[hidden]');
    const analystV = ownerV && analyst.graph.nodes.find(n => n.label === 'Vessel' && n.key === ownerV.key);
    log('abac check', ownerV ? `owner callsign ${ownerV.props.callsign}` : 'no vessel callsign', 'analyst', analystV ? analystV.props.callsign : 'missing');
    if (!ownerV || !analystV || analystV.props.callsign !== '[hidden]') throw new Error('analyst snapshot did not mask Vessel.callsign');
    maritime = { principals: { owner, analyst } };
  } finally { await mar.running.close(); await rm(mar.dataDir, { recursive: true, force: true }); }

  log('booting retail demo');
  const ret = await boot({ demo: true });
  let retail;
  try {
    await post(ret.base, '/api/studio/demo', {});
    const state = await waitCounts(ret.base, { min: 5, stableFor: 1, ticks: 40, ms: 400 });
    log('retail nodes', state.counts.nodes, 'edges', state.counts.edges);
    retail = { principals: { owner: await capturePrincipal(ret.base), analyst: await capturePrincipal(ret.base, 'analyst') } };
  } finally { await ret.running.close(); await rm(ret.dataDir, { recursive: true, force: true }); }

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    engine: 'streamgraph',
    note: 'Precomputed by running the StreamGraph engine. Maritime is the NOAA/MarineCadastre AIS slice plus Natural Earth ports. Retail is the built-in shop demo. No ICIJ data.',
    principals: ['owner', 'analyst'],
    datasets: { maritime, retail, empty },
    wizard,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const snap = await buildSnapshot();
  const out = process.argv[2];
  if (out) {
    const { writeFile } = await import('node:fs/promises');
    await writeFile(out, JSON.stringify(snap));
    log('wrote', out);
  }
}
