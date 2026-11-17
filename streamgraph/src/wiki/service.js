// WikiService: registered vault folders -> the StreamGraph graph (GraphStore), Markdown files as the source of truth.
// One instance per running app (created in explore/combined.js), independent of explore-layer rebuilds.
// Graph -> file write-back is OFF by decision (flag kept, refused when set).
import { readFileSync, writeFileSync, existsSync, mkdirSync, watch } from 'node:fs';
import { join, resolve, posix } from 'node:path';
import { loadVault } from './vault.js';
import { mapVault } from './mapper.js';
import { applySlice, dumpSlice } from './sync.js';
import { isStale, DEFAULT_HUMANS } from './trust.js';
import { writeNote, verifyNote, appendLog } from './write.js';
import { exportVault, ingestRdf } from './rdf.js';

export const DEFAULT_AGENT = 'grokbot/reverse-engineering-analyst';
const SLUG = /^[a-z0-9][a-z0-9-]{0,40}$/;
const fail = (status, message) => Object.assign(new Error(message), { status });

export class WikiService {
  constructor({ graph, dataDir = null, vaults = [], humans = DEFAULT_HUMANS, humanSubjects = { owner: 'human:whsutherland' }, agentActor = DEFAULT_AGENT, writeBack = false, watch: doWatch = false, log = null } = {}) {
    if (!graph) throw new Error('WikiService needs a GraphStore');
    this.graph = graph; this.dataDir = dataDir; this.humans = humans; this.humanSubjects = humanSubjects; this.agentActor = agentActor; this.log = log;
    this.writeBack = false; // decision: files are the source of truth; graph->file write-back is not offered in this MVP
    if (writeBack) log?.('[wiki] writeBack=true ignored: graph->file write-back is disabled (Markdown files are the source of truth)');
    this.vaults = new Map(); this.models = new Map(); this.reports = new Map(); this.watchers = new Map(); this.doWatch = doWatch; this.timers = new Map();
    const saved = dataDir && existsSync(join(dataDir, 'wiki-vaults.json')) ? JSON.parse(readFileSync(join(dataDir, 'wiki-vaults.json'), 'utf8')) : [];
    for (const v of [...vaults, ...saved]) { try { this.#register(v, false); } catch (e) { log?.(`[wiki] vault ${v.dir} not added: ${e.message}`); } }
  }
  #register(v, persist) {
    const dir = resolve(String(v.dir || '')); if (!existsSync(dir)) throw fail(400, `wiki folder not found: ${dir}`);
    const slug = String(v.slug || posix.basename(dir.replace(/\\/g, '/'))).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
    if (!SLUG.test(slug)) throw fail(400, `invalid vault slug "${slug}"`);
    if (this.vaults.has(slug) && this.vaults.get(slug).dir !== dir) throw fail(409, `vault slug "${slug}" is already used by ${this.vaults.get(slug).dir}`);
    this.vaults.set(slug, { slug, dir, base: v.base || null, persisted: persist || !!v.persisted });
    if (persist && this.dataDir) { mkdirSync(this.dataDir, { recursive: true }); writeFileSync(join(this.dataDir, 'wiki-vaults.json'), JSON.stringify([...this.vaults.values()].filter(x => x.persisted).map(({ slug: s, dir: d, base }) => ({ slug: s, dir: d, base, persisted: true })), null, 2)); }
    return slug;
  }
  /** Add a vault folder (persisted in <data>/wiki-vaults.json) and import it. */
  add(v) { const slug = this.#register(v, true); const r = this.sync(slug); if (this.doWatch) this.#watch(slug); return r; }
  list() { return [...this.vaults.values()].map(v => ({ slug: v.slug, dir: v.dir, dialect: this.models.get(v.slug)?.dialect || null, notes: this.models.get(v.slug)?.notes.length ?? null, lastSync: this.reports.get(v.slug) || null })); }
  /** Deterministic full import of one vault (or all). Returns reports. */
  sync(slug = null) {
    if (!slug) return [...this.vaults.keys()].map(s => this.sync(s));
    const v = this.vaults.get(slug); if (!v) throw fail(404, `no wiki vault "${slug}"`);
    const model = loadVault(v.dir, { slug, base: v.base || undefined, humans: this.humans });
    const desired = mapVault(model), counts = applySlice(this.graph, desired);
    this.models.set(slug, model);
    const report = { slug, dialect: model.dialect, notes: model.notes.length, problems: model.notes.filter(n => n.problems.length).length + model.problems.length, at: new Date().toISOString(), ...counts };
    try { this.onSync?.(slug, report); } catch {} // combined.js: register new types/fields with the access rules (fail-closed until then)
    this.reports.set(slug, report); this.log?.(`[wiki] ${slug}: ${report.notes} notes (+${counts.nodesAdded} ~${counts.nodesUpdated} -${counts.nodesRemoved} nodes)`);
    return report;
  }
  start() { const r = this.sync(); if (this.doWatch) for (const s of this.vaults.keys()) this.#watch(s); return r; }
  #watch(slug) {
    if (this.watchers.has(slug)) return;
    try {
      const w = watch(this.vaults.get(slug).dir, { recursive: true }, () => { clearTimeout(this.timers.get(slug)); this.timers.set(slug, setTimeout(() => { try { this.sync(slug); } catch (e) { this.log?.(`[wiki] resync ${slug}: ${e.message}`); } }, 300)); });
      w.on('error', () => {}); this.watchers.set(slug, w);
    } catch (e) { this.log?.(`[wiki] watch ${slug} unavailable: ${e.message}`); }
  }
  close() { for (const w of this.watchers.values()) try { w.close(); } catch {} this.watchers.clear(); for (const t of this.timers.values()) clearTimeout(t); }
  model(slug) { if (!this.models.has(slug)) this.sync(slug); return this.models.get(slug); }
  dump(slug) { return dumpSlice(this.graph, slug); }
  /** All notes across vaults (or one), with derived read-time fields. */
  *notes(slug = null) { for (const s of slug ? [slug] : [...this.vaults.keys()]) { const m = this.model(s); for (const n of m.notes) yield { vault: s, note: n }; } }
  /** Resolve a note by graph id (sg:node:Label:key / Label:key), "vault:path", or { vault, path }. */
  find(ref) {
    if (ref && typeof ref === 'object') { const m = this.model(ref.vault); const n = m.byPath.get(String(ref.path).replace(/^\//, '')); return n ? { vault: ref.vault, note: n } : null; }
    const s = String(ref || '').replace(/^sg:node:/, '');
    for (const x of this.notes()) if (`${x.note.label}:${x.note.key}` === s || x.note.iri === s) return x;
    const i = s.indexOf(':'); if (i > 0 && this.vaults.has(s.slice(0, i))) { const m = this.model(s.slice(0, i)); const p = s.slice(i + 1).replace(/^\//, ''); const n = m.byPath.get(p) || m.byPath.get(p + '.md'); if (n) return { vault: s.slice(0, i), note: n }; }
    return null;
  }
  nodeId(x) { return `sg:node:${x.note.label}:${x.note.key}`; }
  backlinks(x) {
    const out = [];
    for (const y of this.notes(x.vault)) for (const l of [...y.note.frontLinks.map(l => ({ ...l, via: 'frontmatter' })), ...y.note.bodyLinks.map(l => ({ ...l, via: 'body' }))]) if (l.to === x.note) out.push({ from: y, field: l.key || null, via: l.via });
    return out;
  }
  derived(n, now = Date.now()) { return { trust_tier: n.trust.tier, status: n.trust.status, stale_after: n.trust.staleAfter, is_stale: isStale(n.trust.staleAfter, now), generated: n.trust.generated, verified: n.trust.verified, sources: n.trust.sources, problems: n.problems }; }
  humanFor(subjectId) { const h = this.humanSubjects?.[subjectId]; return h && this.humans.includes(h) ? h : null; }
  // ---- writes: file first, then re-import (one code path) ----
  write(slug, args) { const v = this.#vault(slug); const r = writeNote(v.dir, this.model(slug).dialect, args); const rep = this.sync(slug); return { ...r, sync: rep }; }
  verify(slug, args) { const v = this.#vault(slug); const r = verifyNote(v.dir, this.model(slug).dialect, args); this.sync(slug); return r; }
  appendLog(slug, args) { const v = this.#vault(slug); const r = appendLog(v.dir, args); this.sync(slug); return r; }
  async export(slug, opts) { return exportVault(this.model(slug), opts); }
  async ingest(slug, text, opts) { const v = this.#vault(slug); const r = await ingestRdf(v.dir, text, opts); this.sync(slug); return r; }
  #vault(slug) { const v = this.vaults.get(slug); if (!v) throw fail(404, `no wiki vault "${slug}"`); return v; }
}

/** Build from config + env + CLI. env STREAMGRAPH_WIKI = dir[,dir...] (each optionally slug=dir). */
export function wikiFromConfig({ graph, dataDir, config = {}, extraDirs = [], log }) {
  const c = config.wiki || {};
  const envDirs = String(process.env.STREAMGRAPH_WIKI || '').split(',').map(s => s.trim()).filter(Boolean);
  const vaults = [...(c.vaults || []), ...[...envDirs, ...extraDirs].map(s => { const m = /^([a-z0-9-]+)=(.+)$/.exec(s); return m ? { slug: m[1], dir: m[2] } : { dir: s }; })];
  return new WikiService({ graph, dataDir, vaults, humans: c.humans, humanSubjects: c.humanSubjects, agentActor: c.agentActor, writeBack: c.writeBack, watch: c.watch !== false, log });
}
