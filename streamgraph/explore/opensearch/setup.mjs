// npm run opensearch:setup - installs a local single-node OpenSearch into explore/opensearch/.runtime/opensearch
// (or $STREAMGRAPH_OPENSEARCH_RUNTIME). SHA-512 verified against artifacts.opensearch.org. OpenSearch bundles its own JDK.
// Needs: Node 22+, `tar` on PATH (Windows 10+ ships tar.exe, which also extracts .zip). Re-running skips what is installed.
import { createHash } from 'node:crypto';
import { createWriteStream, existsSync, mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { join } from 'node:path';
import { RUNTIME, HOME, DATA, OPENSEARCH_VERSION, PORT, artifact } from './config.js';

mkdirSync(RUNTIME, { recursive: true });
if (existsSync(join(HOME, 'bin'))) { console.log(`OpenSearch already installed in ${HOME}`); process.exit(0); }
const { url, kind, bundle } = artifact();
const want = (await (await fetch(`${url}.sha512`)).text()).trim().split(/\s+/)[0];
if (!/^[0-9a-f]{128}$/.test(want)) throw new Error(`could not read ${url}.sha512`);
console.log(`downloading ${url}`);
const r = await fetch(url); if (!r.ok) throw new Error(`${r.status} ${url}`);
const file = join(RUNTIME, kind === 'zip' ? 'opensearch.zip' : 'opensearch.tgz'), h = createHash('sha512');
await pipeline(Readable.fromWeb(r.body), async function* (src) { for await (const c of src) { h.update(c); yield c; } }, createWriteStream(file));
if (h.digest('hex') !== want) { rmSync(file); throw new Error('OpenSearch SHA-512 mismatch - refusing to install'); }
const tmp = join(RUNTIME, 'extract-tmp'); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp);
execFileSync('tar', ['-xf', file, '-C', tmp], { stdio: 'inherit' }); rmSync(file);
renameSync(join(tmp, readdirSync(tmp)[0]), HOME); rmSync(tmp, { recursive: true, force: true });
// Local dev config: loopback only, single node, low memory. Security plugin (bundle only) disabled: localhost, no login.
const yml = [
  'cluster.name: streamgraph-local', 'node.name: streamgraph-1', 'network.host: 127.0.0.1', `http.port: ${PORT}`,
  'discovery.type: single-node', 'indices.memory.native_index_buffer_size: 64mb', 'action.auto_create_index: false', 'cluster.routing.allocation.disk.threshold_enabled: false',
  `path.data: ${JSON.stringify(DATA)}`, `path.logs: ${JSON.stringify(join(RUNTIME, 'logs'))}`, // quoted: Windows paths keep their backslashes
  ...(bundle ? ['plugins.security.disabled: true'] : []), '',
].join('\n');
writeFileSync(join(HOME, 'config', 'opensearch.yml'), yml);
console.log(`installed OpenSearch ${OPENSEARCH_VERSION} (SHA-512 verified) in ${HOME}. Next: npm run opensearch:start`);
