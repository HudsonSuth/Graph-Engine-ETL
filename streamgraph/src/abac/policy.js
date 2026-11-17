// Policy graph: users (principals), entity-type attributes, field sensitivity and rules live in their
// own small property graph (SQLite file), the way Neo4j is the source of truth in the original design.
import { randomBytes } from 'node:crypto';
import { GraphStore } from '../graph.js';

export const DEFAULT_USERS = [
  { id: 'owner', name: 'Owner (you)', role: 'admin', clearance: 3 },
  { id: 'analyst', name: 'Analyst', role: 'analyst', clearance: 1 },
  { id: 'sync-service', name: 'Sync-out service', role: 'service', clearance: 1 },
];
export const DEFAULT_RULES = [
  { id: 'pii-clearance', name: 'Sensitive (PII) data needs enough clearance', effect: 'deny', locked: true, subjects: { roles: ['*'] }, actions: ['*'], resources: { entities: ['*'], tagsAny: ['pii'] }, condition: 'clearanceBelowClassification', enabled: true },
  { id: 'admins-all', name: 'Admins can do everything', effect: 'allow', locked: true, subjects: { roles: ['admin'] }, actions: ['*'], resources: { entities: ['*'] }, enabled: true },
  { id: 'analysts-read', name: 'Analysts can view, ask questions and export', effect: 'allow', subjects: { roles: ['analyst'] }, actions: ['read', 'query', 'export'], resources: { entities: ['*'] }, enabled: true },
  { id: 'service-sync', name: 'The sync-out service can send data out', effect: 'allow', subjects: { roles: ['service'] }, actions: ['sync-out'], resources: { entities: ['*'] }, enabled: true },
];
const L = { user: '_Principal', entity: '_EntityType', field: '_Field', rule: '_Rule', settings: '_Settings' };

export class PolicyStore {
  constructor(file = ':memory:') { this.g = new GraphStore(file); this.version = 1; this.listeners = new Set(); if (!this.g.getNode(`${L.settings}:main`)) this.seed(); }
  onChange(fn) { this.listeners.add(fn); }
  #changed() { this.version++; this.g.pruneChanges(this.g.maxSeq()); for (const f of this.listeners) f(this.version); }
  seed() {
    this.g.clear();
    this.g.upsertNode(`${L.settings}:main`, L.settings, 'main', { activeUser: 'owner', salt: randomBytes(16).toString('hex'), opa: { enabled: false, url: 'http://127.0.0.1:8181/v1/data/kafka/authz/allow', timeoutMs: 1000 } });
    for (const u of DEFAULT_USERS) this.g.upsertNode(`${L.user}:${u.id}`, L.user, u.id, u);
    this.g.upsertNode(`${L.entity}:Project`, L.entity, 'Project', { tags: ['system'], classification: 0 }); // target of 'admin' decisions
    DEFAULT_RULES.forEach((r, i) => this.g.upsertNode(`${L.rule}:${r.id}`, L.rule, r.id, { ...r, order: i }));
    this.#changed();
  }
  // ---- reads (projection source)
  read() {
    const props = l => this.g.nodes(l).map(n => n.props);
    return { settings: this.g.getNode(`${L.settings}:main`)?.props || {}, users: props(L.user), rules: props(L.rule).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
      entities: Object.fromEntries(this.g.nodes(L.entity).map(n => [n.key, n.props])), fields: Object.fromEntries(this.g.nodes(L.field).map(n => [n.key, n.props])) };
  }
  // ---- writes
  setSettings(patch) { const cur = this.read().settings; this.g.upsertNode(`${L.settings}:main`, L.settings, 'main', { ...cur, ...patch }); this.#changed(); }
  putUser(u) {
    if (!/^[\w.-]{1,40}$/.test(u.id || '')) throw new Error('User ids use letters, numbers, dots and dashes.');
    if (!Number.isInteger(u.clearance) || u.clearance < 0 || u.clearance > 3) throw new Error('Clearance is a whole number from 0 to 3.');
    if (!u.role) throw new Error('Pick a role.');
    if (u.id === 'owner' && u.role !== 'admin') throw new Error('The owner always keeps the admin role.');
    this.g.upsertNode(`${L.user}:${u.id}`, L.user, u.id, { id: u.id, name: u.name || u.id, role: u.role, clearance: u.clearance }); this.#changed();
  }
  deleteUser(id) { if (id === 'owner') throw new Error('The owner cannot be removed.'); this.g.deleteNode(`${L.user}:${id}`); this.#changed(); }
  putRule(r) {
    const cur = this.read().rules.find(x => x.id === r.id);
    if (cur?.locked) { this.g.upsertNode(`${L.rule}:${r.id}`, L.rule, r.id, { ...cur, enabled: true }); this.#changed(); return; }
    if (!['allow', 'deny'].includes(r.effect)) throw new Error('A rule either allows or denies.');
    this.g.upsertNode(`${L.rule}:${r.id}`, L.rule, r.id, { ...r, order: cur?.order ?? this.read().rules.length }); this.#changed();
  }
  deleteRule(id) { if (this.read().rules.find(x => x.id === id)?.locked) throw new Error('Built-in rules cannot be removed.'); this.g.deleteNode(`${L.rule}:${id}`); this.#changed(); }
  setEntity(label, patch) {
    const id = `${L.entity}:${label}`, cur = this.g.getNode(id)?.props || { tags: [], classification: 0 };
    const next = { ...cur, ...patch };
    if (!Array.isArray(next.tags) || !Number.isInteger(next.classification)) throw new Error('Bad entity attributes.');
    this.g.upsertNode(id, L.entity, label, next); this.#changed();
  }
  setField(label, field, sensitivity) {
    if (!['low', 'medium', 'high', 'unclassified'].includes(sensitivity)) throw new Error('Sensitivity is low, medium or high.');
    if (!this.g.getNode(`${L.entity}:${label}`)) this.g.upsertNode(`${L.entity}:${label}`, L.entity, label, { tags: [], classification: 0 });
    this.g.upsertNode(`${L.field}:${label}.${field}`, L.field, `${label}.${field}`, { entity: label, field, sensitivity });
    this.g.upsertEdge('HAS_FIELD', `${L.entity}:${label}`, `${L.field}:${label}.${field}`); this.#changed();
  }
  // New types and fields found in the data are registered as unclassified (hidden below clearance 3).
  register(schema) {
    let n = 0;
    const known = this.read();
    for (const t of [...schema.nodeTypes.map(x => ({ name: x.label, props: x.props })), ...schema.edgeTypes.map(x => ({ name: x.type, props: x.props }))]) {
      if (!known.entities[t.name]) { this.g.upsertNode(`${L.entity}:${t.name}`, L.entity, t.name, { tags: [], classification: 0 }); n++; }
      for (const p of t.props.filter(p => !p.startsWith('_'))) if (!known.fields[`${t.name}.${p}`]) {
        this.g.upsertNode(`${L.field}:${t.name}.${p}`, L.field, `${t.name}.${p}`, { entity: t.name, field: p, sensitivity: 'unclassified' });
        this.g.upsertEdge('HAS_FIELD', `${L.entity}:${t.name}`, `${L.field}:${t.name}.${p}`); n++;
      }
    }
    if (n) this.#changed();
    return n;
  }
  reset() { this.seed(); }
}
