// CLI: node src/server.js [flow.json] [--demo] [--run] [--port 8080] [--graph file.db] [--data dir]
import { resolve } from 'node:path';
import { startServer } from './app.js';
const args = process.argv.slice(2), opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const valued = new Set(['--port', '--graph', '--data']);
const flowArg = args.find((a, i) => !a.startsWith('--') && !valued.has(args[i - 1]));
await startServer({ port: Number(opt('--port') || process.env.PORT || 8080), flowPath: flowArg && resolve(flowArg), graphFile: opt('--graph'), dataDir: opt('--data') && resolve(opt('--data')),
  demo: args.includes('--demo'), runAtBoot: args.includes('--run') });
