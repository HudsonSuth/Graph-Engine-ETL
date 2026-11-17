// Saved views store (SPEC §19). Server-side persistence in <dataDir>/explore-views.json (atomic write:
// temp file + rename), next to StreamGraph's own data files. With no dataDir it is in-memory only.
import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeViewState, restrictState, slugify, VIEW_BUNDLE_FORMAT } from '../shared/saved-views.js';

const now = () => new Date().toISOString();
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const cleanText = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
export class ViewError extends Error { constructor(code, message) { super(message); this.code = code; } }

export class SavedViewStore {
  constructor({ dir = null, file = 'explore-views.json' } = {}) {
    this.file = dir ? join(dir, file) : null;
    this.views = new Map(); this.presentations = new Map(); this.deletedSeeds = new Set();
    if (this.file && existsSync(this.file)) {
      try { const d = JSON.parse(readFileSync(this.file, 'utf8')); for (const v of d.views || []) this.views.set(v.id, v); for (const p of d.presentations || []) this.presentations.set(p.id, p); for (const s of d.deletedSeeds || []) this.deletedSeeds.add(s); }
      catch (e) { throw new Error(`cannot read ${this.file}: ${e.message}`); }
    }
  }
  #persist() {
    if (!this.file) return;
    mkdirSync(join(this.file, '..'), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify({ format: VIEW_BUNDLE_FORMAT, version: 1, views: [...this.views.values()], presentations: [...this.presentations.values()], deletedSeeds: [...this.deletedSeeds] }, null, 2));
    renameSync(tmp, this.file);
  }
  #uniqueId(base) { let id = slugify(base), i = 2; while (this.views.has(id)) id = `${slugify(base)}-${i++}`; return id; }
  summary(v) { return { id: v.id, name: v.name, description: v.description, createdAt: v.createdAt, updatedAt: v.updatedAt, origin: v.origin || 'user', layout: v.state?.layout?.kind || null }; }
  list() { return [...this.views.values()].map(v => this.summary(v)); }
  get(id) { return this.views.get(id) || null; }
  create({ id, name, description, state, origin } = {}) {
    name = cleanText(name, 120); if (!name) throw new ViewError('bad_request', 'name is required');
    const warnings = []; const st = normalizeViewState(state, warnings);
    if (id != null && (typeof id !== 'string' || !/^[\w-]{1,80}$/.test(id))) throw new ViewError('bad_request', 'id must be letters, digits, _ or -');
    if (id && this.views.has(id)) throw new ViewError('conflict', `view ${id} exists`);
    const v = { id: id || this.#uniqueId(name), name, description: cleanText(description, 600), createdAt: now(), updatedAt: now(), origin: origin || 'user', state: st };
    this.views.set(v.id, v); this.#persist();
    return { view: v, warnings };
  }
  update(id, { name, description, state } = {}) {
    const v = this.views.get(id); if (!v) throw new ViewError('not_found', `no view ${id}`);
    const warnings = [];
    if (name !== undefined) { const n = cleanText(name, 120); if (!n) throw new ViewError('bad_request', 'name cannot be empty'); v.name = n; }
    if (description !== undefined) v.description = cleanText(description, 600);
    if (state !== undefined) v.state = normalizeViewState(state, warnings);
    v.updatedAt = now(); this.#persist();
    return { view: v, warnings };
  }
  delete(id) {
    const v = this.views.get(id); if (!v) throw new ViewError('not_found', `no view ${id}`);
    this.views.delete(id); if (v.origin === 'seed') this.deletedSeeds.add(id);
    for (const p of this.presentations.values()) p.viewIds = p.viewIds.filter(x => x !== id);
    this.#persist(); return { deleted: id };
  }
  listPresentations() { return [...this.presentations.values()]; }
  getPresentation(id) { return this.presentations.get(id) || null; }
  putPresentation({ id, name, viewIds, origin }) {
    if (typeof id !== 'string' || !/^[\w-]{1,80}$/.test(id)) throw new ViewError('bad_request', 'presentation id must be letters, digits, _ or -');
    const ids = (Array.isArray(viewIds) ? viewIds : []).filter(x => typeof x === 'string');
    const missing = ids.filter(x => !this.views.has(x)); if (missing.length) throw new ViewError('bad_request', `unknown views: ${missing.join(', ')}`);
    const p = { id, name: cleanText(name, 120) || id, viewIds: ids, origin: origin || 'user', updatedAt: now() };
    this.presentations.set(id, p); this.#persist(); return p;
  }
  exportBundle(ids = null) {
    const views = [...this.views.values()].filter(v => !ids || ids.includes(v.id));
    const keep = new Set(views.map(v => v.id));
    return { format: VIEW_BUNDLE_FORMAT, version: 1, exportedAt: now(), views: views.map(({ id, name, description, state }) => ({ id, name, description, state })),
      presentations: [...this.presentations.values()].map(p => ({ id: p.id, name: p.name, viewIds: p.viewIds.filter(x => keep.has(x)) })) };
  }
  /** mode merge: same id -> overwrite, new id -> add. mode replace: drop everything first. */
  importBundle(bundle, { mode = 'merge', origin = 'import', seed = false } = {}) {
    if (!isObj(bundle) || bundle.format !== VIEW_BUNDLE_FORMAT || !Array.isArray(bundle.views)) throw new ViewError('bad_request', `not a ${VIEW_BUNDLE_FORMAT} bundle`);
    if (mode === 'replace') { this.views.clear(); this.presentations.clear(); }
    const r = { added: [], updated: [], skipped: [], warnings: [] };
    for (const raw of bundle.views) {
      if (!isObj(raw) || !cleanText(raw.name, 120)) { r.skipped.push(raw?.id ?? null); continue; }
      const id = typeof raw.id === 'string' && /^[\w-]{1,80}$/.test(raw.id) ? raw.id : this.#uniqueId(raw.name);
      if (seed && (this.views.has(id) || this.deletedSeeds.has(id))) { r.skipped.push(id); continue; }
      const w = []; const state = normalizeViewState(raw.state, w); r.warnings.push(...w.map(x => `${id}: ${x}`));
      const prev = this.views.get(id);
      this.views.set(id, { id, name: cleanText(raw.name, 120), description: cleanText(raw.description, 600), createdAt: prev?.createdAt || now(), updatedAt: now(), origin: prev?.origin || origin, state });
      (prev ? r.updated : r.added).push(id);
    }
    for (const p of Array.isArray(bundle.presentations) ? bundle.presentations : []) {
      if (!isObj(p) || typeof p.id !== 'string') continue;
      if (seed && this.presentations.has(p.id)) continue;
      const ids = (p.viewIds || []).filter(x => this.views.has(x));
      this.presentations.set(p.id, { id: p.id, name: cleanText(p.name, 120) || p.id, viewIds: ids, origin, updatedAt: now() });
    }
    this.#persist(); return r;
  }
}

/** view copy with node references limited to what the caller may see (selection, pins, roots, positions, focus). */
SavedViewStore.prototype.restrict = function (view, visible) { return view && { ...view, state: restrictState(view.state, visible) }; };
