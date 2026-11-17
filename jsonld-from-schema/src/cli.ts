import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  annotate,
  annotateToNQuads,
  toContext,
  toShacl,
  toVocab,
  JsonLdSchemaError,
} from "./index.js";
import type { ConverterOptionsInput } from "./options.js";

function usage(): never {
  console.error(
    `Usage: jsonld-from-schema <context|vocab|shacl|annotate|nquads> <schema> [instance] [options]\n` +
      `Options:\n` +
      `  --pointer <json-pointer>\n` +
      `  --vocab <iri>\n` +
      `  --format json|yaml\n` +
      `  --arrays set|list\n` +
      `  --uri-as id|anyURI\n` +
      `  --no-vocab-fallback\n` +
      `  --enum-as-iri\n` +
      `  --no-add-types\n` +
      `  --no-validate\n` +
      `  --root-class <name-or-iri>\n`,
  );
  process.exit(2);
}

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  if (args.length < 2) usage();

  const command = args[0];
  if (!["context", "vocab", "shacl", "annotate", "nquads"].includes(command)) usage();

  const positional: string[] = [];
  const opts: ConverterOptionsInput = {};

  for (let i = 1; i < args.length; i++) {
    const a = args[i];
    if (a === "--pointer") {
      opts.pointer = args[++i];
    } else if (a === "--vocab") {
      opts.vocab = args[++i];
    } else if (a === "--format") {
      opts.format = args[++i] as "json" | "yaml";
    } else if (a === "--arrays") {
      opts.arrays = args[++i] as "set" | "list";
    } else if (a === "--uri-as") {
      opts.uriAs = args[++i] as "id" | "anyURI";
    } else if (a === "--no-vocab-fallback") {
      opts.vocabFallback = false;
    } else if (a === "--enum-as-iri") {
      opts.enumAsIri = true;
    } else if (a === "--no-add-types") {
      opts.addTypes = false;
    } else if (a === "--no-validate") {
      opts.validate = false;
    } else if (a === "--root-class") {
      opts.rootClass = args[++i];
    } else if (a.startsWith("-")) {
      usage();
    } else {
      positional.push(a);
    }
  }

  if (positional.length < 1) usage();
  const schemaPath = positional[0];
  const instancePath = positional[1];

  if ((command === "annotate" || command === "nquads") && !instancePath) usage();

  return { command, schemaPath, instancePath, opts };
}

function printWarnings(warnings: { code: string; path: string; message: string }[]) {
  for (const w of warnings) {
    console.error(`${w.code} ${w.path}: ${w.message}`);
  }
}

async function main() {
  const { command, schemaPath, instancePath, opts } = parseArgs(process.argv);

  let schema: unknown;
  let instance: unknown;
  try {
    schema = JSON.parse(readFileSync(resolve(schemaPath), "utf8"));
    if (instancePath) {
      instance = JSON.parse(readFileSync(resolve(instancePath), "utf8"));
    }
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  try {
    if (command === "context") {
      const r = toContext(schema, opts);
      printWarnings(r.warnings);
      process.stdout.write(r.text);
    } else if (command === "vocab") {
      const r = toVocab(schema, opts);
      printWarnings(r.warnings);
      process.stdout.write(r.text);
    } else if (command === "shacl") {
      const r = toShacl(schema, opts);
      printWarnings(r.warnings);
      process.stdout.write(r.text);
    } else if (command === "annotate") {
      const r = annotate(instance, schema, opts);
      printWarnings(r.warnings);
      process.stdout.write(r.text);
    } else if (command === "nquads") {
      const r = await annotateToNQuads(instance, schema, opts);
      printWarnings(r.warnings);
      process.stdout.write(r.nquads.endsWith("\n") ? r.nquads : r.nquads + "\n");
    }
  } catch (e) {
    if (e instanceof JsonLdSchemaError) {
      console.error(`${e.code} ${e.path}: ${e.message}`);
      process.exit(1);
    }
    console.error(e instanceof Error ? e.stack ?? e.message : String(e));
    process.exit(1);
  }
}

main();
