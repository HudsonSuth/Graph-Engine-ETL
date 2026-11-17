// (a) JSON-LD 1.1 @context from the model. SPEC §4 (C-01..C-18).
import { NS, pctEncode, canonJson } from './util.js';

export function buildContext(M) {
  const o = M.opts, w = M.warnings;
  const candidates = { xsd: NS.xsd, ...o.declaredPrefixes };
  const shadowed = new Set();
  for (const p of Object.keys(o.allPrefixes)) if (M.allPropNames.has(p)) shadowed.add(p);
  for (const p of shadowed) if (candidates[p] || p in NS) w.add('W_PREFIX_SHADOWED', '', `prefix ${p} is shadowed by a property name; IRIs written in full`);
  const used = new Set();
  const writeIri = e => { // e = { written, full, prefix? }
    if (e.prefix && !shadowed.has(e.prefix)) { used.add(e.prefix); return e.written; }
    return e.full;
  };
  const writeType = t => {
    if (t.startsWith('@')) return t;
    if (t.startsWith(NS.xsd) && !shadowed.has('xsd')) { used.add('xsd'); return 'xsd:' + t.slice(NS.xsd.length); }
    for (const [p, iri] of Object.entries(o.allPrefixes)) if (!shadowed.has(p) && t.startsWith(iri) && /^[A-Za-z_][\w.-]*$/.test(t.slice(iri.length))) { used.add(p); return `${p}:${t.slice(iri.length)}`; }
    return t;
  };

  const termDef = (pi, active, stack) => {
    if (pi.excluded) return null;
    const def = { '@id': writeIri(pi.iri) };
    if (pi.coercion) def['@type'] = writeType(pi.coercion);
    if (pi.container) def['@container'] = pi.container;
    if (pi.enumIri) {
      def['@context'] = Object.fromEntries(pi.enumValues.map(v => [v, `${o.vocab}${pctEncode(pi.name)}/${v}`]));
    } else if (pi.nested && !stack.has(pi.nested.key)) {
      const scoped = level(pi.nested, active, new Set([...stack, pi.nested.key]));
      if (Object.keys(scoped).length) def['@context'] = scoped;
    }
    return def;
  };
  // terms of one object node; only those that differ from `inherited` (C-07)
  function level(node, inherited, stack) {
    const names = [...node.props.keys()].sort();
    const active = { ...inherited };
    for (const n of names) active[n] = termDef({ ...node.props.get(n), nested: null, enumIri: false }, {}, stack);
    const out = {};
    for (const n of names) { // sorted order: earlier full definitions are visible to later scoped contexts
      const d = termDef(node.props.get(n), active, stack);
      active[n] = d;
      if (n in inherited && canonJson(inherited[n]) === canonJson(d)) continue;
      out[n] = d;
    }
    return out;
  }
  const terms = level(M.root, {}, new Set([M.root.key]));
  const ctx = { '@version': 1.1 };
  if (o.vocabFallback) ctx['@vocab'] = o.vocab;
  if (!shadowed.has('xsd')) ctx.xsd = NS.xsd;
  for (const [p, iri] of Object.entries(o.declaredPrefixes)) if (!shadowed.has(p)) ctx[p] = iri;
  for (const p of used) if (!shadowed.has(p)) ctx[p] = o.allPrefixes[p];
  Object.assign(ctx, terms);
  return { '@context': ctx };
}
