// Test suites write screenshots and broken-implementation logs here.
// This directory is gitignored so a run does not rewrite committed proof/*.png or test/broken-*.txt.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const TEST_OUTPUT = fileURLToPath(new URL('../test-output/', import.meta.url));

/** Path under streamgraph/test-output/. A path with no file extension is created as a directory. */
export function testOutput(...parts) {
  const file = join(TEST_OUTPUT, ...parts);
  const last = parts[parts.length - 1] || '';
  const asDir = !last.includes('.');
  mkdirSync(asDir ? file : (parts.length > 1 ? join(TEST_OUTPUT, ...parts.slice(0, -1)) : TEST_OUTPUT), { recursive: true });
  return file;
}
