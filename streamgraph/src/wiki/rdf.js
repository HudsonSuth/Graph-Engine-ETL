// W2: YAML-LD / JSON-LD <-> RDF for wiki vaults.
//  export: each participating note's frontmatter is expanded as ONE ordinary JSON-LD document against the composed context,
//          with the governing folder's @base as the base option and wikilinks pre-resolved to note IRIs (Vault-LD §4.5/§5.4).
//          Placement travels as vld:path when the note is not at its reconstructable default spot. Bodies never become RDF.
//  ingest: RDF (Turtle / N-Quads / JSON-LD) -> one .md per subject (Vault-LD §5.5); vld:path is consumed into placement;
//          existing bodies (and host keys) are preserved byte-for-byte; unmapped predicates are flagged, never silently dropped.
// Contexts are LOCAL only: the document loader refuses every remote URL.
import jsonld from 'jsonld';
import { Parser, Writer, DataFactory } from 'n3';
import { stringify as yamlStringify } from 'yaml';
import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from 'node:fs';
import { join, posix, dirname } from 'node:path';
import { loadVault, HOST_KEYS } from './vault.js';
import { splitNote, joinNote, wikilinkTarget, encodeName, decodeName } from './parse.js';
import { broken } from './broken.js';

export const VLD = 'https://github.com/The-Knowledge-Graph-Guys/vault-ld#';
export const VLD_PATH = VLD + 'path';
export const OKF_NS = 'https://streamgraph.local/ns/okf#'; // our mapping namespace for OKF trust fields (not an official OKF IRI)
const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const XSD = 'http://www.w3.org/2001/XMLSchema#';

export const documentLoader = async url => { throw Object.assign(new Error(`remote JSON-LD context refused (local contexts only): ${url}`), { code: 'remote_context_refused' }); };

/** Context-like object for an OKF bundle (Vault-LD Appendix B lift, minted from the bundle path; see README). */
export function okfContext(model) {
  const vocab = model.okfBase + 'vocab#';
  const doc = { '@vocab': vocab, xsd: XSD, okf: OKF_NS, type: '@type',
    generated: { '@id': 'okf:generated' }, verified: { '@id': 'okf:verified', '@container': '@set' }, sources: { '@id': 'okf:sources', '@container': '@set' },
    by: { '@id': 'okf:by' }, at: { '@id': 'okf:at', '@type': 'xsd:dateTime' }, status: { '@id': 'okf:status' }, stale_after: { '@id': 'okf:staleAfter', '@type': 'xsd:dateTime' },
    resource: { '@id': 'okf:resource' }, title: { '@id': 'http://purl.org/dc/terms/title' }, description: { '@id': 'http://purl.org/dc/terms/description' } };
  if (model.schemaDoc) Object.entries(model.schemaDoc).forEach(([k, v]) => { if (!(k in doc)) doc[k] = v; });
  return { docs: [doc], vocab, prefixes: new Map([['okf', OKF_NS], ['xsd', XSD], ['vocab', vocab]]), typeAliases: ['@type', 'type'], idAliases: ['@id'], hasVocab: true };
}

const governing = (model, n) => { if (model.dialect !== 'vault-ld') return { folder: '', base: model.okfBase }; const f = posix.dirname(n.path) === '.' ? '' : posix.dirname(n.path); for (const b of model.ctx.folderBases) if (b.folder === '' || f === b.folder || f.startsWith(b.folder + '/')) return b; return { folder: '', base: null }; };
const relTo = (folder, path) => (folder ? path.slice(folder.length + 1) : path);
function defaultRel(n, kinds) {
  if (n.layer !== 'schema') return n.name + '.md';
  if (kinds.has('owl:Class') || kinds.has('rdfs:Class')) return `Classes/${n.name}.md`;
  if ([...kinds].some(k => /^owl:(Object|Datatype|Annotation)Property$|^rdf:Property$/.test(k))) return `Properties/${n.name}.md`;
  return n.name + '.md';
}

/** JSON-LD documents for the vault's participating notes. opts.include(note) filters (ABAC); opts.fieldFilter(note, key). */
export function noteDocs(model, opts = {}) {
  const problems = [], out = [];
  const ctx = model.dialect === 'vault-ld' ? model.ctx : okfContext(model);
  const hasVocab = ctx.hasVocab || ctx.docs.some(d => d['@vocab']);
  const mapped = k => k.startsWith('@') || (ctx.terms ? ctx.terms.has(k) || ctx.expand(k) != null : true) || hasVocab;
  for (const n of model.notes) {
    if (!n.participates || !n.iri || (opts.include && !opts.include(n))) continue;
    const g = governing(model, n), fm = n.fm || {}, doc = {};
    const linkIri = t => { const to = model.resolveName(t, n); if (to && opts.include && !opts.include(to)) return undefined; if (to?.participates && to.iri) return to.iri; problems.push(`${n.path}: [[${t}]] has no note; minted under ${g.base}`); return (g.base || '') + encodeName(t); };
    const rw = (v, k) => {
      if (Array.isArray(v)) return v.map(x => rw(x, k)).filter(x => x !== undefined);
      const t = wikilinkTarget(v); if (t) { const iri = linkIri(t); return iri === undefined ? undefined : ctx.typeAliases.includes(k) ? iri : { '@id': iri }; } // links to notes the reader may not see are dropped
      if (model.dialect === 'okf' && ctx.typeAliases.includes(k) && typeof v === 'string') return ctx.vocab + encodeName(v.replace(/\s+/g, ''));
      if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([a, b]) => [a, rw(b, a)]));
      return v;
    };
    for (const [k, v] of Object.entries(fm)) {
      if (k === '@context' || ctx.idAliases.includes(k)) continue;
      if (HOST_KEYS.includes(k) && !(ctx.terms && ctx.terms.has(k))) continue; // host keys are not triples
      if (opts.fieldFilter && !opts.fieldFilter(n, k)) continue;
      if (!mapped(k)) { problems.push(`${n.path}: field "${k}" is not in the context (not exported; add a term to make it first-class)`); continue; }
      const val = rw(v, k); if (val === undefined || (Array.isArray(val) && !val.length)) continue;
      doc[model.dialect === 'okf' ? k.replace(/[^\w.-]/g, '_') : k] = val;
    }
    doc['@id'] = n.iri;
    out.push({ note: n, base: g.base, folder: g.folder, doc: { '@context': ctx.docs, ...doc } });
  }
  return { docs: out, problems, ctx };
}

const nqLine = q => { const w = new Writer({ format: 'N-Quads' }); return w.quadsToString([q]).trim(); };

/** Export the vault. format: nquads (RDFC-1.0 canonical) | turtle | jsonld | yamlld. */
export async function exportVault(model, { format = 'nquads', roundTrip = true, include, fieldFilter } = {}) {
  const { docs, problems, ctx } = noteDocs(model, { include, fieldFilter });
  const lines = new Set();
  let di = 0;
  for (const { note, doc, base, folder } of docs) {
    di++;
    let nq;
    try { nq = await jsonld.toRDF(doc, { base: base || undefined, documentLoader, format: 'application/n-quads', safe: false }); }
    catch (e) { problems.push(`${note.path}: ${e.message}`); continue; }
    for (const q of new Parser({ format: 'N-Quads', blankNodePrefix: `d${di}_` }).parse(nq)) lines.add(nqLine(q)); // per-note blank-node labels
    if (roundTrip && model.dialect === 'vault-ld') {
      const kinds = new Set(note.types.map(String));
      const rel = relTo(folder, note.path);
      if (rel !== defaultRel(note, kinds) || note.idKey) lines.add(nqLine(DataFactory.quad(DataFactory.namedNode(note.iri), DataFactory.namedNode(VLD_PATH), DataFactory.literal(rel))));
    }
  }
  const nquads = [...lines].sort().join('\n') + (lines.size ? '\n' : '');
  let text;
  if (format === 'nquads' || format === 'ntriples') text = await canonical(nquads);
  else if (format === 'turtle') text = await toTurtle(nquads, prefixMap(ctx));
  else if (format === 'jsonld' || format === 'yamlld') {
    const expanded = await jsonld.fromRDF(nquads, { format: 'application/n-quads' });
    const compacted = await jsonld.compact(expanded, { '@context': ctx.docs }, { documentLoader, base: null });
    text = format === 'jsonld' ? JSON.stringify(compacted, null, 2) + '\n' : yamlStringify(compacted, { lineWidth: 0 });
  } else throw new Error(`unknown format ${format} (nquads | turtle | jsonld | yamlld)`);
  return { text, triples: lines.size, notes: docs.length, problems };
}

export const canonical = async nquads => (nquads.trim() ? jsonld.canonize(nquads, { algorithm: 'RDFC-1.0', inputFormat: 'application/n-quads', format: 'application/n-quads' }) : '');
export const prefixMap = ctx => { const p = Object.fromEntries([...(ctx.prefixes || new Map())].filter(([k]) => /^[A-Za-z][\w-]*$/.test(k))); p.vld = VLD; return p; };
export function toTurtle(nquads, prefixes = {}) {
  const quads = new Parser({ format: 'N-Quads' }).parse(nquads);
  return new Promise((res, rej) => { const w = new Writer({ prefixes }); w.addQuads(quads); w.end((e, r) => (e ? rej(e) : res(r))); });
}

/** Parse RDF text into n3 quads. format: turtle | nquads | ntriples | jsonld */
const remoteCtx = v => { if (Array.isArray(v)) return v.map(remoteCtx).find(Boolean); if (!v || typeof v !== 'object') return null; for (const [k, x] of Object.entries(v)) { if (k === '@context') { for (const c of [].concat(x)) if (typeof c === 'string') return c; } const r = remoteCtx(x); if (r) return r; } return null; };
export async function parseRdf(text, format = 'turtle') {
  if (format === 'jsonld') {
    const doc = typeof text === 'string' ? JSON.parse(text) : text, url = remoteCtx(doc);
    if (url) throw Object.assign(new Error(`remote JSON-LD context refused (local contexts only): ${url}`), { code: 'remote_context_refused', status: 400 });
    const nq = await jsonld.toRDF(doc, { documentLoader, format: 'application/n-quads' }); return new Parser({ format: 'N-Quads' }).parse(nq);
  }
  return new Parser({ format: format === 'turtle' ? 'Turtle' : 'N-Quads' }).parse(String(text));
}

function atomicWrite(file, text) { mkdirSync(dirname(file), { recursive: true }); const tmp = `${file}.tmp-${process.pid}-${Date.now()}`; writeFileSync(tmp, text); renameSync(tmp, file); }

/** RDF -> Vault-LD folder (§5.5). Returns { written, untouched, problems }. dry: compute without writing. */
export async function ingestRdf(dir, text, { format = 'turtle', dry = false } = {}) {
  const model = loadVault(dir);
  if (model.dialect !== 'vault-ld') throw new Error('RDF ingest needs a Vault-LD folder (root context.jsonld)');
  const ctx = model.ctx, problems = [];
  const quads = await parseRdf(text, format);
  const subjects = new Map();
  for (const q of quads) {
    if (q.subject.termType !== 'NamedNode') { problems.push(`blank-node subject skipped (out of scope): ${q.subject.value}`); continue; }
    if (!subjects.has(q.subject.value)) subjects.set(q.subject.value, []);
    subjects.get(q.subject.value).push(q);
  }
  // term index: predicate IRI -> [{ term, coerce, container }]
  const byPred = new Map();
  for (const [name, def] of ctx.terms) {
    if (typeof def['@id'] === 'string' && def['@id'].startsWith('@')) continue;
    const iri = ctx.expand(name); if (!iri) continue;
    const coerce = def['@type'] ? (def['@type'].startsWith('@') ? def['@type'] : ctx.expand(def['@type'])) : null;
    if (!byPred.has(iri)) byPred.set(iri, []); byPred.get(iri).push({ term: name, coerce, container: def['@container'] || null });
  }
  const typeKey = ctx.typeAliases.find(k => k !== '@type') || '@type', idKey = ctx.idAliases.find(k => k !== '@id') || '@id';
  const bases = [...ctx.folderBases].sort((a, b) => b.base.length - a.base.length);
  const compact = iri => { let best = null; for (const [p, ns] of ctx.prefixes) if (iri.startsWith(ns) && iri.length > ns.length && /^[\w.-]+$/.test(iri.slice(ns.length)) && (!best || ns.length > best[1].length)) best = [p, ns]; return best ? `${best[0]}:${iri.slice(best[1].length)}` : iri; };
  // placement
  const placement = new Map();
  for (const [s, qs] of subjects) {
    const vp = qs.find(q => q.predicate.value === VLD_PATH && q.object.termType === 'Literal');
    const b = bases.find(x => s.startsWith(x.base));
    const existing = model.byIri.get(s);
    let path, explicit = false;
    if (vp) path = posix.normalize(b && b.folder ? `${b.folder}/${vp.object.value}` : vp.object.value);
    else if (existing) path = existing.path;
    else if (b) {
      const local = decodeName(s.slice(b.base.length)), types = qs.filter(q => q.predicate.value === RDF_TYPE).map(q => compact(q.object.value));
      const sub = b.folder.startsWith('Ontologies/') ? (types.some(t => /^(owl|rdfs):Class$/.test(t)) ? 'Classes/' : types.some(t => /Property$/.test(t)) ? 'Properties/' : '') : '';
      path = posix.join(b.folder, sub + local + '.md');
    } else { path = decodeName(s.replace(/[#/]+$/, '').split(/[#/]/).pop() || 'resource') + '.md'; }
    if (path.startsWith('..') || path.startsWith('/')) { problems.push(`unsafe path for ${s}: ${path}`); continue; }
    const name = posix.basename(path).replace(/\.md$/, '');
    if (!b || b.base + encodeName(name) !== s) explicit = true;
    placement.set(s, { path, name, explicit });
  }
  const noteName = iri => placement.get(iri)?.name ?? (model.byIri.get(iri)?.name || null);
  const value = (o, coerce) => {
    if (o.termType === 'NamedNode') { const nm = noteName(o.value); return nm ? `[[${nm}]]` : compact(o.value); }
    if (o.termType === 'BlankNode') return undefined;
    const dt = o.datatype?.value;
    if (o.language) { problems.push(`language tag @${o.language} dropped on "${o.value}"`); return o.value; }
    if (dt === XSD + 'integer' || dt === XSD + 'long' || dt === XSD + 'int') { const n = Number(o.value); return Number.isSafeInteger(n) ? n : o.value; }
    if (dt === XSD + 'double' || dt === XSD + 'decimal' || dt === XSD + 'float') return Number(o.value);
    if (dt === XSD + 'boolean') return o.value === 'true';
    if (!dt || dt === XSD + 'string' || dt === coerce) return o.value;
    problems.push(`datatype <${dt}> on "${o.value}" has no term coercion; written as a string`); return o.value;
  };
  const written = [];
  for (const [s, qs] of subjects) {
    const pl = placement.get(s); if (!pl) continue;
    const fm = {};
    if (pl.explicit) fm[idKey] = s;
    const types = qs.filter(q => q.predicate.value === RDF_TYPE).map(q => value(q.object));
    if (types.length) fm[typeKey] = types.length === 1 ? types[0] : types;
    const groups = new Map();
    for (const q of qs) {
      const p = q.predicate.value; if (p === RDF_TYPE || p === VLD_PATH) continue;
      if (q.object.termType === 'BlankNode') { problems.push(`${pl.path}: blank-node value of <${p}> is out of scope (flagged, not written)`); continue; }
      const cands = byPred.get(p);
      if (!cands) { problems.push(`${pl.path}: predicate <${p}> has no short name in the context (flagged, not written)`); continue; }
      const isIri = q.object.termType === 'NamedNode', dt = q.object.datatype?.value;
      const t = cands.find(c => (isIri ? c.coerce === '@id' || c.coerce === '@vocab' : c.coerce === dt)) || cands.find(c => (isIri ? !c.coerce : !c.coerce || c.coerce !== '@id')) || cands[0];
      if (isIri && t.coerce !== '@id' && t.coerce !== '@vocab' && !noteName(q.object.value)) problems.push(`${pl.path}: IRI value for non-IRI term "${t.term}" may re-export as a literal`);
      if (!groups.has(t.term)) groups.set(t.term, { t, vals: [] });
      groups.get(t.term).vals.push(value(q.object, t.coerce));
    }
    for (const term of [...groups.keys()].sort()) { const { t, vals } = groups.get(term); vals.sort((a, b) => (String(a) < String(b) ? -1 : 1)); fm[term] = vals.length === 1 && t.container !== '@set' && t.container !== '@list' ? vals[0] : vals; }
    // preserve the existing file's body, host keys and key order
    const file = join(dir, pl.path); let body = '';
    if (existsSync(file)) {
      const old = splitNote(readFileSync(file, 'utf8'));
      if (!broken()) body = old.body;
      if (old.frontmatter) {
        const ordered = {};
        for (const k of Object.keys(old.frontmatter)) { if (k in fm) ordered[k] = fm[k]; else if (HOST_KEYS.includes(k)) ordered[k] = old.frontmatter[k]; }
        for (const k of Object.keys(fm)) if (!(k in ordered)) ordered[k] = fm[k];
        Object.keys(fm).forEach(k => delete fm[k]); Object.assign(fm, ordered);
      }
    }
    if (!dry) atomicWrite(file, joinNote(fm, body));
    written.push(pl.path);
  }
  const untouched = model.notes.filter(n => n.participates && !subjects.has(n.iri)).map(n => n.path);
  return { written: written.sort(), untouched, problems };
}
export { atomicWrite };
