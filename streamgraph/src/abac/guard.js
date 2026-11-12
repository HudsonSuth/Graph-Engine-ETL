// Applies decisions and masking to whole result sets (graph views, query rows, CSV, sync-out batches).
const splitId = id => { const i = id.indexOf(':'); return [id.slice(0, i), id.slice(i + 1)]; };
export async function allowedLabels(engine, subject, action, labels, env) {
  const out = new Map();
  for (const l of new Set(labels)) out.set(l, (await engine.decide({ subject, action, entity: l, env })).allow);
  return out;
}
export async function viewGraph(engine, subject, action, nodes, edges, env) {
  const ok = await allowedLabels(engine, subject, action, [...nodes.map(n => n.label), ...edges.map(e => e.type)], env);
  const vis = nodes.filter(n => ok.get(n.label)), ids = new Map();
  const outNodes = vis.map(n => { const v = engine.viewNode(subject, n); ids.set(n.id, v.id); return v; });
  const outEdges = edges.filter(e => ok.get(e.type) && ids.has(e.from) && ids.has(e.to)).map(e => ({ id: `${ids.get(e.from)}-[${e.type}]->${ids.get(e.to)}`, type: e.type, from: ids.get(e.from), to: ids.get(e.to), props: engine.maskProps(subject, e.type, e.props).props }));
  return { nodes: outNodes, edges: outEdges, hidden: nodes.length - vis.length, deniedTypes: [...ok].filter(([, v]) => !v).map(([k]) => k) };
}
export async function viewRows(engine, subject, action, rows, env) {
  const labels = rows.flatMap(r => Object.values(r).map(x => x.label || x.type));
  const ok = await allowedLabels(engine, subject, action, labels, env);
  const keep = rows.filter(r => Object.values(r).every(x => ok.get(x.label || x.type)));
  const out = keep.map(r => Object.fromEntries(Object.entries(r).map(([a, x]) => {
    if (x.label) return [a, engine.viewNode(subject, x)];
    const [fl, fk] = splitId(x.from), [tl, tk] = splitId(x.to);
    return [a, { ...x, from: `${fl}:${engine.viewKey(subject, fl, fk)}`, to: `${tl}:${engine.viewKey(subject, tl, tk)}`, props: engine.maskProps(subject, x.type, x.props).props }];
  })));
  return { rows: out, hidden: rows.length - keep.length, deniedTypes: [...ok].filter(([, v]) => !v).map(([k]) => k) };
}
