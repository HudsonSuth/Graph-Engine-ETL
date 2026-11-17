// npm run opensearch:start - runs the local single-node OpenSearch on 127.0.0.1 (low-memory heap for laptops) and
// waits until the cluster answers. Ctrl+C stops it. Flags: --detach (leave it running in the background and exit).
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, openSync } from 'node:fs';
import { join } from 'node:path';
import { HOME, DATA, PORT, HEAP, RUNTIME } from './config.js';

if (!existsSync(join(HOME, 'bin'))) { console.error('OpenSearch is not installed. Run: npm run opensearch:setup'); process.exit(1); }
const url = `http://127.0.0.1:${PORT}`;
const up = async () => { try { const r = await fetch(`${url}/_cluster/health`, { signal: AbortSignal.timeout(2000) }); return r.ok ? r.json() : null; } catch { return null; } };
if (await up()) { console.log(`OpenSearch is already running at ${url}`); process.exit(0); }
mkdirSync(DATA, { recursive: true }); mkdirSync(join(RUNTIME, 'logs'), { recursive: true });
const win = process.platform === 'win32', detach = process.argv.includes('--detach');
const bin = join(HOME, 'bin', win ? 'opensearch.bat' : 'opensearch');
const env = { ...process.env, OPENSEARCH_JAVA_OPTS: `${HEAP} ${process.env.OPENSEARCH_JAVA_OPTS || ''}`.trim() };
delete env.JAVA_HOME; delete env.OPENSEARCH_JAVA_HOME; // use the JDK bundled with OpenSearch
// paths, port and the loopback bind live in config/opensearch.yml (written by setup); only overrides go on the command line
const args = [...(process.env.STREAMGRAPH_OPENSEARCH_DATA ? [`-Epath.data=${DATA}`] : []), ...(process.env.STREAMGRAPH_OPENSEARCH_PORT ? [`-Ehttp.port=${PORT}`] : []), '-Enetwork.host=127.0.0.1'];
const out = detach ? openSync(join(RUNTIME, 'logs', 'console.log'), 'a') : 'inherit';
const child = spawn(bin, args, { env, stdio: ['ignore', out, out], detached: detach, shell: win, windowsHide: true });
child.on('exit', code => { if (!detach) process.exit(code ?? 0); });
for (let i = 0; i < 120; i++) {
  const h = await up();
  if (h) { console.log(`OpenSearch ${h.status} at ${url} (heap ${HEAP})`); if (detach) { child.unref(); process.exit(0); } break; }
  await new Promise(r => setTimeout(r, 1000));
}
if (!(await up())) { console.error('OpenSearch did not start within 120 s; see explore/opensearch/.runtime/logs'); process.exit(1); }
process.on('SIGINT', () => child.kill('SIGINT'));
