// Load a wiki folder into a dialect-neutral model. Two dialects, one model:
//  - Vault-LD (a root context.jsonld exists): frontmatter is YAML-LD against the shared external context (notes MUST NOT carry
//    @context); identity = governing @base + file name (folders never enter the IRI) or an explicit absolute `id`;
//    frontmatter wikilinks are edges, body links are navigational only; host keys (tags/aliases/cssclasses) are not triples.
//  - OKF v0.2 (no root context.jsonld): every .md except index.md / log.md is a concept; `type` is required; identity is the
//    bundle path; links are Markdown body links; trust signals sources / generated / verified / status / stale_after.
// The loader is read-only and deterministic: files are processed in sorted path order and the result does not depend on
// directory listing order.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, posix, dirname } from 'node:path';
import { splitNote, sha256, wikilinkTarget, bodyLinks, encodeName, typeLabel } from './parse.js';
import { trustOf, DEFAULT_HUMANS } from './trust.js';
import { broken } from './broken.js';
import { loadTypeSchemas, validateModel, schemaContexts } from './schema.js';

export const HOST_KEYS = ['tags', 'aliases', 'cssclasses'];
export const RESERVED_OKF = ['index.md', 'log.md'];
const SKIP_DIRS = new Set(['node_modules', '.git', '.obsidian', '.trash']);
const isAbsIri = s => typeof s === 'string' && /^[A-Za-z][A-Za-z0-9+.-]*:[^\s]*$/.test(s) && !s.startsWith('[[');

export function walk(dir) {
  const out = [];
  const rec = rel => {
    const names = readdirSync(join(dir, rel), { withFileTypes: true }).map(d => ({ n: d.name, d: d.isDirectory() })).sort((a, b) => (a.n < b.n ? -1 : a.n > b.n ? 1 : 0));
    for (const { n, d } of names) {
      if (n.startsWith('.') || SKIP_DIRS.has(n)) continue;
      const r = rel ? `${rel}/${n}` : n;
      if (d) rec(r); else out.push(r);
    }
  };
  rec(''); return out;
}

/** Compose the Vault-LD context: root context.jsonld (array or object); string entries are LOCAL references resolved
 *  relative to the referencing document. Remote contexts are refused (security + offline). */
export function composeContext(dir) {
  const problems = [], docs = [], folderBases = [], seen = new Set();
  const load = (rel, from) => {
    if (/^[a-z][a-z0-9+.-]*:/i.test(rel)) { problems.push(`context: remote context refused (local only): ${rel} (in ${from})`); return []; }
    const p = posix.normalize(posix.join(posix.dirname(from), rel));
    if (p.startsWith('..')) { problems.push(`context: reference outside the vault refused: ${rel}`); return []; }
    if (seen.has(p)) return []; seen.add(p);
    if (!existsSync(join(dir, p))) { problems.push(`context: missing local context ${p}`); return []; }
    let doc; try { doc = JSON.parse(readFileSync(join(dir, p), 'utf8')); } catch (e) { problems.push(`context: ${p} is not JSON (${e.message})`); return []; }
    const c = doc['@context'] ?? doc, arr = Array.isArray(c) ? c : [c], out = [];
    for (const e of arr) {
      if (typeof e === 'string') out.push(...load(e, p));
      else if (e && typeof e === 'object') {
        const { '@base': base, ...rest } = e;
        if (typeof base === 'string') folderBases.push({ folder: posix.dirname(p) === '.' ? '' : posix.dirname(p), base, from: p });
        out.push(rest);
      }
    }
    return out;
  };
  docs.push(...load('context.jsonld', 'context.jsonld'));
  // folder contexts not referenced from the root still govern their folder's base (§4.5)
  for (const f of walk(dir).filter(f => posix.basename(f) === 'context.jsonld' && f !== 'context.jsonld' && !seen.has(f))) {
    try { const d = JSON.parse(readFileSync(join(dir, f), 'utf8')); const c = d['@context'] ?? d; for (const e of Array.isArray(c) ? c : [c]) if (e && typeof e === 'object' && typeof e['@base'] === 'string') folderBases.push({ folder: posix.dirname(f), base: e['@base'], from: f }); } catch {}
  }
  // term table, left to right, later entries override; warn on conflicting redefinitions (§4.2)
  const terms = new Map(), prefixes = new Map();
  for (const obj of docs) for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('@')) continue;
    const def = typeof v === 'string' ? { '@id': v } : v && typeof v === 'object' ? v : null; if (!def) continue;
    if (terms.has(k) && JSON.stringify(terms.get(k)) !== JSON.stringify(def)) problems.push(`context: term "${k}" redefined with a different definition`);
    terms.set(k, def);
    if (typeof v === 'string' && /[#/:]$/.test(v) && isAbsIri(v)) prefixes.set(k, v);
  }
  const expand = (s, depth = 0) => {
    if (typeof s !== 'string' || depth > 8) return null;
    if (s.startsWith('@')) return s;
    const i = s.indexOf(':');
    if (i > 0) { const p = s.slice(0, i), rest = s.slice(i + 1); if (!rest.startsWith('//') && prefixes.has(p)) return prefixes.get(p) + rest; if (isAbsIri(s)) return s; }
    if (terms.has(s)) { const d = terms.get(s); return d['@id'] ? expand(d['@id'], depth + 1) : null; }
    return null;
  };
  const typeAliases = [...terms].filter(([, d]) => d['@id'] === '@type').map(([k]) => k);
  const idAliases = [...terms].filter(([, d]) => d['@id'] === '@id').map(([k]) => k);
  folderBases.sort((a, b) => b.folder.length - a.folder.length || (a.folder < b.folder ? -1 : 1));
  return { docs, terms, prefixes, expand, typeAliases: ['@type', ...typeAliases], idAliases: ['@id', ...idAliases], folderBases, problems };
}

/** Load a vault. opts: { slug, base (OKF IRI base), humans } */
export function loadVault(dir, opts = {}) {
  const slug = opts.slug || posix.basename(String(dir).replace(/\\/g, '/').replace(/\/+$/, '')) || 'wiki';
  if (!existsSync(dir) || !statSync(dir).isDirectory()) throw new Error(`wiki folder not found: ${dir}`);
  const dialect = opts.dialect || (existsSync(join(dir, 'context.jsonld')) ? 'vault-ld' : 'okf');
  const humans = opts.humans || DEFAULT_HUMANS, problems = [];
  const ctx = dialect === 'vault-ld' ? composeContext(dir) : null;
  if (ctx) problems.push(...ctx.problems);
  const okfBase = opts.base || `https://streamgraph.local/wiki/${encodeName(slug)}/`;
  const files = walk(dir).filter(f => f.toLowerCase().endsWith('.md'));
  const notes = [];
  for (const path of files) {
    const text = readFileSync(join(dir, path), 'utf8');
    const { frontmatter: fm, body, problems: pp } = splitNote(text);
    const name = posix.basename(path).replace(/\.md$/i, '');
    const reserved = dialect === 'okf' && RESERVED_OKF.includes(posix.basename(path).toLowerCase());
    notes.push({ path, name, fm, body, sha256: sha256(text), size: text.length, problems: [...pp], reserved, dialect });
  }
  const live = notes.filter(n => !n.reserved);
  // identity
  const baseFor = path => { if (!ctx) return okfBase; const f = posix.dirname(path) === '.' ? '' : posix.dirname(path); for (const b of ctx.folderBases) if (b.folder === '' || f === b.folder || f.startsWith(b.folder + '/')) return b.base; return null; };
  for (const n of live) {
    n.layer = /^(Ontologies|Vocabularies)\//.test(n.path) ? 'schema' : 'instance';
    if (dialect === 'vault-ld') {
      if (n.fm && Object.prototype.hasOwnProperty.call(n.fm, '@context')) n.problems.push('vault-ld: notes MUST NOT carry @context (ignored)');
      const tkey = ctx.typeAliases.find(k => n.fm && n.fm[k] != null);
      n.participates = !!tkey; n.typeKey = tkey || null;
      const idKey = ctx.idAliases.find(k => n.fm && n.fm[k] != null);
      const explicit = idKey ? n.fm[idKey] : null;
      if (explicit != null && !isAbsIri(String(explicit))) n.problems.push(`id: must be an absolute IRI (got ${explicit}); minted from the file name instead`);
      n.base = baseFor(n.path);
      const local = broken() ? n.path.replace(/\.md$/i, '').split('/').map(encodeName).join('/') : encodeName(n.name);
      n.iri = explicit != null && isAbsIri(String(explicit)) ? String(explicit) : n.base ? n.base + local : null;
      if (!n.iri && n.participates) n.problems.push('identity: no @base governs this note');
      n.idKey = idKey || null;
    } else {
      n.participates = true; n.typeKey = n.fm && n.fm.type != null ? 'type' : null;
      if (!n.fm) n.problems.push('okf: frontmatter is required');
      else if (n.fm.type == null || n.fm.type === '') n.problems.push('okf: type is required');
      n.identity = '/' + n.path.replace(/\.md$/i, '');
      n.iri = okfBase + n.path.replace(/\.md$/i, '').split('/').map(encodeName).join('/');
    }
    const types = n.typeKey ? [].concat(n.fm[n.typeKey]).filter(t => t != null && t !== '').map(String) : [];
    n.types = types;
    n.label = types.length ? typeLabel(types[0]) : 'Note';
    n.title = String(n.fm?.title ?? n.fm?.label ?? n.fm?.prefLabel ?? n.fm?.name ?? n.name);
    n.trust = trustOf(n.fm || {}, { humans });
    n.problems.push(...n.trust.problems);
  }
  // name / path / iri indexes; duplicate names without an explicit id get a warning (Vault-LD identity is the file name)
  const byName = new Map(), byNameLc = new Map(), byPath = new Map(), byIri = new Map();
  for (const n of live) {
    byPath.set(n.path, n);
    if (byName.has(n.name)) { const first = byName.get(n.name); if (dialect === 'vault-ld' && !n.idKey) n.problems.push(`identity: duplicate file name "${n.name}" (also ${first.path}); add an explicit id`); }
    else byName.set(n.name, n);
    if (!byNameLc.has(n.name.toLowerCase())) byNameLc.set(n.name.toLowerCase(), n);
    if (n.iri) { if (byIri.has(n.iri) && n.participates) n.problems.push(`identity: IRI ${n.iri} already minted by ${byIri.get(n.iri).path}`); else if (n.participates) byIri.set(n.iri, n); }
  }
  const resolveName = (target, from) => {
    const t = String(target).trim().replace(/\.md$/i, '');
    if (t.includes('/')) { const exact = byPath.get(t.replace(/^\//, '') + '.md'); if (exact) return exact; for (const n of live) if (('/' + n.path).endsWith('/' + t + '.md')) return n; }
    return byName.get(t) || byNameLc.get(t.toLowerCase()) || null;
  };
  const resolveMd = (target, from) => {
    const p = target.startsWith('/') ? posix.normalize(target.slice(1)) : posix.normalize(posix.join(posix.dirname(from.path), target));
    return byPath.get(p) || null;
  };
  // keys
  const keyCount = new Map();
  for (const n of live) {
    const want = dialect === 'okf' ? n.identity.slice(1) : n.name;
    let key = `${slug}:${want}`; if (keyCount.has(key)) key = `${slug}:${n.path.replace(/\.md$/i, '')}`;
    keyCount.set(key, 1); n.key = key;
  }
  // links
  for (const n of live) {
    n.frontLinks = []; n.bodyLinks = [];
    if (n.fm) {
      const skip = new Set([...(ctx ? ctx.idAliases : ['id']), ...(dialect === 'okf' ? ['generated', 'verified', 'sources'] : [])]);
      for (const [k, v] of Object.entries(n.fm)) {
        if (skip.has(k)) continue;
        const vals = Array.isArray(v) ? v : [v];
        for (const x of vals) { const t = wikilinkTarget(x); if (t) { const to = resolveName(t, n); n.frontLinks.push({ key: k, target: t, to: to || null, isType: !!(n.typeKey && k === n.typeKey) }); if (!to) n.problems.push(`link: [[${t}]] in "${k}" does not resolve to a note`); } }
      }
    }
    for (const l of bodyLinks(n.body)) {
      const to = l.kind === 'markdown' ? resolveMd(l.target, n) : resolveName(l.target, n);
      n.bodyLinks.push({ target: l.target, kind: l.kind, to: to || null });
    }
  }
  const model = { dir, slug, dialect, ctx, okfBase, humans, notes: live, reserved: notes.filter(n => n.reserved), byName, byPath, byIri, resolveName, problems };
  // W3 + W2b: per-type schemas validate frontmatter and contribute JSON-LD terms (root/ontology terms win; @vocab/@base ignored)
  const ts = loadTypeSchemas(dir); problems.push(...ts.problems); model.typeSchemas = ts.schemas;
  const extra = {};
  for (const c of schemaContexts(ts.schemas)) for (const [k, v] of Object.entries(c)) { if (k.startsWith('@') || (ctx && ctx.terms.has(k)) || k in extra) continue; extra[k] = v; }
  if (Object.keys(extra).length) {
    model.schemaDoc = extra;
    if (ctx) { ctx.docs.push(extra); for (const [k, v] of Object.entries(extra)) { ctx.terms.set(k, typeof v === 'string' ? { '@id': v } : v); if (typeof v === 'string' && /[#/:]$/.test(v) && isAbsIri(v)) ctx.prefixes.set(k, v); } }
  }
  if (opts.validate !== false) validateModel(model, ts.schemas);
  return model;
}
