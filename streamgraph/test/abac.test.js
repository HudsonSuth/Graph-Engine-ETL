// Access rules (ABAC): default deny, deny overrides, clearance vs classification, fail-closed masking,
// immediate policy changes, OPA adapter failing closed, explain trace and audit log, and enforcement on every exit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PolicyStore } from '../src/abac/policy.js';
import { AbacEngine, MASK } from '../src/abac/engine.js';
import { GraphStore } from '../src/graph.js';
import { SyncOut } from '../src/syncout/index.js';
import { startServer } from '../src/app.js';

const setup = (opts) => {
  const policy = new PolicyStore();
  policy.setEntity('Customer', { tags: ['pii'], classification: 1 });
  policy.setEntity('Order', { tags: [], classification: 0 });
  for (const [f, s] of [['name', 'low'], ['email', 'high'], ['points', 'medium']]) policy.setField('Customer', f, s);
  policy.setField('Order', 'total', 'low');
  return { policy, engine: new AbacEngine(policy, opts) };
};
const ask = (engine, user, action, entity, env) => engine.decide({ subjectId: user, action, entity, env });

test('default deny: no matching rule, unknown user, unknown action and unknown resource are all denied', async () => {
  const { policy, engine } = setup();
  policy.putUser({ id: 'guest', role: 'guest', clearance: 3 });
  const d = await ask(engine, 'guest', 'read', 'Order');
  assert.equal(d.allow, false); assert.match(d.trace.at(-1), /default is deny/);
  assert.equal((await ask(engine, 'nobody', 'read', 'Order')).allow, false);
  assert.equal((await ask(engine, 'owner', 'delete-everything', 'Order')).allow, false);
  assert.equal((await ask(engine, 'owner', 'read', 'Unregistered')).allow, false, 'a type with no attributes fails closed even for admins');
  assert.equal((await ask(engine, 'analyst', 'admin', 'Project')).allow, false);
  assert.equal((await ask(engine, 'analyst', 'read', 'Order')).allow, true);
  assert.equal((await engine.decide({ subject: { id: 'x', role: 'admin' }, action: 'read', entity: 'Order' })).allow, false, 'missing clearance fails closed');
});

test('clearance below classification denies PII even when an allow rule matches (deny overrides)', async () => {
  const { policy, engine } = setup();
  policy.setEntity('Customer', { tags: ['pii'], classification: 2 });
  const d = await ask(engine, 'analyst', 'read', 'Customer');
  assert.equal(d.allow, false); assert.ok(d.rules.includes('pii-clearance') && d.rules.includes('analysts-read'));
  assert.match(d.trace.join('\n'), /a deny rule always wins/);
  policy.putUser({ id: 'analyst', name: 'Analyst', role: 'analyst', clearance: 2 });
  assert.equal((await ask(engine, 'analyst', 'read', 'Customer')).allow, true, 'clearance equal to classification is enough');
  assert.equal((await ask(engine, 'analyst', 'sync-out', 'Customer')).allow, false, 'analysts cannot sync out');
});

test('field masking: unknown and unclassified fields are hidden below clearance 3; low fields pass at clearance 0', async () => {
  const { policy, engine } = setup();
  policy.register({ nodeTypes: [{ label: 'Customer', props: ['name', 'email', 'points', 'ssn'] }], edgeTypes: [] });
  policy.putUser({ id: 'intern', role: 'analyst', clearance: 0 });
  const a = engine.subject('analyst'), i = engine.subject('intern'), o = engine.subject('owner');
  const props = { name: 'Ada', email: 'ada@x.io', points: 5, ssn: '123', notes: 'never classified', _src_csv: 1 };
  const m = engine.maskProps(a, 'Customer', props).props;
  assert.deepEqual(m, { name: 'Ada', email: MASK, points: MASK, ssn: MASK, notes: MASK }, 'medium, high, unclassified and unlisted hidden at clearance 1; internal props dropped');
  assert.equal(engine.maskProps(i, 'Customer', props).props.name, 'Ada', 'a low field passes through even at clearance 0');
  assert.equal(engine.maskProps(o, 'Customer', props).props.notes, 'never classified', 'clearance 3 sees unlisted fields');
  policy.putUser({ id: 'analyst', name: 'Analyst', role: 'analyst', clearance: 2 });
  assert.equal(engine.maskProps(engine.subject('analyst'), 'Customer', props).props.points, 5);
});

test('an empty field snapshot masks everything, even for the owner (fail closed)', async () => {
  const engine = new AbacEngine(new PolicyStore());
  const o = engine.subject('owner');
  assert.deepEqual(engine.maskProps(o, 'Customer', { name: 'Ada', tier: 'gold' }).props, { name: MASK, tier: MASK });
  const broken = new AbacEngine({ read: () => { throw new Error('disk gone'); }, onChange() {}, version: 1 });
  assert.equal(broken.loadError, 'disk gone');
  assert.equal((await broken.decide({ subjectId: 'owner', action: 'read', entity: 'Customer' })).allow, false, 'no snapshot means deny');
});

test('policy changes take effect immediately (cache is invalidated on change, TTL is short)', async () => {
  let t = 0; const { policy, engine } = setup({ now: () => t });
  assert.equal((await ask(engine, 'analyst', 'export', 'Order')).allow, true);
  policy.putRule({ id: 'no-export', name: 'No exports', effect: 'deny', subjects: { roles: ['analyst'] }, actions: ['export'], resources: { entities: ['*'] } });
  assert.equal((await ask(engine, 'analyst', 'export', 'Order')).allow, false, 'no stale allow after a rule change');
  policy.setField('Customer', 'email', 'low');
  assert.equal(engine.visible(engine.subject('analyst'), 'Customer', 'email'), true, 'sensitivity change is immediate');
  // TTL: a decision is cached for 5 s at most
  const d1 = await ask(engine, 'owner', 'read', 'Order');
  assert.equal(await ask(engine, 'owner', 'read', 'Order'), d1, 'second call within the TTL is served from the cache');
  t += 6000; assert.notEqual(await ask(engine, 'owner', 'read', 'Order'), d1, 'expired after the TTL');
});

test('OPA adapter (off by default) uses the kafka.authz input shape and fails closed on errors', async () => {
  const seen = []; let reply = () => ({ ok: true, json: async () => ({ result: true }) });
  const { policy, engine } = setup({ fetchImpl: async (url, o) => { seen.push(JSON.parse(o.body)); return reply(); } });
  assert.equal(policy.read().settings.opa.enabled, false);
  policy.setSettings({ opa: { enabled: true, url: 'http://127.0.0.1:8181/v1/data/kafka/authz/allow', timeoutMs: 200 } });
  assert.equal((await ask(engine, 'analyst', 'read', 'Order')).allow, true);
  assert.equal(seen[0].input.action.operation, 'READ'); assert.equal(seen[0].input.action.resourcePattern.name, 'Order');
  assert.equal(seen[0].input.action.resourcePattern.resourceType, 'TOPIC'); assert.equal(seen[0].input.requestContext.principal.name, 'analyst');
  const fresh = async () => { policy.setSettings({ opa: { ...policy.read().settings.opa } }); return ask(engine, 'analyst', 'read', 'Order'); };
  reply = () => { throw new Error('connect ECONNREFUSED'); };
  let d = await fresh(); assert.equal(d.allow, false); assert.match(d.trace.at(-1), /fail closed/);
  reply = () => ({ ok: false, status: 500, json: async () => ({}) }); assert.equal((await fresh()).allow, false);
  reply = () => ({ ok: true, json: async () => ({}) }); assert.equal((await fresh()).allow, false, 'undefined policy result is a deny');
  reply = () => ({ ok: true, json: async () => ({ result: { allow: false } }) }); assert.equal((await fresh()).allow, false);
  reply = () => new Promise(() => {}); d = await engine.decide({ subjectId: 'owner', action: 'read', entity: 'Order', env: { via: 'x' } });
  assert.equal(d.allow, false, 'a hung OPA times out and denies');
  reply = () => ({ ok: true, json: async () => ({ result: true }) });
  assert.equal((await ask(engine, 'analyst', 'read', 'Customer')).allow, true);
  policy.setEntity('Customer', { tags: ['pii'], classification: 3 });
  assert.equal((await ask(engine, 'analyst', 'read', 'Customer')).allow, false, 'OPA cannot override a local deny');
});

test('explain trace and audit log are written', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'sg-audit-')), f = join(dir, 'audit.ndjson');
  const { engine } = setup({ auditFile: f });
  const d = await ask(engine, 'analyst', 'read', 'Customer');
  assert.ok(d.trace.some(x => /User Analyst: role analyst, clearance 1/.test(x)));
  assert.ok(d.trace.some(x => /Customer: tags pii, classification 1/.test(x)));
  await new Promise(r => setTimeout(r, 50));
  const line = JSON.parse((await readFile(f, 'utf8')).trim().split('\n').at(-1));
  assert.equal(line.user, 'analyst'); assert.equal(line.entity, 'Customer'); assert.equal(line.allow, true);
});

test('masking applies to sync-out batches', async () => {
  const { policy, engine } = setup(), graph = new GraphStore(), got = [];
  graph.upsertNode('Customer:c1', 'Customer', 'c1', { name: 'Ada', email: 'ada@x.io', vip_note: 'x' });
  engine.keyFields = { Customer: ['email'] };
  const so = new SyncOut({ graph, engine, factories: { kafka: { producerFactory: async () => ({ connect: async () => {}, disconnect: async () => {}, send: async m => got.push(...m.messages) }) } } });
  await so.configure([{ id: 'k', name: 'K', kind: 'kafka', settings: { topic: 't' }, asUser: 'sync-service' }]); await so.cycle();
  const v = JSON.parse(got.find(m => m.value).value);
  assert.deepEqual(v.props, { name: 'Ada', email: MASK, vip_note: MASK });
  assert.match(v.key, /^anon-[0-9a-f]{10}$/, 'a hidden identifying field is replaced by a stable pseudonym');
  void policy; await so.stop();
});

test('enforcement in the app: queries, search, CSV and Cypher export, graph API, Test as, admin-only setup', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'sg-abac-'));
  const { app, studio, close } = await startServer({ port: 0, dataDir: dir, log: null, syncIntervalMs: 100000 });
  const call = async (m, p, b, as) => { const r = await fetch(`http://127.0.0.1:${app.port}${p}`, { method: m, headers: { 'content-type': 'application/json', ...(as ? { 'x-sg-as': as } : {}) }, body: b && JSON.stringify(b) }); const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; } return { status: r.status, body: j }; };
  try {
    app.graph.upsertNode('Customer:c1', 'Customer', 'c1', { name: 'Ada', email: 'ada@x.io', tier: 'gold' });
    app.graph.upsertNode('Customer:c2', 'Customer', 'c2', { name: 'Ben', email: 'ben@y.io', tier: 'silver' });
    app.onTick();
    studio.policy.setEntity('Customer', { tags: ['pii'], classification: 1 });
    studio.policy.setField('Customer', 'name', 'low'); studio.policy.setField('Customer', 'email', 'high');
    const q = { question: { entity: 'Customer' } };
    let r = await call('POST', '/api/studio/ask', q);
    assert.equal(r.body.table[0]['Customer email'], 'ada@x.io', 'owner sees email');
    assert.equal(r.body.table[0]['Customer tier'], 'gold', 'owner (clearance 3) sees unclassified fields');
    r = await call('POST', '/api/studio/ask', q, 'analyst');
    assert.equal(r.body.table[0]['Customer email'], MASK); assert.equal(r.body.table[0]['Customer tier'], MASK, 'unclassified field hidden from analyst');
    assert.equal(r.body.table[0].Customer, 'Ada'); assert.equal(r.body.testAs, 'analyst');
    r = await call('POST', '/api/studio/ask', { question: { entity: 'Customer', filters: [{ field: 'email', op: 'contains', value: 'ada' }] } }, 'analyst');
    assert.equal(r.status, 400); assert.match(r.body.error, /hidden/);
    r = await call('GET', '/api/studio/search?q=ada%40x', undefined, 'analyst'); assert.equal(r.body.results.length, 0, 'search never matches hidden values');
    r = await call('GET', '/api/studio/search?q=ada%40x'); assert.equal(r.body.results.length, 1);
    r = await call('POST', '/api/studio/export.csv', q, 'analyst');
    assert.match(r.body, /"Customer email"/); assert.ok(!r.body.includes('ada@x.io'), 'CSV export is masked'); assert.ok(r.body.includes(MASK));
    r = await call('GET', '/api/export.cypher', undefined, 'analyst'); assert.ok(!r.body.includes('ada@x.io'));
    r = await call('GET', '/api/graph', undefined, 'analyst'); assert.equal(r.body.nodes[0].props.email, MASK);
    r = await call('POST', '/api/query', { pattern: '(c:Customer)' }, 'analyst'); assert.equal(r.body.rows[0].c.props.email, MASK);
    r = await call('POST', '/api/studio/access/matrix', { user: 'analyst' });
    const cust = r.body.entities.find(e => e.entity === 'Customer');
    assert.equal(cust.actions.read.allow, true); assert.equal(cust.actions.admin.allow, false); assert.equal(cust.fields.find(f => f.field === 'email').visible, false);
    r = await call('POST', '/api/studio/access/explain', { user: 'analyst', action: 'export', entity: 'Customer' }); assert.equal(r.body.allow, true); assert.ok(r.body.trace.length >= 3);
    // A rule change applies to the very next request.
    await call('POST', '/api/studio/access/rule', { rule: { name: 'Analysts cannot export customers', effect: 'deny', subjects: { roles: ['analyst'] }, actions: ['export'], resources: { entities: ['Customer'] } } });
    r = await call('POST', '/api/studio/export.csv', q, 'analyst'); assert.ok(!r.body.includes('Ada'), 'denied type is left out of the export');
    r = await call('POST', '/api/studio/access/rule', { rule: { name: 'Nobody manages', effect: 'deny', subjects: { roles: ['*'] }, actions: ['admin'], resources: { entities: ['*'] } } });
    assert.equal(r.status, 400); assert.match(r.body.error, /stop you/); assert.equal((await call('GET', '/api/flow')).status, 200, 'owner not locked out');
    // Admin gating, with no real login yet: switching the active user to a non-admin blocks setup.
    studio.policy.setSettings({ activeUser: 'analyst' });
    assert.equal((await call('POST', '/api/studio/sinks', { name: 'x', kind: 'kafka', settings: { topic: 't' } })).status, 403);
    assert.equal((await call('GET', '/api/flow')).status, 403);
    assert.equal((await call('POST', '/api/studio/ask', q, 'owner')).status, 403, 'non-admins cannot "Test as" someone else');
    studio.policy.setSettings({ activeUser: 'owner' });
    r = await call('GET', '/api/studio/access'); assert.equal(r.status, 200); assert.ok(!JSON.stringify(r.body).includes('salt')); assert.match(r.body.note, /no real login/);
    await call('POST', '/api/studio/reset', { confirm: 'RESET' });
    r = await call('GET', '/api/studio/access'); assert.ok(!r.body.rules.some(x => x.name === 'Analysts cannot export customers'), 'reset reseeds the access rules');
    assert.ok(r.body.audit.some(a => /Project reset/.test(a.why)), 'reset is in the audit log');
  } finally { await close(); }
});
