// Studio endpoints added by the integration, all under /api/explore/x/* so the ABAC boundary in app.js filters every reply:
//   processing (Kafka + Flink, Duke/Splink), entity-match review, history, editing, comments, case notebooks, SVG export,
//   query builder / Cypher, plain-English questions, text summaries, RDF import/export.
import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { als } from './access.js';
import { runQuery, parseCypher, toCypher, normalize } from './query.js';
import { rulesProvider, summarize } from './nl/rules.js';
import { toRdf, fromRdf } from './rdf.js';
import { renderSvg } from './export-svg.js';
import { wikiApi } from './wiki-api.js';
import jsonld from 'jsonld';
import { stringify as yamlStringify } from 'yaml';

export const PROVIDERS = { rules: rulesProvider };
const fail = (status, message) => Object.assign(new Error(message), { status });
const send = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
const sgId = id => { const s = String(id || ''); if (!s.startsWith('sg:node:')) throw fail(400, 'Only things from your StreamGraph sources can be changed here.'); return s.slice(8); };
const TYPE_RE = /^[A-Za-z]\w{0,60}$/, REL_RE = /^[A-Za-z_]\w{0,60}$/;
const scalar = v => v === null || ['string', 'number', 'boolean'].includes(typeof v);
// wiki decision: Markdown files are the source of truth and graph->file write-back is off, so wiki items are read-only here
const WIKI_RO = 'This came from a Markdown wiki. Edit the note file (or use the wiki write tools); graph-to-file write-back is off.';

export function studioRoutes(ex) {
  const { service, studio } = ex, engine = studio?.engine, graph = ex.app?.graph;
  const dir = ex.config.dataDir || null; if (dir) mkdirSync(dir, { recursive: true });
  const db = new DatabaseSync(dir ? join(dir, 'investigate.db') : ':memory:');
  db.exec(`CREATE TABLE IF NOT EXISTS comments(id TEXT PRIMARY KEY, target TEXT, author TEXT, text TEXT, at INTEGER);
    CREATE TABLE IF NOT EXISTS notebooks(id TEXT PRIMARY KEY, title TEXT, author TEXT, at INTEGER);
    CREATE TABLE IF NOT EXISTS entries(id TEXT PRIMARY KEY, nb TEXT, kind TEXT, text TEXT, ids TEXT, view TEXT, at INTEGER);
    CREATE TABLE IF NOT EXISTS decisions(id TEXT PRIMARY KEY, a TEXT, b TEXT, decision TEXT, note TEXT, author TEXT, at INTEGER, ra TEXT, rb TEXT);
    CREATE TABLE IF NOT EXISTS kv(k TEXT PRIMARY KEY, v TEXT);`);
  try { db.exec('ALTER TABLE decisions ADD COLUMN ra TEXT'); db.exec('ALTER TABLE decisions ADD COLUMN rb TEXT'); } catch {} // older investigate.db
  const kv = { get: (k, d) => { const r = db.prepare('SELECT v FROM kv WHERE k=?').get(k); return r ? JSON.parse(r.v) : d; }, set: (k, v) => db.prepare('INSERT INTO kv(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v').run(k, JSON.stringify(v)) };
  const who = () => als.getStore()?.who || null;
  const subject = () => who()?.subject || null;
  const author = () => who()?.actor?.id || subject()?.id || 'unknown';
  const isAdmin = async () => !!(engine && subject() && (await engine.decide({ subject: subject(), action: 'admin', entity: 'Project', env: { via: 'ui' } })).allow); // the acting user ("Test as" previews stay previews)
  const requireAdmin = async () => { if (!(await isAdmin())) throw fail(403, 'Your access rules do not allow managing this project.'); };
  const decide = async (action, entity) => !!(engine && subject() && (await engine.decide({ subject: subject(), action, entity, env: { via: 'ui' } })).allow);
  const needWrite = async type => { if (engine && !engine.snap?.entities?.[type]) { if (await isAdmin()) return; throw fail(403, `Only admins can add a new kind of thing (${type}).`); } if (!(await decide('write', type))) throw fail(403, `Your access rules do not allow editing ${type}s.`); };
  const canSee = (type, field) => !engine || !subject() ? false : ex.access.canSee(subject(), type, field);
  const view = it => service.view(it, ex.config.principal);
  const audit = (entity, why) => engine?.log({ user: author(), action: 'write', entity, via: 'ui', allow: true, why });
  const live = id => { const it = service.live(id); return it && !it.deleted ? it : null; };
  const visibleItems = async ids => (await ex.guard(ids.map(live).filter(Boolean).map(view).filter(Boolean), subject()?.id)).filter(Boolean);
  const meta = () => { const types = new Set(), fields = {}; for (const it of service.items.values()) if (!it.deleted && it.kind === 'node') { types.add(it.type); const f = (fields[it.type] ??= new Set()); for (const k of Object.keys(it.properties || {})) f.add(k); } return { types: [...types].sort(), fields: Object.fromEntries(Object.entries(fields).map(([t, s]) => [t, [...s].filter(f => canSee(t, f)).sort()])) }; };

  // reviewer decisions survive restarts and engine switches: replay them into the matching engine once it is up
  const replay = async () => { // returns true once every decision could be applied (the engine loads its records shortly after start)
    const eng = ex.er?.engine; if (!eng?.decide) return false; const rows = db.prepare('SELECT * FROM decisions WHERE ra IS NOT NULL ORDER BY at').all(); if (!rows.length) return true;
    if (!rows.every(d => eng.records.has(d.ra) && eng.records.has(d.rb))) return false;
    const all = []; for (const d of rows) all.push(...(await eng.decide(d.ra, d.rb, d.decision)).events); if (all.length) await ex.er.publish?.(all); return true; };
  let tries = 0; const replayTimer = setInterval(() => { replay().then(done => { if (done || ++tries > 30) clearInterval(replayTimer); }, e => { clearInterval(replayTimer); ex.log?.(`[er] replay decisions: ${e.message}`); }); }, 1000); replayTimer.unref?.();

  // ---------------- editing (written to the StreamGraph store: sync-out and history pick the change up from its change log)
  async function edit(ops) {
    if (!graph) throw fail(400, 'Editing needs the StreamGraph store.');
    if (!Array.isArray(ops) || !ops.length || ops.length > 500) throw fail(400, 'Send between 1 and 500 changes.');
    const done = [];
    for (const o of ops) {
      if (o.op === 'addNode') {
        if (!TYPE_RE.test(o.type || '')) throw fail(400, 'Give the new thing a simple type name, like Person.');
        const key = String(o.key ?? '').trim(); if (!key) throw fail(400, 'Give the new thing an identifier.');
        await needWrite(o.type); const props = clean(o.props);
        const id = `${o.type}:${key}`; if (graph.hasNode(id)) throw fail(409, `${o.type} ${key} already exists.`);
        graph.upsertNode(id, o.type, key, { ...props, ...(props.name == null && o.name ? { name: String(o.name) } : {}) }); audit(o.type, `Added ${o.type} ${key} in the graph explorer`); try { ex.app?.onTick?.(); } catch {} done.push({ op: o.op, id: `sg:node:${id}` });
      } else if (o.op === 'setProps') {
        const id = sgId(o.id), n = graph.getNode(id); if (!n) throw fail(404, 'That thing no longer exists.');
        if (n.props?.wiki_vault) throw fail(409, WIKI_RO);
        await needWrite(n.label); const props = clean(o.props);
        for (const f of Object.keys(props)) if (!canSee(n.label, f)) throw fail(403, `You can't change "${f}" because it is hidden for you.`);
        graph.upsertNode(id, n.label, n.key, props); audit(n.label, `Changed ${Object.keys(props).join(', ')} on ${n.label} in the graph explorer`); done.push({ op: o.op, id: o.id });
      } else if (o.op === 'deleteNode') {
        const id = sgId(o.id), n = graph.getNode(id); if (!n) throw fail(404, 'That thing no longer exists.');
        if (n.props?.wiki_vault) throw fail(409, WIKI_RO);
        await needWrite(n.label); graph.deleteNode(id); audit(n.label, `Removed a ${n.label} in the graph explorer`); done.push({ op: o.op, id: o.id });
      } else if (o.op === 'addEdge') {
        if (!REL_RE.test(o.type || '')) throw fail(400, 'Give the connection a simple name, like KNOWS.');
        const f = sgId(o.from), t = sgId(o.to), a = graph.getNode(f), b = graph.getNode(t); if (!a || !b) throw fail(404, 'Both ends must exist.');
        await needWrite(o.type); for (const x of [a, b]) if (!(await decide('read', x.label))) throw fail(403, 'You can only connect things you can see.');
        const type = o.type.toUpperCase(), eid = graph.upsertEdge(type, f, t, clean(o.props)); audit(type, `Connected ${a.label} to ${b.label} (${type}) in the graph explorer`); done.push({ op: o.op, id: `sg:link:${eid}` });
      } else if (o.op === 'deleteEdge') {
        const id = String(o.id || '').replace(/^sg:link:/, ''), e = graph.edges().find(x => x.id === id); if (!e) throw fail(404, 'That connection no longer exists.');
        if (e.props?.wiki_vault) throw fail(409, WIKI_RO);
        await needWrite(e.type); graph.deleteEdge(id); audit(e.type, `Removed a ${e.type} connection in the graph explorer`); done.push({ op: o.op, id: o.id });
      } else throw fail(400, `Unknown change "${o.op}".`);
    }
    try { ex.app?.onTick?.(); } catch {} // register new types and fields with the access rules (new fields start hidden)
    await ex.adapter?.flush?.();
    return { ok: true, done, note: 'Saved to your graph. Outputs on "Send data out" receive the change within a few seconds. A later re-sync of a source can overwrite edited fields of records that source owns.' };
  }
  function clean(p = {}) { const out = {}; for (const [k, v] of Object.entries(p || {})) { if (!/^[A-Za-z][\w ]{0,60}$/.test(k) || k === 'key') throw fail(400, `"${k}" is not a field name you can set.`); if (!scalar(v)) throw fail(400, 'Field values must be text, numbers or yes/no.'); out[k.replace(/ /g, '_')] = v; } return out; }

  // ---------------- routes
  const R = {
    'GET /api/explore/x/processing': async () => ex.control ? ex.control.status(ex) : { available: false },
    'POST /api/explore/x/processing': async b => { await requireAdmin(); if (!ex.control) throw fail(400, 'Not available in this mode.'); const er = b.er && { ...b.er }; if (er?.engine && !['duke', 'splink'].includes(er.engine)) throw fail(400, 'Pick Duke or Splink.');
      if (er?.types) for (const [t, p] of Object.entries(er.types)) if (!TYPE_RE.test(t) || !['person', 'organization', 'none'].includes(p)) throw fail(400, 'Each type is a person, an organization or not matched.');
      if (er?.types) er.types = Object.fromEntries(Object.entries(er.types).filter(([, p]) => p !== 'none'));
      return ex.control.apply({ stream: b.stream, er }); },
    'GET /api/explore/x/processing/metrics': async () => {
      if (!ex.processor) return { enabled: false };
      const ids = [...service.items.values()].filter(it => it.kind === 'node' && !it.deleted).map(it => it.id);
      const vis = new Set((await visibleItems(ids)).map(n => n.id)), rows = [];
      for (const id of vis) { const m = ex.processor.store.metricsFor(id); if (m) rows.push({ id, label: live(id)?.label, type: live(id)?.type, ...m }); }
      rows.sort((a, b) => (b.degree ?? 0) - (a.degree ?? 0));
      return { enabled: true, stats: ex.processor.stats(), top: rows.slice(0, 25), alerts: ex.processor.store.alerts({ limit: 100 }).filter(a => vis.has(a.nodeId)).map(a => ({ ...a, label: live(a.nodeId)?.label, type: live(a.nodeId)?.type })) };
    },
    'GET /api/explore/x/er/review': async () => {
      const decisions = db.prepare('SELECT * FROM decisions ORDER BY at DESC LIMIT 200').all();
      if (!ex.er) return { enabled: false, matches: [], decisions };
      const r = await ex.erQueries.listPossibleMatches({ minScore: 0, limit: 200, principal: ex.config.principal, actAs: subject()?.id });
      const decided = new Set(decisions.map(d => [d.a, d.b].sort().join('|')));
      return { enabled: true, engine: ex.er.matcher.name, matches: r.matches.filter(m => !decided.has([m.entityA, m.entityB].sort().join('|'))), decisions };
    },
    'POST /api/explore/x/er/decide': async b => {
      if (!['same', 'different'].includes(b.decision)) throw fail(400, 'Decide "same" or "different".');
      const A = live(b.a), B = live(b.b); if (!A || !B) throw fail(404, 'Both records must exist.');
      if ((await visibleItems([b.a, b.b])).length < 2) throw fail(404, 'Both records must be visible to you.');
      const recs = it => (it.id.startsWith('sg:node:') ? [it] : [...service.items.values()].filter(l => l.kind === 'link' && !l.deleted && l.type === (ex.er?.config.resolvesType || 'RESOLVES_TO') && l.toId === it.id).map(l => live(l.fromId)).filter(x => x && x.id.startsWith('sg:node:')));
      const ra = recs(A)[0], rb = recs(B)[0], type = b.decision === 'same' ? 'SAME_AS' : 'NOT_SAME_AS';
      let written = null;
      if (ra && rb && graph) { await needWrite(type); written = (await edit([{ op: 'addEdge', type, from: ra.id, to: rb.id, props: { decided_by: author(), decided_at: new Date().toISOString(), ...(b.score != null ? { score: Number(b.score) } : {}) } }])).done[0].id; }
      const id = randomUUID(); db.prepare('INSERT INTO decisions(id,a,b,decision,note,author,at,ra,rb) VALUES(?,?,?,?,?,?,?,?,?)').run(id, b.a, b.b, b.decision, String(b.note || '').slice(0, 2000), author(), Date.now(), ra?.id || null, rb?.id || null);
      let applied = false; if (ra && rb && ex.er?.engine?.decide) { const r = await ex.er.engine.decide(ra.id, rb.id, b.decision); await ex.er.publish?.(r.events); applied = true; }
      return { ok: true, id, written, applied, note: `${b.decision === 'same' ? 'Combined.' : 'Kept apart.'}${written ? ` Also saved as a ${type} connection between the two records, so it goes out through "Send data out".` : ''}` };
    },
    'GET /api/explore/x/history/timeline': async () => (ex.history ? ex.history.timeline() : { events: 0, buckets: [] }),
    'GET /api/explore/x/history/at': async (_, q) => { if (!ex.history) throw fail(400, 'History is off.'); return ex.history.snapshot(Number(q.get('t'))); },
    'GET /api/explore/x/history/compare': async (_, q) => { if (!ex.history) throw fail(400, 'History is off.'); const a = Number(q.get('from')), c = Number(q.get('to')); if (!(a >= 0 && c >= 0)) throw fail(400, 'Pick two times.'); return ex.history.compare(Math.min(a, c), Math.max(a, c)); },
    'POST /api/explore/x/edit': async b => edit(b.ops),
    'GET /api/explore/x/comments': async (_, q) => { const t = q.get('target'); const rows = t ? db.prepare('SELECT * FROM comments WHERE target=? ORDER BY at').all(t) : db.prepare('SELECT * FROM comments ORDER BY at DESC LIMIT 200').all(); return { comments: rows }; },
    'POST /api/explore/x/comments': async b => { const t = String(b.target || ''), text = String(b.text || '').trim(); if (!text) throw fail(400, 'Write a comment first.'); if (text.length > 5000) throw fail(400, 'Comments are limited to 5,000 characters.');
      if (!(await visibleItems([t])).length) throw fail(404, 'You can only comment on things you can see.');
      const c = { id: randomUUID(), target: t, author: author(), text, at: Date.now() }; db.prepare('INSERT INTO comments VALUES(?,?,?,?,?)').run(c.id, c.target, c.author, c.text, c.at); return { comment: c }; },
    'DELETE /api/explore/x/comments': async (_, q) => { const c = db.prepare('SELECT * FROM comments WHERE id=?').get(q.get('id')); if (!c) throw fail(404, 'No such comment.'); if (c.author !== author() && !(await isAdmin())) throw fail(403, 'Only the author or an admin can remove a comment.'); db.prepare('DELETE FROM comments WHERE id=?').run(c.id); return { ok: true }; },
    'GET /api/explore/x/notebooks': async () => ({ notebooks: db.prepare('SELECT n.*, (SELECT count(*) FROM entries e WHERE e.nb=n.id) entries FROM notebooks n ORDER BY at DESC').all() }),
    'POST /api/explore/x/notebooks': async b => { const title = String(b.title || '').trim().slice(0, 200); if (!title) throw fail(400, 'Give the case a name.'); const n = { id: randomUUID(), title, author: author(), at: Date.now() }; db.prepare('INSERT INTO notebooks VALUES(?,?,?,?)').run(n.id, n.title, n.author, n.at); return { notebook: n }; },
    'GET /api/explore/x/notebook': async (_, q) => { const n = db.prepare('SELECT * FROM notebooks WHERE id=?').get(q.get('id')); if (!n) throw fail(404, 'No such case.'); return { notebook: n, entries: db.prepare('SELECT * FROM entries WHERE nb=? ORDER BY at').all(n.id).map(e => ({ ...e, ids: JSON.parse(e.ids || '[]') })) }; },
    'DELETE /api/explore/x/notebook': async (_, q) => { const n = db.prepare('SELECT * FROM notebooks WHERE id=?').get(q.get('id')); if (!n) throw fail(404, 'No such case.'); if (n.author !== author() && !(await isAdmin())) throw fail(403, 'Only the author or an admin can delete a case.'); db.prepare('DELETE FROM entries WHERE nb=?').run(n.id); db.prepare('DELETE FROM notebooks WHERE id=?').run(n.id); return { ok: true }; },
    'POST /api/explore/x/notebook/entry': async b => { const n = db.prepare('SELECT * FROM notebooks WHERE id=?').get(b.nb); if (!n) throw fail(404, 'No such case.'); if (!['note', 'snapshot', 'view'].includes(b.kind)) throw fail(400, 'Unknown entry kind.');
      const ids = Array.isArray(b.ids) ? b.ids.slice(0, 5000).map(String) : []; const vis = new Set((await visibleItems(ids)).map(i => i.id));
      const e = { id: randomUUID(), nb: n.id, kind: b.kind, text: String(b.text || '').slice(0, 20000), ids: ids.filter(i => vis.has(i) || !live(i)), view: b.viewId ? String(b.viewId) : null, at: Date.now() };
      db.prepare('INSERT INTO entries VALUES(?,?,?,?,?,?,?)').run(e.id, e.nb, e.kind, e.text, JSON.stringify(e.ids), e.view, e.at); return { entry: e }; },
    'DELETE /api/explore/x/notebook/entry': async (_, q) => { db.prepare('DELETE FROM entries WHERE id=?').run(q.get('id')); return { ok: true }; },
    'POST /api/explore/x/export/svg': async (b, q, res) => {
      const c = ex.access.ctx(subject()?.id, 'export'), ids = (Array.isArray(b.ids) ? b.ids : []).slice(0, 20000).map(String);
      const items = []; for (const id of [...new Set(ids)]) { const it = live(id); const v = it && view(it); const x = v && (await ex.access.viewItem(c, v, 'view')); if (x) items.push(x); }
      const nodeSet = new Set(ids); for (const l of service.items.values()) if (l.kind === 'link' && !l.deleted && nodeSet.has(l.fromId) && nodeSet.has(l.toId)) { const v = view(l); const x = v && (await ex.access.viewItem(c, v, 'view')); if (x) items.push(x); }
      const pos = {}; for (const [id, p] of Object.entries(b.positions || {})) { const it = live(id); if (it) { const x = await ex.access.viewItem(c, view(it) || it, 'view'); if (x) pos[x.id] = p; } }
      const svg = renderSvg(items, { positions: pos, title: b.title, theme: b.theme, width: b.width, height: b.height });
      res.writeHead(200, { 'content-type': 'image/svg+xml; charset=utf-8', 'content-disposition': 'attachment; filename="streamgraph-view.svg"' }); res.end(svg); return undefined;
    },
    'GET /api/explore/x/meta': async () => meta(),
    'GET /api/explore/x/me': async () => ({ actor: author(), subject: subject()?.id || null, admin: await isAdmin(), previewing: !!(who()?.actor && subject() && who().actor.id !== subject().id), canEdit: (await isAdmin()) || (await Promise.all(meta().types.map(t => decide('write', t)))).some(Boolean) }),
    'POST /api/explore/x/query': async b => {
      const q = b.cypher ? parseCypher(b.cypher) : normalize(b.query || {});
      for (const t of [q.a.type, q.b?.type, q.rel?.type].filter(Boolean)) if (!(await decide('query', t))) throw fail(403, `Your access rules do not allow asking about ${t}s.`);
      return runQuery(service, q, { canSee, view });
    },
    'POST /api/explore/x/cypher': async b => ({ cypher: toCypher(b.query || {}) }),
    'GET /api/explore/x/nl/settings': async () => ({ provider: kv.get('nl.provider', 'off'), providers: [{ id: 'off', name: 'Off' }, ...Object.values(PROVIDERS).map(p => ({ id: p.id, name: p.name }))] }),
    'POST /api/explore/x/nl/settings': async b => { await requireAdmin(); if (b.provider !== 'off' && !PROVIDERS[b.provider]) throw fail(400, 'Unknown provider.'); kv.set('nl.provider', b.provider); return { provider: b.provider }; },
    'POST /api/explore/x/nl/ask': async b => {
      const p = PROVIDERS[kv.get('nl.provider', 'off')]; if (!p) throw fail(400, 'Plain-English questions are off. An admin can turn them on under Analyze > Plain-English questions.');
      const plan = p.interpret(String(b.question || ''), meta());
      if (!plan) return { understood: false, answer: 'Sorry, I could not read that question. Try "how many customers", "show customers where city is Boston", "who is connected to Ada" or "path from Ada to Trail Shoe".' };
      if (plan.kind === 'count' || plan.kind === 'query') { const r = await R['POST /api/explore/x/query']({ query: plan.query }); return { understood: true, plan, cypher: r.cypher, rows: r.rows, answer: plan.kind === 'count' ? `${r.count}${r.truncated ? '+' : ''} ${plan.type}${r.count === 1 ? '' : 's'}.` : `${r.count} ${plan.type}${r.count === 1 ? '' : 's'} found.` }; }
      const find = async name => { const n = String(name).toLowerCase(); for (const it of service.items.values()) if (it.kind === 'node' && !it.deleted && String(it.label).toLowerCase() === n) { const v = (await visibleItems([it.id]))[0]; if (v && v.label.toLowerCase() === n) return v; } return null; };
      if (plan.kind === 'neighbours') { const s = await find(plan.name); if (!s) return { understood: true, plan, answer: `I couldn't find "${plan.name}".` }; const ids = [s.id]; for (const l of service.items.values()) if (l.kind === 'link' && !l.deleted && (l.fromId === s.id || l.toId === s.id)) ids.push(l.fromId === s.id ? l.toId : l.fromId); const items = await visibleItems(ids); return { understood: true, plan, ids: items.map(i => i.id), answer: `${s.label} is directly connected to ${items.length - 1} thing${items.length === 2 ? '' : 's'}.` }; }
      if (plan.kind === 'path') { const a = await find(plan.from), c = await find(plan.to); if (!a || !c) return { understood: true, plan, answer: `I couldn't find ${!a ? `"${plan.from}"` : `"${plan.to}"`}.` }; const r = await ex.core.findPaths(service, { fromId: a.id, toId: c.id, mode: 'shortest', maxHops: 6 }, items => ex.guard(items, subject()?.id), ex.config.principal); return { understood: true, plan, ids: (r.items || []).map(i => i.id), answer: r.found ? `${a.label} and ${c.label} are connected in ${r.paths?.[0]?.links?.length ?? '?'} step(s).` : `No connection within 6 steps between ${a.label} and ${c.label}.` }; }
      if (plan.kind === 'top') { const r = await ex.algo.run({ algo: 'degree', scope: { kind: 'all' } }, { principal: ex.config.principal, actAs: subject()?.id }); const cand = Object.entries(r.values || {}).filter(([id]) => !plan.type || live(id)?.type === plan.type).sort((x, y) => y[1] - x[1]).slice(0, plan.n * 3); const items = (await visibleItems(cand.map(c => c[0]))).slice(0, plan.n); return { understood: true, plan, ids: items.map(i => i.id), answer: items.length ? `Most connected: ${items.map(i => `${i.label} (${r.values[i.id]})`).join(', ')}.` : 'Nothing to rank.' }; }
      return { understood: false, answer: 'Sorry, I could not answer that.' };
    },
    'POST /api/explore/x/summary': async b => { const ids = (b.ids || []).slice(0, 20000); const set = new Set(ids); const links = []; for (const l of service.items.values()) if (l.kind === 'link' && !l.deleted && set.has(l.fromId) && set.has(l.toId)) links.push(l.id); return { text: summarize(await visibleItems([...ids, ...links])) }; },
    'POST /api/explore/x/nl/caption': async b => { const p = PROVIDERS[kv.get('nl.provider', 'off')]; if (!p) throw fail(400, 'Captions are off. An admin can turn them on under Analyze > Plain-English questions.'); const ids = (b.ids || []).slice(0, 20000), set = new Set(ids), links = []; for (const l of service.items.values()) if (l.kind === 'link' && !l.deleted && set.has(l.fromId) && set.has(l.toId)) links.push(l.id); return { caption: p.caption(await visibleItems([...ids, ...links])), provider: p.id }; },
    'GET /api/explore/x/rdf': async (_, q, res) => {
      const c = ex.access.ctx(subject()?.id, 'export'), items = [];
      for (const it of service.items.values()) if (!it.deleted && (it.kind === 'node' || it.kind === 'link')) { const v = view(it); const x = v && (await ex.access.viewItem(c, v, 'view')); if (x) items.push(x); }
      const want = q.get('format');
      if (want === 'jsonld' || want === 'yamlld') { // JSON-LD / YAML-LD view of the same export (plan W2), local contexts only
        const nt = await toRdf(items, 'ntriples'), docs = await jsonld.fromRDF(nt, { format: 'application/n-quads' });
        const out = await jsonld.compact(docs, { '@context': { sg: 'urn:streamgraph:', xsd: 'http://www.w3.org/2001/XMLSchema#', rdfs: 'http://www.w3.org/2000/01/rdf-schema#' } }, { documentLoader: async u => { throw new Error(`remote context refused: ${u}`); } });
        const text = want === 'jsonld' ? JSON.stringify(out, null, 2) : yamlStringify(out, { lineWidth: 0 });
        res.writeHead(200, { 'content-type': want === 'jsonld' ? 'application/ld+json; charset=utf-8' : 'application/x-yaml; charset=utf-8', 'content-disposition': `attachment; filename="streamgraph.${want === 'jsonld' ? 'jsonld' : 'yamlld'}"` }); res.end(text); return undefined;
      }
      const fmt = want === 'ntriples' ? 'ntriples' : 'turtle', text = await toRdf(items, fmt);
      res.writeHead(200, { 'content-type': fmt === 'turtle' ? 'text/turtle; charset=utf-8' : 'application/n-triples; charset=utf-8', 'content-disposition': `attachment; filename="streamgraph.${fmt === 'turtle' ? 'ttl' : 'nt'}"` }); res.end(text); return undefined;
    },
    'POST /api/explore/x/rdf/import': async b => {
      await requireAdmin(); const { nodes, edges } = await fromRdf(String(b.text || ''), b.format === 'ntriples' ? 'ntriples' : 'turtle');
      if (nodes.length > 20000) throw fail(400, 'At most 20,000 things per import.');
      const ops = [...nodes.map(n => (graph.hasNode(`${n.type}:${n.key}`) ? { op: 'setProps', id: `sg:node:${n.type}:${n.key}`, props: n.props } : { op: 'addNode', type: n.type, key: n.key, props: n.props })), ...edges.map(e => ({ op: 'addEdge', type: e.type, from: `sg:node:${e.from}`, to: `sg:node:${e.to}` }))];
      let n = 0; for (let i = 0; i < ops.length; i += 500) n += (await edit(ops.slice(i, i + 500))).done.length;
      return { ok: true, nodes: nodes.length, edges: edges.length, changes: n };
    },
  };
  // ---------------- wiki (Markdown vaults: Vault-LD + OKF), see explore/server/wiki-api.js. Every reply passes the ABAC egress filter.
  const wapi = wikiApi(ex);
  const asUI = () => { const w = who(), actorId = w?.actor?.id || subject()?.id, h = ex.wiki?.humanFor(actorId) || null; return { subjectId: subject()?.id, actor: h || `process:explore-ui:${actorId || 'unknown'}`, human: !!h && !w?.testAs, humanActor: h, via: 'ui' }; };
  const wikiText = (res, r, format) => { res.writeHead(200, { 'content-type': { turtle: 'text/turtle', nquads: 'application/n-quads', jsonld: 'application/ld+json', yamlld: 'application/x-yaml' }[format] + '; charset=utf-8', 'x-wiki-problems': String(r.problems.length) }); res.end(r.text); };
  Object.assign(R, {
    'GET /api/explore/x/wiki/vaults': () => wapi.vaults(asUI()),
    'POST /api/explore/x/wiki/vaults': b => wapi.addVault(asUI(), b),
    'POST /api/explore/x/wiki/reindex': b => wapi.reindex(asUI(), b),
    'GET /api/explore/x/wiki/outline': (_, q) => wapi.outline(asUI(), { vault: q.get('vault') }),
    'GET /api/explore/x/wiki/search': (_, q) => wapi.search(asUI(), { q: q.get('q') || '', types: q.get('types')?.split(',').filter(Boolean) || null, tier: q.get('tier'), stale: q.has('stale') ? q.get('stale') === 'true' : null, vault: q.get('vault'), limit: Number(q.get('limit') || 20) }),
    'GET /api/explore/x/wiki/note': (_, q) => wapi.get(asUI(), { id: q.get('id'), vault: q.get('vault'), path: q.get('path') }),
    'GET /api/explore/x/wiki/backlinks': (_, q) => wapi.backlinks(asUI(), { id: q.get('id') }),
    'GET /api/explore/x/wiki/stale': (_, q) => wapi.stale(asUI(), { vault: q.get('vault') }),
    'POST /api/explore/x/wiki/note': b => wapi.write(asUI(), b),
    'POST /api/explore/x/wiki/verify': async b => { const as = asUI(); if (!as.human) throw fail(403, 'Only a recognised human (wiki.humanSubjects) can verify from the UI; "Test as" previews cannot.'); return wapi.verify(as, b); },
    'POST /api/explore/x/wiki/log': b => wapi.appendLog(asUI(), b),
    'GET /api/explore/x/wiki/export': async (_, q, res) => { const format = ['turtle', 'nquads', 'jsonld', 'yamlld'].includes(q.get('format')) ? q.get('format') : 'turtle'; wikiText(res, await wapi.exportRdf(asUI(), { vault: q.get('vault'), format }), format); return undefined; },
    'POST /api/explore/x/wiki/import-rdf': b => wapi.ingestRdf(asUI(), b),
  });

  return {
    async handle(req, res, url, body) {
      const k = `${req.method} ${url.pathname}`, h = R[k];
      if (!h) return send(res, 404, { error: 'not found' });
      try { const out = await h(req.method === 'GET' || req.method === 'DELETE' ? {} : await body(), url.searchParams, res); if (out !== undefined) send(res, 200, out); }
      catch (e) { if (!res.headersSent) send(res, e.status || 400, { error: e.message }); }
    },
    async reset() { db.exec('DELETE FROM comments; DELETE FROM notebooks; DELETE FROM entries; DELETE FROM decisions;'); },
    close() { clearInterval(replayTimer); try { db.close(); } catch {} },
    edit, routes: R,
  };
}
