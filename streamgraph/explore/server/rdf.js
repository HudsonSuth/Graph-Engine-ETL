// Optional RDF import/export (Phase 4) with N3.js (MIT). Things become <urn:streamgraph:node:Type:key> resources typed
// <urn:streamgraph:type:Type>; fields become literals under <urn:streamgraph:field:name>; connections become triples with
// <urn:streamgraph:rel:TYPE>. Import accepts that shape and also generic RDF (rdf:type local name = type, IRI local name = key).
import N3 from 'n3';
const { Writer, Parser, DataFactory } = N3; const { namedNode, literal, quad } = DataFactory;
const NS = 'urn:streamgraph:', RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', XSD = 'http://www.w3.org/2001/XMLSchema#';
const enc = s => encodeURIComponent(String(s)).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
const nodeIri = id => namedNode(`${NS}node:${id.replace(/^sg:node:/, '').split(':').map(enc).join(':')}`);
const lit = v => (typeof v === 'number' ? literal(String(v), namedNode(XSD + (Number.isInteger(v) ? 'integer' : 'double'))) : typeof v === 'boolean' ? literal(String(v), namedNode(XSD + 'boolean')) : literal(String(v)));

/** items: access-filtered explore items (masked values stay "[hidden]") -> deterministic Turtle or N-Triples */
export function toRdf(items, format = 'turtle') {
  const w = new Writer({ format: format === 'ntriples' ? 'N-Triples' : 'Turtle', prefixes: format === 'turtle' ? { sg: NS, rdfs: 'http://www.w3.org/2000/01/rdf-schema#' } : {} });
  const qs = [];
  for (const it of [...items].sort((a, b) => String(a.id).localeCompare(String(b.id)))) {
    if (it.kind === 'node') {
      const s = nodeIri(it.id); qs.push(quad(s, namedNode(RDF_TYPE), namedNode(`${NS}type:${enc(it.type)}`)));
      if (it.label != null) qs.push(quad(s, namedNode('http://www.w3.org/2000/01/rdf-schema#label'), literal(String(it.label))));
      for (const [k, v] of Object.entries(it.properties || {}).sort()) if (v != null && typeof v !== 'object' && k !== 'key') qs.push(quad(s, namedNode(`${NS}field:${enc(k)}`), lit(v)));
    } else if (it.kind === 'link' && it.fromId && it.toId) qs.push(quad(nodeIri(it.fromId), namedNode(`${NS}rel:${enc(it.type)}`), nodeIri(it.toId)));
  }
  w.addQuads(qs);
  return new Promise((res, rej) => w.end((e, r) => (e ? rej(e) : res(r))));
}
const local = iri => { const s = decodeURIComponent(String(iri)); const m = /[#/:]([^#/:]+)$/.exec(s); return m ? m[1] : s; };
const typeName = iri => (local(iri).replace(/[^\w]/g, '_').replace(/^(\d)/, 'T$1') || 'Resource');
export function fromRdf(text, format = 'turtle') {
  if (text.length > 20e6) throw Object.assign(new Error('RDF files are limited to 20 MB.'), { status: 400 });
  const quads = new Parser({ format: format === 'ntriples' ? 'N-Triples' : 'Turtle' }).parse(text); // throws on bad syntax
  const subj = new Map(), get = iri => { let s = subj.get(iri); if (!s) subj.set(iri, (s = { iri, type: null, props: {}, out: [] })); return s; };
  for (const q of quads) {
    if (q.subject.termType !== 'NamedNode') continue;
    const s = get(q.subject.value), p = q.predicate.value;
    if (p === RDF_TYPE && q.object.termType === 'NamedNode') { s.type = typeName(q.object.value); continue; }
    if (q.object.termType === 'Literal') { const k = p === 'http://www.w3.org/2000/01/rdf-schema#label' ? 'name' : local(p).replace(/[^\w]/g, '_'); const dt = q.object.datatype?.value || ''; s.props[k] = /integer|double|decimal|float/.test(dt) ? Number(q.object.value) : dt.endsWith('boolean') ? q.object.value === 'true' : q.object.value; }
    else if (q.object.termType === 'NamedNode') { get(q.object.value); s.out.push([local(p).replace(/[^\w]/g, '_').toUpperCase(), q.object.value]); }
  }
  const keyOf = s => { const m = new RegExp(`^${NS}node:([^:]+):(.+)$`).exec(s.iri); return m ? [decodeURIComponent(m[1]), decodeURIComponent(m[2])] : [s.type || 'Resource', local(s.iri)]; };
  const nodes = [], ids = new Map();
  for (const s of subj.values()) { const [t, k] = keyOf(s); const type = /^[A-Za-z]\w*$/.test(t) ? t : 'Resource'; ids.set(s.iri, `${type}:${k}`); nodes.push({ type, key: k, props: Object.fromEntries(Object.entries(s.props).filter(([f]) => /^[A-Za-z]\w*$/.test(f) && f !== 'key')) }); }
  const edges = []; for (const s of subj.values()) for (const [t, o] of s.out) edges.push({ type: /^[A-Za-z_]\w*$/.test(t) ? t : 'RELATED', from: ids.get(s.iri), to: ids.get(o) });
  return { nodes, edges };
}
