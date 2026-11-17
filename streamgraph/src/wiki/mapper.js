// One mapper for both dialects: vault model -> the desired graph state for that vault (GraphStore ids `Label:key`).
//  note            -> node labelled by its type (owl:Class -> Class, "[[Vessel]]" -> Vessel, "BigQuery Table" -> BigQueryTable;
//                     untyped Vault-LD notes -> Note). Props: frontmatter scalars + wiki_* bookkeeping + derived trust_tier.
//  frontmatter [[link]] in field f -> edge F (camelCase -> UPPER_SNAKE); in the type field -> IS_A
//  body link       -> LINKS_TO (navigational, never an RDF triple)
//  sources         -> DERIVED_FROM -> Source;  generated.by -> GENERATED_BY -> Actor;  verified[].by -> VERIFIED_BY -> Actor
//  unresolved link -> WikiStub node (wiki_dangling = true)
// The output is sorted, so the same folder always produces the same graph (determinism, W1).
import { edgeId } from '../graph.js';
import { relType } from './parse.js';
import { HOST_KEYS } from './vault.js';

export const BODY_MAX = 20000;
const RESERVED = new Set(['name', 'body', 'trust_tier', 'status', 'stale_after', 'generated_by', 'generated_at', 'verified_by', 'verified_at', 'source_count']);
const TRUST_KEYS = new Set(['generated', 'verified', 'sources', 'status', 'stale_after']);
const scalar = v => v === null || ['string', 'number', 'boolean'].includes(typeof v);
const propKey = k => { let s = String(k).replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+/, ''); if (!s) s = 'field'; if (/^\d/.test(s)) s = 'f_' + s; return RESERVED.has(s) || s.startsWith('wiki_') ? 'fm_' + s : s; };
export const actorKind = a => (String(a).startsWith('human:') ? 'human' : String(a).startsWith('process:') ? 'process' : 'agent');

export function mapVault(model) {
  const { slug, dialect } = model, nodes = new Map(), edges = new Map();
  const node = (label, key, props) => { const id = `${label}:${key}`; if (!nodes.has(id)) nodes.set(id, { id, label, key, props }); return id; };
  const edge = (type, from, to, props = {}) => { const id = edgeId(type, from, to); const prev = edges.get(id); edges.set(id, { id, type, from, to, props: { ...(prev?.props || {}), wiki_vault: slug, ...props } }); };
  const idOf = n => `${n.label}:${n.key}`;
  const stub = target => node('WikiStub', `${slug}:${target}`, { name: target, wiki_vault: slug, wiki_dangling: true });
  for (const n of model.notes) {
    const t = n.trust, props = { name: n.title };
    const fm = n.fm || {};
    const skip = new Set([...(n.typeKey ? [n.typeKey] : []), ...(n.idKey ? [n.idKey] : []), '@context', ...TRUST_KEYS]);
    for (const [k, v] of Object.entries(fm)) {
      if (skip.has(k)) continue;
      const vals = Array.isArray(v) ? v : [v];
      const lits = vals.filter(x => !(typeof x === 'string' && /^\s*\[\[[^\]]+\]\]\s*$/.test(x)));
      if (!lits.length) continue;
      const pk = propKey(k);
      if (Array.isArray(v)) props[pk] = lits.map(x => (scalar(x) ? x : JSON.stringify(x)));
      else props[pk] = scalar(v) ? v : JSON.stringify(v);
    }
    Object.assign(props, {
      body: n.body.length > BODY_MAX ? n.body.slice(0, BODY_MAX) : n.body,
      trust_tier: t.tier, status: t.status,
      ...(t.staleAfter ? { stale_after: t.staleAfter } : {}),
      ...(t.generated ? { generated_by: t.generated.by, ...(t.generated.at ? { generated_at: t.generated.at } : {}) } : {}),
      ...(t.verified.length ? { verified_by: [...new Set(t.verified.map(v => v.by))], verified_at: t.verified.map(v => v.at).filter(Boolean).sort().pop() ?? null } : {}),
      ...(t.sources.length ? { source_count: t.sources.length } : {}),
      wiki_vault: slug, wiki_dialect: dialect, wiki_path: n.path, wiki_sha256: n.sha256,
      ...(n.iri ? { wiki_iri: n.iri } : {}),
      ...(n.types.length ? { wiki_type: n.types.length === 1 ? n.types[0] : n.types } : {}),
      wiki_participates: !!n.participates, wiki_layer: n.layer,
      ...(n.problems.length ? { wiki_problems: [...n.problems] } : {}),
    });
    node(n.label, n.key, props);
  }
  for (const n of model.notes) {
    const from = idOf(n);
    for (const l of n.frontLinks) edge(l.isType ? 'IS_A' : relType(l.key), from, l.to ? idOf(l.to) : stub(l.target), { field: l.key });
    for (const l of n.bodyLinks) edge('LINKS_TO', from, l.to ? idOf(l.to) : stub(l.target), {});
    const t = n.trust;
    for (const s of t.sources) edge('DERIVED_FROM', from, node('Source', `${slug}:${s.resource}`, { name: s.title || s.resource, resource: s.resource, wiki_vault: slug }), {});
    const actor = a => node('Actor', `${slug}:${a}`, { name: a, actor: a, actor_kind: actorKind(a), wiki_vault: slug });
    if (t.generated) edge('GENERATED_BY', from, actor(t.generated.by), t.generated.at ? { at: t.generated.at } : {});
    for (const v of t.verified) { const id = edgeId('VERIFIED_BY', from, actor(v.by)); const prev = edges.get(id)?.props?.at; edge('VERIFIED_BY', from, actor(v.by), { at: [prev, v.at].filter(Boolean).sort().pop() ?? null }); }
  }
  const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  return { slug, nodes: [...nodes.values()].sort(byId), edges: [...edges.values()].sort(byId) };
}

export { HOST_KEYS };
