// Load the cached Will It Run? fixture into the combined StreamGraph + Explore app.
//   npm run demo:willitrun
// Then open the printed /explore URL (style query param colours edges by verdict).
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startCombined } from '../../combined.js';
import { loadConfig } from '../../server/app.js';
import { mapFixture, SOURCE_ID } from './map.js';

export const DEMO_DIR = dirname(fileURLToPath(import.meta.url));
export const APP_ROOT = join(DEMO_DIR, '../../..');
export const FIXTURE_PATH = join(DEMO_DIR, 'fixture.json');
export const STYLE_PUBLIC = join(APP_ROOT, 'explore/public/willitrun-style.json');

export function publishStyle() {
  mkdirSync(dirname(STYLE_PUBLIC), { recursive: true });
  copyFileSync(join(DEMO_DIR, 'style.json'), STYLE_PUBLIC);
  copyFileSync(join(DEMO_DIR, 'style-symbols.json'), join(dirname(STYLE_PUBLIC), 'willitrun-symbols.json')); // symbol style used by the saved views (SPEC §20)
}

export function loadFixture() {
  if (!existsSync(FIXTURE_PATH)) {
    throw new Error(`Missing ${FIXTURE_PATH}. Run: node explore/demos/willitrun/fetch.mjs`);
  }
  return JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'));
}

export async function ingestWillitrun(ex, fixture = loadFixture(), opts = {}) {
  const mapped = mapFixture(fixture, opts);
  const p = ex.producer(SOURCE_ID);
  const snap = `${SOURCE_ID}:${Date.now()}`;
  p.push('snapshot.marker', { phase: 'begin', snapshotId: snap, mode: 'replace-source' });
  for (const n of mapped.nodes) p.push('node.upsert', n);
  for (const l of mapped.links) p.push('link.upsert', l);
  p.push('snapshot.marker', { phase: 'end', snapshotId: snap });
  await p.flush();
  return mapped;
}

export async function startWillitrunDemo({ port = Number(process.env.PORT || 8080), dataDir, log = console.log } = {}) {
  publishStyle();
  const fixture = loadFixture();
  const config = { ...loadConfig(join(DEMO_DIR, 'explore.config.json')), savedViews: { seedFile: join(DEMO_DIR, 'views.json') } };
  const dir = dataDir || process.env.WILLITRUN_DATA || join(APP_ROOT, 'data/willitrun');
  mkdirSync(dir, { recursive: true });
  const app = await startCombined({
    port,
    dataDir: dir,
    graphFile: ':memory:',
    demo: false,
    runAtBoot: false,
    log,
    config,
  });
  const mapped = await ingestWillitrun(app.ex, fixture);
  const styleUrl = `/explore?style=/explore/willitrun-style.json`;
  const base = `http://127.0.0.1:${app.port}`;
  log?.(`Will It Run? graph: ${mapped.stats.nodes} nodes / ${mapped.stats.links} links (verdicts ${JSON.stringify(mapped.stats.verdicts)})`);
  log?.(`Explore UI: ${base}${styleUrl}`);
  log?.(`Saved views: ${base}/explore?view=wir-rtx-5060   Presenter: ${base}/explore?present=1&deck=willitrun-tour`);
  log?.(`StreamGraph UI: ${base}/`);
  log?.(`MCP: ${base}/mcp`);
  log?.('Data from Will It Run? (https://willitrunllm.com)');
  return { ...app, fixture, mapped, urls: { explore: `${base}${styleUrl}`, view: id => `${base}/explore?view=${id}`, present: `${base}/explore?present=1&deck=willitrun-tour`, streamgraph: `${base}/`, mcp: `${base}/mcp` } };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('run.js')) {
  await startWillitrunDemo();
}
