// Build the static Vercel demo: run the engine snapshot, then copy the UI into public/.
// Usage: npm run demo:vercel   (Node 24, same as CI; unpdf requires it)
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../..');
const OUT = join(HERE, 'public');

const major = Number(process.versions.node.split('.')[0]);
if (major < 24 && !process.env.SG_DEMO_NODE_OK) {
  const alt = process.env.NODE24 || '/tmp/node24/bin/node';
  if (existsSync(alt)) {
    const r = spawnSync(alt, process.argv.slice(1), { stdio: 'inherit', env: { ...process.env, SG_DEMO_NODE_OK: '1' } });
    process.exit(r.status ?? 1);
  }
  console.warn('[demo] Node 24 is required for the documents reader (unpdf). Current ' + process.version);
}

const { buildSnapshot } = await import('./snapshot.mjs');

function walk(dir, fn) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, fn);
    else fn(p);
  }
}

const HEAD = `<meta name="robots" content="noindex, nofollow">
<meta name="referrer" content="no-referrer">
<link rel="icon" href="data:,">
<script src="/demo/snapshot.js"></script>
<script src="/vendor/minisearch.js"></script>
<script src="/demo/shim.js"></script>
`;

function inject(html, { tour }) {
  let out = html.replace(/<head[^>]*>/i, m => `${m}\n${HEAD}`);
  if (tour) out = out.replace(/<\/body>/i, '<script src="/demo/tour.js"></script>\n</body>');
  return out;
}

function patchLabels(file) {
  if (!file.endsWith('.js')) return;
  let s = readFileSync(file, 'utf8');
  const before = s;
  s = s.replaceAll('healthy: \'Index healthy\'', 'healthy: \'MiniSearch (stands in for OpenSearch)\'');
  s = s.replaceAll(
    "${r.engine === 'opensearch' ? 'OpenSearch' : 'built-in search'}",
    "${r.engine === 'opensearch' ? 'OpenSearch' : r.engine === 'minisearch' ? 'MiniSearch (stands in for OpenSearch)' : 'built-in search'}",
  );
  s = s.replaceAll('?"OpenSearch":"built-in search"', '?"OpenSearch":"MiniSearch (stands in for OpenSearch)"');
  s = s.replace("cy.layout({ name: 'cose', animate: false, nodeRepulsion: () => 12000, idealEdgeLength: () => 50, gravity: 0.6, randomize: true, fit: true, padding: 20 }).run();", "cy.layout({ name: 'grid', animate: false, fit: true, padding: 20 }).run();");
  s = s.replace(/sourceMappingURL=/g, 'sourceMappingURL-disabled=');
  if (s !== before) writeFileSync(file, s);
}

console.log('[demo] running the StreamGraph engine');
const snap = await buildSnapshot();
const nodes = snap.datasets.maritime.principals.owner.state.counts.nodes;
console.log('[demo] maritime nodes', nodes);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'demo'), { recursive: true });
mkdirSync(join(OUT, 'vendor'), { recursive: true });
mkdirSync(join(OUT, 'explore'), { recursive: true });
mkdirSync(join(OUT, 'sdk'), { recursive: true });

cpSync(join(ROOT, 'public'), OUT, { recursive: true, filter: (src) => !src.includes('node_modules') });
cpSync(join(ROOT, 'explore', 'public'), join(OUT, 'explore'), { recursive: true });
cpSync(join(ROOT, 'sdk', 'js', 'streamgraph.js'), join(OUT, 'sdk', 'streamgraph.js'));
cpSync(join(ROOT, 'node_modules', 'cytoscape', 'dist', 'cytoscape.min.js'), join(OUT, 'vendor', 'cytoscape.min.js'));
cpSync(join(ROOT, 'node_modules', 'minisearch', 'dist', 'umd', 'index.js'), join(OUT, 'vendor', 'minisearch.js'));
cpSync(join(ROOT, 'node_modules', 'minisearch', 'LICENSE.txt'), join(OUT, 'vendor', 'minisearch.LICENSE'));
cpSync(join(HERE, 'shim.js'), join(OUT, 'demo', 'shim.js'));
cpSync(join(HERE, 'tour.js'), join(OUT, 'demo', 'tour.js'));

const json = JSON.stringify(snap).replace(/</g, '\\u003c');
writeFileSync(join(OUT, 'demo', 'snapshot.js'), 'window.__SG_DEMO = ' + json + ';\n');

for (const [rel, tour] of [['index.html', true], ['advanced.html', false]]) {
  const p = join(OUT, rel);
  writeFileSync(p, inject(readFileSync(p, 'utf8'), { tour }));
}
for (const rel of ['index.html', 'studio.html', 'bench.html']) {
  const p = join(OUT, 'explore', rel);
  writeFileSync(p, inject(readFileSync(p, 'utf8'), { tour: false }));
}
walk(OUT, p => { if (['.js', '.mjs'].includes(extname(p)) && !p.endsWith('snapshot.js') && !p.includes(`${join('vendor', 'minisearch')}`)) patchLabels(p); });

const licenses = [
  'StreamGraph demo bundle licenses (permissive only).',
  'Application code: MIT (this repository).',
  'minisearch 7: MIT (vendor/minisearch.LICENSE). Stands in for OpenSearch in the browser.',
  'cytoscape: MIT.',
  'sigma, graphology and their plugins, bundled in explore.js: MIT.',
  'maplibre-gl, bundled under explore/vendor/maplibre: BSD-3-Clause (see LICENSE.txt there).',
  'Natural Earth countries geojson: public domain.',
  'Maritime AIS slice: NOAA / MarineCadastre, CC0. Ports: Natural Earth, public domain.',
  'lucide-static (ISC) and majesticons (MIT) are not copied into this bundle; the demo does not request their icon files.',
  'No ICIJ Offshore Leaks data is included.',
].join('\n') + '\n';
writeFileSync(join(OUT, 'demo', 'LICENSES.txt'), licenses);

console.log('[demo] output', OUT);
