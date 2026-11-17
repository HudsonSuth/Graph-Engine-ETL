import { JsonLdSchemaError } from "./errors.js";
import { BUILTIN_PREFIXES } from "./options.js";
import { isPlainObject, looksLikeAbsoluteIri } from "./util.js";

export interface PropertyHint {
  "@id"?: string;
  "@type"?: string;
  "@container"?: "@set" | "@list";
}

export interface ClassHint {
  "@type"?: string;
  "@idProperty"?: string;
  "@idPrefix"?: string;
}

export interface RootHint extends ClassHint {
  "@vocab"?: string;
  "@prefixes"?: Record<string, string>;
}

const PROPERTY_KEYS = new Set(["@id", "@type", "@container"]);
const CLASS_KEYS = new Set(["@type", "@idProperty", "@idPrefix"]);
const ROOT_KEYS = new Set(["@type", "@idProperty", "@idPrefix", "@vocab", "@prefixes"]);

const VALID_TYPE_SPECIAL = new Set(["@id", "@vocab", "@json"]);
const VALID_CONTAINER = new Set(["@set", "@list"]);

export function parseCurieOrIri(
  value: string,
  knownPrefixes: Record<string, string>,
  path: string,
): { kind: "curie" | "iri"; value: string; prefix?: string } {
  if (value.includes(":")) {
    const idx = value.indexOf(":");
    const prefix = value.slice(0, idx);
    const rest = value.slice(idx + 1);
    // Absolute IRI with scheme:// or urn:
    if (looksLikeAbsoluteIri(value) && (value.includes("://") || value.startsWith("urn:"))) {
      return { kind: "iri", value };
    }
    // CURIE: prefix:local — prefix must be known and local must not start with //
    if (!rest.startsWith("//") && !value.startsWith("urn:")) {
      const all = { ...BUILTIN_PREFIXES, ...knownPrefixes };
      if (!(prefix in all)) {
        throw new JsonLdSchemaError("E_BAD_HINT", path, `unknown CURIE prefix: ${prefix}`);
      }
      return { kind: "curie", value, prefix };
    }
    if (!looksLikeAbsoluteIri(value)) {
      throw new JsonLdSchemaError("E_BAD_HINT", path, `non-absolute IRI: ${value}`);
    }
    return { kind: "iri", value };
  }
  if (!looksLikeAbsoluteIri(value)) {
    throw new JsonLdSchemaError("E_BAD_HINT", path, `non-absolute IRI: ${value}`);
  }
  return { kind: "iri", value };
}

function validateTypeValue(
  value: unknown,
  knownPrefixes: Record<string, string>,
  path: string,
): string {
  if (typeof value !== "string") {
    throw new JsonLdSchemaError("E_BAD_HINT", path, `@type must be a string`);
  }
  if (VALID_TYPE_SPECIAL.has(value)) return value;
  // xsd CURIE/IRI or class IRI/CURIE
  parseCurieOrIri(value, knownPrefixes, path);
  return value;
}

export function parsePropertyHint(
  raw: unknown,
  path: string,
  knownPrefixes: Record<string, string>,
): PropertyHint | false {
  if (raw === false) return false;
  if (!isPlainObject(raw)) {
    throw new JsonLdSchemaError("E_BAD_HINT", path, `x-jsonld must be an object or false`);
  }
  for (const key of Object.keys(raw)) {
    if (!PROPERTY_KEYS.has(key)) {
      throw new JsonLdSchemaError("E_BAD_HINT", path, `unknown hint key: ${key}`);
    }
  }
  const out: PropertyHint = {};
  if ("@id" in raw) {
    if (typeof raw["@id"] !== "string") {
      throw new JsonLdSchemaError("E_BAD_HINT", path, `@id must be a string`);
    }
    parseCurieOrIri(raw["@id"], knownPrefixes, path + "/@id");
    out["@id"] = raw["@id"];
  }
  if ("@type" in raw) {
    out["@type"] = validateTypeValue(raw["@type"], knownPrefixes, path + "/@type");
  }
  if ("@container" in raw) {
    const c = raw["@container"];
    if (typeof c !== "string" || !VALID_CONTAINER.has(c)) {
      throw new JsonLdSchemaError("E_BAD_HINT", path, `invalid @container`);
    }
    out["@container"] = c as "@set" | "@list";
  }
  return out;
}

export function parseClassHint(
  raw: unknown,
  path: string,
  knownPrefixes: Record<string, string>,
  root = false,
): ClassHint | RootHint | undefined {
  if (raw === undefined) return undefined;
  if (raw === false) {
    throw new JsonLdSchemaError("E_BAD_HINT", path, `x-jsonld false is only valid on properties`);
  }
  if (!isPlainObject(raw)) {
    throw new JsonLdSchemaError("E_BAD_HINT", path, `x-jsonld must be an object`);
  }
  const allowed = root ? ROOT_KEYS : CLASS_KEYS;
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) {
      // Property-like keys on a class schema are still invalid if unknown for class
      if (!PROPERTY_KEYS.has(key) && !allowed.has(key)) {
        throw new JsonLdSchemaError("E_BAD_HINT", path, `unknown hint key: ${key}`);
      }
      if (!allowed.has(key) && !CLASS_KEYS.has(key) && !(root && ROOT_KEYS.has(key))) {
        // Allow @id/@container only on property schemas; on class/root reject them unless root specials
        if (key === "@id" || key === "@container") {
          throw new JsonLdSchemaError("E_BAD_HINT", path, `unknown hint key: ${key}`);
        }
      }
    }
  }
  // Stricter: only allowed keys
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) {
      throw new JsonLdSchemaError("E_BAD_HINT", path, `unknown hint key: ${key}`);
    }
  }

  const out: RootHint = {};
  if ("@type" in raw) {
    if (typeof raw["@type"] !== "string") {
      throw new JsonLdSchemaError("E_BAD_HINT", path, `@type must be a string`);
    }
    parseCurieOrIri(raw["@type"] as string, knownPrefixes, path + "/@type");
    out["@type"] = raw["@type"] as string;
  }
  if ("@idProperty" in raw) {
    if (typeof raw["@idProperty"] !== "string") {
      throw new JsonLdSchemaError("E_BAD_HINT", path, `@idProperty must be a string`);
    }
    out["@idProperty"] = raw["@idProperty"] as string;
  }
  if ("@idPrefix" in raw) {
    if (typeof raw["@idPrefix"] !== "string" || !looksLikeAbsoluteIri(raw["@idPrefix"] as string)) {
      throw new JsonLdSchemaError("E_BAD_HINT", path, `@idPrefix must be an absolute IRI`);
    }
    out["@idPrefix"] = raw["@idPrefix"] as string;
  }
  if (root && "@vocab" in raw) {
    if (typeof raw["@vocab"] !== "string" || !looksLikeAbsoluteIri(raw["@vocab"] as string)) {
      throw new JsonLdSchemaError("E_BAD_HINT", path, `@vocab must be an absolute IRI`);
    }
    const v = raw["@vocab"] as string;
    if (!(v.endsWith("/") || v.endsWith("#"))) {
      throw new JsonLdSchemaError("E_BAD_HINT", path, `@vocab must end in / or #`);
    }
    out["@vocab"] = v;
  }
  if (root && "@prefixes" in raw) {
    if (!isPlainObject(raw["@prefixes"])) {
      throw new JsonLdSchemaError("E_BAD_HINT", path, `@prefixes must be an object`);
    }
    const prefixes: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw["@prefixes"] as Record<string, unknown>)) {
      if (typeof v !== "string" || !looksLikeAbsoluteIri(v)) {
        throw new JsonLdSchemaError("E_BAD_HINT", path + "/@prefixes/" + k, `bad prefix IRI`);
      }
      prefixes[k] = v;
    }
    out["@prefixes"] = prefixes;
  }
  return out;
}
