// Guided (no-code) studio API: workspace, wizard, linking, clean-up, explore, home.
import { readFile, writeFile, mkdir, chmod, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { parseCsv } from '../sources/file.js';
import { openDb, ident } from '../db.js';
import { evaluate } from '../expr.js';
import { applyTransform } from '../transforms.js';
import { Pipeline } from '../flow.js';
import { GraphStore } from '../graph.js';
import { compileWorkspace, compileQuestion, cleanupToSteps, RULES, PRESETS } from './compile.js';
import { suggestMatches, suggestRelationships, suggestMapping } from './match.js';
import { PolicyStore } from '../abac/policy.js';
import { AbacEngine, ACTIONS, MASK } from '../abac/engine.js';
import { viewGraph, viewRows } from '../abac/guard.js';
import { SyncOut } from '../syncout/index.js';
import { cypherFor } from '../graph.js';

const KINDS = ['csv', 'json', 'api', 'database', 'stream'];
const slug = s => String(s || 'source').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30) || 'source';
const hidden = k => k.startsWith('_src_');
const plainProps = p => Object.fromEntries(Object.entries(p || {}).filter(([k]) => !hidden(k)));

// Turn low-level errors into sentences a non-technical person can act on.
export function friendlyError(e, s = {}) {
  const m = String(e?.message || e), st = s.settings || {}, where = st.host || st.url || st.brokers || st.file || st.path || '';
  if (e?.friendly) return m;
  if (/ENOENT|no such file/i.test(m)) return `We couldn't find the file${where ? ` "${basename(where)}"` : ''}. Try uploading it again.`;
  if (/ECONNREFUSED/i.test(m)) return `Nothing answered at ${where}. Check the address and that the service is running.`;
  if (/ENOTFOUND|getaddrinfo/i.test(m)) return `We couldn't find the address ${where}. Check it for typos.`;
  if (/timed? ?out|ETIMEDOUT/i.test(m)) return `${where || 'The service'} took too long to answer. Check the address and your network.`;
  if (/password authentication|28P01|SASL|authenticat/i.test(m)) return 'The username or password was not accepted.';
  if (/HTTP 40[13]/.test(m)) return 'The service said no. Check the access key.';
  if (/HTTP 404/.test(m)) return 'That web address does not exist (404). Check the link.';
  if (/HTTP \d+/.test(m)) return `The service had a problem (${m.match(/HTTP \d+/)[0]}). Try again later.`;
  if (/no such table|does not exist/i.test(m)) return `We couldn't find the table "${st.table}". Pick one from the list.`;
  if (/Unexpected token|JSON|not valid/i.test(m)) return "That doesn't look like JSON data.";
  if (/Bad identifier/.test(m)) return 'Table and column names can only use letters, numbers and underscores.';
  if (/Invalid URL|Failed to parse URL/i.test(m)) return 'That web address is not complete. It should start with http:// or https://';
  if (/fetch failed/i.test(m)) return `We couldn't reach ${where}. Check the address and that the service is running.`;
  return `Something went wrong: ${m}`;
}
const fail = msg => Object.assign(new Error(msg), { friendly: true });
const autoItems = body => { // find the list of records inside an API response
  if (Array.isArray(body)) return { rows: body, itemsPath: '' };
  if (body && typeof body === 'object') { const k = Object.keys(body).find(k => Array.isArray(body[k])); if (k) return { rows: body[k], itemsPath: k }; return { rows: [body], itemsPath: '' }; }
  return { rows: [], itemsPath: '' };
};

export async function createStudio({ app, dataDir }) {
  await mkdir(join(dataDir, 'uploads'), { recursive: true });
  const wsFile = join(dataDir, 'workspace.json'), secFile = join(dataDir, 'secrets.json');
  let ws = existsSync(wsFile) ? JSON.parse(await readFile(wsFile, 'utf8')) : { name: 'My knowledge graph', sources: [], entities: {}, relationships: [], linked: false, asked: false };
  let secrets = existsSync(secFile) ? JSON.parse(await readFile(secFile, 'utf8')) : {};
  const recent = [];
  // ---- access rules (ABAC) and sync-out
  const policy = new PolicyStore(join(dataDir, 'policy.db'));
  const engine = new AbacEngine(policy, { auditFile: join(dataDir, 'audit.ndjson') });
  const syncout = new SyncOut({ graph: app.graph, engine, checkpointFile: join(dataDir, 'sync-checkpoints.json'), secret: id => secrets[`sink_${id}`], factories: app.sinkFactories || {}, intervalMs: app.syncIntervalMs || 1000 });
  ws.sinks ??= [];
  await syncout.load(); await syncout.configure(ws.sinks); syncout.start();
  const updateKeyFields = () => { const k = {}; for (const s of ws.sources) (k[s.entity] ??= []).push(...new Set([s.key, s.rawKey].filter(Boolean))); engine.keyFields = k; };
  updateKeyFields();
  let regVer = -1;
  app.onTick = () => { if (app.graph.version === regVer) return; regVer = app.graph.version; try { policy.register(app.graph.schema()); } catch { /* keep the last snapshot */ } };
  const ownerId = () => policy.read().settings.activeUser || 'owner';
  const admin = async who => (await engine.decide({ subject: who.actor, action: 'admin', entity: 'Project', env: { via: 'ui' } })).allow;
  async function whoIs(req) {
    app.onTick(); // make sure every type and field in the data has a policy entry before deciding
    const actor = engine.subject(ownerId()), as = req.headers['x-sg-as'];
    if (!as || as === actor?.id) return { actor, subject: actor };
    if (!(await admin({ actor }))) throw Object.assign(fail('Only admins can preview as another user.'), { status: 403 });
    const subject = engine.subject(as); if (!subject) throw fail(`There is no user "${as}".`);
    return { actor, subject, testAs: as };
  }
  const save = async () => { await writeFile(wsFile, JSON.stringify(ws, null, 2)); await writeFile(secFile, JSON.stringify(secrets)); await chmod(secFile, 0o600).catch(() => {}); }; // chmod is a no-op on Windows; the file inherits the user profile's ACLs there
  const srcName = id => ws.sources.find(s => s.id === id)?.name || id;

  app.resolveSecrets = flow => JSON.parse(JSON.stringify(flow).replace(/\{\{secret:([\w-]+)(\|url)?\}\}/g, (_, id, url) => {
    const v = secrets[id] ?? ''; const out = url ? encodeURIComponent(v) : v; return JSON.stringify(out).slice(1, -1);
  }));
  app.onApplied = ({ ev, ops }) => {
    const n = ops.find(o => o.label); if (!n) return;
    const what = `${n.label} ${n.key}`, from = srcName(ev.topic);
    recent.unshift({ at: Date.now(), text: n.op === 'del-node' ? `Removed ${what} (${from})` : n.created ? `New ${what} from ${from}` : `Updated ${what} from ${from}` });
    recent.length = Math.min(recent.length, 40);
  };
  const publicWs = () => ({ ...ws, sources: ws.sources.map(({ sampleRows, ...s }) => ({ ...s, secret: s.hasSecret ? '••••••••' : '' })) });

  // ---- reading data for previews, tests and matching
  async function readRows(s, secret, limit = 500) {
    const st = s.settings || {};
    switch (s.kind) {
      case 'csv': case 'json': {
        if (!st.path) throw fail('Upload a file first.');
        const text = (await readFile(st.path, 'utf8')).replace(/^\uFEFF/, '');
        let rows;
        if (s.kind === 'csv' || st.path.endsWith('.csv')) rows = parseCsv(text);
        else if (/\.(nd)?jsonl?$/.test(st.path) && text.trim().startsWith('{') && text.trim().includes('\n')) rows = text.split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
        else rows = autoItems(JSON.parse(text)).rows;
        if (!rows.length) throw fail('The file has no rows we can read.');
        return { rows: rows.slice(0, limit) };
      }
      case 'api': {
        if (!/^https?:\/\//.test(st.url || '')) throw fail('That web address is not complete. It should start with http:// or https://');
        const ctl = AbortSignal.timeout(6000);
        const res = await fetch(st.url, { headers: secret ? { Authorization: `Bearer ${secret}` } : {}, signal: ctl });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json();
        const { rows, itemsPath } = st.itemsPath ? { rows: await evaluate(st.itemsPath, body), itemsPath: st.itemsPath } : autoItems(body);
        return { rows: (Array.isArray(rows) ? rows : [rows]).slice(0, limit), itemsPath };
      }
      case 'database': {
        const cfg = st.driver === 'sqlite' ? { driver: 'sqlite', database: resolve(st.file || '') } : { driver: 'postgres', connectionString: `postgres://${encodeURIComponent(st.user || 'postgres')}:${encodeURIComponent(secret || '')}@${st.host || 'localhost'}:${st.port || 5432}/${st.database}` };
        if (cfg.driver === 'sqlite' && !existsSync(cfg.database)) throw fail(`We couldn't find the database file "${st.file}".`);
        const db = await openDb(cfg);
        try {
          const tables = (await db.all(cfg.driver === 'sqlite' ? "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name" : "SELECT table_name AS name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1")).map(r => r.name);
          if (!st.table) return { rows: [], tables };
          if (!tables.includes(st.table)) throw fail(`We couldn't find the table "${st.table}". Pick one from the list.`);
          const rows = await db.all(`SELECT * FROM ${ident(st.table)} LIMIT ${Number(limit)}`);
          const timeCol = Object.keys(rows[0] || {}).find(c => /^(updated|modified|changed)(_at|_on)?$|last_?modified/i.test(c));
          return { rows, tables, timeColumn: timeCol };
        } finally { await db.close(); }
      }
      case 'stream': {
        if (!st.brokers) throw fail('Enter the address of the live feed server.');
        const { Kafka, logLevel } = await import('kafkajs');
        const kafka = new Kafka({ clientId: 'streamgraph-test', brokers: String(st.brokers).split(',').map(x => x.trim()), connectionTimeout: 3000, retry: { retries: 0 }, logLevel: logLevel.NOTHING,
          ...(secret ? { ssl: true, sasl: { mechanism: 'plain', username: st.user, password: secret } } : {}) });
        const admin = kafka.admin();
        try {
          await Promise.race([admin.connect(), new Promise((_, j) => setTimeout(() => j(new Error('timed out')), 4000))]);
          const feeds = await admin.listTopics();
          if (st.feed && !feeds.includes(st.feed)) throw fail(`The live feed "${st.feed}" does not exist on that server.`);
          let rows = [];
          if (st.example) { try { const v = JSON.parse(st.example); rows = Array.isArray(v) ? v : [v]; } catch { throw fail("The example message doesn't look like JSON data."); } }
          return { rows, feeds };
        } finally { await admin.disconnect().catch(() => {}); }
      }
      default: throw fail('Pick a kind of source.');
    }
  }
  const columnsOf = rows => [...new Set(rows.flatMap(r => Object.keys(r || {})))];
  async function rowsFor(s) { if (s.sampleRows?.length) return s.sampleRows; try { return (await readRows(s, secrets[s.id])).rows; } catch { return []; } }

  async function restart() {
    updateKeyFields();
    app.flow = { ...compileWorkspace(ws), baseDir: app.flow.baseDir };
    if (ws.sources.length) await app.run('continuous'); else await app.stop();
  }

  // Build the graph once in a scratch store to show what linking would produce.
  async function linkedSample(draft) {
    const tmp = { ...ws, ...draft, sources: ws.sources.filter(s => s.kind !== 'stream') };
    const g = new GraphStore(), p = new Pipeline(app.resolveSecrets({ ...compileWorkspace(tmp), baseDir: app.flow.baseDir }), { graph: g });
    await p.runOnce();
    const out = {};
    for (const label of new Set(tmp.sources.map(s => s.entity))) {
      const nodes = g.nodes(label), multi = nodes.filter(n => Object.keys(n.props).filter(hidden).length > 1);
      out[label] = { total: nodes.length, inSeveral: multi.length, examples: multi.slice(0, 4).map(n => ({ key: n.key, sources: Object.keys(n.props).filter(hidden).map(k => srcName(k.slice(5))), props: plainProps(n.props) })) };
    }
    const rels = (tmp.relationships || []).map(r => {
      const s = tmp.sources.find(x => x.id === r.source), type = r.type || `HAS_${s.entity.toUpperCase()}`;
      const rows = g.query(`(a:${r.toEntity})-[:${type}]->(b:${s.entity})`, 1000);
      return { sentence: `Each ${s.entity} belongs to ${/^[AEIOU]/i.test(r.toEntity) ? 'an' : 'a'} ${r.toEntity} via ${r.field}`, links: rows.length, examples: rows.slice(0, 3).map(x => `${x.a.props.name || x.a.key} → ${s.entity} ${x.b.key}`) };
    });
    return { entities: out, relationships: rels, errors: p.lastErrors };
  }

  async function exploreMeta(subject) {
    const sch = app.graph.schema(), nodes = app.graph.nodes();
    const okType = new Map();
    for (const t of [...sch.nodeTypes.map(x => x.label), ...sch.edgeTypes.map(x => x.type)]) okType.set(t, (await engine.decide({ subject, action: 'read', entity: t })).allow);
    sch.nodeTypes = sch.nodeTypes.filter(t => okType.get(t.label));
    sch.edgeTypes = sch.edgeTypes.filter(e => okType.get(e.type)).map(e => ({ ...e, from: e.from.filter(x => okType.get(x)), to: e.to.filter(x => okType.get(x)) }));
    const entities = sch.nodeTypes.map(t => {
      const ns = nodes.filter(n => n.label === t.label), fields = {};
      for (const f of t.props.filter(p => !hidden(p) && engine.visible(subject, t.label, p))) {
        const vals = [...new Set(ns.map(n => n.props[f]).filter(v => v != null && v !== ''))];
        fields[f] = { type: vals.every(v => typeof v === 'number') ? 'number' : 'text', values: (vals.length <= 25 ? vals : vals.slice(0, 25)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)), many: vals.length > 25 };
      }
      const rel = [...sch.edgeTypes.filter(e => e.from.includes(t.label)).flatMap(e => e.to.map(to => ({ edge: e.type, dir: 'out', entity: to }))),
        ...sch.edgeTypes.filter(e => e.to.includes(t.label)).flatMap(e => e.from.map(fr => ({ edge: e.type, dir: 'in', entity: fr })))];
      return { label: t.label, count: t.count, fields, related: rel };
    });
    const ideas = [];
    for (const e of entities) for (const r of e.related.filter(r => r.dir === 'out').slice(0, 2)) {
      const cands = Object.entries(e.fields).filter(([k, v]) => v.type === 'text' && !/(^|_)id$|^sku$/i.test(k) && v.values.length > 1 && v.values.length <= 6 && v.values.length < e.count && v.values.every(x => isNaN(Number(x))));
      const f = cands.find(([, v]) => v.values.includes('gold')) || cands.find(([k]) => /tier|status|level|segment|type/i.test(k)) || cands[0];
      const v = f && (f[1].values.includes('gold') ? 'gold' : f[1].values[0]);
      ideas.push(f ? { text: /tier|status|level|segment|type/i.test(f[0]) ? `Show ${v} ${e.label.toLowerCase()}s and their ${r.entity.toLowerCase()}s` : `Show ${e.label.toLowerCase()}s where ${f[0]} is ${v} and their ${r.entity.toLowerCase()}s`, question: { entity: e.label, filters: [{ field: f[0], op: 'is', value: v }], related: { ...r, filters: [] } } }
        : { text: `Show ${e.label.toLowerCase()}s and their ${r.entity.toLowerCase()}s`, question: { entity: e.label, filters: [], related: { ...r, filters: [] } } });
    }
    ideas.sort((a, b) => (b.question.filters[0]?.value === 'gold') - (a.question.filters[0]?.value === 'gold'));
    return { entities, ideas: ideas.slice(0, 6) };
  }

  function home() {
    const st = app.state(), now = Date.now();
    const sources = ws.sources.map(s => {
      const x = st.steps[`src_${s.id}`] || {};
      let health = 'green', note = 'Working';
      if (x.lastErrorAt && (!x.lastPollAt || x.lastErrorAt >= x.lastPollAt)) { health = 'red'; note = friendlyError({ message: x.lastError }, s); }
      else if (!st.running) { health = 'amber'; note = 'Paused'; }
      else if (!x.out) { health = 'amber'; note = 'Connected, waiting for the first records'; }
      return { id: s.id, name: s.name, kind: s.kind, entity: s.entity, health, note, records: x.out || 0, perMinute: x.perMinute || 0, lastUpdate: x.lastAt || null, keepInSync: s.keepInSync !== false };
    });
    const linkedNeeded = ws.sources.length >= 2;
    return { running: st.running, counts: st.counts, perMinute: sources.reduce((t, s) => t + s.perMinute, 0), lastUpdate: Math.max(0, ...sources.map(s => s.lastUpdate || 0)) || null,
      sources, demo: !!ws.demo, recent: recent.slice(0, 12), entities: st.schema.nodeTypes.map(n => ({ label: n.label, count: n.count })),
      checklist: [
        { id: 'add', text: 'Add your first data source', done: ws.sources.length >= 1 },
        { id: 'add2', text: 'Add a second source to combine', done: ws.sources.length >= 2 },
        { id: 'link', text: 'Connect your sources', done: linkedNeeded && !!ws.linked },
        { id: 'clean', text: 'Tidy up a field (optional)', done: ws.sources.some(s => s.cleanup?.length) },
        { id: 'ask', text: 'Ask your first question', done: !!ws.asked },
      ], now };
  }

  async function loadDemo() {
    const demo = await app.startDemo(), d = app.demoDir, sinksKeep = ws.sinks || [];
    const api = `http://127.0.0.1:${app.port}/demo/api/loyalty`;
    const add = (name, kind, settings, entity, key) => ({ id: slug(name), name, kind, settings, entity, key, rawKey: key, keepInSync: true, syncEverySec: kind === 'json' && settings.path.endsWith('.ndjson') ? 1 : 3, cleanup: [] });
    ws = { name: 'Demo shop', entities: {}, relationships: [], linked: false, asked: false, demo: true, sources: [
      { ...add('Customers spreadsheet', 'csv', { path: join(d, 'customers.csv') }, 'Customer', 'id'), fields: { name: 'name', email: 'email', signup: 'signup' } },
      { ...add('Loyalty program API', 'api', { url: api }, 'Customer', 'cust_id'), fields: { tier: 'tier', points: 'points' } },
      { ...add('Products list', 'json', { path: join(d, 'products.json') }, 'Product', 'sku'), fields: { name: 'name', price: 'price', category: 'category' } },
      { ...add('Orders feed', 'json', { path: join(d, 'orders.ndjson') }, 'Order', 'order_id'), fields: { total: 'total', qty: 'qty', ts: 'ts', customer_id: 'customer_id', sku: 'sku' } },
      { ...add('Inventory database', 'database', { driver: 'sqlite', file: join(d, 'shop.db'), table: 'inventory', changedColumn: 'updated_at' }, 'Product', 'sku'), fields: { stock: 'stock', warehouse: 'warehouse' } },
    ] };
    ws.sinks = sinksKeep; secrets = Object.fromEntries(Object.entries(secrets).filter(([k]) => k.startsWith('sink_'))); recent.length = 0; void demo;
    // Demo sensitivity: customers are personal data (tag pii, classification 1); email is high, points medium, the rest low.
    policy.setEntity('Customer', { tags: ['pii'], classification: 1 });
    for (const [e, fs] of Object.entries({ Customer: { id: 'low', cust_id: 'low', name: 'low', signup: 'low', tier: 'low', email: 'high', points: 'medium' }, Product: { sku: 'low', name: 'low', price: 'low', category: 'low', stock: 'low', warehouse: 'low' }, Order: { order_id: 'low', total: 'low', qty: 'low', ts: 'low', customer_id: 'low', sku: 'low' } }))
      for (const [f, s] of Object.entries(fs)) policy.setField(e, f, s);
    for (const e of ['Product', 'Order', 'HAS_ORDER', 'HAS_PRODUCT']) policy.setEntity(e, { tags: [], classification: 0 });
    await save(); await restart();
  }

  const freshWs = () => ({ name: 'My knowledge graph', sources: [], entities: {}, relationships: [], linked: false, asked: false });
  async function resetProject() {
    await app.reset();                          // stops sources and feeds, clears graph, flow and mapping
    await syncout.reset(); policy.reset(); regVer = -1; engine.log({ user: ownerId(), action: 'admin', entity: 'Project', allow: true, why: 'Project reset: data, sources, outputs and access rules cleared' });
    ws = freshWs(); ws.sinks = []; secrets = {}; recent.length = 0; updateKeyFields();
    const up = join(dataDir, 'uploads');
    for (const f of await readdir(up).catch(() => [])) await rm(join(up, f), { recursive: true, force: true, maxRetries: 3 });
    for (const f of await readdir(dataDir)) if (f.endsWith('.json') && f !== 'workspace.json' && f !== 'secrets.json') await rm(join(dataDir, f), { force: true }); // copied flows
    await save();                               // overwrite rather than delete: no Windows file-lock surprises
    return home();
  }
  function backup() {
    const { baseDir, ...flow } = app.flow;
    return { kind: 'streamgraph-backup', version: 1, exportedAt: new Date().toISOString(), note: 'Passwords and access keys are not included.',
      workspace: publicWs(), access: (({ settings: { salt, opa, ...s }, ...p }) => ({ ...p, settings: { ...s, opa: { ...opa, token: undefined } } }))(policy.read()), flow, graph: { nodes: app.graph.nodes(), edges: app.graph.edges() } };
  }
  async function ask(question, subject, action, limit = 500) {
    const { pattern, where } = compileQuestion(question);
    const used = [{ e: question?.entity, f: question?.filters || [] }, { e: question?.related?.entity, f: question?.related?.filters || [] }];
    for (const u of used) for (const f of u.f) if (u.e && f.field && !engine.visible(subject, u.e, f.field)) throw fail(`You can't filter on "${f.field}" because it is hidden for you.`);
    const raw = app.graph.query(pattern, limit, where);
    const v = await viewRows(engine, subject, action, raw, { via: action === 'export' ? 'export' : 'ui' });
    const cols = new Set(), masked = new Set();
    const table = v.rows.map(r => { const o = {}; for (const n of Object.values(r)) if (n?.label) { const pre = n.label; o[pre] = n.props.name && n.props.name !== MASK ? n.props.name : n.key; (n.masked || []).forEach(m => masked.add(`${pre} ${m}`)); for (const [k, val] of Object.entries(n.props)) if (k !== 'name' && !/(^|_)id$|^sku$/i.test(k)) o[`${pre} ${k}`] = val; } Object.keys(o).forEach(k => cols.add(k)); return o; });
    return { count: v.rows.length, hidden: v.hidden, deniedTypes: v.deniedTypes, masked: [...masked], columns: [...cols], table, graph: v.rows, compiled: { pattern, where } };
  }
  const csv = (cols, rows) => { const q = x => `"${String(x ?? '').replace(/"/g, '""')}"`; return [cols.map(q).join(','), ...rows.map(r => cols.map(c => q(r[c])).join(','))].join('\r\n') + '\r\n'; };
  function accessView() {
    const p = policy.read(), byEntity = {};
    for (const f of Object.values(p.fields)) (byEntity[f.entity] ??= []).push({ field: f.field, sensitivity: f.sensitivity });
    const { salt, opa, ...settings } = p.settings;
    return { users: p.users, rules: p.rules, version: p.version,
      entities: Object.entries(p.entities).filter(([k]) => k !== 'Project').map(([label, a]) => ({ label, ...a, fields: (byEntity[label] || []).sort((x, y) => x.field.localeCompare(y.field)) })),
      settings: { ...settings, opa: { enabled: !!opa?.enabled, url: opa?.url, timeoutMs: opa?.timeoutMs, hasToken: !!opa?.token } }, actions: ACTIONS, audit: engine.audit.slice(0, 40), loadError: engine.loadError || null,
      note: 'There is no real login yet: everyone using this app on this computer acts as the Owner. "Test as" previews what another user would see. OAuth 2.0 / Keycloak sign-in is the next step.' };
  }
  async function matrix(userId) {
    const subject = engine.subject(userId); if (!subject) throw fail(`There is no user "${userId}".`);
    const p = policy.read(), out = [];
    for (const e of Object.keys(p.entities).filter(k => k !== 'Project')) {
      const row = { entity: e, actions: {}, fields: [] };
      for (const a of ACTIONS) { const d = await engine.decide({ subject, action: a, entity: e, env: { via: a === 'sync-out' ? 'sync-out' : 'ui' } }); row.actions[a] = { allow: d.allow, trace: d.trace }; }
      for (const f of Object.values(p.fields).filter(f => f.entity === e)) row.fields.push({ field: f.field, sensitivity: f.sensitivity, visible: engine.visible(subject, e, f.field) });
      out.push(row);
    }
    return { user: subject, entities: out };
  }
  const sinkPublic = () => ({ sinks: ws.sinks.map(s => ({ ...s, secret: s.hasSecret ? '••••••••' : '' })), status: syncout.status(), users: Object.values(policy.read().users).map(u => ({ id: u.id, name: u.name })) });
  const OPEN = new Set(['GET /api/studio/workspace', 'GET /api/studio/home', 'GET /api/studio/explore', 'POST /api/studio/ask', 'POST /api/studio/export.csv', 'GET /api/studio/search']);
  const handlers = {
    'POST /api/studio/reset': async (_, __, b) => { if (b?.confirm !== 'RESET') throw fail('To start a new project, confirm with RESET.'); return resetProject(); },
    'GET /api/studio/backup': async (req, url, _b, res) => { res.setHeader('content-disposition', `attachment; filename="streamgraph-backup-${new Date().toISOString().slice(0, 10)}.json"`); return backup(); },
    'GET /api/studio/workspace': () => ({ workspace: publicWs(), rules: Object.fromEntries(Object.entries(RULES).map(([k, v]) => [k, v.label])), presets: PRESETS, kinds: KINDS }),
    'GET /api/studio/home': () => home(),
    'POST /api/studio/upload': async (req, url) => {
      const name = basename(url.searchParams.get('name') || 'upload.csv').replace(/[^\w.\-]+/g, '_');
      if (!/\.(csv|json|ndjson|jsonl)$/i.test(name)) throw fail('Upload a .csv or .json file.');
      const buf = await (await import('../app.js')).readBody(req);
      if (buf.length > 20e6) throw fail('That file is larger than 20 MB.');
      const path = join(dataDir, 'uploads', `${Date.now()}-${name}`); await writeFile(path, buf);
      return { path, name };
    },
    // Wizard step 2-3: test the connection and preview the first rows. Secret may come from the form or, when editing, from the server store.
    'POST /api/studio/test': async (_, __, b) => {
      const s = { kind: b.kind, settings: b.settings || {} };
      try {
        const r = await readRows(s, b.secret || (b.id && secrets[b.id]) || '', 200);
        const columns = columnsOf(r.rows);
        return { ok: true, message: r.rows.length ? `Connected. We found ${r.rows.length}${r.rows.length >= 200 ? '+' : ''} records.` : 'Connected.', preview: r.rows.slice(0, 8), columns,
          tables: r.tables, feeds: r.feeds, itemsPath: r.itemsPath, timeColumn: r.timeColumn, suggestion: r.rows.length ? suggestMapping(r.rows, b.name || '', Object.keys(ws.entities || {}).concat(ws.sources.map(x => x.entity))) : null };
      } catch (e) { return { ok: false, message: friendlyError(e, s) }; }
    },
    'POST /api/studio/sources': async (_, __, b) => {
      if (!KINDS.includes(b.kind)) throw fail('Pick a kind of source.');
      if (!b.name?.trim()) throw fail('Give this source a name.');
      if (!b.entity?.trim() || !/^[A-Za-z]\w*$/.test(b.entity.trim())) throw fail('Pick what this data is about, using letters only (for example Customer).');
      if (!b.key) throw fail('Pick the field that identifies each record.');
      let id = b.id || slug(b.name); if (!b.id) { let n = 2; const base = id; while (ws.sources.some(s => s.id === id)) id = `${base}_${n++}`; }
      const prev = ws.sources.find(s => s.id === id);
      const entity = b.entity.trim()[0].toUpperCase() + b.entity.trim().slice(1);
      const src = { id, name: b.name.trim(), kind: b.kind, settings: { ...b.settings }, entity, key: b.key, rawKey: b.key, fields: b.fields || {}, keepInSync: b.keepInSync !== false,
        syncEverySec: b.syncEverySec || 5, cleanup: b.cleanup || prev?.cleanup || [], hasSecret: !!(b.secret || (prev?.hasSecret && secrets[id])), sampleRows: b.kind === 'stream' ? (b.sampleRows || []) : undefined };
      if (b.secret) secrets[id] = b.secret;
      delete src.settings.password; delete src.settings.token; // never persist secrets in the workspace file
      ws.sources = prev ? ws.sources.map(s => (s.id === id ? src : s)) : [...ws.sources, src];
      await save(); await restart();
      return { id, workspace: publicWs() };
    },
    'DELETE /api/studio/sources': async (_, url) => {
      const id = url.searchParams.get('id'); ws.sources = ws.sources.filter(s => s.id !== id); ws.relationships = ws.relationships.filter(r => r.source !== id); delete secrets[id];
      await save(); await restart(); return { workspace: publicWs() };
    },
    'GET /api/studio/suggestions': async () => {
      const srcs = await Promise.all(ws.sources.map(async s => ({ id: s.id, name: s.name, entity: s.entity, key: s.key, rows: await rowsFor(s) })));
      const matches = suggestMatches(srcs);
      const rules = { ...Object.fromEntries(Object.entries(ws.entities).map(([k, v]) => [k, v.rule])), ...Object.fromEntries(matches.map(m => [m.entity, m.rule])) };
      const keyed = srcs.map(s => { const m = matches.find(m => m.a.source === s.id || m.b.source === s.id); return m ? { ...s, key: m.a.source === s.id ? m.a.field : m.b.field } : s; });
      return { matches, relationships: suggestRelationships(keyed, rules), current: { entities: ws.entities, relationships: ws.relationships }, sources: srcs.map(s => ({ id: s.id, name: s.name, entity: s.entity, key: s.key, columns: columnsOf(s.rows) })) };
    },
    // draft = { matches: [{a:{source,field}, b:{source,field}, rule, entity}], relationships: [...] } -> workspace keys/rules
    'POST /api/studio/linked-sample': async (_, __, b) => linkedSample(applyLinks(structuredClone(ws), b)),
    'POST /api/studio/links': async (_, __, b) => { ws = applyLinks(ws, b); ws.linked = true; await save(); await restart(); return { workspace: publicWs() }; },
    'POST /api/studio/cleanup-preview': async (_, __, b) => {
      const s = ws.sources.find(x => x.id === b.sourceId); if (!s) throw fail('Pick a source.');
      const before = (await rowsFor(s)).slice(0, 8), after = [];
      const steps = cleanupToSteps(b.cleanup || []);
      for (const r of before) { let ev = { op: 'c', topic: s.id, data: r }; for (const st of steps) { ev = ev && await applyTransform(st, ev); } after.push(ev ? ev.data : null); }
      return { before, after, kept: after.filter(Boolean).length };
    },
    'POST /api/studio/cleanup': async (_, __, b) => {
      const s = ws.sources.find(x => x.id === b.sourceId); if (!s) throw fail('Pick a source.');
      cleanupToSteps(b.cleanup || []); s.cleanup = b.cleanup || [];
      for (const c of s.cleanup) if (c.do === 'combine' && c.into && !Object.values(s.fields).includes(c.into)) s.fields[c.into.toLowerCase().replace(/\W+/g, '_')] = c.into;
      await save(); await restart(); return { workspace: publicWs() };
    },
    'GET /api/studio/explore': (req, url, b, res, who) => exploreMeta(who.subject),
    'POST /api/studio/ask': async (_, __, b, res, who) => {
      const r = await ask(b.question, who.subject, 'query', b.limit || 500);
      if (!ws.asked && !who.testAs) { ws.asked = true; await save(); }
      return { ...r, testAs: who.testAs || null };
    },
    'POST /api/studio/export.csv': async (_, __, b, res, who) => {
      const r = await ask(b.question, who.subject, 'export', 5000);
      res.setHeader('content-disposition', 'attachment; filename="streamgraph-results.csv"');
      return { __raw: csv(r.columns, r.table), type: 'text/csv; charset=utf-8' };
    },
    'GET /api/studio/search': async (_, url, b, res, who) => {
      const q = String(url.searchParams.get('q') || '').toLowerCase();
      const v = await viewGraph(engine, who.subject, 'read', app.graph.nodes(), [], { via: 'ui' });
      const hit = n => String(n.key).toLowerCase().includes(q) || Object.values(n.props).some(x => x !== MASK && String(x).toLowerCase().includes(q)); // hidden values are never searched
      return { results: v.nodes.filter(hit).slice(0, 50) };
    },
    // ---- access rules
    'GET /api/studio/access': () => accessView(),
    'POST /api/studio/access/user': async (_, __, b) => { policy.putUser({ ...b, clearance: Number(b.clearance) }); return accessView(); },
    'DELETE /api/studio/access/user': async (_, url) => { policy.deleteUser(url.searchParams.get('id')); return accessView(); },
    'POST /api/studio/access/rule': async (_, __, b) => {
      const r = b.rule || {}; if (!String(r.name || '').trim()) throw fail('Give the rule a short description.');
      if (!(r.actions || []).length) throw fail('Pick at least one thing people can do.');
      const id = r.id || `rule-${Date.now().toString(36)}`, before = policy.read().rules.find(x => x.id === id);
      policy.putRule({ ...r, id, enabled: r.enabled !== false });
      if (!(await engine.decide({ subjectId: 'owner', action: 'admin', entity: 'Project', env: { via: 'ui' } })).allow) { // never let a rule lock the owner out
        if (before) policy.putRule(before); else policy.deleteRule(id);
        throw fail('That rule would stop you (the owner) from managing this project, so it was not added.');
      }
      return accessView();
    },
    'DELETE /api/studio/access/rule': async (_, url) => { policy.deleteRule(url.searchParams.get('id')); return accessView(); },
    'POST /api/studio/access/field': async (_, __, b) => { policy.setField(b.entity, b.field, b.sensitivity); return accessView(); },
    'POST /api/studio/access/entity': async (_, __, b) => { policy.setEntity(b.entity, { tags: (b.tags || []).map(t => String(t).trim().toLowerCase()).filter(Boolean), classification: Number(b.classification) }); return accessView(); },
    'POST /api/studio/access/opa': async (_, __, b) => {
      const cur = policy.read().settings.opa || {};
      if (b.url && !/^https?:\/\//.test(b.url)) throw fail('The OPA address should start with http:// or https://');
      policy.setSettings({ opa: { ...cur, enabled: !!b.enabled, url: b.url || cur.url, timeoutMs: Number(b.timeoutMs) || cur.timeoutMs || 1000, ...(b.token ? { token: b.token } : {}) } }); return accessView();
    },
    'POST /api/studio/access/explain': async (_, __, b) => { const subject = engine.subject(b.user); if (!subject) throw fail(`There is no user "${b.user}".`); return engine.decide({ subject, action: b.action, entity: b.entity, env: { via: b.via || 'ui' } }); },
    'POST /api/studio/access/matrix': async (_, __, b) => matrix(b.user),
    'GET /api/studio/access/audit': () => ({ audit: engine.audit }),
    // ---- sync-out (live output connectors)
    'GET /api/studio/sinks': () => sinkPublic(),
    'POST /api/studio/sinks/test': async (_, __, b) => {
      try { await syncout.test({ kind: b.kind, settings: b.settings || {}, password: b.secret || (b.id && secrets[`sink_${b.id}`]) || undefined }); return { ok: true, message: 'Connected.' }; }
      catch (e) { return { ok: false, message: friendlyError(e) }; }
    },
    'POST /api/studio/sinks': async (_, __, b) => {
      if (!['neo4j', 'memgraph', 'postgres', 'kafka'].includes(b.kind)) throw fail('Pick where to send the data.');
      if (!String(b.name || '').trim()) throw fail('Give this output a name.');
      if (!engine.subject(b.asUser || 'sync-service')) throw fail('Pick who the data is sent as.');
      if (b.kind === 'kafka' && !b.settings?.topic) throw fail('Enter the live feed (topic) name to publish to.');
      const id = b.id || `${slug(b.name)}_${Date.now().toString(36).slice(-4)}`;
      if (b.secret && b.secret !== '••••••••') secrets[`sink_${id}`] = b.secret;
      const settings = { ...(b.settings || {}) }; delete settings.password;
      const s = { id, name: b.name.trim(), kind: b.kind, settings, asUser: b.asUser || 'sync-service', enabled: b.enabled !== false, hasSecret: !!secrets[`sink_${id}`] };
      ws.sinks = ws.sinks.some(x => x.id === id) ? ws.sinks.map(x => (x.id === id ? s : x)) : [...ws.sinks, s];
      await save(); await syncout.configure(ws.sinks); return sinkPublic();
    },
    'DELETE /api/studio/sinks': async (_, url) => { const id = url.searchParams.get('id'); ws.sinks = ws.sinks.filter(s => s.id !== id); delete secrets[`sink_${id}`]; await save(); await syncout.configure(ws.sinks); return sinkPublic(); },
    'POST /api/studio/sinks/sync-now': async () => { await syncout.cycle(); return sinkPublic(); },
    'POST /api/studio/demo': async () => { await loadDemo(); return { workspace: publicWs() }; },
    'POST /api/studio/pause': async () => { await app.stop(); return home(); },
    'POST /api/studio/resume': async () => { await restart(); return home(); },
  };

  function applyLinks(target, b) {
    for (const m of b.matches || []) {
      if (!RULES[m.rule]) throw fail('Pick how to compare the values.');
      target.entities[m.entity] = { rule: m.rule };
      for (const side of [m.a, m.b]) { const s = target.sources.find(x => x.id === side.source); if (s) { s.key = side.field; if (!s.fields[side.field]) s.fields[slug(side.field)] = side.field; } }
    }
    if (b.relationships) target.relationships = b.relationships.map(r => {
      if (!/^[A-Za-z]\w*$/.test(r.toEntity || '')) throw fail('Linked things need a simple name such as Customer.');
      const s = target.sources.find(x => x.id === r.source); if (!s) throw fail('Pick a source for the link.');
      return { source: r.source, field: r.field, toEntity: r.toEntity, type: r.type || `HAS_${s.entity.toUpperCase()}` };
    });
    return target;
  }

  return {
    async handle(req, res, url) {
      const h = handlers[`${req.method} ${url.pathname}`];
      const send = (code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
      if (!h) {
        const other = Object.keys(handlers).find(k => k.endsWith(' ' + url.pathname));
        if (other) { res.setHeader('allow', other.split(' ')[0]); return send(405, { error: `Use ${other.split(' ')[0]} for this.` }); }
        return send(404, { error: 'not found' });
      }
      try {
        const who = await whoIs(req);
        if (!OPEN.has(`${req.method} ${url.pathname}`) && !(await admin(who))) return send(403, { error: 'Your access rules do not allow managing this project.' });
        const b = req.method === 'POST' && url.pathname !== '/api/studio/upload' ? await (async () => { const { readBody } = await import('../app.js'); const x = await readBody(req); return x.length ? JSON.parse(x) : {}; })() : undefined;
        const out = await h(req, url, b, res, who);
        if (out?.__raw !== undefined) { res.writeHead(200, { 'content-type': out.type }); return res.end(out.__raw); }
        send(200, out);
      } catch (e) { send(e.status || 400, { error: friendlyError(e) }); }
    },
    // Access rules for the advanced API: graph, query and Cypher export are filtered; config changes need admin.
    async guardApp(req, res, url) {
      const p = url.pathname, send = (code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
      try {
        const who = await whoIs(req), env = { via: 'api' };
        if (p === '/api/graph') { const v = await viewGraph(engine, who.subject, 'read', app.graph.nodes(), app.graph.edges(), env); send(200, { nodes: v.nodes, edges: v.edges, version: app.graph.version, hidden: v.hidden }); return true; }
        if (p === '/api/query' && req.method === 'POST') { const { readBody } = await import('../app.js'); const x = await readBody(req); const { pattern, limit, where } = x.length ? JSON.parse(x) : {}; const v = await viewRows(engine, who.subject, 'query', app.graph.query(pattern, limit, where), env); send(200, { rows: v.rows, hidden: v.hidden }); return true; }
        if (p === '/api/export.cypher') { const v = await viewGraph(engine, who.subject, 'export', app.graph.nodes(), app.graph.edges(), { via: 'export' }); res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' }); res.end(cypherFor(v.nodes, v.edges)); return true; }
        if (p === '/api/state' || p === '/api/events') return false;
        if (!(await admin(who))) { send(403, { error: 'Your access rules do not allow managing this project.' }); return true; }
        return false;
      } catch (e) { send(e.status || 400, { error: friendlyError(e) }); return true; }
    },
    get workspace() { return ws; }, secrets: () => secrets, resetProject, backup, policy, engine, syncout, home, exploreMeta, linkedSample,
  };
}
