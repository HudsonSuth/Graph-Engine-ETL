// Build the static registry demo. Fixture data is baked into public/data/graph.json.
// Usage: npm run demo:registry
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDemoData } from '../../explore/demos/registry-sanctions/build-graph.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../..');
const OUT = join(HERE, 'public');
const WEB = join(HERE, 'web');

const data = await buildDemoData();
rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'data'), { recursive: true });
mkdirSync(join(OUT, 'vendor'), { recursive: true });
writeFileSync(join(OUT, 'data', 'graph.json'), JSON.stringify(data));
cpSync(join(WEB, 'index.html'), join(OUT, 'index.html'));
cpSync(join(WEB, 'app.js'), join(OUT, 'app.js'));
cpSync(join(WEB, 'app.css'), join(OUT, 'app.css'));
cpSync(join(ROOT, 'node_modules', 'minisearch', 'dist', 'umd', 'index.js'), join(OUT, 'vendor', 'minisearch.js'));
cpSync(join(ROOT, 'node_modules', 'minisearch', 'LICENSE.txt'), join(OUT, 'vendor', 'minisearch.LICENSE'));
cpSync(join(ROOT, 'node_modules', 'cytoscape', 'dist', 'cytoscape.min.js'), join(OUT, 'vendor', 'cytoscape.min.js'));
cpSync(join(ROOT, 'node_modules', 'cytoscape', 'LICENSE'), join(OUT, 'vendor', 'cytoscape.LICENSE'));
writeFileSync(join(OUT, 'LICENSES.txt'), [
  'StreamGraph registry demo. Permissive licenses only.',
  'Application code: MIT (this repository).',
  'minisearch: MIT (vendor/minisearch.LICENSE). Stands in for OpenSearch in the browser.',
  'cytoscape: MIT (vendor/cytoscape.LICENSE).',
  'FCC Covered List, BIS Entity List (ITA Consolidated Screening List), OFAC SDN List, SEC EDGAR: US government works, public domain.',
  'GLEIF LEI records and Level 2 relationships: CC0 1.0.',
  'The fixture is a small excerpt, not a full dump. No ICIJ data is included.',
  '',
].join('\n'));
console.log('[demo:registry] output', OUT);
console.log('[demo:registry] records', JSON.stringify(data.counts.bySource), 'same_as', data.counts.sameAs);
