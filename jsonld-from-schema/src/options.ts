import { JsonLdSchemaError } from "./errors.js";

export const BUILTIN_PREFIXES: Record<string, string> = {
  xsd: "http://www.w3.org/2001/XMLSchema#",
  rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  owl: "http://www.w3.org/2002/07/owl#",
  sh: "http://www.w3.org/ns/shacl#",
  schema: "https://schema.org/",
};

export interface ConverterOptions {
  vocab: string;
  prefixes: Record<string, string>;
  vocabFallback: boolean;
  arrays: "set" | "list";
  uriAs: "id" | "anyURI";
  enumAsIri: boolean;
  addTypes: boolean;
  rootClass?: string;
  validate: boolean;
  format: "json" | "yaml";
  pointer?: string;
}

export type ConverterOptionsInput = Partial<ConverterOptions>;

const DEFAULTS: ConverterOptions = {
  vocab: "https://streamgraph.local/vocab/",
  prefixes: {},
  vocabFallback: true,
  arrays: "set",
  uriAs: "id",
  enumAsIri: false,
  addTypes: true,
  validate: true,
  format: "json",
};

function isAbsoluteIri(value: string): boolean {
  return /^[A-Za-z][A-Za-z0-9+.-]*:/.test(value);
}

export function normalizeOptions(input: ConverterOptionsInput = {}): ConverterOptions {
  const opts: ConverterOptions = {
    ...DEFAULTS,
    ...input,
    prefixes: { ...(input.prefixes ?? {}) },
  };

  if (!isAbsoluteIri(opts.vocab) || !(opts.vocab.endsWith("/") || opts.vocab.endsWith("#"))) {
    throw new JsonLdSchemaError(
      "E_BAD_OPTION",
      "/vocab",
      `vocab must be an absolute IRI ending in '/' or '#', got ${JSON.stringify(opts.vocab)}`,
    );
  }

  if (opts.arrays !== "set" && opts.arrays !== "list") {
    throw new JsonLdSchemaError("E_BAD_OPTION", "/arrays", `arrays must be "set" or "list"`);
  }
  if (opts.uriAs !== "id" && opts.uriAs !== "anyURI") {
    throw new JsonLdSchemaError("E_BAD_OPTION", "/uriAs", `uriAs must be "id" or "anyURI"`);
  }
  if (opts.format !== "json" && opts.format !== "yaml") {
    throw new JsonLdSchemaError("E_BAD_OPTION", "/format", `format must be "json" or "yaml"`);
  }

  for (const [prefix, iri] of Object.entries(opts.prefixes)) {
    if (!prefix || prefix.includes(":") || prefix.includes("/")) {
      throw new JsonLdSchemaError("E_BAD_OPTION", `/prefixes/${prefix}`, `bad prefix name`);
    }
    if (typeof iri !== "string" || !isAbsoluteIri(iri)) {
      throw new JsonLdSchemaError(
        "E_BAD_OPTION",
        `/prefixes/${prefix}`,
        `prefix IRI must be absolute`,
      );
    }
  }

  return opts;
}

export function isAbsoluteIriPublic(value: string): boolean {
  return isAbsoluteIri(value);
}
