// Wiki MVP acceptance tests, W1 (read-only import, both dialects), W2 (YAML-LD/JSON-LD <-> RDF round trip), W3 (schema
// validation), W2b (the jsonld-from-schema converter) and the file-first write rules. WIKI_IMPL=broken must fail these
// (test/wrong-wiki.test.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync, renameSync, mkdirSync, readdirSync, unlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GraphStore } from '../src/graph.js';
import { loadVault, walk } from '../src/wiki/vault.js';
import { mapVault } from '../src/wiki/mapper.js';
import { applySlice, dumpSlice } from '../src/wiki/sync.js';
import { exportVault, ingestRdf, parseRdf, canonical, noteDocs } from '../src/wiki/rdf.js';
import { splitNote } from '../src/wiki/parse.js';
import { WikiService } from '../src/wiki/service.js';
import { isStale } from '../src/wiki/trust.js';
import { writeNote, verifyNote, appendLog } from '../src/wiki/write.js';

const FX = fileURLToPath(new URL('./fixtures/wiki/', import.meta.url));
const tmp = () => mkdtempSync(join(tmpdir(), 'sg-wiki-'));
const copy = name => { const d = join(tmp(), name); cpSync(join(FX, name), d, { recursive: true }); return d; };
const importInto = (g, dir, slug) => applySlice(g, mapVault(loadVault(dir, { slug })));
const bodies = dir => Object.fromEntries(walk(dir).filter(f => f.endsWith('.md')).map(f => [f, splitNote(readFileSync(join(dir, f), 'utf8')).body]));

// ------------------------------------------------------------------ W1
test('W1 Vault-LD Appendix A: notes, IRIs, nodes, edges and types', () => {
  const m = loadVault(join(FX, 'culinary'), { slug: 'culinary' });
  assert.equal(m.dialect, 'vault-ld');
  assert.deepEqual(m.notes.map(n => [n.path, n.iri]), [
    ['Ontologies/Culinary/Classes/Recipe.md', 'https://example.org/culinary#Recipe'],
    ['Ontologies/Culinary/Properties/requiresIngredient.md', 'https://example.org/culinary#requiresIngredient'],
    ['Recipes/hummus.md', 'https://example.org/hummus'],
    ['Vocabularies/DifficultyLevels/Beginner.md', 'https://example.org/difficulty#Beginner'],
    ['Vocabularies/DifficultyLevels/NoCook.md', 'https://example.org/difficulty#NoCook']]);
  const g = mapVault(m);
  assert.equal(g.nodes.length, 9); // 5 notes + 4 unresolved link targets
  assert.equal(g.edges.length, 8);
  const labels = {}; for (const n of g.nodes) labels[n.label] = (labels[n.label] || 0) + 1;
  assert.deepEqual(labels, { Class: 1, Concept: 2, ObjectProperty: 1, Recipe: 1, WikiStub: 4 });
  const types = [...new Set(g.edges.map(e => e.type))].sort();
  assert.deepEqual(types, ['BROADER', 'DIFFICULTY', 'DOMAIN', 'IS_A', 'RANGE', 'REQUIRES_INGREDIENT', 'SUB_CLASS_OF', 'TOP_CONCEPT_OF']);
  assert.ok(g.edges.some(e => e.id === 'Recipe:culinary:hummus-[IS_A]->Class:culinary:Recipe'));
  const hummus = g.nodes.find(n => n.id === 'Recipe:culinary:hummus');
  assert.equal(hummus.props.prepTimeMinutes, 25);
  assert.equal(hummus.props.wiki_iri, 'https://example.org/hummus');
  assert.match(hummus.props.body, /smooth purée/);
});

test('W1 OKF bundle: index.md/log.md skipped, body links become LINKS_TO (broken links kept as stubs)', () => {
  const m = loadVault(join(FX, 'okf-retail'), { slug: 'retail' });
  assert.equal(m.dialect, 'okf');
  assert.deepEqual(m.notes.map(n => n.path), ['dashboards/weekly.md', 'metrics/net-revenue.md', 'tables/customers.md', 'tables/orders.md']);
  assert.deepEqual(m.reserved.map(n => n.path).sort(), ['index.md', 'log.md']);
  const g = mapVault(m), links = g.edges.filter(e => e.type === 'LINKS_TO').map(e => e.id).sort();
  assert.deepEqual(links, [
    'BigQueryTable:retail:tables/customers-[LINKS_TO]->BigQueryTable:retail:tables/orders',
    'BigQueryTable:retail:tables/customers-[LINKS_TO]->Metric:retail:metrics/net-revenue',
    'BigQueryTable:retail:tables/orders-[LINKS_TO]->BigQueryTable:retail:tables/customers',
    'BigQueryTable:retail:tables/orders-[LINKS_TO]->WikiStub:retail:returns.md',
    'Metric:retail:metrics/net-revenue-[LINKS_TO]->BigQueryTable:retail:tables/orders',
    'Note:retail:dashboards/weekly-[LINKS_TO]->Metric:retail:metrics/net-revenue']);
  assert.ok(g.edges.some(e => e.type === 'DERIVED_FROM' && e.to === 'Source:retail:bq://retail.sales.customers'));
  assert.ok(g.edges.some(e => e.type === 'GENERATED_BY' && e.to === 'Actor:retail:grokbot/reverse-engineering-analyst'));
});

test('W1 trust tiers: only human:whsutherland makes a note human-reviewed; other verifiers are machine-confirmed', () => {
  const m = loadVault(join(FX, 'okf-retail'), { slug: 'retail' });
  const tier = p => m.byPath.get(p).trust.tier;
  assert.equal(tier('tables/customers.md'), 'human-reviewed');
  assert.equal(tier('tables/orders.md'), 'machine-confirmed');
  assert.equal(tier('metrics/net-revenue.md'), 'machine-confirmed'); // verified by human:someone-else -> not recognised
  assert.equal(tier('dashboards/weekly.md'), 'unverified');
  assert.ok(m.byPath.get('metrics/net-revenue.md').problems.some(p => /not a recognised human/.test(p)));
});

test('W1 staleness is computed at read time from stale_after', () => {
  const m = loadVault(join(FX, 'okf-retail'), { slug: 'retail' });
  const o = m.byPath.get('tables/orders.md');
  assert.equal(isStale(o.trust.staleAfter, Date.parse('2026-05-31T00:00:00Z')), false);
  assert.equal(isStale(o.trust.staleAfter, Date.parse('2026-06-02T00:00:00Z')), true);
  assert.equal(isStale(m.byPath.get('tables/customers.md').trust.staleAfter), false);
});

test('W1 determinism: same folder twice, a fresh store, and a shuffled copy give a byte-identical sorted dump', () => {
  const a = new GraphStore(), b = new GraphStore();
  importInto(a, join(FX, 'okf-retail'), 'retail'); const first = dumpSlice(a, 'retail');
  const again = importInto(a, join(FX, 'okf-retail'), 'retail');
  assert.equal(again.nodesAdded + again.nodesUpdated + again.nodesRemoved + again.edgesAdded + again.edgesRemoved, 0, 'a re-import of an unchanged folder changes nothing');
  assert.equal(dumpSlice(a, 'retail'), first);
  // shuffled: copy files one by one in reverse order (different directory creation order)
  const d = join(tmp(), 'okf-retail'); for (const f of walk(join(FX, 'okf-retail')).reverse()) { mkdirSync(join(d, f, '..'), { recursive: true }); cpSync(join(FX, 'okf-retail', f), join(d, f)); }
  importInto(b, d, 'retail');
  assert.equal(dumpSlice(b, 'retail'), first);
});

test('W1 identity: moving a Vault-LD file keeps its IRI, renaming re-mints it, a duplicate name warns', () => {
  const d = copy('culinary');
  const before = loadVault(d).byPath.get('Recipes/hummus.md').iri;
  mkdirSync(join(d, 'Recipes/Dips'), { recursive: true }); renameSync(join(d, 'Recipes/hummus.md'), join(d, 'Recipes/Dips/hummus.md'));
  assert.equal(loadVault(d).byPath.get('Recipes/Dips/hummus.md').iri, before);
  renameSync(join(d, 'Recipes/Dips/hummus.md'), join(d, 'Recipes/Dips/houmous.md'));
  assert.equal(loadVault(d).byPath.get('Recipes/Dips/houmous.md').iri, 'https://example.org/houmous');
  writeFileSync(join(d, 'Recipes/houmous.md'), '---\ntype: "[[Recipe]]"\n---\n');
  const dup = loadVault(d).byPath.get('Recipes/houmous.md');
  assert.ok(dup.problems.some(p => /duplicate file name/.test(p)), 'duplicate name without id must warn');
});

test('W1 re-import applies only changes: removed fields, removed notes and their edges disappear', () => {
  const d = copy('okf-retail'), g = new GraphStore();
  importInto(g, d, 'retail');
  assert.ok(g.hasNode('Note:retail:dashboards/weekly'));
  unlinkSync(join(d, 'dashboards/weekly.md'));
  const f = join(d, 'tables/customers.md'); writeFileSync(f, readFileSync(f, 'utf8').replace('description: One row per customer account.\n', ''));
  const r = importInto(g, d, 'retail');
  assert.equal(g.hasNode('Note:retail:dashboards/weekly'), false, 'deleted note must leave the graph');
  assert.equal(g.edges().some(e => e.src === 'Note:retail:dashboards/weekly'), false);
  assert.equal('description' in g.getNode('BigQueryTable:retail:tables/customers').props, false, 'removed field must leave the node');
  assert.ok(r.nodesRemoved >= 1 && r.nodesUpdated >= 1);
});

test('W1 a node id owned by another source is never overwritten by a vault', () => {
  const g = new GraphStore(); g.upsertNode('BigQueryTable:retail:tables/orders', 'BigQueryTable', 'retail:tables/orders', { name: 'from CSV' });
  const r = importInto(g, join(FX, 'okf-retail'), 'retail');
  assert.equal(g.getNode('BigQueryTable:retail:tables/orders').props.name, 'from CSV');
  assert.equal(r.conflicts, 1);
});

test('W1 host keys are not RDF; untyped Vault-LD notes stay out of the RDF but are graph Notes', async () => {
  const d = copy('culinary'); writeFileSync(join(d, 'Scratch.md'), '# just prose, links to [[Recipe]]\n');
  const m = loadVault(d), r = await exportVault(m, { format: 'nquads' });
  assert.doesNotMatch(r.text, /owl-class|skos-concept/);
  assert.doesNotMatch(r.text, /Scratch/);
  assert.equal(m.byPath.get('Scratch.md').participates, false);
  assert.ok(mapVault(m).nodes.some(n => n.id === `Note:${m.slug}:Scratch`));
});

// ------------------------------------------------------------------ W2
test('W2 Vault-LD -> Turtle follows the spec (scoped bases, coercion, vld:path for non-default placement)', async () => {
  const r = await exportVault(loadVault(join(FX, 'culinary')), { format: 'turtle' });
  assert.match(r.text, /cul:Recipe a owl:Class/);
  assert.match(r.text, /rdfs:subClassOf cul:CreativeWork, sdo:Recipe/);
  assert.match(r.text, /cul:prepTimeMinutes 25/);
  assert.match(r.text, /vld:path "Recipes\/hummus\.md"/);
  assert.match(r.text, /diff:NoCook a skos:Concept;\s*skos:broader diff:Beginner/);
  assert.doesNotMatch(r.text, /vld:path "Classes\/Recipe\.md"/, 'a flatly placed schema note needs no vld:path');
});

test('W2 RDF -> empty vault -> RDF is isomorphic (RDFC-1.0)', async () => {
  const a = await exportVault(loadVault(join(FX, 'culinary')), { format: 'nquads' });
  const d = copy('culinary'); for (const f of walk(d).filter(f => f.endsWith('.md'))) unlinkSync(join(d, f));
  const ing = await ingestRdf(d, a.text, { format: 'nquads' });
  assert.equal(ing.written.length, 5); assert.deepEqual(ing.problems, []);
  const b = await exportVault(loadVault(d), { format: 'nquads' });
  assert.equal(b.text, a.text);
});

test('W2 Turtle -> existing vault -> Turtle is isomorphic and every body is unchanged byte-for-byte', async () => {
  const d = copy('culinary'), before = bodies(d);
  const t = await exportVault(loadVault(d), { format: 'turtle' });
  await ingestRdf(d, t.text, { format: 'turtle' });
  assert.deepEqual(bodies(d), before);
  assert.equal((await exportVault(loadVault(d), { format: 'nquads' })).text, (await exportVault(loadVault(join(FX, 'culinary')), { format: 'nquads' })).text);
  assert.match(readFileSync(join(d, 'Ontologies/Culinary/Classes/Recipe.md'), 'utf8'), /tags:\n  - owl-class/, 'host keys survive ingest');
});

test('W2 JSON-LD and YAML-LD exports carry the same graph as N-Quads', async () => {
  const m = loadVault(join(FX, 'culinary')), nq = (await exportVault(m, { format: 'nquads' })).text;
  for (const format of ['jsonld', 'yamlld']) {
    const r = await exportVault(m, { format });
    const doc = format === 'jsonld' ? JSON.parse(r.text) : (await import('yaml')).parse(r.text);
    const back = await canonical((await parseRdf(JSON.stringify(doc), 'jsonld')).map(q => `${q.subject.termType === 'NamedNode' ? `<${q.subject.value}>` : `_:${q.subject.value}`} <${q.predicate.value}> ${q.object.termType === 'NamedNode' ? `<${q.object.value}>` : q.object.termType === 'BlankNode' ? `_:${q.object.value}` : JSON.stringify(q.object.value) + (q.object.language ? '@' + q.object.language : `^^<${q.object.datatype.value}>`)} .`).join('\n') + '\n');
    assert.equal(back, nq, format);
  }
});

test('W2 a YAML-LD note expands to the same triples as its JSON twin', async () => {
  const d = copy('culinary');
  writeFileSync(join(d, 'Recipes/twin.md'), '---\n{"type": "[[Recipe]]", "requiresIngredient": "[[Chickpeas]]", "difficulty": "[[Beginner]]", "prepTimeMinutes": 25}\n---\n');
  const nq = (await exportVault(loadVault(d), { format: 'nquads', roundTrip: false })).text.split('\n');
  const of = s => nq.filter(l => l.startsWith(`<https://example.org/${s}>`)).map(l => l.replace(/^<[^>]+>/, '')).sort();
  assert.equal(of('hummus').length, 4);
  assert.deepEqual(of('twin'), of('hummus'));
});

test('W2 remote @context URLs are refused with a clear error (local contexts only)', async () => {
  const d = copy('culinary');
  const c = JSON.parse(readFileSync(join(d, 'context.jsonld'), 'utf8')); c['@context'].push('https://evil.example/context.jsonld');
  writeFileSync(join(d, 'context.jsonld'), JSON.stringify(c));
  assert.ok(loadVault(d).problems.some(p => /remote context refused \(local only\): https:\/\/evil\.example/.test(p)));
  await assert.rejects(parseRdf(JSON.stringify({ '@context': 'https://evil.example/ctx.jsonld', '@id': 'urn:x', name: 'y' }), 'jsonld'), /remote JSON-LD context refused/);
});

test('W2 constructs without a short name are flagged, never silently dropped', async () => {
  const d = copy('culinary');
  const r = await ingestRdf(d, '<https://example.org/hummus> <https://example.org/culinary#servings> "4" .\n<https://example.org/hummus> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://example.org/culinary#Recipe> .\n', { format: 'nquads' });
  assert.ok(r.problems.some(p => /culinary#servings> has no short name/.test(p)));
  writeFileSync(join(d, 'Recipes/x.md'), '---\ntype: "[[Recipe]]"\nunknownField: 3\n---\n');
  const e = await exportVault(loadVault(d), { format: 'nquads' });
  assert.ok(e.problems.some(p => /field "unknownField" is not in the context/.test(p)));
});

test('W2 OKF bundles export as JSON-LD under the lifted vocabulary; body links are not triples', async () => {
  const r = await exportVault(loadVault(join(FX, 'okf-retail'), { slug: 'retail' }), { format: 'nquads' });
  assert.match(r.text, /<https:\/\/streamgraph\.local\/wiki\/retail\/tables\/customers> <http:\/\/www\.w3\.org\/1999\/02\/22-rdf-syntax-ns#type> <https:\/\/streamgraph\.local\/wiki\/retail\/vocab#BigQueryTable>/);
  assert.match(r.text, /okf#by> "human:whsutherland"/);
  assert.doesNotMatch(r.text, /linksTo|LINKS_TO/);
});

// ------------------------------------------------------------------ W3
test('W3 schema problems carry the JSON pointer and the note still loads', () => {
  const d = copy('okf-retail');
  writeFileSync(join(d, 'tables/bad.md'), '---\ntype: BigQuery Table\nverified:\n  - at: "2026-01-01T00:00:00Z"\nstale_after: soon\nstatus: shiny\n---\n# bad\n');
  const g = new GraphStore(); importInto(g, d, 'retail');
  const n = g.getNode('BigQueryTable:retail:tables/bad'); assert.ok(n, 'invalid note still loads');
  const p = n.props.wiki_problems.join('\n');
  assert.match(p, /schema: \/verified\/0 must have required property 'by'/);
  assert.match(p, /schema: \/stale_after must match format "date-time"/);
  assert.match(p, /schema: \/status must be equal to one of the allowed values/);
  const w = g.getNode('Note:retail:dashboards/weekly').props.wiki_problems.join('\n');
  assert.match(w, /schema: \/ must have required property 'type'/);
});

test('W3 a valid note has zero problems', () => {
  const m = loadVault(join(FX, 'okf-retail'));
  assert.deepEqual(m.byPath.get('tables/customers.md').problems, []);
  assert.deepEqual(m.byPath.get('tables/orders.md').problems, []);
});

test('W3 + W2b one per-type schema validates frontmatter AND supplies JSON-LD terms (our converter)', async () => {
  const d = copy('culinary'); mkdirSync(join(d, 'schemas'));
  writeFileSync(join(d, 'schemas/Recipe.json'), JSON.stringify({ $schema: 'http://json-schema.org/draft-07/schema#', title: 'Recipe', type: 'object', required: ['prepTimeMinutes'],
    properties: { prepTimeMinutes: { type: 'integer', minimum: 0 }, servings: { type: 'integer', 'x-jsonld': { '@id': 'https://schema.org/recipeYield' } } } }));
  writeFileSync(join(d, 'Recipes/toast.md'), '---\ntype: "[[Recipe]]"\nservings: 2\n---\n# Toast\n');
  writeFileSync(join(d, 'Recipes/salad.md'), '---\ntype: "[[Recipe]]"\nprepTimeMinutes: -5\n---\n');
  const m = loadVault(d);
  assert.deepEqual(m.byPath.get('Recipes/hummus.md').problems.filter(p => /schema/.test(p)), []);
  assert.match(m.byPath.get('Recipes/toast.md').problems.join('\n'), /schemas\/Recipe\.json schema: \/ must have required property 'prepTimeMinutes'/);
  assert.match(m.byPath.get('Recipes/salad.md').problems.join('\n'), /schemas\/Recipe\.json schema: \/prepTimeMinutes must be >= 0/);
  const nq = (await exportVault(m, { format: 'nquads' })).text;
  assert.match(nq, /<https:\/\/example\.org\/toast> <https:\/\/schema\.org\/recipeYield> "2"\^\^<http:\/\/www\.w3\.org\/2001\/XMLSchema#integer>/);
  assert.match(nq, /<https:\/\/example\.org\/hummus> <https:\/\/example\.org\/culinary#prepTimeMinutes> "25"/, 'root/ontology terms win over schema terms');
});

test('W2b the canonical converter reproduces its golden N-Quads', async () => {
  const { instanceToNQuads } = await import('jsonld-from-schema');
  const root = fileURLToPath(new URL('../../jsonld-from-schema/', import.meta.url));
  const J = f => JSON.parse(readFileSync(join(root, 'test', f), 'utf8'));
  const nq = await instanceToNQuads(J('fixtures/node-upsert.instance.json'), J('fixtures/graph-events.v1.json'), { pointer: '/events/node.upsert' });
  assert.equal(nq, readFileSync(join(root, 'test/golden/node-upsert.nq'), 'utf8'));
});

// ------------------------------------------------------------------ writes (file first)
test('writes: agents can never write human: actors; generated is server-stamped; status defaults to draft', () => {
  const d = copy('okf-retail');
  assert.throws(() => writeNote(d, 'okf', { path: 'x.md', frontmatter: { type: 'Concept', verified: [{ by: 'human:whsutherland' }] }, actor: 'grokbot/a' }), /cannot write human: actors/);
  assert.throws(() => writeNote(d, 'okf', { path: 'x.md', frontmatter: { type: 'Concept', owner: 'human:whsutherland' }, actor: 'grokbot/a' }), /cannot write human: actors/);
  assert.throws(() => writeNote(d, 'okf', { path: 'x.md', frontmatter: { type: 'Concept' }, actor: 'human:whsutherland' }), /cannot act as a human/);
  assert.throws(() => verifyNote(d, 'okf', { path: 'tables/orders.md', actor: 'human:whsutherland' }), /can never mark a note human-reviewed/);
  const r = writeNote(d, 'okf', { path: 'notes/x.md', frontmatter: { type: 'Concept', generated: { by: 'spoof', at: '2000-01-01' } }, body: 'hello', actor: 'grokbot/a', now: '2026-11-16T12:00:00Z' });
  const fm = splitNote(readFileSync(join(d, 'notes/x.md'), 'utf8')).frontmatter;
  assert.deepEqual(fm.generated, { by: 'grokbot/a', at: '2026-11-16T12:00:00Z' });
  assert.equal(fm.status, 'draft'); assert.equal(r.created, true);
});

test('writes: path rules and optimistic concurrency', () => {
  const d = copy('okf-retail');
  for (const p of ['../evil.md', '/abs.md', 'a/../../x.md', '.hidden/x.md', 'x.txt', 'index.md', 'log.md', 'schemas/x.md']) assert.throws(() => writeNote(d, 'okf', { path: p, frontmatter: { type: 'C' }, actor: 'a/b' }), /invalid note path|end in \.md|reserved|schemas/, p);
  assert.throws(() => writeNote(d, 'okf', { path: 'tables/orders.md', frontmatter: { type: 'C' }, actor: 'a/b' }), /already exists/);
  assert.throws(() => writeNote(d, 'okf', { path: 'tables/orders.md', frontmatter: { type: 'C' }, actor: 'a/b', expectedSha: 'nope' }), /changed since you read it/);
});

test('writes: a content change drops earlier verifications; a human verification through the UI path counts', () => {
  const d = copy('okf-retail'), g = new GraphStore();
  const w = new WikiService({ graph: g, vaults: [{ dir: d, slug: 'retail' }] }); w.start();
  const x = w.find('retail:tables/customers'); assert.equal(x.note.trust.tier, 'human-reviewed');
  w.write('retail', { path: 'tables/customers.md', frontmatter: { ...x.note.fm, description: 'changed' }, body: x.note.body, actor: 'grokbot/a', expectedSha: x.note.sha256 });
  assert.equal(w.find('retail:tables/customers').note.trust.tier, 'unverified');
  assert.equal(g.getNode('BigQueryTable:retail:tables/customers').props.trust_tier, 'unverified');
  w.verify('retail', { path: 'tables/customers.md', actor: w.humanFor('owner'), allowHuman: true });
  assert.equal(g.getNode('BigQueryTable:retail:tables/customers').props.trust_tier, 'human-reviewed');
  assert.equal(w.humanFor('analyst'), null);
  appendLog(d, { actor: 'grokbot/a', text: 'checked\nthings', refs: ['customers'], now: '2026-11-16T12:00:00Z' });
  assert.match(readFileSync(join(d, 'log.md'), 'utf8'), /- 2026-11-16T12:00:00Z \[note\] checked things \[\[customers\]\] \(by grokbot\/a\)\n$/);
  w.close();
});

test('graph -> file write-back stays off even when the flag is set', () => {
  const w = new WikiService({ graph: new GraphStore(), writeBack: true });
  assert.equal(w.writeBack, false);
});
