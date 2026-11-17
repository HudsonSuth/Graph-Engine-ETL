// Schema analysis: JSON Schema document -> a neutral model of classes (object nodes) and property infos.
// SPEC sections 2-6. Everything downstream (context, vocab/SHACL, annotation) reads only this model.
import { fail, Warnings } from './errors.js';
import { NS, DEFAULT_VOCAB, pctEncode, pascal, isAbsIri, isCurie, ptrJoin, ptrGet, canonJson } from './util.js';
import { BROKEN } from './impl.js';

const XSD = l => NS.xsd + l;
const FORMAT_TYPES = { 'date-time': XSD('dateTime'), date: XSD('date'), time: XSD('time'), duration: XSD('duration') };
const URI_FORMATS = new Set(['uri', 'iri', 'uri-reference', 'iri-reference']);
const IGNORED = ['not', 'dependentSchemas', 'dependentRequired', 'dependencies', 'unevaluatedProperties', 'unevaluatedItems', 'propertyNames', 'contains', '$dynamicRef', '$recursiveRef'];
const TYPE_KEYS = ['type', 'format', 'properties', 'items', 'prefixItems', 'enum', 'const', '$ref', 'contentEncoding', 'x-jsonld', 'allOf', 'anyOf', 'oneOf', 'if', 'then', 'else', 'additionalProperties', 'patternProperties'];
const ANNOTATION_ONLY = new Set(['title', 'description', 'x-jsonld', 'default', 'examples', '$comment', 'deprecated', 'readOnly', 'writeOnly', '$id', '$schema', '$anchor']);
const HINT_KEYS = new Set(['@id', '@type', '@container', '@idProperty', '@idPrefix', '@vocab', '@prefixes']);
const ENUM_IRI_RE = /^[A-Za-z_][A-Za-z0-9_.-]*$/;
const OPEN_SCHEMES = new Set(['urn', 'http', 'https', 'mailto', 'tag', 'did']);

export const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
export const draftOf = (doc, target) => {
  const s = String((isObj(target) && target.$schema) || (isObj(doc) && doc.$schema) || '');
  return /draft-0[4-7]/.test(s) ? 'draft-07' : '2020-12';
};

function normalizeOptions(opts, rootHint, w) {
  const o = { vocabFallback: true, arrays: 'set', uriAs: 'id', enumAsIri: false, addTypes: true, validate: true, format: 'json', rootClass: undefined, prefixes: {}, ...opts };
  const bad = (k, why) => fail('E_BAD_OPTION', '', `option ${k}: ${why}`);
  if (!['set', 'list'].includes(o.arrays)) bad('arrays', 'must be "set" or "list"');
  if (!['id', 'anyURI'].includes(o.uriAs)) bad('uriAs', 'must be "id" or "anyURI"');
  if (!['json', 'yaml'].includes(o.format)) bad('format', 'must be "json" or "yaml"');
  if (!isObj(o.prefixes)) bad('prefixes', 'must be an object');
  for (const [p, iri] of Object.entries(o.prefixes)) if (!/^[A-Za-z_][A-Za-z0-9_.-]*$/.test(p) || !isAbsIri(iri)) bad('prefixes', `bad prefix ${p} -> ${iri}`);
  let vocab = o.vocab ?? DEFAULT_VOCAB, vocabFromHint = false;
  if (rootHint && rootHint['@vocab'] !== undefined) { vocab = rootHint['@vocab']; vocabFromHint = true; }
  if (!isAbsIri(vocab) || !/[/#]$/.test(vocab)) (vocabFromHint ? fail('E_BAD_HINT', '/x-jsonld/@vocab', 'must be an absolute IRI ending in / or #') : bad('vocab', 'must be an absolute IRI ending in / or #'));
  o.vocab = vocab;
  const declared = { ...o.prefixes };
  if (rootHint && rootHint['@prefixes'] !== undefined) {
    if (!isObj(rootHint['@prefixes'])) fail('E_BAD_HINT', '/x-jsonld/@prefixes', 'must be an object');
    for (const [p, iri] of Object.entries(rootHint['@prefixes'])) {
      if (!/^[A-Za-z_][A-Za-z0-9_.-]*$/.test(p) || !isAbsIri(iri)) fail('E_BAD_HINT', '/x-jsonld/@prefixes', `bad prefix ${p} -> ${iri}`);
      declared[p] = iri;
    }
  }
  o.declaredPrefixes = declared;
  o.allPrefixes = { ...NS, ...declared };
  return o;
}

export function buildModel(doc, opts = {}) {
  const pointer = opts.pointer || '';
  const got = ptrGet(doc, pointer);
  if (!got.ok) fail('E_SCHEMA_INVALID', pointer, 'pointer does not resolve');
  const target = got.value;
  if (!isObj(target)) fail('E_SCHEMA_INVALID', pointer, 'root (or pointer target) must be an object schema');
  const w = new Warnings();
  const rootHintRaw = target['x-jsonld'];
  if (rootHintRaw !== undefined && !isObj(rootHintRaw)) fail('E_BAD_HINT', ptrJoin(pointer, 'x-jsonld'), 'root hint must be an object');
  const o = normalizeOptions(opts, rootHintRaw, w);
  const draft = draftOf(doc, target);
  const idIndex = indexIds(doc);
  const registry = new Map();
  const allPropNames = new Set();
  const M = { doc, opts: o, draft, registry, warnings: w, allPropNames, pointer };

  // ---------- IRIs / hints
  const expandIri = (v, path) => {
    if (typeof v !== 'string' || !v) fail('E_BAD_HINT', path, 'IRI must be a non-empty string');
    if (isCurie(v)) {
      const [p, ...rest] = v.split(':');
      if (o.allPrefixes[p]) return { written: v, full: o.allPrefixes[p] + rest.join(':'), prefix: p };
      if (!OPEN_SCHEMES.has(p)) fail('E_BAD_HINT', path, `unknown prefix "${p}" in ${v}`);
      return { written: v, full: v };
    }
    if (isAbsIri(v)) return { written: v, full: v };
    fail('E_BAD_HINT', path, `not an absolute IRI or known CURIE: ${v}`);
  };
  const checkHint = (h, path, isRoot) => {
    if (h === undefined || h === false) return h;
    if (!isObj(h)) fail('E_BAD_HINT', path, 'x-jsonld must be an object or false');
    for (const k of Object.keys(h)) {
      if (!HINT_KEYS.has(k)) fail('E_BAD_HINT', path, `unknown hint key ${k}`);
      if ((k === '@vocab' || k === '@prefixes') && !isRoot) fail('E_BAD_HINT', path, `${k} is only allowed on the root schema`);
    }
    if (h['@container'] !== undefined && !['@set', '@list'].includes(h['@container'])) fail('E_BAD_HINT', path, '@container must be "@set" or "@list"');
    if (h['@id'] !== undefined) expandIri(h['@id'], ptrJoin(path, '@id'));
    if (h['@type'] !== undefined) {
      const t = h['@type'];
      if (typeof t !== 'string') fail('E_BAD_HINT', path, '@type must be a string');
      if (t.startsWith('@') && !['@id', '@vocab', '@json'].includes(t)) fail('E_BAD_HINT', path, `@type ${t} is not allowed`);
      if (!t.startsWith('@')) expandIri(t, ptrJoin(path, '@type'));
    }
    if (h['@idProperty'] !== undefined && (typeof h['@idProperty'] !== 'string' || !h['@idProperty'])) fail('E_BAD_HINT', path, '@idProperty must be a property name');
    if (h['@idPrefix'] !== undefined && !isAbsIri(h['@idPrefix'])) fail('E_BAD_HINT', path, '@idPrefix must be an absolute IRI');
    return h;
  };
  // hint @type: keyword or xsd => coercion; any other IRI => class
  const hintCoercion = h => {
    if (!isObj(h) || h['@type'] === undefined) return undefined;
    const t = h['@type'];
    if (t.startsWith('@')) return t;
    const e = expandIri(t, '');
    return e.full.startsWith(NS.xsd) ? e.full : undefined;
  };
  const hintClass = h => {
    if (!isObj(h) || h['@type'] === undefined || h['@type'].startsWith('@')) return undefined;
    const e = expandIri(h['@type'], '');
    return e.full.startsWith(NS.xsd) ? undefined : e;
  };

  // ---------- $ref resolution
  const resolveRef = (ref, loc) => {
    if (typeof ref !== 'string') fail('E_BAD_REF', loc.ptr, '$ref must be a string');
    let resPtr = loc.res, frag;
    if (ref.startsWith('#')) frag = ref;
    else {
      let abs; try { abs = new URL(ref, loc.base || undefined).href; } catch { abs = null; }
      if (!abs) fail('E_EXTERNAL_REF', loc.ptr, `cannot resolve non-local $ref ${ref} offline`);
      const [base, f = ''] = abs.split('#');
      if (!idIndex.has(base)) fail('E_EXTERNAL_REF', loc.ptr, `non-local $ref ${ref} (no network access)`);
      resPtr = idIndex.get(base).ptr; frag = '#' + f;
    }
    if (frag !== '#' && !frag.startsWith('#/')) fail('E_BAD_REF', loc.ptr, `unsupported fragment ${frag} (anchors are not supported)`);
    const tptr = resPtr + (frag === '#' ? '' : decodeURIComponent(frag.slice(1)));
    const g = ptrGet(doc, tptr);
    if (!g.ok) fail('E_BAD_REF', loc.ptr, `$ref ${ref} does not resolve`);
    return { schema: g.value, loc: locFor(tptr) };
  };
  const locCache = new Map();
  function locFor(ptr) { // nearest enclosing $id resource for a pointer
    if (locCache.has(ptr)) return locCache.get(ptr);
    let res = '', base = null;
    const segs = ptr === '' ? [] : ptr.slice(1).split('/');
    let cur = doc, p = '';
    if (isObj(doc) && typeof doc.$id === 'string') { try { base = new URL(doc.$id).href.split('#')[0]; } catch { /* relative root id */ } }
    for (const raw of segs) {
      const seg = raw.replace(/~1/g, '/').replace(/~0/g, '~');
      cur = cur?.[seg]; p += '/' + raw;
      if (isObj(cur) && typeof cur.$id === 'string' && !cur.$id.startsWith('#')) {
        try { base = new URL(cur.$id, base || undefined).href.split('#')[0]; res = p; } catch { /* ignore */ }
      }
    }
    const l = { ptr, res, base };
    locCache.set(ptr, l); return l;
  }
  /** follow $ref chains; returns { schema, loc, targetPtr, defName } */
  const deref = (s, loc) => {
    let cur = s, curLoc = loc, defName = null, targetPtr = null, hops = 0;
    while (isObj(cur) && cur.$ref !== undefined) {
      if (++hops > 64) fail('E_BAD_REF', loc.ptr, '$ref chain too long or circular');
      const { $ref, ...sib } = cur;
      const t = resolveRef($ref, curLoc);
      targetPtr = t.loc.ptr;
      const m = /\/(\$defs|definitions)\/([^/]+)$/.exec(targetPtr);
      if (m) defName = m[2].replace(/~1/g, '/').replace(/~0/g, '~');
      const sibKeys = Object.keys(sib);
      if (!isObj(t.schema)) { cur = t.schema; curLoc = t.loc; break; }
      if (M.draft === 'draft-07') cur = sib['x-jsonld'] !== undefined ? { ...t.schema, 'x-jsonld': sib['x-jsonld'] } : t.schema;
      else if (sibKeys.every(k => ANNOTATION_ONLY.has(k))) cur = { ...t.schema, ...sib };
      else { const { 'x-jsonld': hx, title, description } = sib; cur = { allOf: [t.schema, sib], ...(title ? { title } : t.schema.title ? { title: t.schema.title } : {}), ...(description ? { description } : {}), ...(hx !== undefined ? { 'x-jsonld': hx } : t.schema['x-jsonld'] !== undefined ? { 'x-jsonld': t.schema['x-jsonld'] } : {}) }; }
      curLoc = t.loc;
    }
    return { schema: cur, loc: curLoc, targetPtr, defName };
  };

  const typeList = s => (isObj(s) ? (Array.isArray(s.type) ? s.type : s.type !== undefined ? [s.type] : []) : []);
  const isNullOnly = s => isObj(s) && typeList(s).length === 1 && s.type === 'null' && !s.properties;
  const nullableBranch = s => {
    for (const k of ['anyOf', 'oneOf']) if (isObj(s) && Array.isArray(s[k]) && s[k].length === 2) {
      const nn = s[k].filter(b => !isNullOnly(b));
      if (nn.length === 1) return nn[0];
    }
    return null;
  };
  const warnIgnored = (s, ptr) => { if (isObj(s)) for (const k of IGNORED) if (s[k] !== undefined) w.add('W_IGNORED_KEYWORD', ptr, `keyword ${k} is ignored`); };
  const typeDetermining = s => isObj(s) && TYPE_KEYS.some(k => s[k] !== undefined);

  // ---------- object analysis (U-01..U-06)
  function collect(s, loc, acc = { props: new Map(), order: [], required: new Set(), closed: false }) {
    if (!isObj(s)) return acc;
    warnIgnored(s, loc.ptr);
    const addCand = (name, schema, l, optional) => {
      if (!acc.props.has(name)) { acc.props.set(name, []); acc.order.push(name); }
      acc.props.get(name).push({ schema, loc: l, optional });
    };
    if (isObj(s.properties)) for (const [n, ps] of Object.entries(s.properties)) addCand(n, ps, locFor(ptrJoin(loc.ptr, 'properties', n)), false);
    if (Array.isArray(s.required)) for (const r of s.required) acc.required.add(r);
    if (s.additionalProperties === false) acc.closed = true;
    if (isObj(s.additionalProperties) || s.patternProperties !== undefined) w.add('W_UNMAPPED_KEYS', loc.ptr, 'patternProperties/additionalProperties keys get no terms (covered only by @vocab fallback)');
    if (Array.isArray(s.allOf)) s.allOf.forEach((b, i) => { const d = deref(b, locFor(ptrJoin(loc.ptr, 'allOf', i))); collect(d.schema, d.loc, acc); });
    const branchSets = [];
    const branches = (list, key, code, msg) => {
      w.add(code, ptrJoin(loc.ptr, key), msg);
      const reqs = [];
      list.forEach(([b, l]) => {
        const d = deref(b, l); const sub = collect(d.schema, d.loc);
        for (const n of sub.order) for (const c of sub.props.get(n)) addCand(n, c.schema, c.loc, true);
        reqs.push(sub.required);
      });
      branchSets.push(reqs);
    };
    const nb = nullableBranch(s);
    if (nb) { const d = deref(nb, loc); collect(d.schema, d.loc, acc); }
    else for (const k of ['anyOf', 'oneOf']) if (Array.isArray(s[k])) branches(s[k].map((b, i) => [b, locFor(ptrJoin(loc.ptr, k, i))]), k, 'W_COMPOSITION_STATIC', `${k} branches are merged statically (not evaluated per instance)`);
    if (s.then !== undefined || s.else !== undefined) {
      const list = []; if (s.then !== undefined) list.push([s.then, locFor(ptrJoin(loc.ptr, 'then'))]); if (s.else !== undefined) list.push([s.else, locFor(ptrJoin(loc.ptr, 'else'))]);
      branches(list, s.then !== undefined ? 'then' : 'else', 'W_CONDITIONAL', 'if/then/else: then/else properties merged as optional; if is ignored');
    }
    for (const reqs of branchSets) if (reqs.length) for (const r of reqs[0]) if (reqs.every(x => x.has(r))) acc.required.add(r);
    return acc;
  }

  // ---------- value analysis (C-03..C-11)
  function valueInfo(raw, loc, termName, hint) {
    const v = { coercion: null, range: null, nested: null, enumValues: null, enumIri: false, isArray: false, constraints: {}, literal: true, unknown: false };
    if (raw === undefined || raw === true || raw === false) { v.unknown = true; return v; }
    let { schema: s, loc: l, targetPtr, defName } = deref(raw, loc);
    const nb = nullableBranch(s); if (nb) ({ schema: s, loc: l, targetPtr, defName } = deref(nb, l));
    if (!isObj(s)) { v.unknown = true; return v; }
    warnIgnored(s, l.ptr);
    const types = typeList(s).filter(t => t !== 'null');
    if (types.length > 1) { w.add('W_UNION_TYPE', loc.ptr, `union type ${types.join('|')}: no coercion`); v.unknown = true; return v; }
    const t = types[0];
    if (t === 'array' || (!t && (s.items !== undefined || s.prefixItems !== undefined))) { v.isArray = true; return v; }
    const looksObject = t === 'object' || (!t && (s.properties !== undefined || s.allOf || s.anyOf || s.oneOf || s.additionalProperties !== undefined || s.patternProperties !== undefined));
    if (looksObject) {
      const c = collect(s, l);
      if (c.order.length) {
        v.nested = objNode(s, targetPtr || l.ptr, l, defName, false);
        v.literal = false; v.range = v.nested.cls ? v.nested.cls.full : null; return v;
      }
      if (t === 'object' || s.additionalProperties !== undefined || s.patternProperties !== undefined) { v.coercion = '@json'; v.range = NS.rdf + 'JSON'; return v; }
    }
    if (t === 'integer') v.coercion = XSD('integer');
    else if (t === 'number') v.coercion = XSD('double');
    else if (t === 'boolean') v.coercion = XSD('boolean');
    else if (t === 'string' || (!t && typeof s.format === 'string')) {
      const f = s.format;
      if (f && FORMAT_TYPES[f] && !BROKEN()) v.coercion = FORMAT_TYPES[f];
      else if (f && URI_FORMATS.has(f) && !BROKEN()) { if (o.uriAs === 'id') { v.coercion = '@id'; v.literal = false; } else v.coercion = XSD('anyURI'); }
      else if (s.contentEncoding === 'base64') v.coercion = XSD('base64Binary');
      if (t === 'string' && !v.coercion) v.range = XSD('string');
    } else if (!t && s.enum === undefined && s.const === undefined) v.unknown = true;
    if (v.coercion && v.coercion !== '@id') v.range = v.coercion;
    if (v.coercion === '@id') v.range = null;
    const vals = Array.isArray(s.enum) ? s.enum : s.const !== undefined ? [s.const] : null;
    if (vals) {
      v.enumValues = vals;
      if (!t) { const ts = new Set(vals.map(x => typeof x)); if (ts.size === 1 && ts.has('string')) v.range = XSD('string'); }
      const wantIri = o.enumAsIri || (isObj(hint) && hint['@type'] === '@vocab');
      if (wantIri) {
        if (vals.every(x => typeof x === 'string' && ENUM_IRI_RE.test(x))) { v.enumIri = true; v.coercion = '@vocab'; v.literal = false; v.range = null; }
        else w.add('W_ENUM_NOT_IRI', loc.ptr, `enum of ${termName} kept as literals (values are not all IRI-safe names)`);
      }
    }
    for (const k of ['pattern', 'minLength', 'maxLength', 'minimum', 'maximum']) if (s[k] !== undefined) v.constraints[k] = s[k];
    if (typeof s.exclusiveMinimum === 'number') v.constraints.exclusiveMinimum = s.exclusiveMinimum;
    if (typeof s.exclusiveMaximum === 'number') v.constraints.exclusiveMaximum = s.exclusiveMaximum;
    if (v.unknown && v.enumValues) v.unknown = false;
    return v;
  }

  function propInfo(name, cand) {
    const { schema: raw, loc } = cand;
    const base = { name, path: loc.ptr, excluded: false, conflict: false };
    const hintRaw = isObj(raw) ? raw['x-jsonld'] : undefined;
    const exIri = { written: o.vocab + pctEncode(name), full: o.vocab + pctEncode(name) };
    if (hintRaw === false) return { ...base, iri: exIri, excluded: true };
    checkHint(hintRaw, ptrJoin(loc.ptr, 'x-jsonld'), false);
    let hint = hintRaw;
    let r = raw;
    if (isObj(raw)) { const d = deref(raw, loc); if (isObj(d.schema)) { if (hint === undefined) { const th = d.schema['x-jsonld']; if (th === false) return { ...base, iri: exIri, excluded: true }; hint = checkHint(th, ptrJoin(d.loc.ptr, 'x-jsonld'), false); } } }
    const idE = hint && hint['@id'] !== undefined ? expandIri(hint['@id'], ptrJoin(loc.ptr, 'x-jsonld', '@id')) : { written: o.vocab + pctEncode(name), full: o.vocab + pctEncode(name) };
    const info = { ...base, iri: idE, coercion: null, container: null, nested: null, enumValues: null, enumIri: false, constraints: {}, isArray: false, minItems: undefined, maxItems: undefined, range: null, literal: true, unknown: false, description: undefined };
    const d = isObj(r) ? deref(r, loc) : { schema: r, loc };
    let s = d.schema; const nb = nullableBranch(s); let sl = d.loc; if (nb) { const dd = deref(nb, sl); s = dd.schema; sl = dd.loc; }
    if (isObj(s) && typeof s.description === 'string') info.description = s.description;
    else if (isObj(raw) && typeof raw.description === 'string') info.description = raw.description;
    const types = typeList(s).filter(t => t !== 'null');
    const isArr = isObj(s) && ((types.length === 1 && types[0] === 'array') || (!types.length && (s.items !== undefined || s.prefixItems !== undefined)));
    let v;
    if (isArr) {
      warnIgnored(s, sl.ptr);
      info.isArray = true; info.minItems = s.minItems; info.maxItems = s.maxItems;
      const tuple = Array.isArray(s.items) ? s.items : Array.isArray(s.prefixItems) ? s.prefixItems : null;
      if (tuple) {
        const vs = tuple.map((it, i) => valueInfo(it, locFor(ptrJoin(sl.ptr, Array.isArray(s.items) ? 'items' : 'prefixItems', i)), name, hint));
        const keys = new Set(vs.map(x => canonJson({ c: x.coercion, n: x.nested?.key || null, a: x.isArray })));
        v = keys.size === 1 ? vs[0] : (w.add('W_MIXED_TUPLE', loc.ptr, `tuple ${name} has mixed item types: no coercion`), { ...valueInfo(undefined), unknown: true });
        info.container = '@list';
      } else {
        v = valueInfo(s.items, locFor(ptrJoin(sl.ptr, 'items')), name, hint);
        info.container = BROKEN() ? '@list' : o.arrays === 'list' ? '@list' : '@set';
      }
      if (v.isArray) { w.add('W_NESTED_ARRAY', loc.ptr, `array of arrays ${name}: stored as @json`); v = { ...v, isArray: false, coercion: '@json', range: NS.rdf + 'JSON', nested: null, unknown: false }; info.container = null; }
      if (v.coercion === '@json') info.container = null;
    } else {
      v = valueInfo(r, loc, name, hint);
      if (BROKEN() && v.isArray) info.container = '@list';
    }
    Object.assign(info, { coercion: v.coercion, nested: v.nested, enumValues: v.enumValues, enumIri: v.enumIri, constraints: v.constraints, range: v.range, literal: v.literal, unknown: v.unknown });
    const hc = hintCoercion(hint);
    if (hc !== undefined) {
      if (hc === '@vocab' && !info.enumIri) { if (info.enumValues) w.add('W_ENUM_NOT_IRI', loc.ptr, `enum of ${name} kept as literals`); else { info.coercion = '@vocab'; info.literal = false; info.range = null; } }
      else if (hc !== '@vocab') { info.coercion = hc; info.literal = hc !== '@id'; info.range = hc.startsWith('@') ? (hc === '@json' ? NS.rdf + 'JSON' : null) : hc; if (hc === '@json') { info.container = null; info.nested = null; } }
    }
    if (hint && hint['@container'] !== undefined && info.coercion !== '@json') info.container = hint['@container'];
    if (!BROKEN() && info.isArray && info.container === null && info.coercion !== '@json') info.container = '@set';
    return info;
  }

  function objNode(s, key, loc, defName, isRoot) {
    if (registry.has(key)) return registry.get(key);
    const hint = checkHint(isObj(s) ? s['x-jsonld'] : undefined, ptrJoin(loc.ptr, 'x-jsonld'), isRoot);
    const node = { key, path: loc.ptr, cls: null, name: null, label: null, comment: isObj(s) && typeof s.description === 'string' ? s.description : undefined, props: new Map(), required: new Set(), closed: false, idProperty: undefined, idPrefix: undefined, isRoot };
    registry.set(key, node);
    const hc = hintClass(hint);
    let name = null;
    if (hc) { node.cls = hc; name = defName ? pascal(defName) : isObj(s) && s.title ? pascal(s.title) : pascal(hc.full.split(/[#/:]/).pop() || 'Thing'); }
    else if (isRoot && o.rootClass) { name = isAbsIri(o.rootClass) ? pascal(o.rootClass.split(/[#/:]/).pop()) : pascal(o.rootClass); node.cls = isAbsIri(o.rootClass) ? { written: o.rootClass, full: o.rootClass } : { written: o.vocab + name, full: o.vocab + name }; }
    else if (isRoot && isObj(s) && s.title) { name = pascal(s.title); }
    else if (defName) name = pascal(defName);
    else if (!isRoot && isObj(s) && s.title) name = pascal(s.title);
    if (name && !node.cls) node.cls = { written: o.vocab + name, full: o.vocab + name };
    if (node.cls && !name) name = 'Thing';
    node.name = name; node.label = isObj(s) && s.title ? s.title : name;
    if (hint) { node.idProperty = hint['@idProperty']; node.idPrefix = hint['@idPrefix']; }
    const c = collect(s, loc);
    node.required = c.required; node.closed = c.closed;
    for (const n of c.order) {
      if (n.startsWith('@')) fail('E_KEYWORD_PROPERTY', ptrJoin(loc.ptr, 'properties', n), `property name ${n} collides with a JSON-LD keyword`);
      if (n === '' || n.includes(':') || n.includes('/')) { w.add('W_UNMAPPABLE_NAME', ptrJoin(loc.ptr, 'properties', n), `property name ${JSON.stringify(n)} cannot be a JSON-LD term`); continue; }
      allPropNames.add(n);
      const cands = c.props.get(n);
      const typed = cands.filter(x => typeDetermining(x.schema) || x.schema === true || x.schema === false);
      const use = typed.length ? typed : [cands[0]];
      const infos = use.map(x => propInfo(n, x));
      const sig = i => canonJson({ i: i.iri.full, c: i.coercion, k: i.container, e: i.enumIri ? i.enumValues : null, n: i.nested ? i.nested.key : null, x: i.excluded });
      let info = infos[0];
      if (new Set(infos.map(sig)).size > 1) {
        w.add('W_CONFLICT', ptrJoin(loc.ptr, 'properties', n), `conflicting definitions for ${n}: term emitted without coercion`);
        info = { ...infos[0], coercion: null, container: null, nested: null, enumIri: false, conflict: true, range: null, literal: true, unknown: true };
      }
      info.required = node.required.has(n);
      node.props.set(n, info);
    }
    if (node.idProperty && !node.props.has(node.idProperty)) w.add('W_ID_PROPERTY_MISSING', loc.ptr, `@idProperty ${node.idProperty} is not a declared property`);
    return node;
  }

  M.root = objNode(target, pointer, locFor(pointer), null, true);
  M.expandIri = expandIri;
  return M;
}

function indexIds(doc) {
  const idx = new Map();
  const walk = (v, ptr, base) => {
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, ptrJoin(ptr, i), base)); return; }
    if (!isObj(v)) return;
    let b = base;
    if (typeof v.$id === 'string' && !v.$id.startsWith('#')) {
      try { b = new URL(v.$id, base || undefined).href.split('#')[0]; idx.set(b, { ptr }); } catch { /* relative id without base */ }
    }
    for (const [k, x] of Object.entries(v)) if (k !== 'enum' && k !== 'const' && k !== 'default' && k !== 'examples') walk(x, ptrJoin(ptr, k), b);
  };
  walk(doc, '', null);
  return idx;
}
