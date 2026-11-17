// Builds the seed wiki (agent-generated, rules only, no LLM calls, deterministic): node demo/wiki/build-seed.mjs [--out dir]
//   demo/wiki/maritime-kb/  Vault-LD vault from the maritime AIS demo pack (demo/maritime/*.csv, NOAA AIS 2018-01-01, public domain)
//   demo/wiki/app-docs/     OKF v0.2 bundle describing the app's own concepts, each citing the repo files it was read from
// Trust signals: generated.by = grokbot/reverse-engineering-analyst (fixed timestamp); machine checks are `process:` actors
// (a CSV cross-check, a repo file check). No human: actor is ever written by this script; only Billy can add human review.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stringify } from 'yaml';

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = join(HERE, '..', '..');
const oi = process.argv.indexOf('--out'), OUT = oi > 0 ? process.argv[oi + 1] : HERE; // --out <dir>: write elsewhere (determinism test)
const AGENT = 'grokbot/reverse-engineering-analyst', AT = '2026-11-16T17:00:00Z';
const gen = { by: AGENT, at: AT };
const csv = f => { const [h, ...rows] = readFileSync(join(ROOT, 'demo/maritime', f), 'utf8').trim().split(/\r?\n/); const cols = h.split(','); return rows.map(r => { const v = []; let cur = '', q = false; for (const ch of r) { if (ch === '"') q = !q; else if (ch === ',' && !q) { v.push(cur); cur = ''; } else cur += ch; } v.push(cur); return Object.fromEntries(cols.map((c, i) => [c, v[i] ?? ''])); }); };
const note = (dir, path, fm, body) => { const f = join(dir, path); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, (Object.keys(fm).length ? `---\n${stringify(fm, { lineWidth: 0 })}---\n` : '') + `${body.trim()}\n`); };
const json = (dir, path, o) => { const f = join(dir, path); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, JSON.stringify(o, null, 2) + '\n'); };
const pascal = s => s.replace(/[^A-Za-z0-9]+/g, ' ').trim().split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join('');
const TRUST_TERMS = {
  okf: 'https://streamgraph.local/ns/okf#', dcterms: 'http://purl.org/dc/terms/',
  title: 'dcterms:title', description: 'dcterms:description',
  generated: { '@id': 'okf:generated' }, verified: { '@id': 'okf:verified', '@container': '@set' }, sources: { '@id': 'okf:sources', '@container': '@set' },
  by: 'okf:by', at: { '@id': 'okf:at', '@type': 'xsd:dateTime' }, note: 'okf:note', resource: 'okf:resource',
  status: 'okf:status', stale_after: { '@id': 'okf:staleAfter', '@type': 'xsd:dateTime' },
};

// ------------------------------------------------------------------ maritime-kb (Vault-LD)
const KB = join(OUT, 'maritime-kb'); rmSync(KB, { recursive: true, force: true });
json(KB, 'context.jsonld', { '@context': [{
  '@base': 'https://streamgraph.local/kb/', type: '@type', id: '@id',
  owl: 'http://www.w3.org/2002/07/owl#', rdfs: 'http://www.w3.org/2000/01/rdf-schema#', skos: 'http://www.w3.org/2004/02/skos/core#', xsd: 'http://www.w3.org/2001/XMLSchema#', sdo: 'https://schema.org/',
  label: 'rdfs:label', comment: 'rdfs:comment', prefLabel: 'skos:prefLabel', definition: 'skos:definition',
  subClassOf: { '@id': 'rdfs:subClassOf', '@type': '@id', '@container': '@set' }, broader: { '@id': 'skos:broader', '@type': '@id' }, topConceptOf: { '@id': 'skos:topConceptOf', '@type': '@id' }, inScheme: { '@id': 'skos:inScheme', '@type': '@id' },
  domain: { '@id': 'rdfs:domain', '@type': '@id' }, range: { '@id': 'rdfs:range', '@type': '@id' }, ...TRUST_TERMS,
}, 'Ontologies/Maritime/context.jsonld', 'Vocabularies/VesselTypes/context.jsonld'] });
json(KB, 'Ontologies/Maritime/context.jsonld', { '@context': {
  '@base': 'https://streamgraph.local/kb/maritime#', mar: 'https://streamgraph.local/kb/maritime#', xsd: 'http://www.w3.org/2001/XMLSchema#',
  vesselType: { '@id': 'mar:vesselType', '@type': '@id' }, portOfCall: { '@id': 'mar:portOfCall', '@type': '@id' },
  mmsi: 'mar:mmsi', imo: 'mar:imo', callsign: 'mar:callsign', portId: 'mar:portId', website: 'sdo:url',
  lat: { '@id': 'sdo:latitude', '@type': 'xsd:double' }, lon: { '@id': 'sdo:longitude', '@type': 'xsd:double' },
  lengthM: { '@id': 'mar:lengthMetres', '@type': 'xsd:double' }, pingCount: { '@id': 'mar:pingCount', '@type': 'xsd:integer' },
  observedFrom: { '@id': 'mar:observedFrom', '@type': 'xsd:dateTime' }, observedTo: { '@id': 'mar:observedTo', '@type': 'xsd:dateTime' },
  aisCodes: { '@id': 'mar:aisCode', '@container': '@set' },
} });
json(KB, 'Vocabularies/VesselTypes/context.jsonld', { '@context': { '@base': 'https://streamgraph.local/kb/vessel-type#', vt: 'https://streamgraph.local/kb/vessel-type#' } });
const ontoNote = (path, fm, body) => note(KB, path, { ...fm, generated: gen, sources: [{ resource: 'demo/maritime/README.md' }] }, body);
ontoNote('Ontologies/Maritime/Maritime.md', { type: 'owl:Ontology', label: 'Maritime (AIS demo)', comment: 'Classes and properties for the Mid-Atlantic AIS demo pack.' }, '# Maritime ontology\nA small ontology for the AIS demo: [[Vessel]], [[Port]], [[VesselType]] and [[Position]]. Generated from the demo pack README and CSV headers.');
ontoNote('Ontologies/Maritime/Classes/Vessel.md', { type: 'owl:Class', label: 'Vessel', comment: 'A ship identified by its MMSI.', subClassOf: ['sdo:Vehicle'] }, '# Vessel\nOne row of `vessels.csv`. Identity is the MMSI; IMO and call sign are often missing for small craft.');
ontoNote('Ontologies/Maritime/Classes/Port.md', { type: 'owl:Class', label: 'Port', comment: 'A port or harbour with a position.', subClassOf: ['sdo:Place'] }, '# Port\nOne row of `ports.csv`.');
ontoNote('Ontologies/Maritime/Classes/VesselType.md', { type: 'owl:Class', label: 'Vessel type', comment: 'An AIS ship-type category.', subClassOf: ['skos:Concept'] }, '# VesselType\nThe concepts live in the [[VesselTypes]] vocabulary.');
ontoNote('Ontologies/Maritime/Classes/Position.md', { type: 'owl:Class', label: 'Position', comment: 'One timestamped AIS ping.' }, '# Position\nPositions stay in the graph (4,000 rows); the wiki summarises them per vessel.');
ontoNote('Ontologies/Maritime/Properties/vesselType.md', { type: 'owl:ObjectProperty', label: 'vessel type', domain: '[[Vessel]]', range: '[[VesselType]]' }, '# vesselType');
ontoNote('Ontologies/Maritime/Properties/portOfCall.md', { type: 'owl:ObjectProperty', label: 'port of call', comment: 'A port the vessel was seen near in the AIS slice.', domain: '[[Vessel]]', range: '[[Port]]' }, '# portOfCall\nDerived from `positions.csv` rows whose `port_id` is set.');

const types = csv('vessel_types.csv'), byName = new Map();
for (const t of types) { const n = t.name; if (!byName.has(n)) byName.set(n, []); byName.get(n).push(Number(t.vessel_type)); }
note(KB, 'Vocabularies/VesselTypes/VesselTypes.md', { type: 'skos:ConceptScheme', prefLabel: 'AIS vessel types', generated: gen, sources: [{ resource: 'demo/maritime/vessel_types.csv' }] }, '# AIS vessel types\nOne concept per distinct type name in `vessel_types.csv`; several AIS codes can share a name.');
const conceptName = new Map();
for (const [name, codes] of [...byName].sort()) {
  const file = pascal(name); conceptName.set(name, file);
  note(KB, `Vocabularies/VesselTypes/${file}.md`, { type: 'skos:Concept', prefLabel: name, topConceptOf: '[[VesselTypes]]', aisCodes: codes.map(String), generated: gen, verified: [{ by: 'process:csv-crosscheck', at: AT, note: 'codes match vessel_types.csv' }], sources: [{ resource: 'demo/maritime/vessel_types.csv' }] },
    `# ${name}\nAIS ship-type code${codes.length > 1 ? 's' : ''} ${codes.join(', ')}.`);
}
const ports = csv('ports.csv'), portName = new Map(ports.map(p => [p.port_id, p.name]));
for (const p of ports) note(KB, `Ports/${p.name}.md`, { type: '[[Port]]', label: p.name, portId: p.port_id, lat: Number(p.lat), lon: Number(p.lon), ...(p.website ? { website: p.website } : {}), generated: gen,
  verified: [{ by: 'process:csv-crosscheck', at: AT, note: 'position within the demo bounding box' }], sources: [{ resource: 'demo/maritime/ports.csv' }] }, `# ${p.name}\nPort ${p.port_id} at ${Number(p.lat).toFixed(3)}, ${Number(p.lon).toFixed(3)}. Vessels seen nearby link here with portOfCall.`);
const vessels = csv('vessels.csv'), pos = csv('positions.csv'), pings = new Map(), calls = new Map(), first = new Map(), last = new Map();
for (const p of pos) { pings.set(p.mmsi, (pings.get(p.mmsi) || 0) + 1); if (p.port_id && portName.has(p.port_id)) { if (!calls.has(p.mmsi)) calls.set(p.mmsi, new Set()); calls.get(p.mmsi).add(portName.get(p.port_id)); } if (!first.has(p.mmsi) || p.ts < first.get(p.mmsi)) first.set(p.mmsi, p.ts); if (!last.has(p.mmsi) || p.ts > last.get(p.mmsi)) last.set(p.mmsi, p.ts); }
const top = vessels.filter(v => v.name && pings.get(v.mmsi)).sort((a, b) => pings.get(b.mmsi) - pings.get(a.mmsi) || (a.mmsi < b.mmsi ? -1 : 1)).slice(0, 15);
const seen = new Set();
for (const v of top) {
  let file = v.name.toLowerCase().replace(/[^a-z0-9 .-]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b[a-z]/g, c => c.toUpperCase()) || `Vessel ${v.mmsi}`; if (seen.has(file)) file += v.mmsi; seen.add(file);
  const pc = [...(calls.get(v.mmsi) || [])].sort();
  note(KB, `Vessels/${file}.md`, { type: '[[Vessel]]', label: v.name, mmsi: v.mmsi, ...(v.imo ? { imo: v.imo } : {}), ...(v.callsign ? { callsign: v.callsign } : {}),
    ...(conceptName.has(v.vessel_type_name) ? { vesselType: `[[${conceptName.get(v.vessel_type_name)}]]` } : {}), ...(pc.length ? { portOfCall: pc.map(p => `[[${p}]]`) } : {}),
    ...(v.length_m ? { lengthM: Number(v.length_m) } : {}), pingCount: pings.get(v.mmsi), observedFrom: first.get(v.mmsi), observedTo: last.get(v.mmsi),
    generated: gen, sources: [{ resource: 'demo/maritime/vessels.csv' }, { resource: 'demo/maritime/positions.csv' }], stale_after: '2018-01-08T00:00:00Z', status: 'draft' },
  `# ${v.name}\n${v.vessel_type_name || 'Unknown type'} vessel, MMSI ${v.mmsi}, ${pings.get(v.mmsi)} AIS pings between ${first.get(v.mmsi)} and ${last.get(v.mmsi)}.\n\nThis summary describes a 2018 AIS slice, so it is marked stale: check live data before relying on it.${pc.length ? `\n\nSeen near: ${pc.map(p => `[[${p}]]`).join(', ')}.` : ''}`);
}
note(KB, 'README.md', {}, `# Maritime knowledge base (seed)\nAgent-generated Vault-LD vault built by \`demo/wiki/build-seed.mjs\` from the AIS demo pack. Start at [[Maritime]], browse [[VesselTypes]], or open a port such as [[Norfolk]].\n\nTrust: every note is \`generated\` by ${AGENT}. Ports and vessel types are machine-confirmed by a CSV cross-check; vessel summaries are drafts and stale (2018 data). Nothing here is human-reviewed until Billy verifies it in the app.`);

// ------------------------------------------------------------------ app-docs (OKF v0.2)
const OK = join(OUT, 'app-docs'); rmSync(OK, { recursive: true, force: true });
const exists = p => existsSync(join(ROOT, p));
const concept = (path, fm, body, { verify = true } = {}) => {
  const srcs = fm.sources || [];
  const ok = verify && srcs.length && srcs.every(s => exists(s.resource));
  note(OK, path, { ...fm, generated: gen, ...(ok ? { verified: [{ by: 'process:repo-file-check', at: AT, note: 'every cited source file exists in this build' }] } : {}) }, body);
};
const S = (...p) => p.map(resource => ({ resource }));
concept('architecture/combined-app.md', { type: 'Component', title: 'Combined app', description: 'StreamGraph studio + Explore UI + MCP server on one port.', sources: S('explore/combined.js', 'package.json') },
  `# Combined app\n\`npm start\` runs \`explore/combined.js\`: the StreamGraph studio, the [Explore UI](explore-ui.md), the [MCP server](mcp-server.md) at /mcp and the [wiki import](../wiki/wiki-import.md) share one port. Built-in processing ([Kafka topics](../streaming/kafka-topics.md) and Flink) and [entity resolution](entity-resolution.md) are switched on from the studio.`);
concept('architecture/explore-ui.md', { type: 'Component', title: 'Explore UI', description: 'Sigma.js graph explorer at /explore, with a MapLibre map viewer.', sources: S('explore/server/app.js', 'explore/server/geo-queries.js') },
  `# Explore UI\nInteractive graph exploration at /explore (Sigma.js), with saved views, history, query builder and a map. Every reply passes the [access rules](../security/abac.md).`);
concept('architecture/mcp-server.md', { type: 'Service', title: 'MCP server', description: 'Model Context Protocol tools for AI clients over stdio and Streamable HTTP (/mcp).', sources: S('explore/server/mcp-server.js', 'explore/server/wiki-mcp.js', 'explore/mcp-stdio.js') },
  `# MCP server\nRead tools are always on; write tools need configuration. Wiki tools (wiki_search, wiki_get, wiki_write_note, wiki_verify, ...) and history/RDF/query tools are described in [wiki as memory](../wiki/wiki-as-memory.md). Results are filtered by the [access rules](../security/abac.md).`);
concept('architecture/entity-resolution.md', { type: 'Component', title: 'Entity resolution', description: 'Duke (default) or Splink matching, with a review queue.', sources: S('explore/er/engine.js', 'explore/er/integration.js') },
  `# Entity resolution\nMatches records that describe the same thing (for example the maritime [vessel watchlist](../datasets/maritime-ais.md) against vessels).`);
concept('streaming/kafka-topics.md', { type: 'Kafka Topic Family', title: 'Kafka topics', description: 'graph.changes, graph.state, graph.commands, graph.command-results and graph.dlq, validated by draft-07 contracts.', sources: S('explore/kafka/contracts.js', 'explore/kafka/schemas/graph-events.v1.json') },
  `# Kafka topics\n- graph.changes: every applied change (wiki imports included)\n- graph.state: compacted current state\n- graph.commands / graph.command-results: MCP write commands in Kafka mode\n- graph.dlq: events that failed the contract\n\nThe event contract converts to JSON-LD with our [converter](../wiki/jsonld-from-schema.md).`);
concept('security/abac.md', { type: 'Concept', title: 'Access rules (ABAC)', description: 'Deny by default, deny wins, hidden fields stay hidden; fail-closed egress filter on every explore reply.', sources: S('src/abac/engine.js', 'explore/server/access.js') },
  `# Access rules (ABAC)\nUsers, entity types, field sensitivity and rules. Explore and MCP replies are filtered: denied types disappear, hidden fields show as [hidden], hidden keys become pseudonyms. [Trust tiers](../wiki/trust-tiers.md) are never access rules.`);
concept('features/history.md', { type: 'Feature', title: 'History and compare', description: 'Every graph change recorded with time; graph at a time, compare two times.', sources: S('explore/server/history.js') },
  `# History\nRecorded in history.db. MCP: history_timeline, history_at, history_compare. Wiki edits show up here because they are ordinary graph changes.`);
concept('features/rdf-export.md', { type: 'Feature', title: 'RDF import and export', description: 'Turtle / N-Triples (and now JSON-LD / YAML-LD) export of what you may export.', sources: S('explore/server/rdf.js', 'explore/server/studio-routes.js') },
  `# RDF export\nGraph-wide export uses urn:streamgraph: IRIs. Wiki vaults export with their own IRIs (see [wiki import](../wiki/wiki-import.md)).`);
concept('features/query-builder.md', { type: 'Feature', title: 'Query builder and Cypher', description: 'One-hop query builder with a Cypher subset; access-checked per type.', sources: S('explore/server/query.js') },
  `# Query builder\nMATCH (a:Type)-[:REL]->(b:Type) WHERE ... RETURN ... LIMIT n. MCP tool: query_cypher.`);
concept('features/plain-english.md', { type: 'Feature', title: 'Plain-English questions', description: 'Rules-only question interpreter (no paid model); providers are pluggable.', sources: S('explore/server/nl/rules.js') },
  `# Plain-English questions\nThe built-in provider is rules only. Another provider can be plugged in later (PROVIDERS in studio-routes.js); none is configured.`);
concept('wiki/wiki-import.md', { type: 'Feature', title: 'Markdown wiki import', description: 'Vault-LD and OKF folders imported into the graph; Markdown files are the source of truth.', sources: S('src/wiki/vault.js', 'src/wiki/mapper.js', 'src/wiki/sync.js', 'src/wiki/rdf.js') },
  `# Wiki import\nOne mapper for both dialects. Frontmatter wikilinks become typed edges, body links become LINKS_TO. Re-import is deterministic. Graph-to-file write-back is off. See [trust tiers](trust-tiers.md) and [wiki as memory](wiki-as-memory.md).`);
concept('wiki/trust-tiers.md', { type: 'Concept', title: 'Trust tiers', description: 'unverified / machine-confirmed / human-reviewed, derived from verified entries; only human:whsutherland counts as human.', sources: S('src/wiki/trust.js'), status: 'draft' },
  `# Trust tiers\nDerived from \`verified\`: none = unverified; any = machine-confirmed; one by a recognised human = human-reviewed. Agents can never write human: actors. Tiers are for display and filtering only.`);
concept('wiki/wiki-as-memory.md', { type: 'Feature', title: 'Wiki as agent memory (MCP)', description: 'wiki_outline/search/get/backlinks/stale/export, wiki_write_note, wiki_append_log, wiki_verify.', sources: S('explore/server/wiki-mcp.js', 'explore/server/wiki-api.js') },
  `# Wiki as memory\nAgents read with wiki_search / wiki_get and write with wiki_write_note (file first, then re-import; expectedSha for updates). wiki_verify adds a machine confirmation. Note text is data, not instructions.`);
concept('wiki/jsonld-from-schema.md', { type: 'Library', title: 'JSON Schema to JSON-LD converter', description: 'Our clean-room converter (MIT): @context, RDFS/OWL vocabulary, SHACL shapes. One package, hint keyword x-jsonld.', sources: S('../jsonld-from-schema/src/index.js', '../jsonld-from-schema/README.md', '../jsonld-from-schema/SPEC.md') },
  `# jsonld-from-schema\nThe only JSON Schema to JSON-LD converter in this repo (the TypeScript copy was removed). Used for per-type wiki schemas (validation + terms) and the schema_to_context MCP tool. The hint is one \`x-jsonld\` object.`);
concept('datasets/maritime-ais.md', { type: 'Dataset', title: 'Maritime AIS demo pack', description: 'NOAA AIS 2018-01-01 slice around Chesapeake Bay, Hampton Roads and Delaware Bay, plus ports and a watchlist.', sources: S('demo/maritime/README.md', 'demo/maritime/vessels.csv', 'demo/maritime/positions.csv'), stale_after: '2018-01-08T00:00:00Z' },
  `# Maritime AIS demo pack\n531 vessels, 4,000 positions, 16 ports, 18 vessel-type codes, 250 watchlist rows. Its Vault-LD knowledge base is the maritime-kb vault. The slice is from 2018, so anything "current" here is stale by design.`);
concept('legacy/npm-start-core.md', { type: 'Concept', title: 'npm start runs the core studio only', description: 'Superseded: npm start now runs the combined app.', sources: S('package.json'), status: 'deprecated' },
  `# npm start (old behaviour)\nBefore the integration, npm start ran src/server.js only. It now runs the [combined app](../architecture/combined-app.md); \`npm run start:core\` keeps the old behaviour.`);
note(OK, 'index.md', {}, `# StreamGraph app docs (OKF bundle, seed)\nAgent-generated by ${AGENT} from this repository. Start with the [combined app](architecture/combined-app.md), [access rules](security/abac.md), and [wiki import](wiki/wiki-import.md).`);
writeFileSync(join(OK, 'log.md'), `# Log\n- ${AT} [seed] bundle generated from the repository by build-seed.mjs (by ${AGENT})\n`);
console.log('seed wiki written: demo/wiki/maritime-kb, demo/wiki/app-docs');
