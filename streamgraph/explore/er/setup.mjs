// Installs what the Duke entity-resolution sidecar needs into explore/er/lib (or $STREAMGRAPH_ER_LIB). All Apache-2.0,
// SHA-1 verified against Maven Central (see explore/LICENSES.md):
//   duke 1.2 (no.priv.garshol.duke), lucene-core 4.0.0, lucene-analyzers-common 4.0.0, jackson-databind/core/annotations 2.18.3
// Java 17+ is needed at runtime: JAVA_HOME / PATH / STREAMGRAPH_JAVA, or the Temurin JDK that `npm run flink:setup` installs.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { ER_LIB, javaBin } from './config.js';

const MAVEN = 'https://repo1.maven.org/maven2';
export const JARS = ['no/priv/garshol/duke/duke/1.2/duke-1.2.jar', 'org/apache/lucene/lucene-core/4.0.0/lucene-core-4.0.0.jar',
  'org/apache/lucene/lucene-analyzers-common/4.0.0/lucene-analyzers-common-4.0.0.jar', 'com/fasterxml/jackson/core/jackson-databind/2.18.3/jackson-databind-2.18.3.jar',
  'com/fasterxml/jackson/core/jackson-core/2.18.3/jackson-core-2.18.3.jar', 'com/fasterxml/jackson/core/jackson-annotations/2.18.3/jackson-annotations-2.18.3.jar'];
const get = async url => { const r = await fetch(url); if (!r.ok) throw new Error(`${r.status} ${url}`); return Buffer.from(await r.arrayBuffer()); };
const sha1 = b => createHash('sha1').update(b).digest('hex');
mkdirSync(ER_LIB, { recursive: true });
for (const p of JARS) {
  const name = p.split('/').pop(), dest = join(ER_LIB, name);
  if (existsSync(dest)) { console.log(`${name} already installed`); continue; }
  const b = await get(`${MAVEN}/${p}`), want = (await get(`${MAVEN}/${p}.sha1`)).toString().trim().split(/\s+/)[0];
  if (sha1(b) !== want) throw new Error(`${name}: SHA-1 mismatch - refusing to install`);
  writeFileSync(dest, b); console.log(`installed ${name} (SHA-1 verified)`);
}
let ver = ''; try { ver = execFileSync(javaBin(), ['-XshowSettings:properties', '-version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { ver = String(e.stderr || e.stdout || ''); }
const major = Number((ver.match(/java\.specification\.version = (\d+)/) || [])[1] || 0);
console.log(major >= 17 ? `Java ${major} found (${javaBin()})` : 'No Java 17+ found: install Temurin 21 (winget install EclipseAdoptium.Temurin.21.JDK) or run npm run flink:setup');
console.log(`Duke ready in ${ER_LIB}. The sidecar jar ships prebuilt in explore/er/build; rebuild after edits with npm run er:build`);

// ---- Splink (default engine): a private virtualenv in explore/er/.venv with pinned, MIT-licensed packages
const win = process.platform === 'win32';
const venv = join(ER_LIB, '..', '.venv'), vpy = join(venv, win ? 'Scripts' : 'bin', win ? 'python.exe' : 'python');
const SPLINK = ['splink==5.0.0', 'duckdb==2.0.0', 'pyarrow', 'sqlglot'];
if (process.argv.includes('--no-splink')) console.log('skipping Splink (--no-splink): use "er": { "engine": "duke" }');
else {
  if (!existsSync(vpy)) {
    const sys = process.env.STREAMGRAPH_PYTHON_BOOTSTRAP || (win ? 'python' : 'python3');
    console.log(`creating virtualenv ${venv} with ${sys}`);
    execFileSync(sys, ['-m', 'venv', venv], { stdio: 'inherit' });
  }
  execFileSync(vpy, ['-m', 'pip', 'install', '--disable-pip-version-check', '-q', ...SPLINK], { stdio: 'inherit' });
  console.log(`Splink ready (${vpy})`);
}
