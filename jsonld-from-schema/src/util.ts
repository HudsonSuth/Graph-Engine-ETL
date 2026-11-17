import { JsonLdSchemaError } from "./errors.js";

/** Percent-encode for vocab term IRIs: keep unreserved A-Za-z0-9-._~ */
export function pctEncode(name: string): string {
  let out = "";
  for (const ch of name) {
    if (/[A-Za-z0-9\-._~]/.test(ch)) {
      out += ch;
    } else {
      const bytes = Buffer.from(ch, "utf8");
      for (const b of bytes) {
        out += "%" + b.toString(16).toUpperCase().padStart(2, "0");
      }
    }
  }
  return out;
}

export function pascalCase(input: string): string {
  const parts = input
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return parts.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function pointerJoin(base: string, ...parts: (string | number)[]): string {
  let p = base === "" ? "" : base;
  for (const part of parts) {
    const seg = String(part).replace(/~/g, "~0").replace(/\//g, "~1");
    p += "/" + seg;
  }
  return p || "";
}

export function getByPointer(doc: unknown, pointer: string): unknown {
  if (pointer === "" || pointer === "/") {
    return pointer === "/" ? undefined : doc;
  }
  if (!pointer.startsWith("/")) {
    throw new JsonLdSchemaError("E_SCHEMA_INVALID", pointer, `bad JSON pointer: ${pointer}`);
  }
  const parts = pointer
    .slice(1)
    .split("/")
    .map((s) => s.replace(/~1/g, "/").replace(/~0/g, "~"));
  let cur: unknown = doc;
  for (const part of parts) {
    if (Array.isArray(cur)) {
      const idx = Number(part);
      if (!Number.isInteger(idx) || idx < 0 || idx >= cur.length) {
        throw new JsonLdSchemaError("E_SCHEMA_INVALID", pointer, `pointer does not resolve`);
      }
      cur = cur[idx];
    } else if (isPlainObject(cur) && Object.prototype.hasOwnProperty.call(cur, part)) {
      cur = cur[part];
    } else {
      throw new JsonLdSchemaError("E_SCHEMA_INVALID", pointer, `pointer does not resolve`);
    }
  }
  return cur;
}

const LD_KEYWORD_ORDER = [
  "@context",
  "@version",
  "@base",
  "@vocab",
  "@id",
  "@type",
  "@container",
  "@json",
] as const;

export function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (!isPlainObject(value)) {
    return value;
  }
  const keys = Object.keys(value);
  keys.sort((a, b) => {
    const ai = (LD_KEYWORD_ORDER as readonly string[]).indexOf(a);
    const bi = (LD_KEYWORD_ORDER as readonly string[]).indexOf(b);
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    }
    return a < b ? -1 : a > b ? 1 : 0;
  });
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    out[k] = sortKeysDeep(value[k]);
  }
  return out;
}

export function serializeJson(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value), null, 2) + "\n";
}

export function isAbsoluteIriValue(value: string): boolean {
  if (/^urn:/i.test(value)) return true;
  return /^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(value);
}

export function looksLikeAbsoluteIri(value: string): boolean {
  return /^[A-Za-z][A-Za-z0-9+.-]*:/.test(value);
}

export const ENUM_IRI_PATTERN = /^[A-Za-z_][A-Za-z0-9_.-]*$/;

export const TYPE_DETERMINING_KEYS = new Set([
  "type",
  "format",
  "properties",
  "items",
  "prefixItems",
  "enum",
  "const",
  "$ref",
  "contentEncoding",
  "x-jsonld",
  "allOf",
  "anyOf",
  "oneOf",
  "if",
  "then",
  "else",
  "not",
]);

export function hasTypeDeterminingKeyword(schema: Record<string, unknown>): boolean {
  for (const k of Object.keys(schema)) {
    if (TYPE_DETERMINING_KEYS.has(k)) return true;
  }
  return false;
}

export function draftFromSchema(schema: Record<string, unknown>): "2020-12" | "draft-07" {
  const s = schema.$schema;
  if (typeof s === "string") {
    if (s.includes("draft-07") || s.includes("draft-06") || s.includes("draft-04")) {
      return "draft-07";
    }
  }
  return "2020-12";
}
