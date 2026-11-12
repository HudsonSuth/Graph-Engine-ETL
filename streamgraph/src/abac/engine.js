// Embedded ABAC engine: default deny, deny overrides, fail closed, field masking, explain trace, audit log.
import { createHash } from 'node:crypto';
import { appendFile } from 'node:fs/promises';
import { askOpa } from './opa.js';

export const ACTIONS = ['read', 'query', 'export', 'sync-out', 'admin'];
export const MASK = '[hidden]';
export const NEEDS = { low: 0, medium: 2, high: 3, unclassified: 3 }; // clearance needed to see a field; unlisted = 3
const BROKEN = () => process.env.STREAMGRAPH_ABAC === 'broken'; // DELIBERATELY WRONG engine for tests: default-allow and unknown fields pass

const any = (list, v) => !list || list.includes('*') || list.includes(v);
export function ruleMatches(r, { subject, action, entity, res, env }) {
  if (r.enabled === false) return false;
  if (!any(r.subjects?.roles, subject.role)) return false;
  if (r.subjects?.users?.length && !r.subjects.users.includes(subject.id)) return false;
  if (r.subjects?.minClearance != null && !(subject.clearance >= r.subjects.minClearance)) return false;
  if (!any(r.actions, action)) return false;
  if (!any(r.resources?.entities, entity)) return false;
  if (r.resources?.tagsAny?.length && !r.resources.tagsAny.some(t => res.tags?.includes(t))) return false;
  if (r.env?.via?.length && !r.env.via.includes(env.via)) return false;
  if (r.env?.hoursUtc && !(env.hourUtc >= r.env.hoursUtc[0] && env.hourUtc < r.env.hoursUtc[1])) return false;
  if (r.condition === 'clearanceBelowClassification') {
    if (!Number.isInteger(res.classification)) return true; // unknown classification on tagged data: treat as matched (deny)
    return subject.clearance < res.classification;
  }
  return true;
}

export class AbacEngine {
  constructor(store, { auditFile, ttlMs = 5000, fetchImpl, now = () => Date.now() } = {}) {
    this.store = store; this.ttlMs = ttlMs; this.fetchImpl = fetchImpl; this.now = now; this.auditFile = auditFile;
    this.cache = new Map(); this.lastLogged = new Map(); this.audit = []; this.keyFields = {}; this.snap = null; this.loadError = null;
    this.refresh(); store?.onChange(() => this.refresh());
  }
  // Project the policy graph into an in-memory snapshot. A failed read keeps the last good one (never publishes a partial one).
  refresh() {
    try {
      const p = this.store.read();
      this.snap = { version: this.store.version, ...p, users: Object.fromEntries(p.users.map(u => [u.id, u])) };
      this.loadError = null;
    } catch (e) { this.loadError = e.message; }
    this.cache.clear(); // policy changes take effect immediately
  }
  log(entry) {
    const e = { at: new Date(this.now()).toISOString(), ...entry };
    this.audit.unshift(e); this.audit.length = Math.min(this.audit.length, 300);
    if (this.auditFile) appendFile(this.auditFile, JSON.stringify(e) + '\n').catch(() => {});
  }
  subject(id) { return this.snap?.users?.[id] || null; }

  async decide({ subjectId, subject, action, entity, env = {} }) {
    const s = this.snap, trace = [];
    const deny = why => { trace.push(why); return { allow: false, trace, rules: [] }; };
    if (!s) return deny('Access data is not loaded: denied (fail closed)');
    const sub = subject || s.users[subjectId];
    if (!sub) return deny(`Unknown user "${subjectId}": denied`);
    trace.push(`User ${sub.name || sub.id}: role ${sub.role || '(none)'}, clearance ${sub.clearance ?? '(none)'}`);
    if (!sub.role) return deny('The user has no role: denied (fail closed)');
    if (typeof sub.clearance !== 'number' || Number.isNaN(sub.clearance)) return deny('The user has no numeric clearance: denied (fail closed)');
    if (!ACTIONS.includes(action)) return deny(`Unknown action "${action}": denied`);
    if (!entity) return deny('No resource named: denied (fail closed)');
    const fullEnv = { via: env.via || 'ui', hourUtc: new Date(this.now()).getUTCHours(), ip: env.ip };
    const key = `${s.version}|${sub.id}|${sub.role}|${sub.clearance}|${action}|${entity}|${fullEnv.via}|${fullEnv.hourUtc}`;
    const hit = this.cache.get(key);
    if (hit && hit.exp > this.now()) return hit.result;
    const res = s.entities[entity];
    let result;
    if (!res && !BROKEN()) result = deny(`${entity} has no access attributes yet: denied (fail closed)`);
    else {
      const r0 = res || { tags: [], classification: 0 };
      trace.push(`${entity}: tags ${r0.tags?.length ? r0.tags.join(', ') : '(none)'}, classification ${r0.classification ?? '(unknown)'}`);
      const ctx = { subject: sub, action, entity, res: r0, env: fullEnv };
      const matched = s.rules.filter(r => ruleMatches(r, ctx));
      const denies = matched.filter(r => r.effect === 'deny'), allows = matched.filter(r => r.effect === 'allow');
      for (const r of matched) trace.push(`Rule "${r.name}" applies (${r.effect})`);
      let allow;
      if (denies.length) { allow = false; trace.push('Decision: deny (a deny rule always wins)'); }
      else if (allows.length) { allow = true; trace.push(`Decision: allow`); }
      else if (BROKEN()) { allow = true; trace.push('Decision: allow (no rule matched)'); }
      else { allow = false; trace.push('Decision: deny (no rule allows this; the default is deny)'); }
      if (allow && s.settings?.opa?.enabled) {
        const o = await askOpa(s.settings.opa, { subject: sub, action, entity, resource: r0, env: fullEnv }, this.fetchImpl);
        trace.push(o.why); if (!o.allow) allow = false;
      }
      result = { allow, trace, rules: matched.map(r => r.id) };
    }
    this.cache.set(key, { exp: this.now() + this.ttlMs, result });
    // Audit each decision, but only once a minute while it stays the same (sync-out asks every second).
    const lk = `${sub.id}|${action}|${entity}|${fullEnv.via}`, last = this.lastLogged.get(lk);
    if (!last || last.allow !== result.allow || last.version !== s.version || this.now() - last.at > 60000) {
      this.lastLogged.set(lk, { allow: result.allow, version: s.version, at: this.now() });
      this.log({ user: sub.id, action, entity, via: fullEnv.via, allow: result.allow, why: result.trace.at(-1) });
    }
    return result;
  }

  // Which fields this user may see. Empty or missing snapshot masks everything (fail closed).
  fieldNeeds(entity, field) {
    const f = this.snap?.fields?.[`${entity}.${field}`];
    if (!f) return BROKEN() ? 0 : NEEDS.unclassified; // unlisted fields are treated as high
    return NEEDS[f.sensitivity] ?? NEEDS.unclassified;
  }
  visible(subject, entity, field) {
    if (!this.snap || !Object.keys(this.snap.fields || {}).length) return false;
    return typeof subject?.clearance === 'number' && subject.clearance >= this.fieldNeeds(entity, field);
  }
  pseudonym(label, key) { return 'anon-' + createHash('sha256').update(`${this.snap?.settings?.salt || ''}|${label}|${key}`).digest('hex').slice(0, 10); }
  keyHidden(subject, label) { const kf = this.keyFields[label] || []; return kf.some(f => !this.visible(subject, label, f)); }
  viewKey(subject, label, key) { return this.keyHidden(subject, label) ? this.pseudonym(label, key) : key; }
  maskProps(subject, entity, props) {
    const out = {}, masked = [];
    for (const [k, v] of Object.entries(props || {})) { if (k.startsWith('_')) continue; if (this.visible(subject, entity, k)) out[k] = v; else { out[k] = MASK; masked.push(k); } }
    return { props: out, masked };
  }
  viewNode(subject, n) { const key = this.viewKey(subject, n.label, n.key); const { props, masked } = this.maskProps(subject, n.label, n.props); return { id: `${n.label}:${key}`, label: n.label, key, props, masked }; }
}
