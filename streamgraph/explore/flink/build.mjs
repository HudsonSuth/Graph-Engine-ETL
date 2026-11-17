// Compile the Flink job into explore/flink/build/graph-processor.jar (needs a JDK 17+; uses the same JDK lookup as the runner).
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname, delimiter } from 'node:path';
import { FLINK_DIR, RUNTIME, JOB_JAR, javaBin, flinkHome } from './config.js';
const bin = dirname(javaBin()), ext = process.platform === 'win32' ? '.exe' : '';
const javac = bin === '.' ? 'javac' : join(bin, 'javac' + ext), jar = bin === '.' ? 'jar' : join(bin, 'jar' + ext);
const out = join(FLINK_DIR, 'build', 'classes');
rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
if (!existsSync(join(flinkHome(), 'lib'))) { console.error('Flink not found - run npm run flink:setup first'); process.exit(1); }
const cp = [join(flinkHome(), 'lib', '*'), join(RUNTIME, 'lib', '*')].join(delimiter);
execFileSync(javac, ['--release', '17', '-nowarn', '-d', out, '-cp', cp, join(FLINK_DIR, 'src', 'streamgraph', 'flink', 'GraphStreamProcessor.java')], { stdio: 'inherit' });
execFileSync(jar, ['--create', '--file', JOB_JAR, '-C', out, '.'], { stdio: 'inherit' });
console.log(`built ${JOB_JAR}`);
