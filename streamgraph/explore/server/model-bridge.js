#!/usr/bin/env node
// StreamGraph Model Bridge as a separate process (plan §5.2a). Keys live in THIS process's environment / secrets file.
//   stdio (default):  node explore/server/model-bridge.js --data <dir>
//   HTTP:             node explore/server/model-bridge.js --data <dir> --http 8790 --token-env BRIDGE_TOKEN [--host 127.0.0.1]
//   test providers:   --providers <module.mjs>   (a module that calls registerProvider; used by the offline test fixtures)
import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createModelBridge } from '../../src/llm/bridge.js';
import { loadModels } from '../../src/llm/config.js';
import { loadPrices } from '../../src/llm/prices.js';

export async function startModelBridge(argv = process.argv.slice(2), { stdio = true } = {}) {
  const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
  const dataDir = resolve(arg('data', 'data'));
  for (let i = 0; i < argv.length; i++) if (argv[i] === '--providers') await import(pathToFileURL(resolve(argv[i + 1])).href);
  const secFile = join(dataDir, 'secrets.json');
  const secret = id => (existsSync(secFile) ? JSON.parse(readFileSync(secFile, 'utf8'))[id] : undefined);
  const make = () => createModelBridge({ models: () => loadModels(dataDir), prices: () => loadPrices(dataDir), secret, log: l => process.stderr.write(`${l}\n`) });
  const port = arg('http');
  if (!port) {
    if (!stdio) throw new Error('--http <port> is required when stdio is off');
    const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
    await make().connect(new StdioServerTransport());
    return null;
  }
  const { StreamableHTTPServerTransport } = await import('@modelcontextprotocol/sdk/server/streamableHttp.js');
  const tokenEnv = arg('token-env'); const token = tokenEnv ? process.env[tokenEnv] : undefined;
  const host = arg('host', '127.0.0.1');
  if (!token && host !== '127.0.0.1' && host !== 'localhost') throw new Error('a bearer token (--token-env NAME) is required when listening beyond loopback');
  const authed = req => { if (!token) return true; const got = Buffer.from(String(req.headers.authorization || '')); const want = Buffer.from(`Bearer ${token}`); return got.length === want.length && timingSafeEqual(got, want); };
  const srv = createServer(async (req, res) => {
    if (new URL(req.url, 'http://x').pathname !== '/mcp') { res.writeHead(404).end(); return; }
    if (!authed(req)) { res.writeHead(401, { 'content-type': 'application/json' }).end('{"error":"unauthorized"}'); return; }
    const chunks = []; for await (const c of req) chunks.push(c);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : undefined;
    const server = make(), transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined }); // stateless: one server per request
    res.on('close', () => { transport.close(); server.close(); });
    await server.connect(transport); await transport.handleRequest(req, res, body);
  });
  await new Promise(r => srv.listen(Number(port), host, r));
  return srv;
}
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) startModelBridge().catch(e => { process.stderr.write(`model-bridge: ${e.message}\n`); process.exit(1); });
