// Installs the Flink runtime the processor needs into explore/flink/.runtime (or $STREAMGRAPH_FLINK_RUNTIME):
//   flink/        Apache Flink 2.2.1 binary distribution (Apache-2.0), SHA-512 verified against downloads.apache.org
//   lib/          flink-sql-connector-kafka 5.0.0-2.2 (Kafka client shaded), networknt json-schema-validator 1.5.9 + Jackson
//                 2.18.3 + ethlo itu 1.14.0 + Uber H3 4.5.1 (all Apache-2.0), SHA-1 verified against Maven Central
//   jdk/          Eclipse Temurin 21 (only if no Java 17+ is found: JAVA_HOME / PATH / STREAMGRAPH_JAVA)
// Needs: Node 22+, `tar` on PATH (Windows 10+ ships tar.exe). Re-running skips what is already installed.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync, readFileSync, renameSync, readdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { RUNTIME, FLINK_VERSION, javaBin } from './config.js';

const FLINK = `flink-${FLINK_VERSION}`, MAVEN = 'https://repo1.maven.org/maven2';
const JARS = ['org/apache/flink/flink-sql-connector-kafka/5.0.0-2.2/flink-sql-connector-kafka-5.0.0-2.2.jar', 'com/networknt/json-schema-validator/1.5.9/json-schema-validator-1.5.9.jar',
  'com/fasterxml/jackson/core/jackson-databind/2.18.3/jackson-databind-2.18.3.jar', 'com/fasterxml/jackson/core/jackson-core/2.18.3/jackson-core-2.18.3.jar',
  'com/fasterxml/jackson/core/jackson-annotations/2.18.3/jackson-annotations-2.18.3.jar', 'com/ethlo/time/itu/1.14.0/itu-1.14.0.jar',
  'com/uber/h3/4.5.1/h3-4.5.1.jar']; // H3 (Apache-2.0, bundles its JNI library for linux/windows/mac): optional geo metrics (SPEC §22.7)
const get = async url => { const r = await fetch(url); if (!r.ok) throw new Error(`${r.status} ${url}`); return Buffer.from(await r.arrayBuffer()); };
const hash = (alg, b) => createHash(alg).update(b).digest('hex');
mkdirSync(join(RUNTIME, 'lib'), { recursive: true });

if (!existsSync(join(RUNTIME, 'flink', 'lib'))) {
  const base = `https://downloads.apache.org/flink/${FLINK}/${FLINK}-bin-scala_2.12.tgz`;
  console.log(`downloading ${base}`);
  const tgz = await get(base), want = (await get(`${base}.sha512`)).toString().trim().split(/\s+/)[0];
  if (hash('sha512', tgz) !== want) throw new Error('Flink SHA-512 mismatch - refusing to install');
  const f = join(RUNTIME, `${FLINK}.tgz`); writeFileSync(f, tgz);
  execFileSync('tar', ['-xzf', f, '-C', RUNTIME], { stdio: 'inherit' }); rmSync(f);
  renameSync(join(RUNTIME, FLINK), join(RUNTIME, 'flink'));
  console.log(`installed Flink ${FLINK_VERSION} (SHA-512 verified)`);
} else console.log('Flink already installed');

for (const p of JARS) {
  const name = p.split('/').pop(), dest = join(RUNTIME, 'lib', name);
  if (existsSync(dest)) continue;
  const b = await get(`${MAVEN}/${p}`), sha1 = (await get(`${MAVEN}/${p}.sha1`)).toString().trim().split(/\s+/)[0];
  if (hash('sha1', b) !== sha1) throw new Error(`${name}: SHA-1 mismatch - refusing to install`);
  writeFileSync(dest, b); console.log(`installed ${name} (SHA-1 verified)`);
}

const ver = (() => { try { const r = execFileSync(javaBin(), ['-XshowSettings:properties', '-version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); return r; } catch (e) { return String(e.stderr || e.stdout || ''); } })();
const major = Number((ver.match(/java\.specification\.version = (\d+)/) || [])[1] || 0);
if (major >= 17) console.log(`Java ${major} found (${javaBin()})`);
else if (!existsSync(join(RUNTIME, 'jdk'))) {
  const os = { win32: 'windows', darwin: 'mac', linux: 'linux' }[process.platform], arch = { x64: 'x64', arm64: 'aarch64' }[process.arch];
  const url = `https://api.adoptium.net/v3/binary/latest/21/ga/${os}/${arch}/jdk/hotspot/normal/eclipse`;
  console.log(`no Java 17+ found - downloading Temurin 21 from ${url}`);
  const b = await get(url), f = join(RUNTIME, os === 'windows' ? 'jdk.zip' : 'jdk.tgz'); writeFileSync(f, b);
  const tmp = join(RUNTIME, 'jdk-tmp'); mkdirSync(tmp, { recursive: true });
  execFileSync('tar', ['-xf', f, '-C', tmp], { stdio: 'inherit' }); rmSync(f);
  const top = readdirSync(tmp)[0]; renameSync(join(tmp, top, ...(os === 'mac' ? ['Contents', 'Home'] : [])), join(RUNTIME, 'jdk')); rmSync(tmp, { recursive: true, force: true });
  console.log('installed Temurin 21 into .runtime/jdk');
}
console.log(`Flink runtime ready in ${RUNTIME}. Next: npm run flink:build (only needed if explore/flink/build/graph-processor.jar is missing or you changed the Java source)`);
