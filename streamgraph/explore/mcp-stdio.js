// MCP over stdio for desktop AI clients (Claude Desktop, Cursor, Grok Bot...).
// Starts the combined app in-process (UI still reachable on --port, default 8090) and speaks MCP on stdin/stdout.
// stdout is reserved for MCP: every log line goes to stderr.
console.log = (...a) => console.error(...a);
const { resolve } = await import('node:path');
const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
const { startCombined } = await import('./combined.js');
const { buildMcpServer } = await import('./server/mcp-server.js');
const args = process.argv.slice(2), opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const valued = new Set(['--port', '--graph', '--data', '--synthetic']);
const flowArg = args.find((a, i) => !a.startsWith('--') && !valued.has(args[i - 1]));
const app = await startCombined({ port: Number(opt('--port') || process.env.PORT || 8090), flowPath: flowArg && resolve(flowArg), graphFile: opt('--graph'), dataDir: opt('--data') && resolve(opt('--data')),
  demo: args.includes('--demo'), runAtBoot: args.includes('--run'), synthetic: Number(opt('--synthetic') || 0), log: (...a) => console.error(...a) });
const server = buildMcpServer(app.ex);
await server.connect(new StdioServerTransport());
const bye = async () => { await server.close(); await app.close(); process.exit(0); };
process.stdin.on('close', bye); process.on('SIGINT', bye); process.on('SIGTERM', bye);
