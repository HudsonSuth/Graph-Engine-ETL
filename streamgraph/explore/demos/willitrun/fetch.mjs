// Refresh the offline fixture from Will It Run? Prefer the public MCP server
// (https://willitrunllm.com/api/mcp); fall back to API v1 per endpoint.
// Respects the published ~120 req/min limit. Usage:
//   node explore/demos/willitrun/fetch.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { resultJson } from '../../server/connectors/mcp.js';
import { DEFAULT_CONFIG } from './map.js';

const MCP_URL = 'https://willitrunllm.com/api/mcp';
const API_BASE = 'https://willitrunllm.com/api/v1';
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'fixture.json');
const MIN_INTERVAL_MS = Number(process.env.WILLITRUN_MIN_INTERVAL_MS || 600); // ~100 req/min
const CONFIG = { ...DEFAULT_CONFIG };

const sleep = ms => new Promise(r => setTimeout(r, ms));
let lastCall = 0;
async function throttle() {
  const wait = MIN_INTERVAL_MS - (Date.now() - lastCall);
  if (wait > 0) await sleep(wait);
  lastCall = Date.now();
}

async function httpGet(path) {
  await throttle();
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (res.status === 429) throw new Error(`HTTP 429 for ${url}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

function log(msg) { console.log(`[willitrun] ${msg}`); }

async function openMcp() {
  const client = new Client({ name: 'streamgraph-willitrun-fetch', version: '0.1.0' });
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL));
  await client.connect(transport);
  const tools = (await client.listTools()).tools.map(t => t.name);
  const need = ['search_models', 'search_hardware', 'what_fits', 'get_benchmarks'];
  const missing = need.filter(n => !tools.includes(n));
  if (missing.length) throw new Error(`MCP missing tools: ${missing.join(', ')} (has ${tools.join(', ')})`);
  return {
    tools,
    async call(name, args) {
      await throttle();
      const res = await client.callTool({ name, arguments: args });
      return resultJson(res);
    },
    async close() { await client.close().catch(() => {}); },
  };
}

async function fetchModels(mcp) {
  if (mcp) {
    const r = await mcp.call('search_models', { query: '', include_old: false, limit: 200 });
    if (Array.isArray(r.models) && r.models.length) return { via: 'mcp', models: r.models, count: r.count ?? r.models.length, meta: r.meta };
  }
  const r = await httpGet('/models');
  return { via: 'http', models: r.models, count: r.count, meta: r.meta };
}

async function fetchHardware(mcp) {
  if (mcp) {
    const r = await mcp.call('search_hardware', { query: '', limit: 200 });
    if (Array.isArray(r.hardware) && r.hardware.length) return { via: 'mcp', hardware: r.hardware, count: r.count ?? r.hardware.length, meta: r.meta };
  }
  const r = await httpGet('/hardware');
  return { via: 'http', hardware: r.hardware, count: r.count, meta: r.meta };
}

function dedupeBenchmarks(rows) {
  const seen = new Set(), out = [];
  for (const b of rows || []) {
    const k = JSON.stringify([b.hw, b.model, b.quant, b.backend, b.tg128, b.pp512, b.source, b.label]);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(b);
  }
  return out;
}

async function fetchBenchmarks(mcp) {
  // MCP get_benchmarks does not honour `offset` (always returns the first page,
  // max 500). Use HTTP pagination for the complete measured set.
  const all = [];
  let offset = 0, meta, total = Infinity;
  while (offset < total) {
    const r = await httpGet(`/benchmarks?limit=500&offset=${offset}`);
    meta = r.meta;
    const rows = r.benchmarks || [];
    total = r.count ?? (offset + rows.length);
    all.push(...rows);
    if (!rows.length) break;
    offset += rows.length;
  }
  const unique = dedupeBenchmarks(all);
  return { via: 'http', benchmarks: unique, count: unique.length, reportedCount: total, meta };
}

function fitsQuery(hwId) {
  const q = new URLSearchParams({
    hw: hwId,
    minq: CONFIG.minq,
    ctx: String(CONFIG.ctx),
    kv: CONFIG.kv,
    ram: String(CONFIG.ram),
    rambw: String(CONFIG.rambw),
  });
  return `/fits?${q}`;
}

async function fetchFitsOne(mcp, hwId) {
  if (mcp) {
    try {
      const r = await mcp.call('what_fits', {
        hw: hwId,
        minq: CONFIG.minq,
        ctx: CONFIG.ctx,
        kv: CONFIG.kv,
        ram: CONFIG.ram,
        rambw: CONFIG.rambw,
        include_old: false,
        limit: 200,
      });
      const models = r.models || [];
      if (r.count != null && models.length < r.count) {
        throw new Error(`what_fits truncated for ${hwId}: ${models.length}/${r.count}`);
      }
      return {
        via: 'mcp',
        hwId,
        ctx: r.ctx,
        kv: r.kv,
        ramGB: r.ramGB,
        minQuant: r.minQuant,
        count: r.count ?? models.length,
        fitsFully: r.fitsFully,
        models,
        meta: r.meta,
      };
    } catch (e) {
      log(`MCP what_fits failed for ${hwId} (${e.message}); trying HTTP`);
    }
  }
  const r = await httpGet(fitsQuery(hwId));
  return {
    via: 'http',
    hwId,
    ctx: r.ctx,
    kv: r.kv,
    ramGB: r.ramGB,
    minQuant: r.minQuant,
    count: r.count ?? r.models?.length,
    fitsFully: r.fitsFully,
    models: r.models || [],
    meta: r.meta,
  };
}

const endpoints = { mcp: MCP_URL, api: API_BASE, docs: 'https://willitrunllm.com/api/', mcpDocs: 'https://willitrunllm.com/mcp/' };

const mcp = await openMcp().catch(e => {
  log(`MCP connect failed (${e.message}); using HTTP API`);
  return null;
});
if (mcp) log(`MCP connected (${mcp.tools.join(', ')})`);

try {
  const models = await fetchModels(mcp);
  log(`models: ${models.models.length} via ${models.via}`);
  const hardware = await fetchHardware(mcp);
  log(`hardware: ${hardware.hardware.length} via ${hardware.via}`);
  const benches = await fetchBenchmarks(mcp);
  log(`benchmarks: ${benches.benchmarks.length} via ${benches.via}`);

  const fits = {};
  const viaCounts = { mcp: 0, http: 0 };
  let i = 0;
  for (const hw of hardware.hardware) {
    i++;
    const block = await fetchFitsOne(mcp, hw.id);
    viaCounts[block.via] = (viaCounts[block.via] || 0) + 1;
    fits[hw.id] = {
      ctx: block.ctx,
      kv: block.kv,
      ramGB: block.ramGB,
      minQuant: block.minQuant,
      count: block.count,
      fitsFully: block.fitsFully,
      models: block.models,
      via: block.via,
    };
    if (i % 20 === 0 || i === hardware.hardware.length) log(`fits ${i}/${hardware.hardware.length}`);
  }

  const meta = models.meta || hardware.meta || benches.meta || {};
  const fixture = {
    fetchedAt: new Date().toISOString(),
    attribution: 'Data from Will It Run? (https://willitrunllm.com)',
    license: meta.license || 'CC BY 4.0 for the Will It Run? compilation and estimates; each benchmark row links its source.',
    endpoints,
    source: {
      models: models.via,
      hardware: hardware.via,
      benchmarks: benches.via,
      fits: viaCounts,
      mcpTools: mcp?.tools || [],
    },
    config: CONFIG,
    meta: { rev: meta.rev, dataDate: meta.dataDate, api: meta.api, docs: meta.docs, attribution: meta.attribution, license: meta.license },
    models: models.models,
    hardware: hardware.hardware,
    benchmarks: benches.benchmarks,
    fits,
  };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(fixture, null, 2));
  log(`wrote ${OUT} (${models.models.length} models, ${hardware.hardware.length} hardware, ${benches.benchmarks.length} benchmarks, ${Object.keys(fits).length} fit lists)`);
} finally {
  await mcp?.close();
}
