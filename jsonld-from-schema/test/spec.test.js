// Acceptance tests: one or more test per SPEC ID (SPEC-JSONSCHEMA-TO-JSONLD.md). Test names start with the ID.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { generateContext, generateVocabulary, generateShapes, annotate, toNQuads, expand, instanceToNQuads } from '../src/index.js';
import { XSD, RDF, RDFS, OWL, SH, V, fixture, golden, S2020, D7, store, objs, one, list, codes, reject } from './helpers.js';

const ctxOf = (s, o) => generateContext(s, o).context['@context'];
const obj = (properties, extra = {}) => ({ $schema: S2020, type: 'object', properties, ...extra });
import { PERSON, ANN } from './person-fixture.mjs';
const nq = async (inst, schema, o) => instanceToNQuads(inst, schema, o);

// ---------------- (a) context
test('C-01 context has @version 1.1, xsd, @vocab iff vocabFallback', () => {
  const c = ctxOf(obj({ a: { type: 'string' } }));
  assert.equal(c['@version'], 1.1); assert.equal(c.xsd, XSD('')); assert.equal(c['@vocab'], V(''));
  assert.equal('@vocab' in ctxOf(obj({ a: { type: 'string' } }), { vocabFallback: false }), false);
  assert.equal(ctxOf(obj({ a: {} }), { vocab: 'https://ex.org/v#' })['@vocab'], 'https://ex.org/v#');
});
test('C-02 properties become terms under vocab, percent-encoded', () => {
  const c = ctxOf(obj({ 'first name': { type: 'string' }, 'a.b-c_d~e': { type: 'string' }, 'é': { type: 'string' } }));
  assert.equal(c['first name']['@id'], V('first%20name'));
  assert.equal(c['a.b-c_d~e']['@id'], V('a.b-c_d~e'));
  assert.equal(c['é']['@id'], V('%C3%A9'));
});
test('C-03 type/format coercion table', () => {
  const c = ctxOf(obj({ i: { type: 'integer' }, n: { type: 'number' }, b: { type: 'boolean' }, dt: { type: 'string', format: 'date-time' }, d: { type: 'string', format: 'date' }, t: { type: 'string', format: 'time' }, du: { type: 'string', format: 'duration' },
    u: { type: 'string', format: 'uri' }, ur: { type: 'string', format: 'uri-reference' }, ir: { type: 'string', format: 'iri' }, irr: { type: 'string', format: 'iri-reference' }, e: { type: 'string', format: 'email' }, s: { type: 'string' }, bin: { type: 'string', contentEncoding: 'base64' }, f: { format: 'date-time' } }));
  const t = k => c[k]['@type'];
  assert.deepEqual([t('i'), t('n'), t('b'), t('dt'), t('d'), t('t'), t('du')], ['xsd:integer', 'xsd:double', 'xsd:boolean', 'xsd:dateTime', 'xsd:date', 'xsd:time', 'xsd:duration']);
  assert.deepEqual([t('u'), t('ur'), t('ir'), t('irr')], ['@id', '@id', '@id', '@id']);
  assert.equal(t('e'), undefined); assert.equal(t('s'), undefined); assert.equal(t('bin'), 'xsd:base64Binary'); assert.equal(t('f'), 'xsd:dateTime');
  assert.equal(ctxOf(obj({ u: { type: 'string', format: 'uri' } }), { uriAs: 'anyURI' }).u['@type'], 'xsd:anyURI');
});
test('C-04 nullable types keep coercion; real unions warn and do not coerce', () => {
  const r = generateContext(obj({ a: { type: ['string', 'null'], format: 'date-time' }, b: { anyOf: [{ type: 'integer' }, { type: 'null' }] }, c: { type: ['integer', 'string'] } }));
  const c = r.context['@context'];
  assert.equal(c.a['@type'], 'xsd:dateTime'); assert.equal(c.b['@type'], 'xsd:integer'); assert.equal(c.c['@type'], undefined);
  assert.deepEqual(codes(r.warnings), ['W_UNION_TYPE']);
});
test('C-05 arrays: @set default, @list option, tuples are @list, mixed tuples warn', () => {
  const s = obj({ a: { type: 'array', items: { type: 'integer' } }, t: { type: 'array', prefixItems: [{ type: 'number' }, { type: 'number' }] }, m: { type: 'array', prefixItems: [{ type: 'number' }, { type: 'string' }] } });
  const r = generateContext(s); const c = r.context['@context'];
  assert.deepEqual(c.a, { '@id': V('a'), '@type': 'xsd:integer', '@container': '@set' });
  assert.deepEqual(c.t, { '@id': V('t'), '@type': 'xsd:double', '@container': '@list' });
  assert.deepEqual(c.m, { '@id': V('m'), '@container': '@list' });
  assert.ok(codes(r.warnings).includes('W_MIXED_TUPLE'));
  assert.equal(ctxOf(s, { arrays: 'list' }).a['@container'], '@list');
  const d7 = { $schema: D7, type: 'object', properties: { t: { type: 'array', items: [{ type: 'integer' }, { type: 'integer' }] } } };
  assert.deepEqual(ctxOf(d7).t, { '@id': V('t'), '@type': 'xsd:integer', '@container': '@list' });
});
test('C-06 arrays of arrays become @json (lossless)', async () => {
  const s = obj({ m: { type: 'array', items: { type: 'array', items: { type: 'number' } } } });
  const r = generateContext(s);
  assert.deepEqual(r.context['@context'].m, { '@id': V('m'), '@type': '@json' });
  assert.ok(codes(r.warnings).includes('W_NESTED_ARRAY'));
  assert.match(await nq({ m: [[1, 2], [3]] }, s), /"\[\[1,2\],\[3\]\]"\^\^<http:\/\/www\.w3\.org\/1999\/02\/22-rdf-syntax-ns#JSON>/);
});
test('C-07 nested objects get property-scoped contexts; identical inherited terms omitted; propagation works', async () => {
  const s = obj({ when: { type: 'string', format: 'date-time' }, n: { type: 'object', properties: { when: { type: 'string', format: 'date-time' }, k: { type: 'integer' }, deep: { type: 'object', properties: { k: { type: 'integer' }, z: { type: 'string', format: 'date' } } } } } });
  const c = ctxOf(s);
  assert.deepEqual(Object.keys(c.n['@context']).sort(), ['deep', 'k']); // "when" inherited unchanged -> omitted
  assert.deepEqual(Object.keys(c.n['@context'].deep['@context']), ['z']); // k inherited from n scope
  const out = await nq({ when: '2026-01-01T00:00:00Z', n: { when: '2026-01-02T00:00:00Z', k: 3, deep: { k: 4, z: '2026-01-03' } } }, s);
  assert.match(out, /"2026-01-02T00:00:00Z"\^\^<http:\/\/www\.w3\.org\/2001\/XMLSchema#dateTime>/);
  assert.match(out, /"4"\^\^<http:\/\/www\.w3\.org\/2001\/XMLSchema#integer>/);
  assert.match(out, /"2026-01-03"\^\^<http:\/\/www\.w3\.org\/2001\/XMLSchema#date>/);
  assert.equal('@context' in ctxOf(obj({ a: { type: 'integer' }, n: { type: 'object', properties: { a: { type: 'integer' } } } })).n, false);
});
test('C-08 free-form objects become @json', () => {
  const c = ctxOf(obj({ f: { type: 'object' }, m: { type: 'object', additionalProperties: { type: 'string' } }, p: { type: 'object', patternProperties: { '^x': {} } } }));
  for (const k of ['f', 'm', 'p']) assert.equal(c[k]['@type'], '@json', k);
});
test('C-09 local $ref forms resolve; cycles do not loop; 2020-12 siblings merge with referrer hint winning', () => {
  const s = { $schema: S2020, $id: 'https://ex.org/s.json', type: 'object', properties: {
    a: { $ref: '#/$defs/When' }, b: { $ref: '#/definitions/Num' }, c: { $ref: 'https://ex.org/s.json#/$defs/When' }, d: { $ref: '#/properties/b' },
    e: { $ref: '#/$defs/When', 'x-jsonld': { '@id': 'schema:startDate' } }, node: { $ref: '#/$defs/Node' } },
    $defs: { When: { type: 'string', format: 'date-time', 'x-jsonld': { '@id': 'schema:endDate' } }, Node: { type: 'object', properties: { child: { $ref: '#/$defs/Node' }, v: { type: 'integer' } } } },
    definitions: { Num: { type: 'number' } } };
  const r = generateContext(s); const c = r.context['@context'];
  assert.equal(c.a['@type'], 'xsd:dateTime'); assert.equal(c.a['@id'], 'schema:endDate');
  assert.equal(c.b['@type'], 'xsd:double'); assert.equal(c.c['@type'], 'xsd:dateTime'); assert.equal(c.d['@type'], 'xsd:double');
  assert.equal(c.e['@id'], 'schema:startDate');
  assert.ok(c.node['@context'].child); assert.equal('@context' in c.node['@context'].child, false); // cycle: no deeper scope
});
test('C-10 classes from hint, rootClass, title, $defs name, inline title', () => {
  const s = { $schema: S2020, title: 'trade order', type: 'object', properties: { buyer: { $ref: '#/$defs/party_info' }, ship: { title: 'shipment', type: 'object', properties: { x: { type: 'string' } } }, misc: { type: 'object', properties: { y: { type: 'string' } } } },
    $defs: { party_info: { type: 'object', properties: { name: { type: 'string' } } } } };
  const d = annotate({ buyer: { name: 'A' }, ship: { x: '1' }, misc: { y: '2' } }, s).document;
  assert.equal(d['@type'], V('TradeOrder')); assert.equal(d.buyer['@type'], V('PartyInfo')); assert.equal(d.ship['@type'], V('Shipment')); assert.equal(d.misc['@type'], undefined);
  assert.equal(annotate({}, s, { rootClass: 'Deal' }).document['@type'], V('Deal'));
  assert.equal(annotate({}, s, { rootClass: 'https://schema.org/Order' }).document['@type'], 'https://schema.org/Order');
  assert.equal(annotate({}, { ...s, 'x-jsonld': { '@type': 'schema:Order' } }).document['@type'], 'https://schema.org/Order');
});
test('C-11 enums: literals by default, IRIs with enumAsIri or @vocab hint, unsafe values stay literals', async () => {
  const s = obj({ st: { enum: ['active', 'retired'] }, op: { type: 'string', enum: ['node.upsert', 'link.remove'], 'x-jsonld': { '@type': '@vocab' } }, bad: { enum: ['a b', 'c'] } });
  const c = ctxOf(s);
  assert.equal(c.st['@type'], undefined);
  assert.deepEqual(c.op, { '@id': V('op'), '@type': '@vocab', '@context': { 'link.remove': V('op/link.remove'), 'node.upsert': V('op/node.upsert') } });
  const r = generateContext(s, { enumAsIri: true });
  assert.equal(r.context['@context'].st['@type'], '@vocab'); assert.equal(r.context['@context'].bad['@type'], undefined);
  assert.ok(codes(r.warnings).includes('W_ENUM_NOT_IRI'));
  const out = await nq({ st: 'active', op: 'node.upsert' }, s);
  assert.match(out, /<https:\/\/streamgraph\.local\/vocab\/op> <https:\/\/streamgraph\.local\/vocab\/op\/node\.upsert>/);
  assert.match(out, /<https:\/\/streamgraph\.local\/vocab\/st> "active"/);
});
test('C-12 hint overrides @id (CURIE kept, prefix added), @type, @container', () => {
  const c = ctxOf(obj({ n: { type: 'string', 'x-jsonld': { '@id': 'schema:name' } }, w: { type: 'string', 'x-jsonld': { '@type': 'xsd:gYear' } }, l: { type: 'array', items: { type: 'string' }, 'x-jsonld': { '@container': '@list' } }, r: { type: 'string', 'x-jsonld': { '@id': 'https://ex.org/rel', '@type': '@id' } } }));
  assert.equal(c.n['@id'], 'schema:name'); assert.equal(c.schema, 'https://schema.org/');
  assert.equal(c.w['@type'], 'xsd:gYear'); assert.equal(c.l['@container'], '@list');
  assert.deepEqual(c.r, { '@id': 'https://ex.org/rel', '@type': '@id' });
});
test('C-13 x-jsonld:false excludes a property (term null, no triple)', async () => {
  const s = obj({ keep: { type: 'string' }, secret: { type: 'string', 'x-jsonld': false } });
  assert.equal(ctxOf(s).secret, null);
  const out = await nq({ keep: 'k', secret: 's' }, s);
  assert.doesNotMatch(out, /"s"/); assert.match(out, /"k"/);
});
test('C-14 unmappable property names warn and get no term', () => {
  const r = generateContext(obj({ 'sys:x': { type: 'string' }, 'a/b': { type: 'string' }, '': { type: 'string' }, ok: { type: 'string' } }));
  const c = r.context['@context'];
  assert.ok(!('sys:x' in c) && !('a/b' in c) && !('' in c) && c.ok);
  assert.equal(codes(r.warnings).filter(x => x === 'W_UNMAPPABLE_NAME').length, 3);
});
test('C-15 prefixes: xsd always, declared always, built-ins only when used', () => {
  const c = ctxOf({ ...obj({ a: { type: 'string' } }), 'x-jsonld': { '@prefixes': { ex: 'https://ex.org/' } } }, { prefixes: { foaf: 'http://xmlns.com/foaf/0.1/' } });
  assert.equal(c.ex, 'https://ex.org/'); assert.equal(c.foaf, 'http://xmlns.com/foaf/0.1/'); assert.equal(c.xsd, XSD(''));
  for (const p of ['schema', 'rdf', 'rdfs', 'owl', 'sh']) assert.equal(p in c, false, p);
});
test('C-16 conflicting merged definitions -> term without coercion + W_CONFLICT', () => {
  const r = generateContext({ $schema: S2020, type: 'object', allOf: [{ properties: { t: { type: 'integer' } } }, { properties: { t: { type: 'string', format: 'date' } } }] });
  assert.deepEqual(r.context['@context'].t, { '@id': V('t') }); assert.ok(codes(r.warnings).includes('W_CONFLICT'));
});
test('C-16b refinement candidates (no type keywords) never conflict', () => {
  const r = generateContext({ $schema: S2020, type: 'object', properties: { p: { type: 'object', properties: { k: { type: 'integer' } } } }, else: { properties: { p: { required: ['k'] } } } });
  assert.equal(r.context['@context'].p['@context'].k['@type'], 'xsd:integer'); assert.ok(!codes(r.warnings).includes('W_CONFLICT'));
});
test('C-17 @idProperty keeps the property a literal term', () => {
  assert.deepEqual(ctxOf(PERSON).id, { '@id': V('id') });
});
test('C-18 a property named like a prefix shadows it; IRIs written in full', async () => {
  const s = obj({ xsd: { type: 'string' }, d: { type: 'string', format: 'date' } });
  const r = generateContext(s); const c = r.context['@context'];
  assert.deepEqual(c.xsd, { '@id': V('xsd') }); assert.equal(c.d['@type'], XSD('date'));
  assert.ok(codes(r.warnings).includes('W_PREFIX_SHADOWED'));
  assert.match(await nq({ xsd: 'v', d: '2026-01-01' }, s), /"2026-01-01"\^\^<http:\/\/www\.w3\.org\/2001\/XMLSchema#date>/);
});

// ---------------- (b) vocabulary + shapes
test('V-01 classes under vocab are described; foreign classes are not', async () => {
  const st = store((await generateVocabulary(PERSON)).turtle);
  assert.deepEqual(objs(st, V('Address'), RDF('type')), [RDFS('Class'), OWL('Class')].sort());
  assert.deepEqual(objs(st, V('Address'), RDFS('comment')), ['A postal address^^' + XSD('string')]);
  assert.equal(st.getQuads(null, null, null, null).some(q => q.subject.value === 'https://schema.org/Person'), false);
});
test('V-02 properties typed rdf:Property + owl Datatype/ObjectProperty; foreign properties not described', async () => {
  const st = store((await generateVocabulary(PERSON)).turtle);
  assert.ok(objs(st, V('age'), RDF('type')).includes(OWL('DatatypeProperty')));
  assert.ok(objs(st, V('homepage'), RDF('type')).includes(OWL('ObjectProperty')));
  assert.ok(objs(st, V('address'), RDF('type')).includes(OWL('ObjectProperty')));
  assert.ok(objs(st, V('age'), RDF('type')).includes(RDF('Property')));
  assert.equal(st.getQuads(null, null, null, null).some(q => q.subject.value === 'https://schema.org/name'), false);
});
test('V-03 rdfs:domain only with one owner class, rdfs:range only with one range', async () => {
  const st = store((await generateVocabulary(PERSON)).turtle);
  assert.deepEqual(objs(st, V('age'), RDFS('domain')), ['https://schema.org/Person']);
  assert.deepEqual(objs(st, V('age'), RDFS('range')), [XSD('integer')]);
  assert.deepEqual(objs(st, V('born'), RDFS('range')), [XSD('date')]);
  assert.deepEqual(objs(st, V('address'), RDFS('range')), [V('Address')]);
  const two = { $schema: S2020, type: 'object', title: 'A', properties: { x: { type: 'integer' }, b: { $ref: '#/$defs/B' } }, $defs: { B: { type: 'object', properties: { x: { type: 'string' } } } } };
  const st2 = store((await generateVocabulary(two)).turtle);
  assert.deepEqual(objs(st2, V('x'), RDFS('domain')), []); assert.deepEqual(objs(st2, V('x'), RDFS('range')), []);
});
test('S-01 node shapes per class / root / nested, with targetClass', async () => {
  const st = store((await generateShapes(PERSON)).turtle);
  assert.deepEqual(objs(st, V('PersonShape'), SH('targetClass')), ['https://schema.org/Person']);
  assert.deepEqual(objs(st, V('AddressShape'), SH('targetClass')), [V('Address')]);
  const anon = store((await generateShapes(obj({ n: { type: 'object', properties: { a: { type: 'string' } } } }))).turtle);
  assert.deepEqual(objs(anon, V('RootShape'), RDF('type')), [SH('NodeShape')]);
  assert.deepEqual(objs(anon, V('RootShape-n-node'), RDF('type')), [SH('NodeShape')]);
  assert.deepEqual(objs(anon, V('RootShape-n-node'), SH('targetClass')), []);
  assert.deepEqual(objs(anon, V('RootShape-n'), RDF('type')), [SH('PropertyShape')]);
  assert.deepEqual(objs(anon, V('RootShape-n'), SH('node')), [V('RootShape-n-node')]);
});
test('S-02 cardinality from required / arrays / minItems / maxItems', async () => {
  const st = store((await generateShapes(PERSON)).turtle);
  assert.deepEqual(objs(st, V('PersonShape-name'), SH('minCount')), ['1^^' + XSD('integer')]);
  assert.deepEqual(objs(st, V('PersonShape-name'), SH('maxCount')), ['1^^' + XSD('integer')]);
  assert.deepEqual(objs(st, V('PersonShape-born'), SH('minCount')), []);
  assert.deepEqual(objs(st, V('PersonShape-tags'), SH('minCount')), ['1^^' + XSD('integer')]);
  assert.deepEqual(objs(st, V('PersonShape-tags'), SH('maxCount')), ['5^^' + XSD('integer')]);
  assert.deepEqual(objs(st, V('PersonShape-friends'), SH('maxCount')), []);
});
test('S-03 value constraints: datatype, nodeKind, node, pattern, lengths, ranges', async () => {
  const st = store((await generateShapes(PERSON)).turtle);
  assert.deepEqual(objs(st, V('PersonShape-age'), SH('datatype')), [XSD('integer')]);
  assert.deepEqual(objs(st, V('PersonShape-age'), SH('minInclusive')), ['0^^' + XSD('integer')]);
  assert.deepEqual(objs(st, V('PersonShape-age'), SH('maxInclusive')), ['150^^' + XSD('integer')]);
  assert.deepEqual(objs(st, V('PersonShape-homepage'), SH('nodeKind')), [SH('IRI')]);
  assert.deepEqual(objs(st, V('PersonShape-address'), SH('node')), [V('AddressShape')]);
  assert.deepEqual(objs(st, V('PersonShape-tags'), SH('pattern')), ['^[a-z]+$^^' + XSD('string')]);
  assert.deepEqual(objs(st, V('AddressShape-city'), SH('minLength')), ['1^^' + XSD('integer')]);
  assert.deepEqual(objs(st, V('AddressShape-city'), SH('datatype')), [XSD('string')]);
  const ex = store((await generateShapes(obj({ x: { type: 'number', exclusiveMinimum: 0.5, exclusiveMaximum: 9 }, j: { type: 'object' } }))).turtle);
  assert.deepEqual(objs(ex, V('RootShape-x'), SH('minExclusive')), ['0.5^^' + XSD('decimal')]);
  assert.deepEqual(objs(ex, V('RootShape-x'), SH('maxExclusive')), ['9^^' + XSD('integer')]);
  assert.deepEqual(objs(ex, V('RootShape-j'), SH('datatype')), [RDF('JSON')]);
});
test('S-04 enum/const -> sh:in in schema order (literals or IRIs)', async () => {
  const st = store((await generateShapes(PERSON)).turtle);
  assert.deepEqual(list(st, one(st, V('PersonShape-status'), SH('in'))), ['active', 'retired']);
  const st2 = store((await generateShapes(obj({ op: { enum: ['b', 'a'] }, k: { const: 3 } }), { enumAsIri: true })).turtle);
  assert.deepEqual(list(st2, one(st2, V('RootShape-op'), SH('in'))), [V('op/b'), V('op/a')]);
  assert.deepEqual(list(st2, one(st2, V('RootShape-k'), SH('in'))), ['3']);
});
test('S-05 additionalProperties:false -> sh:closed with rdf:type ignored', async () => {
  const st = store((await generateShapes(PERSON)).turtle);
  assert.deepEqual(objs(st, V('PersonShape'), SH('closed')), ['true^^' + XSD('boolean')]);
  assert.deepEqual(list(st, one(st, V('PersonShape'), SH('ignoredProperties'))), [RDF('type')]);
  assert.deepEqual(objs(st, V('AddressShape'), SH('closed')), []);
});
test('S-06 composition is not translated to sh:or/xone; branch props optional unless required in all', async () => {
  const s = { $schema: S2020, type: 'object', anyOf: [{ properties: { a: { type: 'string' }, b: { type: 'string' } }, required: ['a', 'b'] }, { properties: { a: { type: 'string' } }, required: ['a'] }] };
  const ttl = (await generateShapes(s)).turtle; const st = store(ttl);
  assert.doesNotMatch(ttl, /sh:or|sh:xone/);
  assert.deepEqual(objs(st, V('RootShape-a'), SH('minCount')), ['1^^' + XSD('integer')]);
  assert.deepEqual(objs(st, V('RootShape-b'), SH('minCount')), []);
});

// ---------------- unsupported / partial keywords
test('U-01 allOf merges properties and required', async () => {
  const s = { $schema: S2020, type: 'object', allOf: [{ properties: { a: { type: 'integer' } }, required: ['a'] }, { properties: { b: { type: 'string', format: 'date' } } }] };
  const c = ctxOf(s); assert.equal(c.a['@type'], 'xsd:integer'); assert.equal(c.b['@type'], 'xsd:date');
  assert.deepEqual(objs(store((await generateShapes(s)).turtle), V('RootShape-a'), SH('minCount')), ['1^^' + XSD('integer')]);
});
test('U-02 anyOf/oneOf union statically with W_COMPOSITION_STATIC', () => {
  for (const k of ['anyOf', 'oneOf']) {
    const r = generateContext({ $schema: S2020, type: 'object', [k]: [{ properties: { a: { type: 'integer' } } }, { properties: { b: { type: 'boolean' } } }] });
    assert.equal(r.context['@context'].a['@type'], 'xsd:integer'); assert.equal(r.context['@context'].b['@type'], 'xsd:boolean');
    assert.ok(codes(r.warnings).includes('W_COMPOSITION_STATIC'), k);
  }
});
test('U-03 if/then/else merges then/else props with W_CONDITIONAL', () => {
  const r = generateContext({ $schema: S2020, type: 'object', if: { properties: { k: { const: 'x' } } }, then: { properties: { a: { type: 'integer' } } }, else: { properties: { b: { type: 'string', format: 'date' } } } });
  const c = r.context['@context']; assert.equal(c.a['@type'], 'xsd:integer'); assert.equal(c.b['@type'], 'xsd:date'); assert.equal('k' in c, false);
  assert.ok(codes(r.warnings).includes('W_CONDITIONAL'));
});
test('U-04 patternProperties / additionalProperties schema -> W_UNMAPPED_KEYS, keys via @vocab only', async () => {
  const s = obj({ a: { type: 'string' } }, { patternProperties: { '^x_': { type: 'integer' } } });
  const r = generateContext(s); assert.ok(codes(r.warnings).includes('W_UNMAPPED_KEYS'));
  assert.equal('x_1' in r.context['@context'], false);
  assert.match(await nq({ a: 'q', x_1: 5 }, s), /<https:\/\/streamgraph\.local\/vocab\/x_1> "5"/);
  assert.doesNotMatch(await nq({ a: 'q', x_1: 5 }, s, { vocabFallback: false }), /x_1/);
});
test('U-05 ignored keywords warn once per path', () => {
  const r = generateContext(obj({ a: { type: 'string', not: { const: 'x' } }, b: { type: 'array', items: { type: 'string' }, contains: { const: 'y' } } }, { propertyNames: { pattern: '^[a-z]+$' }, dependentRequired: { a: ['b'] } }));
  const ig = r.warnings.filter(w => w.code === 'W_IGNORED_KEYWORD').map(w => w.message).sort();
  assert.deepEqual(ig, ['keyword contains is ignored', 'keyword dependentRequired is ignored', 'keyword not is ignored', 'keyword propertyNames is ignored']);
});
test('U-06 additionalProperties:false has no context effect', () => {
  assert.deepEqual(ctxOf(obj({ a: { type: 'string' } }, { additionalProperties: false })), ctxOf(obj({ a: { type: 'string' } })));
});
test('U-07 boolean property schemas get plain terms', () => {
  const c = ctxOf(obj({ any: true, none: false }));
  assert.deepEqual(c.any, { '@id': V('any') }); assert.deepEqual(c.none, { '@id': V('none') });
});

// ---------------- (c) annotation
test('A-01 invalid instance -> E_INVALID_INSTANCE, no output', async () => {
  const e = await reject(() => annotate({ id: 'p', name: 3 }, PERSON), 'E_INVALID_INSTANCE');
  assert.ok(Array.isArray(e.details) && e.details.length);
  await reject(() => annotate({ id: 'p', name: 'x', born: 'not-a-date' }, PERSON), 'E_INVALID_INSTANCE');
  assert.ok(annotate({ id: 'p', name: 'x', born: 'nope' }, PERSON, { validate: false }).document);
});
test('A-02 output embeds the generated context', () => {
  const d = annotate(ANN, PERSON).document;
  assert.deepEqual(d['@context'], ctxOf(PERSON)); assert.equal(typeof d['@context'], 'object');
});
test('A-03 @type added to class nodes (root, nested, array items, $ref targets); off with addTypes:false', () => {
  const d = annotate(ANN, PERSON).document;
  assert.equal(d['@type'], 'https://schema.org/Person'); assert.equal(d.address['@type'], V('Address')); assert.equal(d.friends[0]['@type'], 'https://schema.org/Person');
  const d2 = annotate(ANN, PERSON, { addTypes: false }).document; assert.equal(d2['@type'], undefined); assert.equal(d2.address['@type'], undefined);
});
test('A-04 @idProperty -> @id (prefixed + encoded, or absolute as is)', () => {
  const s = { ...PERSON, 'x-jsonld': { '@type': 'schema:Person', '@idProperty': 'id', '@idPrefix': 'https://ex.org/people/' } };
  assert.equal(annotate({ id: 'a b', name: 'X' }, s).document['@id'], 'https://ex.org/people/a%20b');
  assert.equal(annotate({ id: 'urn:uuid:1234', name: 'X' }, s).document['@id'], 'urn:uuid:1234');
  assert.equal(annotate({ id: 'https://x.org/1', name: 'X' }, s).document['@id'], 'https://x.org/1');
  assert.equal(annotate({ id: 'Person:1', name: 'X' }, PERSON).document['@id'], V('id/Person%3A1'));
  assert.equal(annotate({ id: 'p', name: 'X' }, PERSON).document.id, 'p');
});
test('A-05 instance keys starting with @ are refused', async () => {
  await reject(() => annotate({ '@id': 'x' }, obj({ a: { type: 'string' } })), 'E_KEYWORD_IN_INSTANCE');
});
test('A-06 YAML-LD output parses back to the same document under YAML 1.2 and 1.1', () => {
  const r = annotate({ ...ANN, born: '1990-01-02' }, PERSON, { format: 'yaml' });
  assert.deepEqual(YAML.parse(r.text), r.document);
  assert.deepEqual(YAML.parse(r.text, { version: '1.1' }), r.document);
  assert.match(r.text, /born: "1990-01-02"/); assert.doesNotMatch(r.text, /&|\*[a-z]|!!/);
});
test('A-07 toNQuads is offline and canonical', async () => {
  const d = annotate(ANN, PERSON).document;
  const a = await toNQuads(d), b = await toNQuads(structuredClone(d));
  assert.equal(a, b); assert.match(a, /_:c14n0/);
  await reject(() => toNQuads({ '@context': 'https://schema.org/', name: 'x' }), 'E_REMOTE_CONTEXT');
});
test('A-08 x-jsonld hints do not change validation', async () => {
  const strip = s => JSON.parse(JSON.stringify(s, (k, v) => (k === 'x-jsonld' ? undefined : v)));
  const { default: Ajv2020 } = await import('ajv/dist/2020.js'); const { default: addFormats } = await import('ajv-formats');
  for (const inst of [ANN, { id: 1 }, { id: 'x', name: 'y', extra: 1 }]) {
    const a = new Ajv2020({ strict: false }); addFormats(a); const b = new Ajv2020({ strict: false }); addFormats(b);
    assert.equal(a.validate(PERSON, inst), b.validate(strip(PERSON), inst));
  }
});
test('A-09 RDF terms: typed literals, IRIs, rdf:JSON, RDF lists', async () => {
  const out = await nq(ANN, PERSON);
  assert.match(out, /"1990-01-02"\^\^<http:\/\/www\.w3\.org\/2001\/XMLSchema#date>/);
  assert.match(out, /<https:\/\/streamgraph\.local\/vocab\/homepage> <https:\/\/ann\.example\/>/);
  assert.match(out, /rdf-syntax-ns#first> "3\.68E1"\^\^<http:\/\/www\.w3\.org\/2001\/XMLSchema#double>/);
  assert.match(out, /"36"\^\^<http:\/\/www\.w3\.org\/2001\/XMLSchema#integer>/);
  const ex = await expand(annotate(ANN, PERSON).document);
  assert.deepEqual(ex[0]['https://schema.org/name'], [{ '@value': 'Ann' }]);
});

// ---------------- determinism
test('D-01 same input -> same bytes; keywords first, keys sorted', () => {
  const a = generateContext(PERSON).text, b = generateContext(structuredClone(PERSON)).text;
  assert.equal(a, b); assert.ok(a.endsWith('}\n'));
  const keys = Object.keys(JSON.parse(a)['@context']);
  assert.deepEqual(keys.slice(0, 2), ['@version', '@vocab']);
  const rest = keys.slice(2); assert.deepEqual(rest, [...rest].sort());
  assert.equal(annotate(ANN, PERSON).text, annotate(structuredClone(ANN), PERSON).text);
});
test('D-02 Turtle output is byte-stable and sorted', async () => {
  const a = (await generateShapes(PERSON)).turtle, b = (await generateShapes(structuredClone(PERSON))).turtle;
  assert.equal(a, b);
  const subj = a.split('\n').filter(l => /^v:/.test(l)).map(l => l.split(' ')[0]);
  assert.deepEqual(subj, [...subj].sort());
  assert.equal((await generateVocabulary(PERSON)).turtle, (await generateVocabulary(PERSON)).turtle);
});
test('D-03 warnings sorted by path then code', () => {
  const ws = generateContext(fixture('graph-events.v1.json'), { pointer: '/events/node.upsert' }).warnings;
  const k = ws.map(w => `${w.path}\u0000${w.code}`); assert.deepEqual(k, [...k].sort());
});
test('D-04 property and key order do not change outputs', async () => {
  const rev = o => (o && typeof o === 'object' && !Array.isArray(o) ? Object.fromEntries(Object.entries(o).reverse().map(([k, v]) => [k, rev(v)])) : Array.isArray(o) ? o.map(rev) : o);
  const P2 = rev(PERSON), A2 = rev(ANN);
  P2.required = [...PERSON.required]; // arrays keep order
  assert.equal(generateContext(P2).text, generateContext(PERSON).text);
  assert.equal((await generateShapes(P2)).turtle, (await generateShapes(PERSON)).turtle);
  assert.equal(await nq(A2, P2), await nq(ANN, PERSON));
});

// ---------------- errors
test('E-01 bad options -> E_BAD_OPTION', async () => {
  const s = obj({ a: { type: 'string' } });
  for (const o of [{ vocab: 'relative/' }, { vocab: 'https://ex.org/v' }, { arrays: 'bag' }, { uriAs: 'x' }, { format: 'xml' }, { prefixes: { ex: 'not an iri' } }]) await reject(() => generateContext(s, o), 'E_BAD_OPTION');
});
test('E-02 unresolvable and external $ref', async () => {
  await reject(() => generateContext(obj({ a: { $ref: '#/$defs/Nope' } })), 'E_BAD_REF');
  await reject(() => generateContext(obj({ a: { $ref: 'https://other.example/s.json' } })), 'E_EXTERNAL_REF');
  await reject(() => generateContext(obj({ a: { $ref: 'other.json#/x' } })), 'E_EXTERNAL_REF');
});
test('E-03 property named like a keyword', async () => {
  await reject(() => generateContext(obj({ '@type': { type: 'string' } })), 'E_KEYWORD_PROPERTY');
});
test('E-04 malformed hints', async () => {
  for (const h of [{ '@id': 'nope:x' }, { '@id': 'rel/x' }, { '@type': '@list' }, { '@container': '@index' }, { '@frame': 1 }, 'schema:name', { '@vocab': 'https://ex.org/' }]) await reject(() => generateContext(obj({ a: { type: 'string', 'x-jsonld': h } })), 'E_BAD_HINT');
  await reject(() => generateContext({ ...obj({}), 'x-jsonld': { '@vocab': 'https://ex.org/novocab' } }), 'E_BAD_HINT');
});
test('E-05 invalid instance produces no RDF', async () => {
  await reject(() => instanceToNQuads({ id: 5 }, PERSON), 'E_INVALID_INSTANCE');
});
test('E-06 remote contexts refused', async () => {
  await reject(() => toNQuads({ '@context': ['https://www.w3.org/ns/credentials/v2'], a: 1 }), 'E_REMOTE_CONTEXT');
});
test('E-07 root/pointer must be an object schema', async () => {
  await reject(() => generateContext(true), 'E_SCHEMA_INVALID');
  await reject(() => generateContext([]), 'E_SCHEMA_INVALID');
  await reject(() => generateContext(obj({}), { pointer: '/nope' }), 'E_SCHEMA_INVALID');
});
test('E-08 @-keys in instances', async () => {
  await reject(() => annotate({ a: { '@value': 1 } }, obj({ a: { type: 'object', properties: { b: { type: 'string' } } } })), 'E_KEYWORD_IN_INSTANCE');
});

// ---------------- real fixtures from the integrated build
const GE = fixture('graph-events.v1.json');
const GE_POINTERS = [...Object.keys(GE.events).map(k => `/events/${k}`), '/command', '/commandResult', '/stateRecord'];
test('F-01 every graph-events.v1 contract converts (context, vocab, shapes)', async () => {
  for (const p of GE_POINTERS) {
    const r = generateContext(GE, { pointer: p });
    assert.ok(r.context['@context']['@version'], p);
    await generateVocabulary(GE, { pointer: p }); await generateShapes(GE, { pointer: p });
  }
  const c = ctxOf(GE, { pointer: '/events/node.upsert' });
  assert.equal(c.eventTime['@type'], 'xsd:dateTime'); assert.equal(c.seq['@type'], 'xsd:integer');
  assert.equal(c.payload['@context'].properties['@type'], '@json');
  assert.equal(ctxOf(GE, { pointer: '/command' }).issuedAt['@type'], 'xsd:dateTime');
});
test('F-02 a valid node.upsert event round-trips to golden N-Quads', async () => {
  const ev = fixture('node-upsert.instance.json');
  const out = await nq(ev, GE, { pointer: '/events/node.upsert' });
  assert.equal(out, golden('node-upsert.nq'));
  assert.match(out, /"2026-11-16T15:00:00Z"\^\^<http:\/\/www\.w3\.org\/2001\/XMLSchema#dateTime>/);
  await reject(() => nq({ ...ev, seq: 0 }, GE, { pointer: '/events/node.upsert' }), 'E_INVALID_INSTANCE');
});
test('F-03 every MCP tool input schema converts; enum -> sh:in', async () => {
  const tools = fixture('mcp-tool-input-schemas.json');
  assert.ok(Object.keys(tools).length >= 19);
  for (const [name, schema] of Object.entries(tools)) {
    generateContext(schema); await generateVocabulary(schema); await generateShapes(schema, { rootClass: name });
  }
  const st = store((await generateShapes(tools.changes_since, { rootClass: 'ChangesSince' })).turtle);
  assert.deepEqual(list(st, one(st, V('ChangesSinceShape-from'), SH('in'))), ['oldest', 'now']);
});
test('F-02b golden Person N-Quads (hand-written schema)', async () => {
  assert.equal(await nq(ANN, PERSON), golden('person.nq'));
});

// ---------------- CLI
const BIN = fileURLToPath(new URL('../bin/jsonld-from-schema.js', import.meta.url));
const FX = f => fileURLToPath(new URL(`./fixtures/${f}`, import.meta.url));
const cli = args => spawnSync(process.execPath, [BIN, ...args], { encoding: 'utf8' });
test('CLI-01 commands, exit codes, pointer', () => {
  const ok = cli(['context', FX('graph-events.v1.json'), '--pointer', '/command', '--quiet']);
  assert.equal(ok.status, 0); assert.equal(JSON.parse(ok.stdout)['@context'].issuedAt['@type'], 'xsd:dateTime');
  const nqr = cli(['nquads', FX('graph-events.v1.json'), FX('node-upsert.instance.json'), '--pointer', '/events/node.upsert', '--quiet']);
  assert.equal(nqr.status, 0); assert.equal(nqr.stdout, golden('node-upsert.nq'));
  const w = cli(['context', FX('graph-events.v1.json'), '--pointer', '/events/node.upsert']); assert.match(w.stderr, /warning W_CONDITIONAL/);
  assert.equal(cli(['shacl', FX('graph-events.v1.json'), '--pointer', '/command']).status, 0);
  assert.equal(cli(['context', FX('graph-events.v1.json'), '--pointer', '/nope']).status, 1);
  assert.equal(cli(['bogus']).status, 2); assert.equal(cli(['context']).status, 2); assert.equal(cli(['context', FX('graph-events.v1.json'), '--wat']).status, 2);
});
