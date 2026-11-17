// MCP server (inbound): exposes the explore graph to AI clients over stdio and Streamable HTTP.
// Read tools are always on; write tools exist only when config.mcp.allowWrites === true.
// Every result is permission-filtered (source access policy + StreamGraph access rules) and size-capped.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SubscribeRequestSchema, UnsubscribeRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { readFileSync } from 'node:fs';
import { timingSafeEqual } from 'node:crypto';
import { join } from 'node:path';
import { computeLayout, LAYOUT_KINDS } from '../shared/layouts.js';
import { EXPLORE_ROOT } from './app.js';

const VERSION = '0.1.0';
const text = obj => ({ content: [{ type: 'text', text: JSON.stringify(obj) }], structuredContent: obj });
const errorResult = msg => ({ content: [{ type: 'text', text: msg }], isError: true });
const slim = it => { const o = { id: it.id, kind: it.kind, type: it.type, label: it.label, properties: it.properties, version: it.version }; if (it.kind === 'link') { o.fromId = it.fromId; o.toId = it.toId; } if (it.eventTime) o.eventTime = it.eventTime; o.sources = it.sources?.map(s => s.sourceId); return o; };

export function buildMcpServer(ex, opts = {}) {
  const cfg = { ...ex.config.mcp, ...opts };
  const cap = n => Math.max(1, Math.min(Number(n) || 50, cfg.maxResults));
  const { service } = ex;
  const server = new McpServer({ name: 'streamgraph-explore', version: VERSION }, { capabilities: { tools: {}, resources: { subscribe: true } } });
  // one working session per MCP connection, as the configured MCP principal
  const sid = service.openSession({ principal: cfg.principal, follow: false }).sessionId;
  const guard = items => ex.guard(items, cfg.actAs);
  const finish = async (items, extra = {}) => {
    const visible = await guard(items);
    service.release(sid, items.map(i => i.id)); // MCP calls do not grow a working set
    const truncated = visible.length > cfg.maxResults;
    return text({ ...extra, items: visible.slice(0, cfg.maxResults).map(slim), count: Math.min(visible.length, cfg.maxResults), truncated: truncated || !!extra.truncated });
  };
  const visibleNodes = async () => { const out = []; for (const it of service.items.values()) if (it.kind === 'node' && !it.deleted) { const v = service.view(it, cfg.principal); if (v) out.push(v); } return guard(out); };
  const visibleLinks = async ids => { const out = []; for (const it of service.items.values()) if (it.kind === 'link' && !it.deleted && ids.has(it.fromId) && ids.has(it.toId)) { const v = service.view(it, cfg.principal); if (v) out.push(v); } return guard(out); };

  async function schema() {
    const nodes = await visibleNodes(), ids = new Set(nodes.map(n => n.id)), links = await visibleLinks(ids);
    const nt = {}, lt = {}, srcs = new Set();
    for (const n of nodes) { const t = nt[n.type] ??= { count: 0, properties: new Set() }; t.count++; Object.keys(n.properties).forEach(k => t.properties.add(k)); n.sources.forEach(s => srcs.add(s.sourceId)); }
    const typeOf = new Map(nodes.map(n => [n.id, n.type]));
    for (const l of links) { const t = lt[l.type] ??= { count: 0, from: new Set(), to: new Set() }; t.count++; t.from.add(typeOf.get(l.fromId)); t.to.add(typeOf.get(l.toId)); }
    return { nodeTypes: Object.entries(nt).map(([type, v]) => ({ type, count: v.count, properties: [...v.properties].sort() })), linkTypes: Object.entries(lt).map(([type, v]) => ({ type, count: v.count, from: [...v.from], to: [...v.to] })), totals: { nodes: nodes.length, links: links.length }, sources: [...srcs], lag: service.lag };
  }

  server.registerTool('graph_stats', { title: 'Graph stats and schema', description: 'Node and link types with counts and property names, sources and stream lag (only what you may read).', inputSchema: {}, annotations: { readOnlyHint: true } }, async () => text(await schema()));

  server.registerTool('search_nodes', { title: 'Search nodes', description: 'Case-insensitive text search over node id, label and property values. Optional type filter.',
    inputSchema: { text: z.string().default(''), types: z.array(z.string()).optional(), limit: z.number().int().min(1).max(5000).default(50) }, annotations: { readOnlyHint: true } },
  async ({ text: q, types, limit }) => { const r = service.search(sid, { text: q, types: types?.length ? types : null, limit: cap(limit) }); return finish(r.items, { truncated: r.truncated }); });

  server.registerTool('get_node', { title: 'Get node and neighbours', description: 'A node plus its neighbours up to `depth` hops (default 1, max 3), limited per hop.',
    inputSchema: { id: z.string(), depth: z.number().int().min(1).max(3).default(1), limit: z.number().int().min(1).max(5000).default(50), direction: z.enum(['in', 'out', 'both']).default('both'), types: z.array(z.string()).optional() }, annotations: { readOnlyHint: true } },
  async ({ id, depth, limit, direction, types }) => {
    const seed = service.view(service.live(id), cfg.principal);
    if (!seed || !(await guard([seed])).length) return errorResult(`Node ${id} not found or not visible`);
    const all = new Map([[seed.id, seed]]); let frontier = [seed.id], truncated = false;
    for (let d = 0; d < depth && frontier.length; d++) {
      const r = await service.expand(sid, { ids: frontier, direction, types: types?.length ? types : null, limit: cap(limit), useConnectors: d === 0 });
      truncated ||= r.truncated; const next = [];
      for (const it of r.items) if (!all.has(it.id)) { all.set(it.id, it); if (it.kind === 'node') next.push(it.id); }
      frontier = next;
      if (all.size > cfg.maxResults) { truncated = true; break; }
    }
    return finish([...all.values()], { node: slim(seed), truncated });
  });

  server.registerTool('shortest_path', { title: 'Shortest path', description: 'Unweighted shortest path between two nodes on the permissioned in-memory graph.',
    inputSchema: { fromId: z.string(), toId: z.string(), directed: z.boolean().default(false), maxLength: z.number().int().min(1).max(12).default(6) }, annotations: { readOnlyHint: true } },
  async args => {
    const r = service.path(sid, args);
    if (!r.found) return text({ found: false, message: r.message, incomplete: r.incomplete });
    const items = await guard(r.items);
    if (items.length !== r.items.length) return text({ found: false, message: 'No path you are allowed to see' });
    service.release(sid, r.items.map(i => i.id));
    return text({ found: true, nodeIds: r.nodeIds, linkIds: r.linkIds, hops: r.linkIds.length, items: items.map(slim), incomplete: r.incomplete });
  });

  // ---- Phase 1 core loop (SPEC §23): k-hop neighbourhood, paths, algorithms (read-only; same access filtering as the UI)
  const whereSchema = z.array(z.object({ property: z.string(), op: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'exists', 'in']).default('eq'), value: z.any().optional(), type: z.string().optional() })).optional();
  server.registerTool('neighborhood', { title: 'k-hop neighbourhood', description: 'Nodes within `hops` (0-6) of the seed nodes plus the links among them, breadth first, with optional link-type, node-type and property filters and a node cap. Returns per-hop counts and whether the cap cut it short.',
    inputSchema: { seeds: z.array(z.string()).min(1), hops: z.number().int().min(0).max(6).default(1), direction: z.enum(['in', 'out', 'both']).default('both'), linkTypes: z.array(z.string()).optional(), nodeTypes: z.array(z.string()).optional(), where: whereSchema, maxNodes: z.number().int().min(1).max(5000).default(200) }, annotations: { readOnlyHint: true } },
  async args => {
    const r = await ex.core.neighborhood(service, { ...args, maxNodes: Math.min(args.maxNodes, cfg.maxResults) }, guard, cfg.principal);
    if (!r.nodes.length) return errorResult(`None of the seed nodes exist or are visible: ${args.seeds.join(', ')}`);
    const links = r.links.slice(0, cfg.maxResults);
    return text({ nodes: r.nodes.map(n => ({ ...slim(n), hop: r.hopOf[n.id] })), links: links.map(slim), hops: r.stats.hops, truncated: r.truncated || links.length < r.links.length, ms: +r.stats.ms.toFixed(2) });
  });
  server.registerTool('find_paths', { title: 'Find paths between two nodes', description: 'The shortest path and all simple paths up to maxHops (shortest first, capped at maxPaths) between two nodes; undirected unless directed=true. Optional link/node type filters.',
    inputSchema: { fromId: z.string(), toId: z.string(), maxHops: z.number().int().min(1).max(8).default(4), maxPaths: z.number().int().min(1).max(500).default(50), mode: z.enum(['all', 'shortest']).default('all'), directed: z.boolean().default(false), linkTypes: z.array(z.string()).optional(), nodeTypes: z.array(z.string()).optional() }, annotations: { readOnlyHint: true } },
  async args => {
    const r = await ex.core.findPaths(service, args, guard, cfg.principal);
    if (!r.found) return text({ found: false, message: r.message });
    return text({ found: true, shortest: r.shortest, paths: r.paths, pathCount: r.paths.length, truncated: r.truncated, items: r.items.slice(0, cfg.maxResults).map(slim) });
  });
  if (ex.algo) {
    const scopeSchema = z.object({ kind: z.enum(['all', 'filter', 'ids']).default('all'), types: z.array(z.string()).optional(), hiddenTypes: z.array(z.string()).optional(), linkTypes: z.array(z.string()).optional(), hiddenLinkTypes: z.array(z.string()).optional(), where: whereSchema, ids: z.array(z.string()).optional() }).optional();
    server.registerTool('list_algorithms', { title: 'List graph algorithms', description: 'Algorithms run_algorithm accepts, with their level (node/link), result kind (numeric/categorical) and default parameters, plus recent results you can read with get_algorithm_result.', inputSchema: {}, annotations: { readOnlyHint: true } },
      async () => text({ algorithms: Object.entries(ex.algo.defs).map(([name, d]) => ({ name, ...d })), recent: ex.algo.list().map(r => ({ runId: r.runId, algo: r.algo, scope: r.scope, at: r.at })) }));
    server.registerTool('run_algorithm', { title: 'Run a graph algorithm', description: 'Run degree, pagerank, betweenness (sampled above exactMax nodes), louvain, leiden, components, shortest_path (params.source, optional target) or jaccard (per link, or params.node for top-k similar) on the whole visible graph (scope.kind=all), a server-side filter (scope.kind=filter) or a node list (scope.kind=ids). Returns a runId, summary stats and the top nodes.',
      inputSchema: { algo: z.enum(ex.algo.names), params: z.record(z.string(), z.any()).optional(), scope: scopeSchema, top: z.number().int().min(0).max(500).default(20) }, annotations: { readOnlyHint: true } },
    async ({ algo, params, scope, top }) => {
      try {
        const r = await ex.algo.run({ algo, params: params || {}, scope: scope || { kind: 'all' } }, { principal: cfg.principal, actAs: cfg.actAs });
        const vals = Object.entries(r.values), topN = r.kind === 'categorical' ? [] : vals.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, top).map(([id, value]) => ({ id, value }));
        const { values, key, top: _t, ...rest } = r;
        return text({ ...rest, top: topN, valueCount: vals.length });
      } catch (e) { return errorResult(e.message); }
    });
    server.registerTool('get_algorithm_result', { title: 'Read an algorithm result', description: 'Values of an earlier run_algorithm result: for given ids, the top-k, or the members of one community / component.',
      inputSchema: { runId: z.string(), ids: z.array(z.string()).optional(), top: z.number().int().min(0).max(5000).optional(), community: z.number().int().optional() }, annotations: { readOnlyHint: true } },
    async ({ runId, ids, top, community }) => {
      const r = ex.algo.get(runId); if (!r) return errorResult(`No result ${runId} (only the last 32 runs are kept)`);
      let entries = Object.entries(r.values);
      if (ids?.length) entries = ids.filter(i => i in r.values).map(i => [i, r.values[i]]);
      else if (community != null) entries = entries.filter(([, v]) => v === community);
      else entries = entries.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, top ?? 50);
      const capped = entries.slice(0, cfg.maxResults);
      return text({ runId, algo: r.algo, kind: r.kind, level: r.level, values: Object.fromEntries(capped), count: capped.length, truncated: capped.length < entries.length });
    });
  }

  // ---- Phase 2 (SPEC §24.6): cluster overview for big graphs, approximate cost before heavy work
  if (ex.scale) {
    const scopeSchema2 = z.object({ kind: z.enum(['all', 'filter', 'ids']).default('all'), types: z.array(z.string()).optional(), hiddenTypes: z.array(z.string()).optional(), linkTypes: z.array(z.string()).optional(), hiddenLinkTypes: z.array(z.string()).optional(), ids: z.array(z.string()).optional() }).optional();
    server.registerTool('cluster_overview', { title: 'Cluster overview (aggregated graph)', description: 'Summarise the graph as clusters (by louvain, leiden, components, type, property:<name> or run:<runId>) with member counts, main type, top members and meta-edges (link counts between clusters). Pass `cluster` to list that cluster\'s members (highest degree first). Use this first on big graphs instead of pulling nodes.',
      inputSchema: { by: z.string().default('louvain'), scope: scopeSchema2, maxClusters: z.number().int().min(1).max(2000).default(50), seed: z.number().int().default(1), cluster: z.string().optional(), top: z.number().int().min(1).max(5000).default(100) }, annotations: { readOnlyHint: true } },
    async ({ by, scope, maxClusters, seed, cluster, top }) => {
      try {
        const who = { principal: cfg.principal, actAs: cfg.actAs }, o = { by, scope: scope || { kind: 'all' }, maxClusters, seed };
        if (cluster) { const m = await ex.scale.members({ ...o, cluster, max: Math.min(top, cfg.maxResults) }, who); return text(m); }
        const r = await ex.scale.overview(o, who);
        return text({ by: r.by, runId: r.runId, modularity: r.modularity, totals: r.totals, clusters: r.clusters.slice(0, cfg.maxResults).map(({ x, y, r: rad, ...c }) => c), metaEdges: r.metaEdges.slice(0, Math.min(top * 2, cfg.maxResults)), truncated: r.metaEdges.length > Math.min(top * 2, cfg.maxResults), ms: Math.round(r.timings.totalMs) });
      } catch (e) { return errorResult(e.message); }
    });
    server.registerTool('estimate_cost', { title: 'Estimate query cost', description: 'Approximate nodes / links touched and time before running something heavy: op=neighborhood (seeds, hops, maxNodes), algo (algo, params, scope), overview (by), layout (kind, nodes, links) or bundle (edges). Level is low (<0.3 s), medium (<2 s) or high.',
      inputSchema: { op: z.enum(['neighborhood', 'algo', 'overview', 'layout', 'bundle']), seeds: z.array(z.string()).optional(), hops: z.number().int().min(0).max(6).optional(), maxNodes: z.number().int().optional(), algo: z.string().optional(), params: z.record(z.string(), z.any()).optional(), scope: scopeSchema2, by: z.string().optional(), kind: z.string().optional(), nodes: z.number().int().optional(), links: z.number().int().optional(), edges: z.number().int().optional() }, annotations: { readOnlyHint: true } },
    async args => { try { return text(await ex.scale.estimate(args, { principal: cfg.principal, actAs: cfg.actAs })); } catch (e) { return errorResult(e.message); } });
  }

  const filterOp = z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'exists']);
  const filterLimit = z.number().int().min(1).max(5000);
  // Ad-hoc filters omit defaults. Zod 4 applies .default() inside .partial(), which would turn a missing limit into 200 and override maxResults.
  const filterShape = { types: z.array(z.string()).optional(), linkTypes: z.array(z.string()).optional(), property: z.string().optional(), op: filterOp.optional(), value: z.union([z.string(), z.number(), z.boolean()]).optional(), limit: filterLimit.optional() };
  const filterInput = { ...filterShape, op: filterOp.default('eq').optional(), limit: filterLimit.default(200) };
  async function filterSubgraph({ types, linkTypes, property, op = 'eq', value, limit }) {
    const test = n => { if (types?.length && !types.includes(n.type)) return false; if (!property) return true; const x = n.properties[property];
      switch (op) { case 'eq': return String(x) === String(value); case 'neq': return String(x) !== String(value); case 'gt': return Number(x) > Number(value); case 'gte': return Number(x) >= Number(value); case 'lt': return Number(x) < Number(value); case 'lte': return Number(x) <= Number(value); case 'contains': return typeof x === 'string' && x.toLowerCase().includes(String(value).toLowerCase()); case 'exists': return x != null; } };
    const nodes = (await visibleNodes()).filter(test), lim = cap(limit), page = nodes.slice(0, lim), ids = new Set(page.map(n => n.id));
    const links = (await visibleLinks(ids)).filter(l => !linkTypes?.length || linkTypes.includes(l.type));
    return { nodes: page, links: links.slice(0, cfg.maxResults), truncated: nodes.length > lim || links.length > cfg.maxResults, totalMatching: nodes.length };
  }
  server.registerTool('filter_subgraph', { title: 'Filter subgraph', description: 'Nodes matching type and/or a property test, plus the links among them.', inputSchema: filterInput, annotations: { readOnlyHint: true } },
    async args => { const r = await filterSubgraph(args); return text({ nodes: r.nodes.map(slim), links: r.links.map(slim), truncated: r.truncated, totalMatching: r.totalMatching }); });

  const views = () => [...(ex.config.views || []), { name: 'everything', description: 'All visible nodes (capped)', filter: {}, layout: { kind: 'force' } }];
  server.registerTool('run_view', { title: 'Run a saved view or layout', description: `Run a saved view (see explore://views) or an ad-hoc filter, and compute layout positions server-side. Layout kinds: ${LAYOUT_KINDS.join(', ')}.`,
    inputSchema: { name: z.string().optional(), filter: z.object(filterShape).optional(), layout: z.enum(LAYOUT_KINDS).optional(), roots: z.array(z.string()).optional() }, annotations: { readOnlyHint: true } },
  async ({ name, filter, layout, roots }) => {
    const v = name ? views().find(x => x.name === name) : { name: 'ad-hoc', filter: filter || {}, layout: { kind: layout || 'force' } };
    if (!v) return errorResult(`No saved view "${name}". Saved views: ${views().map(x => x.name).join(', ')}`);
    const r = await filterSubgraph({ limit: cfg.maxResults, ...(v.filter || {}) });
    const kind = layout || v.layout?.kind || 'force';
    const pos = computeLayout({ nodes: r.nodes.map(n => ({ id: n.id, type: n.type, properties: n.properties })), links: r.links.map(l => ({ source: l.fromId, target: l.toId })), options: { ...(v.layout || {}), kind, roots: roots || v.layout?.roots, incremental: false } });
    return text({ view: v.name, layout: kind, nodes: r.nodes.map(n => ({ ...slim(n), x: +pos.get(n.id).x.toFixed(2), y: +pos.get(n.id).y.toFixed(2) })), links: r.links.map(slim), truncated: r.truncated });
  });

  // ---- saved views (SPEC §19): the same server-side store the Explore UI uses; node references are filtered to what this MCP principal may see
  if (ex.views) {
    server.registerTool('list_views', { title: 'List saved views', description: 'Saved Explore views (name, description, layout kind) and presentation sequences. Open one in the UI with /explore?view=<id>.', inputSchema: {}, annotations: { readOnlyHint: true } },
      async () => text({ views: ex.views.list(), presentations: ex.views.listPresentations() }));
    server.registerTool('get_view', { title: 'Get a saved view', description: 'Full state of a saved view: layout type and settings, filters, style reference, camera, selection, time/live, processor overlay. References to nodes you may not see are removed.',
      inputSchema: { id: z.string() }, annotations: { readOnlyHint: true } },
    async ({ id }) => { const v = await ex.viewFor(id, cfg.principal, cfg.actAs); return v ? text({ view: v, url: `/explore?view=${encodeURIComponent(v.id)}` }) : errorResult(`No saved view "${id}"`); });
  }

  // a delta is reported only if the caller may currently see the item (removes: if it may read the source)
  const visibleDelta = async d => { if (d.op === 'snapshot.marker') return service.canReadSource(cfg.principal, d.sourceId); const it = d.id && service.get(d.id); return d.op.endsWith('.remove') ? service.canReadSource(cfg.principal, d.sourceId) : !!(it && (await guard([service.view(it, cfg.principal)].filter(Boolean))).length); };
  server.registerTool('recent_deltas', { title: 'Recent stream deltas', description: 'Recently applied streaming events (op, id, type, source, seq). Use `since` with the last `n` you saw. For a cursor that survives restarts use changes_since.',
    inputSchema: { since: z.number().int().min(0).default(0), limit: z.number().int().min(1).max(2000).default(100), sourceId: z.string().optional() }, annotations: { readOnlyHint: true } },
  async ({ since, limit, sourceId }) => {
    const evs = ex.deltaLog.filter(d => d.n > since && (!sourceId || d.sourceId === sourceId));
    const out = [];
    for (const d of evs.slice(-cap(limit))) if (await visibleDelta(d)) out.push(d);
    return text({ events: out, lastN: ex.deltaLog.at(-1)?.n ?? 0, lag: service.lag });
  });

  // ---- change subscription for agents (event-driven): poll/long-poll from a cursor, or subscribe to explore://changes
  const changesSince = async ({ cursor, limit = 100, types, sourceId, ops }) => {
    const r = ex.feed.since(cursor || '', { limit: cap(limit) });
    if (r.error) return r;
    const out = [];
    for (const d of r.events) if ((!types || types.includes(d.type)) && (!sourceId || d.sourceId === sourceId) && (!ops || ops.includes(d.op)) && await visibleDelta(d)) out.push(d);
    return { ...r, events: out, mode: ex.config.mode, position: ex.kafka?.consumer?.position() ?? null };
  };
  server.registerTool('changes_since', { title: 'Changes since cursor (subscribe / poll)',
    description: 'Applied graph changes after an opaque cursor. Omit cursor to read from the oldest retained change; pass from:"now" to get only a fresh cursor. Pass waitMs to long-poll. In kafka mode the cursor is a set of Kafka partition offsets and survives restarts. reset:true means changes were dropped before your cursor: re-read state (graph_stats / search) and continue with the returned cursor.',
    inputSchema: { cursor: z.string().max(4096).optional(), from: z.enum(['oldest', 'now']).default('oldest').optional(), limit: z.number().int().min(1).max(2000).default(100), types: z.array(z.string()).optional(), ops: z.array(z.string()).optional(), sourceId: z.string().optional(), waitMs: z.number().int().min(0).max(30000).default(0) },
    annotations: { readOnlyHint: true } },
  async a => {
    if (!a.cursor && a.from === 'now') return text({ events: [], cursor: ex.feed.cursor(), more: false, reset: false, mode: ex.config.mode, position: ex.kafka?.consumer?.position() ?? null });
    let r = await changesSince(a);
    if (r.error) return errorResult(r.error);
    if (!r.events.length && !r.more && a.waitMs > 0) {
      const deadline = Date.now() + a.waitMs; let cur = r.cursor;
      while (Date.now() < deadline) {
        await new Promise(res => { const t = setTimeout(done, deadline - Date.now()); function done() { clearTimeout(t); ex.feed.off('append', done); res(); } ex.feed.on('append', done); });
        await new Promise(res => setTimeout(res, 20)); // let the rest of the batch land
        r = await changesSince({ ...a, cursor: cur }); if (r.events.length || r.reset) break; cur = r.cursor;
      }
    }
    return text(r);
  });
  const subs = new Set(); let pending = null;
  const onAppend = () => { if (!subs.has('explore://changes') || pending) return; pending = setTimeout(() => { pending = null; server.server.sendResourceUpdated({ uri: 'explore://changes' }).catch(() => {}); }, 100); };
  ex.feed.on('append', onAppend);
  server.server.setRequestHandler(SubscribeRequestSchema, async req => { subs.add(req.params.uri); return {}; });
  server.server.setRequestHandler(UnsubscribeRequestSchema, async req => { subs.delete(req.params.uri); return {}; });
  server.registerResource('changes', 'explore://changes', { title: 'Change feed', description: 'Latest applied changes and the current cursor. Subscribe (resources/subscribe) to get notifications/resources/updated when it changes; then call changes_since with your cursor.', mimeType: 'application/json' },
    async uri => { const r = await changesSince({ cursor: '', limit: 2000 }); return { contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify({ cursor: ex.feed.cursor(), mode: ex.config.mode, position: r.position, latest: r.events.slice(-50) }, null, 2) }] }; });

  server.registerResource('schema', 'explore://schema', { title: 'Graph schema', description: 'Node/link types, counts and property names visible to this MCP client', mimeType: 'application/json' },
    async uri => ({ contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(await schema(), null, 2) }] }));
  server.registerResource('style-config', 'explore://style-config', { title: 'Style config (v1)', description: 'Versioned visual style config used by the Explore UI', mimeType: 'application/json' },
    async uri => ({ contents: [{ uri: uri.href, mimeType: 'application/json', text: readFileSync(join(EXPLORE_ROOT, 'public', 'style-config.v1.json'), 'utf8') }] }));
  server.registerResource('views', 'explore://views', { title: 'Saved views', mimeType: 'application/json' }, async uri => ({ contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(views(), null, 2) }] }));

  // ---- stream-processor read tools (SPEC §18): only when the optional Flink processor overlay is enabled
  if (ex.processor) {
    const store = ex.processor.store;
    /** ids -> the subset this MCP principal may see (live nodes, source access policy, StreamGraph ABAC) */
    const visibleIds = async ids => new Set((await guard(ids.map(id => service.live(id)).filter(it => it && it.kind === 'node' && service.view(it, cfg.principal)))).map(n => n.id));
    server.registerTool('node_metrics', { title: 'Stream metrics per node (Flink processor)',
      description: 'Degree, in/out degree, total change count, latest tumbling-window activity and latest degree-spike alert per node, computed by the Flink stream processor from graph.changes. Pass ids, or omit them to get the top nodes by degree or by changes.',
      inputSchema: { ids: z.array(z.string()).max(1000).optional(), top: z.number().int().min(1).max(500).default(20), by: z.enum(['degree', 'changes']).default('degree') }, annotations: { readOnlyHint: true } },
    async a => {
      let ids = a.ids;
      if (!ids) { const all = await visibleIds([...store.nodes.keys()]); ids = [...all].sort((x, y) => (store.nodes.get(y)[a.by] - store.nodes.get(x)[a.by]) || x.localeCompare(y)).slice(0, cap(a.top)); return text({ metrics: ids.map(id => store.metricsFor(id)), processor: ex.processor.stats() }); }
      const ok = await visibleIds(ids);
      return text({ metrics: ids.filter(id => ok.has(id)).map(id => store.metricsFor(id)).filter(Boolean), notVisibleOrUnknown: ids.filter(id => !ok.has(id) || !store.nodes.has(id)).length, processor: ex.processor.stats() });
    });
    server.registerTool('stream_alerts', { title: 'Stream alerts (Flink processor)',
      description: 'Recent derived alerts (degree.spike: a node gained at least `threshold` links inside one tumbling event-time window), newest first. Optional nodeId filter.',
      inputSchema: { nodeId: z.string().optional(), limit: z.number().int().min(1).max(200).default(50) }, annotations: { readOnlyHint: true } },
    async a => {
      const al = store.alerts({ nodeId: a.nodeId, limit: 1000 }), ok = await visibleIds([...new Set(al.map(x => x.nodeId))]);
      return text({ alerts: al.filter(x => ok.has(x.nodeId)).slice(0, a.limit), processor: ex.processor.stats() });
    });
  }

  // ---- entity-resolution read tools (SPEC §21.6): only when er.enabled. Read-only, access-filtered like every other read.
  if (ex.er || ex.config.er?.enabled) {
    const q = ex.erQueries;
    const out = r => (r.error ? errorResult(r.error) : text(r));
    server.registerTool('resolve_entity', { title: 'Resolve entity',
      description: 'The resolved entity for a record id (or an entity id, or a retired entity id that was merged): its records with data source, record id, match score and match key, its features, possible matches to other entities and its recent merge/split history. Only records you may read are listed; an entity that includes records you may not read is not shown.',
      inputSchema: { id: z.string().describe('record node id, entity id ("er:entity:...") or a retired entity id'), maxRecords: z.number().int().min(1).max(1000).default(200) }, annotations: { readOnlyHint: true } },
    async ({ id, maxRecords }) => out(await q.resolveEntity(id, { principal: cfg.principal, actAs: cfg.actAs, maxRecords: cap(maxRecords) })));
    server.registerTool('why_matched', { title: 'Why matched (or not)',
      description: 'Explain the match decision between two records: score, decision (match / possible / no-match) against the thresholds, and per-feature evidence (weight = log2 Bayes factor; positive supports, negative contradicts; prior + sum(weights) = log2 odds of the score). Omit b to explain why record a belongs to its entity. Both records must be visible to you.',
      inputSchema: { a: z.string(), b: z.string().optional() }, annotations: { readOnlyHint: true } },
    async ({ a, b }) => out(await q.whyMatched(a, b, { principal: cfg.principal, actAs: cfg.actAs })));
    server.registerTool('list_possible_matches', { title: 'List possible matches',
      description: 'POSSIBLY_SAME relationships: entity pairs whose best record pair scored between the possible-match and match thresholds (not merged; a human should review). Optional entityId filter and minimum score; highest score first.',
      inputSchema: { entityId: z.string().optional(), minScore: z.number().min(0).max(1).default(0), limit: z.number().int().min(1).max(1000).default(50) }, annotations: { readOnlyHint: true } },
    async ({ entityId, minScore, limit }) => out(await q.listPossibleMatches({ entityId, minScore, limit: cap(limit), principal: cfg.principal, actAs: cfg.actAs })));
  }

  // ---- geo read tools (SPEC §22.6): always on; empty results when no node has a position. Access-filtered like every read.
  {
    const gq = ex.geoQueries;
    const bbox = z.array(z.number()).length(4).describe('[west, south, east, north] in degrees (WGS84); west > east crosses the antimeridian');
    const safe = f => async a => { try { return text(await f(a)); } catch (e) { return errorResult(e.message); } };
    server.registerTool('nodes_in_bbox', { title: 'Nodes in a bounding box',
      description: 'Nodes with a position (properties lat/lon, latitude/longitude, or a GeoJSON geometry) inside a lon/lat bounding box, sorted by id. Optional type filter. Only nodes you may read are returned or counted.',
      inputSchema: { bbox, types: z.array(z.string()).optional(), limit: z.number().int().min(1).max(5000).default(200) }, annotations: { readOnlyHint: true } },
    safe(({ bbox, types, limit }) => gq.nodesInBbox({ bbox, types, limit: cap(limit), principal: cfg.principal, actAs: cfg.actAs })));
    server.registerTool('grid_counts', { title: 'Grid cell counts (H3 / MGRS)',
      description: 'Counts of positioned nodes per grid cell: H3 hexagons (resolution 0-10) or MGRS squares (precision 0 = 100 km, 1 = 10 km, 2 = 1 km, 3 = 100 m, 4 = 10 m). Optional bbox and type filters; ids per cell on request. includeStream adds the Flink per-cell windowed event counts (graph.geo-metrics) when the processor computes them and you may read every source. Only nodes you may read are counted.',
      inputSchema: { kind: z.enum(['h3', 'mgrs']).default('h3'), resolution: z.number().int().min(0).max(10).optional(), bbox: bbox.optional(), types: z.array(z.string()).optional(), limit: z.number().int().min(1).max(5000).default(200), idsPerCell: z.number().int().min(0).max(100).default(0), includeStream: z.boolean().default(false) }, annotations: { readOnlyHint: true } },
    safe(a => gq.gridCounts({ ...a, limit: cap(a.limit), principal: cfg.principal, actAs: cfg.actAs })));
  }

  // ---- write tools: OFF unless explicitly enabled. Writes go through the streaming contract as source "mcp".
  if (cfg.allowWrites === true) {
    const WRITE_SOURCE = cfg.writeSourceId || 'mcp';
    if (ex.views) {
      server.registerTool('save_view', { title: 'Save a view', description: 'Create a saved view (or update it when id exists). state follows SPEC §19 (layout, filters, style, camera, selection, time, processor).',
        inputSchema: { id: z.string().optional(), name: z.string(), description: z.string().optional(), state: z.record(z.string(), z.any()).default({}) } },
      async ({ id, name, description, state }) => { try { const r = id && ex.views.get(id) ? ex.views.update(id, { name, description, state }) : ex.views.create({ id, name, description, state, origin: 'mcp' }); return text({ ok: true, id: r.view.id, warnings: r.warnings }); } catch (e) { return errorResult(e.message); } });
      server.registerTool('set_layout', { title: 'Set the layout of a saved view', description: `Change the layout of a saved view (kind: ${LAYOUT_KINDS.join(', ')}; seed makes it reproducible; timeProperty for timeline; groupBy for community, e.g. louvain or a property). The UI applies it when the view loads.`,
        inputSchema: { id: z.string(), kind: z.enum(LAYOUT_KINDS), seed: z.number().int().optional(), timeProperty: z.string().optional(), groupBy: z.string().optional(), spacing: z.number().min(0).max(10).optional(), orientation: z.enum(['down', 'up', 'left', 'right']).optional() } },
      async ({ id, ...layout }) => { try { const v = ex.views.get(id); if (!v) return errorResult(`No saved view ${id}`); const state = { ...v.state, layout: { ...(v.state?.layout || {}), ...Object.fromEntries(Object.entries(layout).filter(([, x]) => x !== undefined)) } }; const r = ex.views.update(id, { state }); return text({ ok: true, id, layout: r.view.state.layout, warnings: r.warnings }); } catch (e) { return errorResult(e.message); } });
      server.registerTool('delete_view', { title: 'Delete a saved view', description: 'Delete a saved view by id.', inputSchema: { id: z.string() }, annotations: { destructiveHint: true } },
        async ({ id }) => { try { return text(ex.views.delete(id)); } catch (e) { return errorResult(e.message); } });
    }

    const itemSchema = { id: z.string(), type: z.string(), label: z.string().optional(), properties: z.record(z.string(), z.any()).default({}) };
    const cmds = ex.kafka?.commands;
    if (cmds) {
      // kafka mode, orchestrator-worker: tools emit commands to graph.commands; a command worker (shared group) applies them
      const issuer = { id: cfg.principal?.id || 'mcp', roles: cfg.principal?.roles || [], via: 'mcp' };
      const wait = { waitMs: z.number().int().min(0).max(30000).default(5000).describe('wait this long for the worker result (0 = return the commandId at once)') };
      const run = async (kind, args, waitMs) => {
        let commandId; try { commandId = await cmds.emit(kind, args, issuer); } catch (e) { return errorResult(`command rejected: ${e.message}`); }
        const result = await cmds.status(commandId, waitMs);
        if (result?.status === 'rejected') return { ...text({ commandId, status: 'rejected', result }), isError: true };
        return text({ commandId, status: result?.status || 'queued', result });
      };
      server.registerTool('upsert_node', { title: 'Upsert node (command)', description: `Emit an upsert_node command to the command topic; a worker applies it as source "${WRITE_SOURCE}".`, inputSchema: { ...itemSchema, ...wait } },
        async ({ waitMs, ...a }) => run('upsert_node', a, waitMs));
      server.registerTool('upsert_link', { title: 'Upsert link (command)', description: 'Emit an upsert_link command.', inputSchema: { ...itemSchema, fromId: z.string(), toId: z.string(), ...wait } },
        async ({ waitMs, ...a }) => run('upsert_link', a, waitMs));
      server.registerTool('remove_item', { title: 'Remove item (command)', description: `Emit a remove_item command. The worker refuses items not written by "${WRITE_SOURCE}".`, inputSchema: { id: z.string(), kind: z.enum(['node', 'link']).optional(), ...wait }, annotations: { destructiveHint: true } },
        async ({ waitMs, id }) => run('remove_item', { id }, waitMs));
      server.registerTool('command_status', { title: 'Command status', description: 'Result of a command (applied / rejected), or queued if no worker has answered yet.', inputSchema: { commandId: z.string(), waitMs: z.number().int().min(0).max(30000).default(0) }, annotations: { readOnlyHint: true } },
        async ({ commandId, waitMs }) => { const r = await cmds.status(commandId, waitMs); return text({ commandId, status: r?.status || 'queued', result: r }); });
    } else {
      // Writes go through the streaming contract as source "mcp".
      const prod = () => ex.producer(WRITE_SOURCE);
      server.registerTool('upsert_node', { title: 'Upsert node', description: `Create or update a node (source "${WRITE_SOURCE}").`, inputSchema: itemSchema, annotations: { destructiveHint: false } },
        async a => { prod().push('node.upsert', { ...a, kind: 'node' }); await prod().flush(); return text({ ok: true, id: a.id }); });
      server.registerTool('upsert_link', { title: 'Upsert link', description: 'Create or update a link.', inputSchema: { ...itemSchema, fromId: z.string(), toId: z.string() } },
        async a => { prod().push('link.upsert', { ...a, kind: 'link' }); await prod().flush(); return text({ ok: true, id: a.id }); });
      server.registerTool('remove_item', { title: 'Remove node or link', description: `Tombstone an item that was written by source "${WRITE_SOURCE}" (other sources are refused).`, inputSchema: { id: z.string(), kind: z.enum(['node', 'link']) }, annotations: { destructiveHint: true } },
        async ({ id, kind }) => { const it = service.live(id); if (it && !it.sources.some(s => s.sourceId === WRITE_SOURCE)) return errorResult('forbidden: item belongs to another source'); prod().push(`${kind}.remove`, { id }); await prod().flush(); return text({ ok: true, id }); });
      server.registerTool('push_stream_batch', { title: 'Push stream event batch', description: 'Push a §6 contract batch for a configured stream source. Returns the ack.',
        inputSchema: { batch: z.object({ batchId: z.string(), sourceId: z.string(), partition: z.number().int().default(0), events: z.array(z.record(z.string(), z.any())).max(500) }) } },
        async ({ batch }) => { if (![...ex.config.streams, WRITE_SOURCE].includes(batch.sourceId)) return errorResult(`sourceId ${batch.sourceId} is not a configured stream`); return text(await ex.receive(batch)); });
    }
  }
  server.close = (orig => async () => { ex.feed.off('append', onAppend); clearTimeout(pending); service.closeSession(sid); return orig(); })(server.close.bind(server));
  return server;
}

/** Streamable HTTP handler (stateless: a fresh server per request). Mounted at /mcp by the combined app. */
export function mcpHttpHandler(ex, { allowedHosts = null, token = null } = {}) {
  const expected = token ? Buffer.from(`Bearer ${token}`) : null;
  return async (req, res) => {
    if (req.method !== 'POST') { res.writeHead(405, { 'content-type': 'application/json', allow: 'POST' }); return res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed (stateless server: POST only)' }, id: null })); }
    const host = req.headers.host;
    if (allowedHosts && !allowedHosts.includes(host)) { res.writeHead(403); return res.end('host not allowed'); }
    if (expected) { // optional bearer token (mcp.httpTokenEnv) — required when the endpoint is exposed beyond localhost
      const got = Buffer.from(String(req.headers.authorization || ''));
      if (got.length !== expected.length || !timingSafeEqual(got, expected)) { res.writeHead(401, { 'www-authenticate': 'Bearer' }); return res.end('unauthorized'); }
    }
    const chunks = []; for await (const c of req) chunks.push(c);
    let body; try { body = JSON.parse(Buffer.concat(chunks).toString('utf8') || 'null'); } catch { res.writeHead(400); return res.end('bad json'); }
    const server = buildMcpServer(ex);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on('close', () => { transport.close(); server.close(); });
    await server.connect(transport);
    await transport.handleRequest(req, res, body);
  };
}
