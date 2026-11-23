// Load the fixture sample, resolve it, and return the demo document.
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOURCES } from './sources.mjs';
import { loadParsed, materialize } from './model.mjs';

export const FIXTURE_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

export function readFixtureFiles(dir = FIXTURE_DIR) {
  const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
  const submissionsDir = join(dir, 'edgar', 'submissions');
  const submissions = readdirSync(submissionsDir).filter(n => n.endsWith('.json')).sort()
    .map(n => JSON.parse(readFileSync(join(submissionsDir, n), 'utf8')));
  return {
    manifest,
    ofacXml: readFileSync(join(dir, 'ofac', 'sdn.xml'), 'utf8'),
    bisCsv: readFileSync(join(dir, 'bis', 'entity-list.csv'), 'utf8'),
    fccHtml: readFileSync(join(dir, 'fcc', 'coveredlist.html'), 'utf8'),
    gleif: JSON.parse(readFileSync(join(dir, 'gleif', 'bundle.json'), 'utf8')),
    tickers: JSON.parse(readFileSync(join(dir, 'edgar', 'company_tickers.json'), 'utf8')),
    submissions,
  };
}

function chainFor(nodes, edges, { title, test }) {
  const orgs = nodes.filter(n => n.label === 'Organization');
  const seed = orgs.find(n => test.test(`${n.props.name} ${(n.props.aliases || []).join(' ')}`));
  if (!seed) return null;
  const entity = seed.props.resolvedEntity;
  const members = orgs.filter(n => n.props.resolvedEntity === entity);
  const ids = new Set(members.map(n => n.id));
  const parents = edges.filter(e => e.type === 'parent_of' && ids.has(e.to)).map(e => orgs.find(n => n.id === e.from)).filter(Boolean);
  const children = edges.filter(e => e.type === 'parent_of' && ids.has(e.from)).map(e => orgs.find(n => n.id === e.to)).filter(Boolean);
  const steps = [];
  const push = (n, role) => {
    if (!n || steps.some(s => s.id === n.id)) return;
    steps.push({
      id: n.id,
      role,
      name: n.props.name,
      source: n.props.source,
      list: n.props.list,
      program: n.props.program,
      listed: n.props.listed,
    });
  };
  for (const n of members) push(n, 'same entity');
  for (const n of parents) push(n, 'parent');
  for (const n of children) push(n, 'subsidiary');
  const links = edges.filter(e => e.type === 'same_as' && ids.has(e.from) && ids.has(e.to)).map(e => ({
    from: e.from, to: e.to, score: e.props.score, explanation: e.props.explanation,
  }));
  return { title, steps, links };
}

const CHAIN_SEEDS = [
  { title: 'Huawei Technologies', test: /huawei technologies/i },
  { title: 'Hikvision', test: /hikvision/i },
  { title: 'Hytera', test: /hytera communications/i },
  { title: 'Dahua', test: /^dahua technology/i },
  { title: 'ZTE', test: /^zte corp/i },
  { title: 'China Mobile', test: /china mobile (limited|ltd)/i },
];

export async function buildDemoData(dir = FIXTURE_DIR) {
  const files = readFixtureFiles(dir);
  const parsed = loadParsed(files, files.manifest.retrieved);
  const { graph, resolved } = await materialize(parsed);
  const nodes = graph.nodes();
  const edges = graph.edges();
  const chains = CHAIN_SEEDS.map(seed => chainFor(nodes, edges, seed)).filter(Boolean);
  const bySource = {
    fcc: parsed.fcc.length,
    bis: parsed.bis.length,
    ofac: parsed.ofac.length,
    gleif: parsed.gleif.records.length,
    edgarTickers: parsed.tickers.length,
    edgarSubmissions: parsed.submissions.length,
  };
  return {
    generatedAt: new Date().toISOString(),
    retrieved: files.manifest.retrieved,
    disclaimer: 'Public registry and sanctions excerpts for demonstration. A match is a name-resolution score, not a legal determination.',
    sources: Object.values(SOURCES).map(s => ({
      id: s.id, title: s.title, url: s.url, license: s.license, notes: s.notes,
      retrieved: files.manifest.retrieved,
    })),
    counts: {
      bySource,
      sourceRecords: Object.values(bySource).reduce((a, b) => a + b, 0),
      nodes: nodes.length,
      edges: edges.length,
      sameAs: resolved.sameAs.length,
      clusters: resolved.clusters.filter(c => c.members.length > 1).length,
    },
    stats: resolved.stats,
    chains,
    nodes,
    edges,
  };
}
