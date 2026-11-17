#!/usr/bin/env node
// CLI. Exit codes: 0 ok, 1 conversion error (E_*), 2 usage error.
import { readFileSync } from 'node:fs';
import { generateContext, generateVocabulary, generateShapes, annotate, toNQuads, JsonLdSchemaError } from '../src/index.js';

const USAGE = `usage: jsonld-from-schema <command> <schema.json> [instance.json] [options]
commands:
  context    print the JSON-LD @context derived from the schema
  vocab      print an RDFS/OWL vocabulary (Turtle)
  shacl      print SHACL shapes (Turtle)
  annotate   validate + annotate an instance as JSON-LD (or YAML-LD with --format yaml)
  nquads     annotate an instance and print canonical N-Quads
options:
  --pointer <json-pointer>   use a sub-schema of the file (refs still resolve against the whole file)
  --vocab <iri>              base vocabulary IRI (ends in / or #)
  --prefix <p>=<iri>         extra prefix (repeatable)
  --arrays set|list          container for plain arrays (default set)
  --uri-as id|anyURI         how format:uri values are typed (default id)
  --enum-iri                 map string enums to IRIs
  --no-vocab-fallback        do not emit @vocab
  --no-types                 do not add @type to annotated nodes
  --no-validate              skip instance validation (not recommended)
  --root-class <name|iri>    class for the root object
  --format json|yaml         annotation output format
  --quiet                    do not print warnings to stderr`;

function parse(argv) {
  const pos = [], o = { prefixes: {} }; let quiet = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], next = () => { if (i + 1 >= argv.length) throw new Error(`${a} needs a value`); return argv[++i]; };
    if (a === '--pointer') o.pointer = next();
    else if (a === '--vocab') o.vocab = next();
    else if (a === '--prefix') { const [p, ...r] = next().split('='); o.prefixes[p] = r.join('='); }
    else if (a === '--arrays') o.arrays = next();
    else if (a === '--uri-as') o.uriAs = next();
    else if (a === '--enum-iri') o.enumAsIri = true;
    else if (a === '--no-vocab-fallback') o.vocabFallback = false;
    else if (a === '--no-types') o.addTypes = false;
    else if (a === '--no-validate') o.validate = false;
    else if (a === '--root-class') o.rootClass = next();
    else if (a === '--format') o.format = next();
    else if (a === '--quiet') quiet = true;
    else if (a === '-h' || a === '--help') { console.log(USAGE); process.exit(0); }
    else if (a.startsWith('--')) throw new Error(`unknown option ${a}`);
    else pos.push(a);
  }
  return { pos, o, quiet };
}
const readJson = f => { try { return JSON.parse(readFileSync(f, 'utf8')); } catch (e) { throw new Error(`cannot read JSON ${f}: ${e.message}`); } };

let args;
try { args = parse(process.argv.slice(2)); } catch (e) { console.error(e.message + '\n' + USAGE); process.exit(2); }
const [cmd, schemaFile, instFile] = args.pos;
if (!cmd || !schemaFile || !['context', 'vocab', 'shacl', 'annotate', 'nquads'].includes(cmd) || (['annotate', 'nquads'].includes(cmd) && !instFile)) { console.error(USAGE); process.exit(2); }
const warn = ws => { if (!args.quiet) for (const w of ws) console.error(`warning ${w.code} at ${w.path || '/'}: ${w.message}`); };
try {
  const schema = readJson(schemaFile);
  if (cmd === 'context') { const r = generateContext(schema, args.o); warn(r.warnings); process.stdout.write(r.text); }
  else if (cmd === 'vocab') { const r = await generateVocabulary(schema, args.o); warn(r.warnings); process.stdout.write(r.turtle); }
  else if (cmd === 'shacl') { const r = await generateShapes(schema, args.o); warn(r.warnings); process.stdout.write(r.turtle); }
  else {
    const r = annotate(readJson(instFile), schema, args.o); warn(r.warnings);
    process.stdout.write(cmd === 'annotate' ? r.text : await toNQuads(r.document));
  }
} catch (e) {
  if (e instanceof JsonLdSchemaError) { console.error(e.message); process.exit(1); }
  if (/cannot read JSON/.test(e.message)) { console.error(e.message); process.exit(2); }
  console.error(e.stack || e.message); process.exit(1);
}
