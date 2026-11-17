// W3: frontmatter validation with our JSON Schema machinery. Invalid frontmatter never blocks the import: problems are attached
// to the note (wiki_problems, with the JSON pointer) and the note still loads.
//  - OKF notes: schemas/okf-concept.v02.json (type required, trust families shaped).
//  - Vault-LD notes: the same schema minus "type required" for the trust families they carry.
//  - Per-type opt-in: <vault>/schemas/<Label>.json (draft-07 or 2020-12) validates notes of that label, and (W2b) the SAME
//    schema produces JSON-LD term definitions with our clean-room converter, so meaning is defined once.
import Ajv from 'ajv';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { generateContext } from 'jsonld-from-schema';
import { broken } from './broken.js';

const OKF = JSON.parse(readFileSync(new URL('./schemas/okf-concept.v02.json', import.meta.url), 'utf8'));
const TRUST = { ...OKF, required: [], $id: OKF.$id.replace('.json', '-trust.json') };
const mk = draft2020 => { const a = draft2020 ? new Ajv2020({ allErrors: true, strict: false }) : new Ajv({ allErrors: true, strict: false }); addFormats(a); return a; };
const ajv = mk(false);
const vOkf = ajv.compile(OKF), vTrust = ajv.compile(TRUST);
const fmt = (errs, prefix = '') => (errs || []).map(e => `${prefix}schema: ${e.instancePath || '/'} ${e.message}${e.params?.allowedValues ? ` (${e.params.allowedValues.join(', ')})` : ''}`);

/** Per-type schemas in <vault>/schemas/*.json -> Map label -> { schema, validate, context, warnings } */
export function loadTypeSchemas(dir) {
  const out = new Map(), problems = [], sdir = join(dir, 'schemas');
  if (!existsSync(sdir)) return { schemas: out, problems };
  for (const f of readdirSync(sdir).filter(f => f.endsWith('.json')).sort()) {
    const label = f.replace(/\.(schema\.)?json$/, '');
    try {
      const schema = JSON.parse(readFileSync(join(sdir, f), 'utf8'));
      const validate = mk(String(schema.$schema || '').includes('2020-12')).compile(schema);
      let context = null, warnings = [];
      try { const g = generateContext(schema, { vocab: `https://streamgraph.local/wiki/schema/${label}#` }); context = g.context; warnings = g.warnings.map(w => `${f}: ${w.code || ''} ${w.message || w}`.trim()); }
      catch (e) { problems.push(`schemas/${f}: no JSON-LD context (${e.code || ''} ${e.message})`); }
      out.set(label, { file: `schemas/${f}`, schema, validate, context, warnings });
    } catch (e) { problems.push(`schemas/${f}: ${e.message}`); }
  }
  return { schemas: out, problems };
}

/** Validate every note of a loaded model in place (pushes onto note.problems). Returns the number of notes with problems. */
export function validateModel(model, typeSchemas = loadTypeSchemas(model.dir).schemas) {
  if (broken()) return 0;
  let bad = 0;
  for (const n of model.notes) {
    if (!n.fm) continue;
    const before = n.problems.length;
    const v = model.dialect === 'okf' ? vOkf : vTrust;
    if (!v(n.fm)) n.problems.push(...fmt(v.errors).filter(p => !n.problems.includes(p)));
    const ts = typeSchemas.get(n.label);
    if (ts && !ts.validate(n.fm)) n.problems.push(...fmt(ts.validate.errors, `${ts.file} `));
    if (n.problems.length > before) bad++;
  }
  return bad;
}

/** Context documents generated from per-type schemas (W2b), to compose after the vault's own context. Root terms win. */
export function schemaContexts(typeSchemas) { return [...typeSchemas.values()].filter(t => t.context).map(t => t.context['@context']).flatMap(c => (Array.isArray(c) ? c : [c])).filter(c => c && typeof c === 'object'); }
