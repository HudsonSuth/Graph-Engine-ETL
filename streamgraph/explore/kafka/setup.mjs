// Installs the local Kafka broker the studio's "Live processing" page starts (KRaft mode, no ZooKeeper, no Docker, no admin):
//   explore/kafka/.runtime/kafka   Apache Kafka 4.3.2 (Apache-2.0), SHA-512 verified against downloads.apache.org
// The broker is started with `java -cp libs/*` (local-broker.js), so the .sh/.bat scripts are never used; works the same on Windows.
// Needs: Node 22+, `tar` on PATH (Windows 10+ ships tar.exe), Java 17+ (JAVA_HOME / STREAMGRAPH_JAVA) to run it.
// Already have Kafka somewhere? Set KAFKA_HOME instead of running this.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync, renameSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const VERSION = process.env.STREAMGRAPH_KAFKA_VERSION || '4.3.2', SCALA = '2.13';
const RUNTIME = fileURLToPath(new URL('./.runtime/', import.meta.url)), DEST = join(RUNTIME, 'kafka');
if (existsSync(join(DEST, 'libs'))) { console.log(`Kafka already installed at ${DEST}`); process.exit(0); }
mkdirSync(RUNTIME, { recursive: true });
const name = `kafka_${SCALA}-${VERSION}`, base = `https://downloads.apache.org/kafka/${VERSION}/${name}.tgz`;
const get = async url => { const r = await fetch(url); if (!r.ok) throw new Error(`${r.status} ${url}`); return Buffer.from(await r.arrayBuffer()); };
console.log(`downloading ${base}`);
const tgz = await get(base), sumTxt = (await get(`${base}.sha512`)).toString();
// Apache's .sha512 for Kafka is "file: AAAA BBBB ..." (grouped, upper case, may wrap): keep only the hex digits
const want = sumTxt.slice(sumTxt.indexOf(':') + 1).replace(/[^0-9a-f]/gi, '').toLowerCase();
const got = createHash('sha512').update(tgz).digest('hex');
if (got !== want) throw new Error('Kafka SHA-512 mismatch - refusing to install');
const f = join(RUNTIME, `${name}.tgz`); writeFileSync(f, tgz);
execFileSync('tar', ['-xzf', f, '-C', RUNTIME], { stdio: 'inherit' }); rmSync(f);
renameSync(join(RUNTIME, name), DEST);
console.log(`installed Kafka ${VERSION} at ${DEST} (SHA-512 verified)`);
