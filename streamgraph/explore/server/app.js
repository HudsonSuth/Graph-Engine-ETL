// Explore layer wiring: service + ingest + StreamGraph adapter + connectors + HTTP API + delta log + ABAC guard.
import { readFile } from 'node:fs/promises';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { validateBenchResult, benchFileName } from '../shared/bench-schema.js';
import { join, dirname, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GraphService, StreamIngest } from './impl.js';
import { StreamGraphAdapter, SG_SOURCE } from './streamgraph-adapter.js';
import { StreamProducer } from './producer.js';
import { ChangeFeed } from './changefeed.js';
import { rng } from '../shared/layouts.js';
import { SavedViewStore } from './views-impl.js';
import { createAccess, als, DROP, SG } from './access.js';

export const EXPLORE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(EXPLORE_ROOT, 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.map': 'application/json', '.svg': 'image/svg+xml', '.mjs': 'text/javascript', '.geojson': 'application/geo+json', '.png': 'image/png' };
const json = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
const readBody = req => new Promise((r, j) => { const c = []; let n = 0; req.on('data', x => { n += x.length; if (n > 16e6) { j(new Error('body too large')); req.destroy(); } else c.push(x); }); req.on('end', () => r(Buffer.concat(c))); req.on('error', j); });

export function loadConfig(file = process.env.EXPLORE_CONFIG || join(EXPLORE_ROOT, 'explore.config.json')) {
  const base = { mode: 'inprocess', kafka: {}, access: { defaultRead: ['role:analyst'], sources: {} }, principal: { id: 'local', roles: ['analyst'] }, streams: ['external'], views: [],
    connectors: [], mcp: { enabled: true, http: true, allowWrites: false, maxResults: 500, actAs: 'owner', principal: { id: 'mcp', roles: ['analyst'] } } };
  const c = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  const out = { ...base, ...c, access: { ...base.access, ...(c.access || {}) }, mcp: { ...base.mcp, ...(c.mcp || {}) }, kafka: { ...(c.kafka || {}) }, processor: { enabled: false, ...(c.processor || {}) }, er: { enabled: false, ...(c.er || {}) } };
  if (process.env.EXPLORE_MODE) out.mode = process.env.EXPLORE_MODE;          // inprocess | kafka
  if (process.env.KAFKA_BROKERS) out.kafka.brokers = process.env.KAFKA_BROKERS;
  if (process.env.EXPLORE_INSTANCE_ID) out.kafka.instanceId = process.env.EXPLORE_INSTANCE_ID;
  if (process.env.EXPLORE_PROCESSOR === '1') out.processor.enabled = true;    // optional Flink processor overlay (SPEC §18)
  return out;
}

/** Build the access policy: every known source gets defaultRead unless configured explicitly (unknown sources stay fail-closed). */
function accessFor(cfg, sourceIds) {
  const sources = {};
  for (const s of sourceIds) sources[s] = { read: cfg.access.defaultRead };
  for (const [k, v] of Object.entries(cfg.access.sources || {})) sources[k] = v;
  return { sources };
}

export async function createExplore({ graph = null, studio = null, config = loadConfig(), log = console.log, app = null, control = null, history = null } = {}) {
  const sourceIds = [SG_SOURCE, 'synthetic', config.mcp?.writeSourceId || 'mcp', ...config.streams, ...config.connectors.map(c => c.sourceId), ...(config.er?.enabled || process.env.EXPLORE_ER === '1' ? [config.er?.sourceId || 'er'] : [])];
  const service = new GraphService({ access: accessFor(config, sourceIds), resolution: config.resolution || [], conflictPolicy: config.conflictPolicy || 'field-merge-lww', fieldAttribution: !!config.fieldAttribution });
  const ingest = new StreamIngest(service, { ...(config.ingest || {}), derivedWriters: config.er?.enabled || process.env.EXPLORE_ER === '1' ? [config.er?.sourceId || 'er'] : [] });
  // change feed: every APPLIED event (MCP changes_since / recent_deltas, /api/explore/deltas). Resumable cursor, see changefeed.js
  const feed = new ChangeFeed({ size: config.changeFeedSize || (config.mode === 'kafka' ? 5000 : 2000) });
  ingest.onApplied = (st, e) => { if (e.op !== 'heartbeat') feed.push({ at: new Date().toISOString(), sourceId: st.sourceId, partition: st.partition, seq: e.seq, op: e.op, id: e.payload?.id ?? null, type: e.payload?.type ?? null, eventTime: e.eventTime ?? null }); };
  const receive = batch => ingest.receive(batch);
  const ex = { service, ingest, config, receive, feed, adapter: null, producers: new Map(), studio, mcpClients: [], kafka: null };
  Object.defineProperty(ex, 'deltaLog', { get: () => feed.entries, enumerable: true });
  // mode: inprocess (default) -> producers call ingest directly; kafka -> producers publish to graph.changes and the read
  // model is built by this instance's consumer group (explore/kafka/). See SPEC §17.
  ex.publish = receive;
  if (config.mode === 'kafka') {
    const { startKafka } = await import('../kafka/runtime.js');
    ex.kafka = await startKafka(ex, config, { log: log || (() => {}), dataDir: config.dataDir });
    ex.publish = ex.kafka.publisher && ex.kafka.config.publish ? b => ex.kafka.publisher.send(b) : null;
  } else if (config.mode !== 'inprocess') throw new Error(`unknown mode ${config.mode} (inprocess | kafka)`);
  // optional Flink stream processor (SPEC §18): off unless processor.enabled; needs kafka mode
  ex.processor = null;
  if (config.processor?.enabled) {
    const { startProcessor } = await import('../flink/integration.js');
    ex.processor = await startProcessor(ex, config, { log: log || (() => {}), dataDir: config.dataDir });
  }
  // optional entity resolution (SPEC §21): off unless er.enabled
  ex.er = null;
  const { erQueries } = await import('../er/queries.js');
  ex.erQueries = erQueries(ex);
  // geo (SPEC §22): read queries for the map viewer HTTP API and the MCP tools nodes_in_bbox / grid_counts
  const { geoQueries } = await import('./geo-queries.js');
  ex.geoQueries = geoQueries(ex);
  // Phase 1 core loop (SPEC §23): streamed k-hop neighbourhoods, paths, live growth, algorithms mapped to visual encoding
  const { core, CORE_IMPLEMENTATION } = await import('./core-loop-impl.js');
  ex.core = core; ex.coreImpl = CORE_IMPLEMENTATION; service.growWrong = !!core.growWrong;
  const { algoService } = await import('./algorithms.js');
  ex.algo = algoService(ex);
  // Phase 2 scale and readability (SPEC §24): server-side cluster overview, cluster members, cost estimates
  const { scaleService } = await import('./scale.js');
  ex.scale = scaleService(ex);
  if (config.er?.enabled || process.env.EXPLORE_ER === '1') {
    const { startEr } = await import('../er/integration.js');
    ex.er = await startEr(ex, config, { log: log || (() => {}), dataDir: config.dataDir });
  }
  const publish = b => (ex.publish ? ex.publish(b) : Promise.resolve({ batchId: b?.batchId, status: 'error', error: { code: 'not_publisher', message: 'this instance does not publish (kafka.publish=false)' } }));
  if (graph && !history && !process.env.EXPLORE_NO_HISTORY) { const { GraphHistory } = await import('./history.js'); history = new GraphHistory({ dataDir: config.dataDir || null, graph }); ex.ownHistory = true; }
  ex.history = history; ex.app = app; ex.control = control; ex.studio = studio;
  if (graph && ex.publish) { ex.adapter = new StreamGraphAdapter(graph, { send: publish }); if (history) { ex.adapter.onRow = r => history.onRow(r); ex.adapter.onSnapshot = () => history.reconcile(); } ex.adapter.start(); }

  // connectors (credentials only from environment variables, never from the browser)
  for (const c of config.connectors) {
    try { const conn = await makeConnector(c, ex); if (conn) { service.registerConnector(conn); log?.(`[explore] connector ${c.sourceId} (${c.kind}) registered`); } }
    catch (e) { log?.(`[explore] connector ${c.sourceId} not started: ${e.message}`); }
  }

  /** StreamGraph access rules (ABAC) applied on top of source permissions for items that came from StreamGraph.
   *  Integration change: fail closed (no engine or no user = no StreamGraph items), labels and keys are masked too, and the
   *  UI user is the one making the request (owner, or the "Test as" user), see explore/server/access.js. */
  ex.access = createAccess({ engine: studio?.engine || null, service, derivedTypes: () => (ex.er && studio?.engine ? Object.keys(ex.er.config.types) : null) });
  ex.guard = async (items, subjectId) => {
    if (!studio?.engine) return items.filter(it => !ex.access.fromSG(it) || (process.env.EXPLORE_ABAC === 'broken'));
    if (process.env.EXPLORE_ABAC === 'broken') return items;
    return ex.access.guard(items, subjectId);
  };
  { const base = config.uiActAs; Object.defineProperty(config, 'uiActAs', { configurable: true, enumerable: true, get: () => als.getStore()?.subjectId ?? base ?? (studio?.ownerId ? studio.ownerId() : null), set: v => { /* fixed per request */ } }); }
  // search must not match on fields the user cannot see (otherwise it is an oracle for hidden values)
  service.searchVisible = (it, q) => {
    if (!ex.access.fromSG(it) || !studio?.engine || !q || process.env.EXPLORE_ABAC === 'broken') return true;
    const subject = studio.engine.subject(config.uiActAs); if (!subject) return false;
    const e = studio.engine, key = String(it.id).replace(/^sg:node:[^:]+:/, ''), vk = e.viewKey ? e.viewKey(subject, it.type, key) : key;
    const hay = [vk, ...Object.entries(it.properties || {}).filter(([k, v]) => k !== 'key' && typeof v !== 'object' && ex.access.canSee(subject, it.type, k)).map(([, v]) => String(v))].join('\u0001').toLowerCase();
    return hay.includes(q);
  };

  const { studioRoutes } = await import('./studio-routes.js');
  ex.extra = studioRoutes(ex);
  // saved views (SPEC §19): server-side store next to the app data; node references are access-filtered on read
  ex.views = new SavedViewStore({ dir: config.viewsDir ?? config.dataDir ?? null });
  if (config.savedViews?.seedFile) { try { ex.views.importBundle(JSON.parse(readFileSync(config.savedViews.seedFile, 'utf8')), { seed: true, origin: 'seed' }); } catch (e) { log?.(`[explore] saved-view seed not loaded: ${e.message}`); } }
  /** ids -> Set of the node ids this principal (source policy) + StreamGraph user (ABAC) may see */
  ex.visibleIds = async (ids, principal = config.principal, actAs = config.uiActAs || null) =>
    new Set((await ex.guard(ids.map(id => service.live(id)).filter(it => it && it.kind === 'node').map(it => service.view(it, principal)).filter(Boolean), actAs)).map(n => n.id));
  ex.viewFor = async (id, principal, actAs) => { const v = ex.views.get(id); if (!v) return null; const { referencedIds } = await import('../shared/saved-views.js'); return ex.views.restrict(v, await ex.visibleIds(referencedIds(v.state), principal, actAs)); };

  ex.producer = sourceId => { let p = ex.producers.get(sourceId); if (!p) ex.producers.set(sourceId, p = new StreamProducer({ sourceId, producerId: `${sourceId}-${process.pid}`, send: publish, startSeq: ex.kafka ? 0 : ingest.cursor(sourceId).lastAppliedSeq })); return p; };
  /** Synthetic load through the real contract path (performance demos / benchmarks). */
  ex.synthetic = async (nodes = 10000, links = 20000, seed = 5) => {
    const p = ex.producer('synthetic'), r = rng(seed), types = ['Person', 'Account', 'Device', 'Company', 'Address', 'Phone', 'Email', 'Transaction'];
    const t0 = performance.now();
    for (let i = 0; i < nodes; i++) p.push('node.upsert', { id: `syn:node:${i}`, type: types[i % 8], label: `${types[i % 8]} ${i}`, properties: { score: Math.floor(r() * 100), community: Math.floor(i / 250) } });
    for (let j = 0; j < links; j++) {
      const c = Math.floor(r() * Math.ceil(nodes / 250)), a = Math.min(nodes - 1, c * 250 + Math.floor(r() * 250)), b = r() < 0.9 ? Math.min(nodes - 1, c * 250 + Math.floor(r() * 250)) : Math.floor(r() * nodes);
      p.push('link.upsert', { id: `syn:link:${j}`, type: r() < 0.5 ? 'KNOWS' : 'TRANSFER', fromId: `syn:node:${a}`, toId: `syn:node:${b === a ? (a + 1) % nodes : b}`, properties: { amount: Math.floor(r() * 1000) } });
    }
    await p.flush();
    return { nodes, links, ms: performance.now() - t0 };
  };

  // ---------------------------------------------------------------- HTTP
  const sessions = new Map(); // sessionId -> Set(res) for SSE
  ex.claims = p => p === '/explore' || p.startsWith('/explore/') || p.startsWith('/api/explore/') || p === '/mcp';
  ex.handle = async (req, res, url) => {
    const p = url.pathname;
    const body = async () => { if (req.sgBody !== undefined) return req.sgBody; const b = await readBody(req); return b.length ? JSON.parse(b) : {}; };
    try {
      if (p === '/mcp') { if (!ex.mcpHttp) return json(res, 404, { error: 'MCP HTTP endpoint is disabled' }); return await ex.mcpHttp(req, res); }
      if (p === '/explore/studio') return sendFile(res, join(PUBLIC, 'studio.html'));
      if (p === '/explore' || p === '/explore/') return sendFile(res, join(PUBLIC, 'index.html'));
      if (p === '/explore/bench' || p === '/explore/bench/') return sendFile(res, join(PUBLIC, 'bench.html')); // WebGPU vs WebGL benchmark (synthetic graphs made in the browser)
      if (p === '/api/explore/bench/webgpu' && req.method === 'POST') { // store a benchmark result as perf/webgpu-bench-<timestamp>.json (no graph data involved)
        const b = await body(), problems = validateBenchResult(b);
        if (problems.length) return json(res, 400, { error: 'not a valid benchmark result', problems: problems.slice(0, 20) });
        const dir = process.env.EXPLORE_BENCH_DIR || join(EXPLORE_ROOT, '..', 'perf'), name = benchFileName();
        mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, name), JSON.stringify(b, null, 2));
        return json(res, 200, { ok: true, file: `perf/${name}`, runs: b.runs.length });
      }
      if (p.startsWith('/explore/icons/') || p === '/api/explore/icons') return serveIcon(res, p, url, config);
      if (p.startsWith('/explore/')) { const f = normalize(join(PUBLIC, p.slice('/explore/'.length))); if (!f.startsWith(PUBLIC) || !existsSync(f)) return json(res, 404, { error: 'not found' }); return sendFile(res, f); }
      if (p === '/api/explore/session' && req.method === 'POST') {
        const b = await body();
        const r = service.openSession({ principal: config.principal, follow: b.follow !== false, types: b.types || null, initialSearch: b.search || null, grow: !!b.grow, growLinkTypes: Array.isArray(b.growLinkTypes) && b.growLinkTypes.length ? b.growLinkTypes : null, growMax: Math.min(Number(b.growMax) || 5000, 50000) });
        { const ss = service.session(r.sessionId); if (ss?.on) { const pend = [], keep = d => { if (pend.length < 5000) pend.push(d); }; ss.on('delta', keep); ss._early = { pend, keep }; setTimeout(() => { if (ss._early) { ss.off('delta', keep); ss._early = null; } }, 30000).unref?.(); } } // integration: hold deltas until the viewer subscribes, so a slow first reply causes no gap
        r.snapshot.items = await ex.guard(r.snapshot.items, config.uiActAs || null);
        return json(res, 200, r);
      }
      const m = p.match(/^\/api\/explore\/session\/([\w-]+)\/(\w+)$/);
      if (m) {
        const [, sid, cmd] = m, s = service.session(sid);
        if (cmd === 'events') {
          res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
          res.write(': connected\n\n');
          const onDelta = d => res.write(`event: delta\ndata: ${JSON.stringify(d)}\n\n`);
          if (s._early) { s.off('delta', s._early.keep); for (const d of s._early.pend) onDelta(d); s._early = null; }
          s.on('delta', onDelta);
          const ka = setInterval(() => res.write(': ka\n\n'), 15000);
          req.on('close', () => { clearInterval(ka); s.off('delta', onDelta); setTimeout(() => { if (!s.listenerCount('delta')) service.closeSession(sid); }, 60000).unref(); });
          return;
        }
        const b = await body();
        if (cmd === 'search') return json(res, 200, service.search(sid, b));
        if (cmd === 'expand') return json(res, 200, await service.expand(sid, b));
        if (cmd === 'release') return json(res, 200, service.release(sid, b.ids || []));
        if (cmd === 'path') return json(res, 200, service.path(sid, b));
        if (cmd === 'neighborhood') return streamNeighborhood(req, res, s, b, url);
        if (cmd === 'paths') { const r = await ex.core.findPaths(service, b, uiGuard, config.principal); if (r.found && b.adopt !== false) s.adopt(r.items); return json(res, 200, r); }
        if (cmd === 'summary') { const r = await ex.core.nodeSummary(service, url.searchParams.get('id') ?? b.id, uiGuard, config.principal); return r ? json(res, 200, r) : json(res, 404, { error: 'node not found or not visible' }); }
        if (cmd === 'resync') return json(res, 200, s.snapshot());
        if (cmd === 'follow') { s.follow = !!b.follow; return json(res, 200, { follow: s.follow }); }
        if (cmd === 'close') { service.closeSession(sid); return json(res, 200, { closed: true }); }
        return json(res, 404, { error: 'unknown command' });
      }
      if (p === '/api/explore/core/config') { const c = service.counts(); return json(res, 200, { counts: c, fullSnapshotMax: Number(process.env.EXPLORE_FULL_SNAPSHOT_MAX || config.ui?.fullSnapshotMax || 50000), scope: config.ui?.scope || 'auto', coreImpl: ex.coreImpl, algoImpl: ex.algo.implementation, uiWrong: process.env.CORE_UI_IMPL === 'wrong', scaleImpl: ex.scale.implementation, scaleUiWrong: process.env.SCALE_UI_IMPL === 'wrong', scaleLimits: ex.scale.limits, algorithms: ex.algo.defs, datasetCredit: config.datasetCredit || config.ui?.datasetCredit || null, limits: (await import('./core-loop.js')).NB_LIMITS }); }
      if (p === '/api/explore/algo/run' && req.method === 'POST') { const b = await body(); const r = await ex.algo.run(b, { principal: config.principal, actAs: config.uiActAs || null }); return json(res, 200, b.values === false ? ex.algo.summary(r) : r); }
      if (p === '/api/explore/clusters' || p === '/api/explore/clusters/members' || p === '/api/explore/cost') { // SPEC §24
        const b = req.method === 'POST' ? await body() : Object.fromEntries([...url.searchParams].map(([k, v]) => [k, k === 'scope' ? JSON.parse(v) : k === 'membership' ? v === '1' || v === 'true' : v]));
        const who = { principal: config.principal, actAs: config.uiActAs || null };
        if (p === '/api/explore/cost') return json(res, 200, await ex.scale.estimate(b, who));
        return json(res, 200, p.endsWith('/members') ? await ex.scale.members(b, who) : await ex.scale.overview(b, who));
      }
      if (p === '/api/explore/algo/results') return json(res, 200, { results: ex.algo.list() });
      const am = p.match(/^\/api\/explore\/algo\/result\/([\w-]+)$/);
      if (am) { const r = ex.algo.get(am[1]); if (!r) return json(res, 404, { error: `no result ${am[1]} (results are kept for the last 32 runs)` }); const ids = url.searchParams.get('ids')?.split(',').filter(Boolean); return json(res, 200, { ...ex.algo.summary(r), values: ids ? Object.fromEntries(ids.filter(i => i in r.values).map(i => [i, r.values[i]])) : r.values }); }
      if (p === '/api/explore/ingest' && req.method === 'POST') { // §6 ingest endpoint for external producers
        const b = await body();
        if (!config.streams.includes(b.sourceId)) return json(res, 403, { status: 'error', error: { code: 'forbidden', message: `sourceId ${b.sourceId} is not a configured stream (explore.config.json "streams")` } });
        return json(res, 200, await publish(b));
      }
      if (p === '/api/explore/cursor') return json(res, 200, ingest.cursor(url.searchParams.get('sourceId'), Number(url.searchParams.get('partition') || 0)));
      if (p === '/api/explore/search' && studio?.search) { // OpenSearch-backed search; the reply also passes the egress filter (filterResponse) like every explore reply
        const st = als.getStore(); const subject = st?.who?.subject || (studio.engine && config.uiActAs ? studio.engine.subject(config.uiActAs) : null);
        try { return json(res, 200, await studio.search.search(subject, req.method === 'POST' ? await body() : url.searchParams, { realIds: true })); } catch (e) { return json(res, 400, { error: e.message }); }
      }
      if (p === '/api/explore/search/status' && studio?.search) return json(res, 200, await studio.search.status());
      if (p === '/api/explore/stats') return json(res, 200, { counts: service.counts(), metrics: service.metrics, ingest: { ...ingest.metrics, streams: ingest.status() }, lag: service.lag, adapter: ex.adapter && { changes: ex.adapter.changes, snapshots: ex.adapter.snapshots }, connectors: [...service.connectors.keys()], mode: config.mode, kafka: ex.kafka?.stats(), processor: ex.processor ? ex.processor.stats() : { enabled: false }, er: ex.er ? { enabled: true, engine: ex.er.matcher.name, records: ex.er.engine.records.size, entities: ex.er.engine.entities.size } : { enabled: false } });
      if (p === '/api/explore/processor') return json(res, 200, ex.processor ? ex.processor.stats() : { enabled: false });
      if (p === '/api/explore/processor/metrics' && req.method === 'POST') { // derived metrics for nodes the UI may see
        if (!ex.processor) return json(res, 404, { error: 'processor disabled (explore.config.json processor.enabled)' });
        const b = await body(), ids = (Array.isArray(b.ids) ? b.ids : []).slice(0, 20000).map(String);
        const visible = new Set((await ex.guard(ids.map(id => service.live(id)).filter(it => it && it.kind === 'node' && service.view(it, config.principal)), config.uiActAs || null)).map(n => n.id));
        const metrics = {}; for (const id of visible) { const m = ex.processor.store.metricsFor(id); if (m) metrics[id] = m; }
        return json(res, 200, { metrics, alerts: ex.processor.store.alerts({ limit: 200 }).filter(a => visible.has(a.nodeId)), stats: ex.processor.stats() });
      }
      if (p.startsWith('/api/explore/er/')) { // entity resolution (SPEC §21.6): same access filtering as the MCP tools
        if (!ex.er && !config.er?.enabled) return json(res, 404, { error: 'entity resolution disabled (explore.config.json er.enabled)' });
        const who = { principal: config.principal, actAs: config.uiActAs || null }, q = url.searchParams;
        if (p === '/api/explore/er/stats') return json(res, 200, ex.er ? ex.er.stats() : { enabled: true, engine: null });
        if (p === '/api/explore/er/entity') { const r = await ex.erQueries.resolveEntity(q.get('id') || '', who); return json(res, r.error ? 404 : 200, r); }
        if (p === '/api/explore/er/why') { const r = await ex.erQueries.whyMatched(q.get('a') || '', q.get('b') || undefined, who); return json(res, r.error ? 404 : 200, r); }
        if (p === '/api/explore/er/possible') return json(res, 200, await ex.erQueries.listPossibleMatches({ entityId: q.get('entityId') || null, minScore: Number(q.get('minScore') || 0), limit: Math.min(1000, Number(q.get('limit') || 100)), ...who }));
        return json(res, 404, { error: 'not found' });
      }
      if (p.startsWith('/api/explore/geo/')) { // map viewer (SPEC §22): config + access-filtered geo queries (same as the MCP tools)
        const q = url.searchParams, who = { principal: config.principal, actAs: config.uiActAs || null };
        const list = k => q.get(k)?.split(',').filter(Boolean) || null, bb = () => (q.get('bbox') ? q.get('bbox').split(',').map(Number) : null);
        if (p === '/api/explore/geo/config') return json(res, 200, geoClientConfig(config, ex));
        if (p === '/api/explore/geo/bbox') return json(res, 200, await ex.geoQueries.nodesInBbox({ bbox: bb(), types: list('types'), limit: Math.min(5000, Number(q.get('limit') || 500)), ...who }));
        if (p === '/api/explore/geo/grid') return json(res, 200, await ex.geoQueries.gridCounts({ kind: q.get('kind') || 'h3', resolution: q.has('res') ? Number(q.get('res')) : undefined, bbox: bb(), types: list('types'), limit: Math.min(20000, Number(q.get('limit') || 5000)), includeStream: q.get('stream') === '1', ...who }));
        return json(res, 404, { error: 'not found' });
      }
      if (p === '/api/explore/views' && req.method === 'GET') return json(res, 200, { views: ex.views.list(), presentations: ex.views.listPresentations() });
      if (p === '/api/explore/views' && req.method === 'POST') { const r = ex.views.create(await body()); return json(res, 201, { view: await ex.viewFor(r.view.id), warnings: r.warnings }); }
      if (p === '/api/explore/views-export') return json(res, 200, ex.views.exportBundle(url.searchParams.get('ids')?.split(',').filter(Boolean) || null));
      if (p === '/api/explore/views-import' && req.method === 'POST') { const b = await body(); return json(res, 200, ex.views.importBundle(b.bundle ?? b, { mode: b.mode === 'replace' ? 'replace' : 'merge' })); }
      const vm = p.match(/^\/api\/explore\/views\/([\w-]+)$/);
      if (vm) {
        if (req.method === 'GET') { const v = await ex.viewFor(vm[1]); return v ? json(res, 200, v) : json(res, 404, { error: `no view ${vm[1]}` }); }
        if (req.method === 'PUT') { const r = ex.views.update(vm[1], await body()); return json(res, 200, { view: await ex.viewFor(r.view.id), warnings: r.warnings }); }
        if (req.method === 'DELETE') return json(res, 200, ex.views.delete(vm[1]));
      }
      if (p === '/api/explore/presentations') return json(res, 200, { presentations: ex.views.listPresentations() });
      const pm = p.match(/^\/api\/explore\/presentations\/([\w-]+)$/);
      if (pm && req.method === 'GET') { const d = ex.views.getPresentation(pm[1]); return d ? json(res, 200, d) : json(res, 404, { error: `no presentation ${pm[1]}` }); }
      if (pm && req.method === 'PUT') return json(res, 200, ex.views.putPresentation({ ...(await body()), id: pm[1] }));
      if (p === '/api/explore/deltas') { const since = Number(url.searchParams.get('since') || 0); return json(res, 200, { events: feed.entries.filter(d => d.n > since).slice(-500), cursor: feed.cursor() }); }
      if (p === '/api/explore/synthetic' && req.method === 'POST') { const b = await body(); return json(res, 200, await ex.synthetic(Math.min(b.nodes ?? 10000, 200000), Math.min(b.links ?? 20000, 400000))); }
      if (p.startsWith('/api/explore/connectors/') && req.method === 'POST') { const [, , , , sid, op] = p.split('/'); const b = await body(); const env = await service.fetchFromConnector(sid, op, b); return json(res, 200, { ...env, items: undefined, count: env.items.length }); }
      if (p.startsWith('/api/explore/x/')) return await ex.extra.handle(req, res, url, body);
      return json(res, 404, { error: 'not found' });
    } catch (e) { if (!res.headersSent) json(res, e.status || (e.code === 'not_found' ? 404 : e.code === 'conflict' ? 409 : 400), { error: e.message }); }
  };
  const uiGuard = items => ex.guard(items, config.uiActAs || null);
  // ---------------------------------------------------------------- ABAC boundary for /api/explore/* (integration)
  const inner = ex.handle, sessionOwner = new Map();
  const ADMIN_ONLY = (p, m) => (p === '/api/explore/ingest' || p === '/api/explore/bench/webgpu' || p === '/api/explore/synthetic' || p.startsWith('/api/explore/connectors/') || p === '/api/explore/views-import') && m !== 'GET';
  ex.handle = async (req, res, url) => {
    const p = url.pathname;
    if (!p.startsWith('/api/explore/') || p === '/api/explore/icons' || !studio?.whoIs) return inner(req, res, url);
    if (/\/events$/.test(p) && !req.headers['x-sg-as'] && url.searchParams.get('sg-as')) req.headers['x-sg-as'] = url.searchParams.get('sg-as'); // EventSource cannot send headers; same admin-only check in whoIs
    let who; try { who = await studio.whoIs(req); } catch (e) { return json(res, e.status || 403, { error: e.message }); }
    const subjectId = who.subject?.id; if (!subjectId) return json(res, 403, { error: 'No StreamGraph user: access denied' });
    if (ADMIN_ONLY(p, req.method) && !(await studio.isAdmin(who))) return json(res, 403, { error: 'Your access rules do not allow changing data here.' });
    const sm = p.match(/^\/api\/explore\/session\/([\w-]+)\//);
    if (sm && sessionOwner.has(sm[1]) && sessionOwner.get(sm[1]) !== subjectId) return json(res, 403, { error: 'This explore session belongs to another user.' });
    if (req.method !== 'GET' && req.method !== 'HEAD') { try { const b = await readBody(req); req.sgBody = ex.access.ingress(b.length ? JSON.parse(b) : {}); } catch (e) { return json(res, 400, { error: e.message }); } }
    for (const [k, v] of [...url.searchParams]) url.searchParams.set(k, v.split(',').map(x => ex.access.ingress(x)).join(','));
    filterResponse(res, subjectId, v => { if (p === '/api/explore/session' && v?.sessionId) sessionOwner.set(v.sessionId, subjectId); });
    return als.run({ subjectId, who }, () => inner(req, res, url));
  };
  function filterResponse(res, subjectId, onJson) {
    const W = res.write.bind(res), E = res.end.bind(res), H = res.writeHead.bind(res), eg = v => ex.access.egress(v, subjectId);
    let type = '', code = 200, head = {}, chain = Promise.resolve(), buf = '', sse = ''; const jb = [];
    const line = async l => { if (!l.trim()) return l; let v; try { v = await eg(JSON.parse(l)); } catch { return null; } return v === DROP ? null : JSON.stringify(v); };
    res.writeHead = (c, h = {}) => { code = c; head = h; type = String(h['content-type'] || ''); if (type.startsWith('application/json')) return res; return H(c, h); };
    res.write = chunk => {
      const s = String(chunk);
      if (type.startsWith('application/json')) { jb.push(s); return true; }
      if (type.startsWith('application/x-ndjson')) { chain = chain.then(async () => { buf += s; let i; while ((i = buf.indexOf('\n')) >= 0) { const o = await line(buf.slice(0, i)); buf = buf.slice(i + 1); if (o != null) W(o + '\n'); } }); return true; }
      if (type.startsWith('text/event-stream')) { chain = chain.then(async () => { // filter whole events: a data line can arrive split over several writes
        sse += s; let i;
        while ((i = sse.indexOf('\n\n')) >= 0) {
          const block = sse.slice(0, i), lines = block.split('\n'), data = lines.filter(l => l.startsWith('data:')).map(l => l.slice(l.startsWith('data: ') ? 6 : 5)); sse = sse.slice(i + 2);
          if (!data.length) { W(block + '\n\n'); continue; }
          const o = await line(data.join('\n')); if (o == null) { if (process.env.SG_DEBUG_EGRESS) console.log('[egress] dropped event', data.join('').slice(0, 400)); continue; } // hidden or unreadable: the event is left out
          W([...lines.filter(l => !l.startsWith('data:')), 'data: ' + o].join('\n') + '\n\n');
        } }); return true; }
      return W(chunk);
    };
    res.end = chunk => {
      if (chunk != null && chunk !== '') res.write(chunk);
      chain = chain.then(async () => {
        if (!type.startsWith('application/json')) return E();
        let v; try { v = await eg(JSON.parse(jb.join('') || 'null')); } catch { v = DROP; }
        if (v !== DROP) onJson?.(v);
        const out = v === DROP ? JSON.stringify({ error: 'not found or not visible' }) : JSON.stringify(v);
        H(v === DROP ? 404 : code, { ...head, 'content-type': 'application/json' }); E(out);
      });
      return res;
    };
  }
  /** NDJSON stream of a k-hop neighbourhood (SPEC §23.2): one JSON object per line; items join the session working set. */
  async function streamNeighborhood(req, res, s, b, url) {
    const stream = b.stream !== false && url.searchParams.get('stream') !== '0';
    if (!stream) { const r = await ex.core.neighborhood(service, b, uiGuard, config.principal); s.adopt([...r.nodes, ...r.links]); return json(res, 200, r); }
    res.writeHead(200, { 'content-type': 'application/x-ndjson', 'cache-control': 'no-cache', 'x-content-type-options': 'nosniff' });
    let closed = false; req.on('close', () => { closed = true; });
    res.write(JSON.stringify({ type: 'start', seeds: b.seeds || [], hops: b.hops ?? 1, maxNodes: b.maxNodes ?? null }) + '\n');
    try {
      for await (const c of ex.core.neighborhoodStream(service, b, uiGuard, config.principal)) {
        if (closed) return;
        if (c.type === 'chunk') s.adopt([...c.nodes, ...c.links]);
        if (!res.write(JSON.stringify(c) + '\n')) await new Promise(r => res.once('drain', r));
        if (b.slowMs) await new Promise(r => setTimeout(r, Math.min(2000, Number(b.slowMs)))); // test hook: proves the client renders chunks progressively
      }
    } catch (e) { res.write(JSON.stringify({ type: 'error', error: e.message }) + '\n'); }
    res.end();
  }
  ex.close = async (o = {}) => { ex.extra?.close(); if (ex.ownHistory) ex.history?.close(); ex.adapter?.stop(); await ex.adapter?.flush().catch(() => {}); await ex.er?.close(o); await ex.processor?.close(o); await ex.kafka?.close(o); for (const c of ex.mcpClients) await c.close?.(); for (const s of [...service.sessions.keys()]) service.closeSession(s); };
  return ex;
}
// ---------------------------------------------------------------- map viewer config (SPEC §22.2)
// Default basemap: OpenFreeMap "liberty" (OpenStreetMap data, ODbL; free, no key, usage allowed incl. commercial, attribution
// required). Never the openstreetmap.org tile servers by default (their tile policy forbids heavy/app use). 'offline' = the
// bundled Natural Earth (public domain) vector countries only, no network. Override with geo.styleUrl / geo.tileUrl.
export const GEO_DEFAULTS = {
  basemap: 'auto', // auto (online style, falls back to offline if it does not load) | online | offline
  styleUrl: 'https://tiles.openfreemap.org/styles/liberty',
  tileUrl: null, // raster XYZ template instead of a style, e.g. a tile server you run or are licensed to use
  attribution: '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> <a href="https://www.openmaptiles.org/" target="_blank">&copy; OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
  offlineAttribution: 'Basemap: <a href="https://www.naturalearthdata.com/" target="_blank">Natural Earth</a> (public domain)',
  offlineData: '/explore/geo/ne_110m_admin_0_countries.geojson',
  fallbackMs: 6000, defaultGrid: null, // e.g. { kind: 'h3', resolution: 3 } to open the map with a grid
};
function geoClientConfig(config, ex) {
  const g = { ...GEO_DEFAULTS, ...(config.geo || {}) };
  if (process.env.EXPLORE_BASEMAP) g.basemap = process.env.EXPLORE_BASEMAP;
  return { basemap: g.basemap, styleUrl: g.styleUrl, tileUrl: g.tileUrl, attribution: g.tileUrl ? (g.tileAttribution || g.attribution) : g.attribution, offlineAttribution: g.offlineAttribution, offlineData: g.offlineData,
    fallbackMs: g.fallbackMs, defaultGrid: g.defaultGrid, streamGeo: !!ex.processor?.store?.geoEnabled, streamGeoResolution: ex.processor?.config?.geo?.resolution ?? null };
}
// ---------------------------------------------------------------- icon sets (SPEC §20.3)
// Bundled: Lucide (ISC) and Majesticons line/solid (MIT), served from node_modules. Custom: SVG folders under
// explore/icons-custom/<set>/ or <data dir>/icons/<set>/ (the style file must name each custom set with its licence).
const NM = join(EXPLORE_ROOT, '..', 'node_modules');
const iconDirs = config => ({
  lucide: [[join(NM, 'lucide-static', 'icons'), '']],
  'majesticons-line': [[join(NM, 'majesticons', 'line'), '-line'], [join(NM, 'majesticons', 'line'), '']],
  'majesticons-solid': [[join(NM, 'majesticons', 'solid'), '']],
  custom: set => [join(EXPLORE_ROOT, 'icons-custom', set), ...(config.viewsDir || config.dataDir ? [join(config.viewsDir || config.dataDir, 'icons', set)] : [])].map(d => [d, '']),
});
async function serveIcon(res, p, url, config) {
  const D = iconDirs(config);
  if (p === '/api/explore/icons') {
    const { readdirSync } = await import('node:fs');
    const list = dirs => { const out = new Set(); for (const [d, suf] of dirs) { try { for (const f of readdirSync(d)) if (f.endsWith(`${suf}.svg`)) out.add(f.slice(0, -(`${suf}.svg`).length)); } catch {} } return [...out].sort(); };
    const set = url.searchParams.get('set');
    if (!set) return json(res, 200, { sets: [{ id: 'lucide', license: 'ISC', count: list(D.lucide).length }, { id: 'majesticons:line', license: 'MIT', count: list(D['majesticons-line']).length }, { id: 'majesticons:solid', license: 'MIT', count: list(D['majesticons-solid']).length }] });
    const dirs = set.startsWith('custom:') ? (/^[a-z0-9][a-z0-9_-]{0,40}$/.test(set.slice(7)) ? D.custom(set.slice(7)) : []) : D[set.replace(':', '-')] || [];
    return json(res, 200, { set, icons: list(dirs).filter(n => !url.searchParams.get('q') || n.includes(url.searchParams.get('q'))) });
  }
  const m = p.match(/^\/explore\/icons\/(lucide|majesticons-line|majesticons-solid|custom\/([a-z0-9][a-z0-9_-]{0,40}))\/([a-z0-9][a-z0-9-]{0,80})\.svg$/);
  if (!m) return json(res, 404, { error: 'not found' });
  const dirs = m[2] ? D.custom(m[2]) : D[m[1]];
  for (const [d, suf] of dirs) { const f = join(d, `${m[3]}${suf}.svg`); if (existsSync(f)) { res.writeHead(200, { 'content-type': 'image/svg+xml', 'cache-control': 'max-age=86400' }); return res.end(await readFile(f)); } }
  return json(res, 404, { error: `no icon ${m[3]} in ${m[1]}` });
}
async function sendFile(res, f) { res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream', 'cache-control': 'no-cache' }); res.end(await readFile(f)); }

async function makeConnector(c, ex) {
  const env = n => (n ? process.env[n] : undefined);
  if (c.kind === 'neo4j') {
    const neo4j = (await import('neo4j-driver')).default;
    const pass = env(c.passwordEnv);
    const driver = neo4j.driver(c.url, neo4j.auth.basic(c.user || 'neo4j', pass || ''), { disableLosslessIntegers: false });
    const { Neo4jConnector } = await import('./connectors/neo4j.js');
    return new Neo4jConnector({ ...c, driver, secrets: [pass] });
  }
  if (c.kind === 'postgres') {
    const pg = (await import('pg')).default;
    const conn = env(c.connectionStringEnv);
    const pool = new pg.Pool({ connectionString: conn, max: 4 });
    const { PostgresConnector } = await import('./connectors/postgres.js');
    return new PostgresConnector({ ...c, pool, secrets: [conn, conn && new URL(conn).password] });
  }
  if (c.kind === 'http') { const { HttpConnector } = await import('./connectors/http.js'); return new HttpConnector({ ...c, headers: Object.fromEntries(Object.entries(c.headerEnv || {}).map(([k, v]) => [k, env(v) || ''])) }); }
  if (c.kind === 'mcp') { const { McpSource } = await import('./connectors/mcp.js'); const m = new McpSource({ ...c, send: b => (ex.publish ? ex.publish(b) : ex.receive(b)) }); await m.start(); ex.mcpClients.push(m); return m; }
  throw new Error(`unknown connector kind ${c.kind}`);
}
