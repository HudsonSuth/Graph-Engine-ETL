// StreamGraph server core: flow API, live SSE, static UI, guided studio API.
import http from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { loadFlow, validateFlow, copyFlow, Pipeline, KINDS } from './flow.js';
import { GraphStore } from './graph.js';
import { createStudio } from './studio/api.js';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const STATIC = { '/': 'public/index.html', '/advanced': 'public/advanced.html', '/advanced.html': 'public/advanced.html', '/app.js': 'public/app.js', '/style.css': 'public/style.css',
  '/studio.js': 'public/studio.js', '/studio.css': 'public/studio.css', '/vendor/cytoscape.min.js': 'node_modules/cytoscape/dist/cytoscape.min.js' };
export const readBody = req => new Promise((r, j) => { const c = []; req.on('data', x => c.push(x)); req.on('end', () => r(Buffer.concat(c))); req.on('error', j); });
export const json = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };

export async function startServer({ host = process.env.HOST || '127.0.0.1', port = 8080, flowPath, graphFile = ':memory:', dataDir = join(ROOT, 'data'), demo = false, runAtBoot = false, log = console.log, sinkFactories = {}, syncIntervalMs = 1000 } = {}) {
  const graph = new GraphStore(graphFile);
  const clients = new Set();
  const app = {
    graph, port, flowPath, sinkFactories, syncIntervalMs, pipe: null, demo: null, demoDir: join(ROOT, 'demo'),
    flow: flowPath && existsSync(flowPath) ? loadFlow(flowPath) : { name: 'empty', baseDir: ROOT, steps: [], links: [] },
    resolveSecrets: f => f, onApplied: () => {},
    state() { const p = app.pipe; return { name: app.flow.name, running: !!p?.running, counts: graph.counts(), version: graph.version, schema: graph.schema(), steps: p?.stepSchemas() || {}, errors: p?.lastErrors || [], validation: validateFlow(app.flow) }; },
    broadcast(event, data) { const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`; for (const c of clients) c.write(msg); },
    async run(mode = 'continuous') {
      await app.pipe?.stop(); graph.clear();
      const p = app.pipe = new Pipeline(app.resolveSecrets(app.flow), { graph });
      p.on('tick', () => { app.onTick?.(); app.broadcast('state', app.state()); });
      p.on('error-event', e => app.broadcast('error', e));
      p.on('applied', x => app.onApplied(x));
      if (mode === 'batch') await p.runOnce(); else await p.start();
      app.onTick?.();
      app.broadcast('state', app.state());
    },
    async stop() { await app.pipe?.stop(); app.broadcast('state', app.state()); },
    // Start a new project: stop everything first so no in-flight record can write after the wipe.
    async reset() {
      const old = app.pipe; app.pipe = null;
      if (process.env.STREAMGRAPH_RESET !== 'broken') await old?.stop(); // DELIBERATELY WRONG when broken: sources keep running
      else app.pipe = old;
      app.demo?.stop?.(); app.demo = null;
      graph.clear(); // truncates tables, so a --graph file stays open and works on Windows
      app.flow = { name: 'empty', baseDir: app.flow.baseDir, steps: [], links: [] };
      app.broadcast('state', app.state());
    },
    async startDemo() { if (!app.demo) app.demo = await (await import(join(ROOT, 'demo/simulate.js'))).setup(app.demoDir); return app.demo; },
  };
  if (demo) await app.startDemo();
  const studio = await createStudio({ app, dataDir });

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x'), p = url.pathname;
    const body = async () => { const b = await readBody(req); return b.length ? JSON.parse(b) : {}; };
    try {
      if (STATIC[p]) { res.writeHead(200, { 'content-type': MIME[extname(STATIC[p])] || 'text/html' }); return res.end(await readFile(join(ROOT, STATIC[p]))); }
      if (p === '/demo/api/loyalty') return app.demo ? json(res, 200, app.demo.loyalty()) : json(res, 404, { error: 'Demo is not running' });
      if (p.startsWith('/api/studio/')) return await studio.handle(req, res, url);
      if (p.startsWith('/api/') && await studio.guardApp(req, res, url)) return; // access rules for the advanced API
      if (p === '/api/events') {
        res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
        res.write(`event: state\ndata: ${JSON.stringify(app.state())}\n\n`); clients.add(res); req.on('close', () => clients.delete(res)); return;
      }
      if (p === '/api/flow' && req.method === 'GET') { const { baseDir, ...flow } = app.flow; return json(res, 200, { flow, kinds: KINDS }); }
      if (p === '/api/flow' && req.method === 'PUT') {
        const f = await body(); const errors = validateFlow(f);
        app.flow = { ...f, baseDir: app.flow.baseDir };
        if (url.searchParams.get('save') && flowPath) { const { baseDir, ...out } = app.flow; await writeFile(flowPath, JSON.stringify(out, null, 2)); }
        return json(res, 200, { errors });
      }
      if (p === '/api/validate') return json(res, 200, { errors: validateFlow(await body()) });
      if (p === '/api/copy') { const { name } = await body(); const { baseDir, ...out } = copyFlow(app.flow, name); const dest = join(dataDir, `${name.replace(/\W+/g, '-')}.json`); await writeFile(dest, JSON.stringify(out, null, 2)); return json(res, 200, { saved: dest }); }
      if (p === '/api/run') { const { mode = 'continuous' } = await body(); const errors = validateFlow(app.flow); if (errors.length) return json(res, 400, { errors }); await app.run(mode); return json(res, 200, app.state()); }
      if (p === '/api/stop') { await app.stop(); return json(res, 200, app.state()); }
      if (p === '/api/state') return json(res, 200, app.state());
      if (p === '/api/graph') return json(res, 200, { nodes: graph.nodes(), edges: graph.edges(), version: graph.version });
      if (p === '/api/query') { const { pattern, limit, where } = await body(); return json(res, 200, { rows: graph.query(pattern, limit, where) }); }
      if (p === '/api/export.cypher') { res.writeHead(200, { 'content-type': 'text/plain' }); return res.end(graph.exportCypher()); }
      json(res, 404, { error: 'not found' });
    } catch (e) { if (!res.headersSent) json(res, 400, { error: e.message }); }
  });
  await new Promise((r, j) => { server.once('error', j); server.listen(port, host, r); }); // localhost only by default: there is no login
  app.port = server.address().port;
  log?.(`StreamGraph on http://${host.includes(':') ? `[${host}]` : host}:${app.port}${app.demo ? '  (demo simulator on)' : ''}`);
  if (runAtBoot) await app.run('continuous');
  return { server, app, studio, close: async () => { await studio.syncout.stop(); await app.pipe?.stop(); for (const c of clients) c.end(); server.close(); } };
}
