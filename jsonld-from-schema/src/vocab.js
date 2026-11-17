// (b) RDFS/OWL vocabulary and SHACL shapes as deterministic Turtle. SPEC §5 (V-01..V-03, S-01..S-06).
import N3 from 'n3';
import { NS, pctEncode } from './util.js';
import { cmp } from './errors.js';
import { BROKEN } from './impl.js';
const { DataFactory } = N3; const { namedNode: nn, literal } = DataFactory;
const R = l => NS.rdf + l, RS = l => NS.rdfs + l, O = l => NS.owl + l, SH = l => NS.sh + l, X = l => NS.xsd + l;

function numLit(n) { return Number.isInteger(n) ? literal(String(n), nn(X('integer'))) : literal(String(n), nn(X('decimal'))); }
function valueLit(v, coercion) {
  if (typeof v === 'number') return coercion === X('double') ? literal(String(v), nn(X('double'))) : numLit(v);
  if (typeof v === 'boolean') return literal(String(v), nn(X('boolean')));
  if (v === null) return literal('null', nn(R('JSON')));
  if (typeof v === 'object') return literal(JSON.stringify(v), nn(R('JSON')));
  return coercion && coercion.startsWith(NS.xsd) ? literal(String(v), nn(coercion)) : literal(String(v));
}
const termKey = t => (t.list ? 'L' + t.list.map(termKey).join(',') : t.termType + ':' + t.value + (t.datatype ? '^^' + t.datatype.value : '') + (t.language ? '@' + t.language : ''));

function write(triples, prefixes) {
  const sorted = [...triples].sort((a, b) => cmp(a[0].value, b[0].value) || cmp(a[1].value, b[1].value) || cmp(termKey(a[2]), termKey(b[2])));
  const seen = new Set(), uniq = [];
  for (const t of sorted) { const k = t[0].value + ' ' + t[1].value + ' ' + termKey(t[2]); if (!seen.has(k)) { seen.add(k); uniq.push(t); } }
  const pfx = Object.fromEntries(Object.entries(prefixes).sort((a, b) => cmp(a[0], b[0])));
  const w = new N3.Writer({ prefixes: pfx });
  for (const [s, p, o] of uniq) w.addQuad(s, p, o.list ? w.list(o.list) : o);
  return new Promise((res, rej) => w.end((e, r) => (e ? rej(e) : res(r))));
}

function allNodes(M) { return [...M.registry.values()]; }

export async function buildVocab(M) {
  const o = M.opts, T = [];
  const inVocab = iri => iri.startsWith(o.vocab);
  const owners = new Map(), ranges = new Map(), kinds = new Map(), comments = new Map();
  for (const node of allNodes(M)) {
    if (node.cls && inVocab(node.cls.full)) {
      const c = nn(node.cls.full);
      T.push([c, nn(R('type')), nn(RS('Class'))], [c, nn(R('type')), nn(O('Class'))], [c, nn(RS('label')), literal(node.label || node.name)]);
      if (node.comment) T.push([c, nn(RS('comment')), literal(node.comment)]);
    }
    for (const [n, pi] of node.props) {
      if (pi.excluded) continue;
      const iri = pi.iri.full;
      if (!owners.has(iri)) { owners.set(iri, new Set()); ranges.set(iri, new Set()); kinds.set(iri, new Set()); comments.set(iri, new Set()); }
      owners.get(iri).add(node.cls ? node.cls.full : '');
      ranges.get(iri).add(pi.unknown || pi.conflict ? '' : pi.nested ? (pi.nested.cls ? pi.nested.cls.full : '') : pi.range || '');
      kinds.get(iri).add(pi.unknown || pi.conflict ? '?' : pi.literal && !pi.nested ? 'D' : 'O');
      if (pi.description) comments.get(iri).add(pi.description);
      if (!kinds.get(iri).name) kinds.get(iri).name = n;
    }
  }
  for (const [iri, own] of owners) {
    if (!inVocab(iri)) continue;
    const p = nn(iri);
    T.push([p, nn(R('type')), nn(R('Property'))], [p, nn(RS('label')), literal(kinds.get(iri).name)]);
    const k = kinds.get(iri);
    if (k.size === 1 && k.has('D')) T.push([p, nn(R('type')), nn(O('DatatypeProperty'))]);
    if (k.size === 1 && k.has('O')) T.push([p, nn(R('type')), nn(O('ObjectProperty'))]);
    if (own.size === 1 && !own.has('')) T.push([p, nn(RS('domain')), nn([...own][0])]);
    const rg = ranges.get(iri); if (rg.size === 1 && !rg.has('')) T.push([p, nn(RS('range')), nn([...rg][0])]);
    for (const c of [...comments.get(iri)].sort()) T.push([p, nn(RS('comment')), literal(c)]);
  }
  return write(T, { rdf: NS.rdf, rdfs: NS.rdfs, owl: NS.owl, xsd: NS.xsd, v: o.vocab });
}

export async function buildShapes(M) {
  const o = M.opts, T = [];
  const shapeIri = new Map();
  const assign = (node, iri) => { if (!shapeIri.has(node.key)) shapeIri.set(node.key, iri); };
  // named shapes first (classes, root), then untitled nested ones relative to their parent (S-01)
  for (const node of allNodes(M)) if (node.cls || node.isRoot) assign(node, `${o.vocab}${node.name || 'Root'}Shape`);
  const visit = (node, seen = new Set()) => {
    if (seen.has(node.key)) return; seen.add(node.key);
    for (const [n, pi] of node.props) if (pi.nested) { assign(pi.nested, `${shapeIri.get(node.key)}-${pctEncode(n)}-node`); visit(pi.nested, seen); }
  };
  visit(M.root);
  for (const node of allNodes(M)) if (!shapeIri.has(node.key)) assign(node, `${o.vocab}${node.name || 'Anon'}Shape`);
  for (const node of allNodes(M)) {
    const s = nn(shapeIri.get(node.key));
    T.push([s, nn(R('type')), nn(SH('NodeShape'))]);
    if (node.cls) T.push([s, nn(SH('targetClass')), nn(node.cls.full)]);
    if (node.closed) { T.push([s, nn(SH('closed')), literal('true', nn(X('boolean')))], [s, nn(SH('ignoredProperties')), { list: [nn(R('type'))] }]); }
    for (const [n, pi] of node.props) {
      if (pi.excluded) continue;
      const ps = nn(`${s.value}-${pctEncode(n)}`);
      T.push([s, nn(SH('property')), ps], [ps, nn(R('type')), nn(SH('PropertyShape'))], [ps, nn(SH('path')), nn(pi.iri.full)]);
      const req = pi.required && !BROKEN();
      let min = req ? 1 : undefined, max;
      if (pi.isArray) { if (typeof pi.minItems === 'number' && pi.minItems > 0) min = Math.max(min || 0, pi.minItems); if (typeof pi.maxItems === 'number') max = pi.maxItems; }
      else max = 1;
      if (min !== undefined) T.push([ps, nn(SH('minCount')), numLit(min)]);
      if (max !== undefined) T.push([ps, nn(SH('maxCount')), numLit(max)]);
      if (!pi.conflict && !pi.unknown) {
        if (pi.nested) T.push([ps, nn(SH('node')), nn(shapeIri.get(pi.nested.key))]);
        else if (pi.coercion === '@id' || pi.coercion === '@vocab') T.push([ps, nn(SH('nodeKind')), nn(SH('IRI'))]);
        else if (pi.coercion === '@json') T.push([ps, nn(SH('datatype')), nn(R('JSON'))]);
        else if (pi.range && pi.range.startsWith(NS.xsd)) T.push([ps, nn(SH('datatype')), nn(pi.range)]);
      }
      const c = pi.constraints || {};
      if (c.pattern !== undefined) T.push([ps, nn(SH('pattern')), literal(String(c.pattern))]);
      if (c.minLength !== undefined) T.push([ps, nn(SH('minLength')), numLit(c.minLength)]);
      if (c.maxLength !== undefined) T.push([ps, nn(SH('maxLength')), numLit(c.maxLength)]);
      if (c.minimum !== undefined) T.push([ps, nn(SH('minInclusive')), numLit(c.minimum)]);
      if (c.maximum !== undefined) T.push([ps, nn(SH('maxInclusive')), numLit(c.maximum)]);
      if (c.exclusiveMinimum !== undefined) T.push([ps, nn(SH('minExclusive')), numLit(c.exclusiveMinimum)]);
      if (c.exclusiveMaximum !== undefined) T.push([ps, nn(SH('maxExclusive')), numLit(c.exclusiveMaximum)]);
      if (pi.enumValues && !pi.conflict) {
        const items = pi.enumIri ? pi.enumValues.map(v => nn(`${o.vocab}${pctEncode(n)}/${v}`)) : pi.enumValues.map(v => valueLit(v, pi.coercion));
        T.push([ps, nn(SH('in')), { list: items }]);
      }
    }
  }
  return write(T, { rdf: NS.rdf, sh: NS.sh, xsd: NS.xsd, v: o.vocab });
}
