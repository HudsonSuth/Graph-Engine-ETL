// Compile the Duke sidecar into explore/er/build/duke-sidecar.jar (needs a JDK 17+ and npm run er:setup for the Duke/Lucene jars).
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { ER_DIR, ER_LIB, SIDECAR_JAR, javaBin } from './config.js';
const bin = dirname(javaBin()), ext = process.platform === 'win32' ? '.exe' : '';
const javac = bin === '.' ? 'javac' : join(bin, 'javac' + ext), jar = bin === '.' ? 'jar' : join(bin, 'jar' + ext);
if (!existsSync(join(ER_LIB, 'duke-1.2.jar'))) { console.error('Duke not found - run npm run er:setup first'); process.exit(1); }
const out = join(ER_DIR, 'build', 'classes');
rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
execFileSync(javac, ['--release', '17', '-nowarn', '-d', out, '-cp', join(ER_LIB, '*'), join(ER_DIR, 'src', 'streamgraph', 'er', 'DukeSidecar.java')], { stdio: 'inherit' });
execFileSync(jar, ['--create', '--file', SIDECAR_JAR, '-C', out, '.'], { stdio: 'inherit' });
rmSync(out, { recursive: true, force: true });
console.log(`built ${SIDECAR_JAR}`);
