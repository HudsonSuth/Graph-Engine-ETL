// Combined app: StreamGraph (unchanged) + Explore layer + MCP server on one port.
// mode: inprocess (default) or kafka (explore.config.json "mode" / EXPLORE_MODE=kafka, KAFKA_BROKERS=host:9092)
// node explore/combined.js [flow.json] [--demo] [--run] [--kafka] [--processor] [--port 8080] [--graph file.db] [--data dir] [--synthetic N]
import { resolve } from 'node:path';
import { hostname } from 'node:os';
import { startServer } from '../src/app.js';
import { createExplore, loadConfig } from './server/app.js';
import { mcpHttpHandler } from './server/mcp-server.js';

export async function startCombined({ port = 8080, flowPath, graphFile, dataDir, demo = false, runAtBoot = false, synthetic = 0, log = console.log, config = loadConfig() } = {}) {
  const sg = await startServer({ port, flowPath, graphFile, dataDir, demo, runAtBoot, log });
  const p = sg.app.port, dir = sg.app.dataDir || dataDir;
  // Integration: built-in stream processing (local Kafka + Flink) and entity matching (Duke/Splink) are switched on and off
  // from the studio; their settings persist in <data>/explore-settings.json and the explore layer is rebuilt on a switch.
  const { ProcessingControl } = await import('./server/processing.js');
  const ctl = new ProcessingControl({ dataDir: dir, baseConfig: config, log });
  let ex = null;
  const { GraphHistory } = await import('./server/history.js');
  const history = new GraphHistory({ dataDir: dir, graph: sg.app.graph });
  sg.app.onReset = async () => { history.clear(); await ex?.extra?.reset(); };
  const build = async cfg => {
    if (cfg.mode === 'kafka') { // per-instance identity (view group id, transactional ids) and checkpoint location
      cfg = { ...cfg, dataDir: cfg.dataDir || dir, kafka: { ...cfg.kafka, instanceId: cfg.kafka?.instanceId || `${hostname()}-${p}` } };
    }
    if (cfg.viewsDir === undefined) cfg = { ...cfg, viewsDir: dir || null }; // saved views live next to StreamGraph's data
    if (cfg.dataDir === undefined) cfg = { ...cfg, dataDir: dir };
    const e = await createExplore({ graph: sg.app.graph, studio: sg.studio, config: cfg, log, app: sg.app, control: ctl, history });
    if (cfg.mcp.enabled !== false && cfg.mcp.http !== false) e.mcpHttp = mcpHttpHandler(e, { allowedHosts: [`127.0.0.1:${p}`, `localhost:${p}`, `[::1]:${p}`, ...(cfg.mcp.allowedHosts || [])], token: cfg.mcp.httpTokenEnv ? process.env[cfg.mcp.httpTokenEnv] || null : null });
    if (cfg.mcp.httpTokenEnv && !process.env[cfg.mcp.httpTokenEnv]) log?.(`[explore] WARNING: mcp.httpTokenEnv=${cfg.mcp.httpTokenEnv} is not set; /mcp is unauthenticated (localhost only)`);
    return e;
  };
  ctl.getEx = () => ex;
  ctl.rebuild = async () => { const old = ex; ex = null; await old?.close().catch(e => log?.(`[explore] close: ${e.message}`)); ex = await build(await ctl.effectiveConfig()); return ex; };
  try { ex = await build(await ctl.effectiveConfig()); }
  catch (e) { log?.(`[explore] built-in processing did not start (${e.message}); starting without it`); ctl.lastError = e.message; await ctl.broker?.stop().catch(() => {}); ex = await build(config); }
  // route /explore, /api/explore/* and /mcp to the explore layer; everything else goes to StreamGraph untouched
  const orig = sg.server.listeners('request');
  sg.server.removeAllListeners('request');
  sg.server.on('request', async (req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname.startsWith('/api/explore/') && !ex) { res.writeHead(503, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ error: 'The explore layer is restarting. Try again in a few seconds.' })); }
    if (ex && ex.claims(url.pathname)) return ex.handle(req, res, url);
    for (const f of orig) f.call(sg.server, req, res);
  });
  if (synthetic > 0) { const r = await ex.synthetic(synthetic, synthetic * 2); log?.(`[explore] synthetic graph: ${r.nodes} nodes / ${r.links} links via the stream contract in ${Math.round(r.ms)} ms`); }
  log?.(`Explore UI on http://127.0.0.1:${p}/explore   Studio graph explorer on http://127.0.0.1:${p}/#explore-graph   MCP (Streamable HTTP) on http://127.0.0.1:${p}/mcp`);
  return { sg, get ex() { return ex; }, ctl, port: p, close: async () => { await ex?.close(); await ctl.close(); history.close(); await sg.close(); } };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('combined.js')) {
  const args = process.argv.slice(2), opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
  const valued = new Set(['--port', '--graph', '--data', '--synthetic']);
  const flowArg = args.find((a, i) => !a.startsWith('--') && !valued.has(args[i - 1]));
  let config = loadConfig();
  if (args.includes('--kafka')) config = { ...config, mode: 'kafka' };
  if (args.includes('--er')) config = { ...config, er: { ...config.er, enabled: true } }; // entity resolution (SPEC §21)
  if (args.includes('--processor')) config = { ...config, processor: { ...config.processor, enabled: true } }; // Flink processor overlay (needs --kafka)
  const running = await startCombined({ config, port: Number(opt('--port') || process.env.PORT || 8080), flowPath: flowArg && resolve(flowArg), graphFile: opt('--graph'), dataDir: opt('--data') && resolve(opt('--data')),
    demo: args.includes('--demo'), runAtBoot: args.includes('--run'), synthetic: Number(opt('--synthetic') || 0) });
  // Ctrl+C / window close / kill: stop the Kafka broker, Flink job and Duke sidecar too, so no Java process is left behind
  let stopping = false; const stop = sig => { if (stopping) return process.exit(1); stopping = true; console.log(`[streamgraph] ${sig}: stopping`); Promise.race([running.close(), new Promise(r => setTimeout(r, 15000))]).finally(() => process.exit(0)); };
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGBREAK', 'SIGHUP']) try { process.on(sig, () => stop(sig)); } catch {}
}
