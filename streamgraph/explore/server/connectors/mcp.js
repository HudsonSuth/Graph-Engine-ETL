// MCP client source (outbound): connects to an external MCP server (stdio command or Streamable HTTP URL),
// lists its tools, calls a configured tool on a schedule or on demand, maps the JSON result to canonical items
// with a mapping config, and pushes them through the streaming contract (same merge/dedupe path as every stream).
//
// Mapping config (all paths are JSON pointers into the tool result; "/items/*" iterates an array):
// { "nodes": [{ "from": "/people/*", "id": "id", "type": "Person" | { "field": "kind" }, "label": "name", "properties": ["email"] | "*" }],
//   "links": [{ "from": "/edges/*", "id": "id"?, "source": "src", "target": "dst", "type": "KNOWS" | { "field": "rel" }, "properties": [...] | "*",
//               "sourceIdPrefix"?: "<other sourceId>:node:", "targetIdPrefix"?: ... }],
//   "removeMissing": false }   // true => snapshot replace-source semantics (items not in the latest result are tombstoned)
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { StreamProducer } from '../producer.js';
import { envelope, sanitize } from './common.js';

const RESERVED = new Set(['id', 'kind', 'fromId', 'toId', 'sources', 'version', 'deleted']);
function select(obj, path) {
  if (!path || path === '/') return [obj];
  let cur = [obj];
  for (const raw of path.split('/').slice(1)) {
    const k = raw.replace(/~1/g, '/').replace(/~0/g, '~'), next = [];
    for (const c of cur) { if (c == null) continue; if (k === '*') { if (Array.isArray(c)) next.push(...c); else if (typeof c === 'object') next.push(...Object.values(c)); } else next.push(c[k]); }
    cur = next;
  }
  return cur.filter(v => v !== undefined);
}
const get = (o, f) => (f == null ? undefined : String(f).split('.').reduce((x, k) => (x == null ? undefined : x[k]), o));
const val = (o, spec) => (spec && typeof spec === 'object' ? get(o, spec.field) ?? spec.default : spec);
const pickProps = (o, spec, used) => { const out = {}; const keys = spec === '*' ? Object.keys(o).filter(k => !used.has(k)) : Array.isArray(spec) ? spec : []; for (const k of keys) { const v = get(o, k); if (v !== undefined && !RESERVED.has(k)) out[k] = v; } return out; };

/** Extract the JSON payload of a tools/call result (structuredContent first, else the first JSON text block). */
export function resultJson(result) {
  if (result?.isError) throw new Error(`tool error: ${result.content?.map(c => c.text).join(' ').slice(0, 200)}`);
  if (result?.structuredContent) return result.structuredContent;
  for (const c of result?.content || []) if (c.type === 'text') { try { return JSON.parse(c.text); } catch {} }
  throw new Error('tool result has no JSON content');
}

/** Pure mapping: tool JSON -> canonical items (nodes, links) + warnings. */
export function mapMcpResult(json, mapping, sourceId, fetchedAt = new Date().toISOString()) {
  const items = [], warnings = [], nodeId = v => `${sourceId}:node:${v}`;
  const prov = native => [{ sourceId, nativeId: String(native), fetchedAt }];
  for (const m of mapping.nodes || []) for (const o of select(json, m.from)) {
    if (!o || typeof o !== 'object') continue;
    const id = get(o, m.id); if (id == null || id === '') { warnings.push({ code: 'missing_id', message: `${m.from}: object without ${m.id}` }); continue; }
    const type = val(o, m.type) || 'Unknown', label = m.label ? get(o, m.label) : undefined;
    const used = new Set([m.id, m.label, m.type?.field].filter(Boolean));
    items.push({ id: nodeId(id), kind: 'node', type: String(type), ...(label != null ? { label: String(label) } : {}), properties: pickProps(o, m.properties ?? '*', used), sources: prov(id), ...(m.eventTime && get(o, m.eventTime) ? { eventTime: get(o, m.eventTime) } : {}) });
  }
  for (const m of mapping.links || []) for (const o of select(json, m.from)) {
    if (!o || typeof o !== 'object') continue;
    const s = get(o, m.source), t = get(o, m.target), type = val(o, m.type) || 'RELATED';
    if (s == null || t == null) { warnings.push({ code: 'null_endpoint', message: `${m.from}: link without ${m.source}/${m.target}` }); continue; }
    const native = m.id ? get(o, m.id) : `${s}-[${type}]->${t}`;
    const used = new Set([m.id, m.source, m.target, m.type?.field].filter(Boolean));
    items.push({ id: `${sourceId}:link:${native}`, kind: 'link', type: String(type), fromId: (m.sourceIdPrefix ?? `${sourceId}:node:`) + s, toId: (m.targetIdPrefix ?? `${sourceId}:node:`) + t, properties: pickProps(o, m.properties ?? '*', used), sources: prov(native) });
  }
  return { items, warnings };
}

export class McpSource {
  /** { sourceId, command?, args?, env?, cwd?, url?, headersEnv?, tool, arguments?, searchArgument?, intervalMs?, mapping, send(batch)->ack, transport? (tests) } */
  constructor(o) {
    Object.assign(this, { intervalMs: 0, arguments: {}, ...o });
    if (!this.mapping) throw new Error('mcp source needs a mapping');
    this.producer = new StreamProducer({ sourceId: this.sourceId, producerId: `${this.sourceId}-mcp`, send: o.send, lingerMs: 5 });
    this.client = null; this.timer = null; this.tools = []; this.lastError = null; this.runs = 0;
  }
  capabilities() { return { queryLanguage: 'mcp-tool', expand: false, maxPageSize: 5000, stream: !!this.intervalMs, estimatedLagMs: this.intervalMs || null }; }
  #transport() {
    if (this.transport) return this.transport;
    if (this.url) return new StreamableHTTPClientTransport(new URL(this.url), { requestInit: { headers: Object.fromEntries(Object.entries(this.headersEnv || {}).map(([k, v]) => [k, process.env[v] || ''])) } });
    if (this.command) return new StdioClientTransport({ command: this.command, args: this.args || [], env: { ...process.env, ...(this.env || {}) }, cwd: this.cwd, stderr: 'ignore' });
    throw new Error('mcp source needs command or url');
  }
  async connect() {
    if (this.client) return this.client;
    const c = new Client({ name: 'streamgraph-explore-mcp-source', version: '0.1.0' });
    await c.connect(this.#transport());
    this.client = c;
    this.tools = (await c.listTools()).tools;
    if (!this.tools.some(t => t.name === this.tool)) throw new Error(`MCP server has no tool "${this.tool}" (has: ${this.tools.map(t => t.name).join(', ')})`);
    return c;
  }
  async start() { await this.connect(); await this.pull(); if (this.intervalMs > 0) { this.timer = setInterval(() => this.pull().catch(() => {}), this.intervalMs); this.timer.unref?.(); } return this; }
  /** Call the tool once and push mapped items through the streaming contract. */
  async pull(extraArgs = {}) {
    const startedAt = Date.now();
    try {
      await this.connect();
      const res = await this.client.callTool({ name: this.tool, arguments: { ...this.arguments, ...extraArgs } });
      const { items, warnings } = mapMcpResult(resultJson(res), this.mapping, this.sourceId);
      const p = this.producer, snap = this.mapping.removeMissing ? `${this.sourceId}:${++this.runs}` : null;
      if (snap) p.push('snapshot.marker', { phase: 'begin', snapshotId: snap, mode: 'replace-source' });
      for (const it of items.filter(i => i.kind === 'node')) p.push('node.upsert', it);
      for (const it of items.filter(i => i.kind === 'link')) p.push('link.upsert', it);
      if (snap) p.push('snapshot.marker', { phase: 'end', snapshotId: snap });
      await p.flush();
      this.lastError = null;
      return envelope({ sourceId: this.sourceId, items, warnings, startedAt });
    } catch (e) { this.lastError = sanitize(e.message); return envelope({ sourceId: this.sourceId, error: { code: 'source_unavailable', message: this.lastError }, startedAt }); }
  }
  // connector interface: search = on-demand pull (optionally passing the text to a configured argument)
  async search({ text } = {}) { const env = await this.pull(this.searchArgument && text ? { [this.searchArgument]: text } : {}); return { ...env, items: [] }; } // items already merged via the stream
  async expand() { return envelope({ sourceId: this.sourceId, warnings: [{ code: 'unsupported', message: 'expand not supported by MCP source' }] }); }
  async refresh() { return this.search({}); }
  async health() { return this.lastError ? { status: 'degraded', message: this.lastError } : { status: 'ok' }; }
  async close() { clearInterval(this.timer); await this.client?.close().catch(() => {}); this.client = null; }
}
