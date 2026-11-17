export type ErrorCode =
  | "E_BAD_OPTION"
  | "E_BAD_REF"
  | "E_EXTERNAL_REF"
  | "E_KEYWORD_PROPERTY"
  | "E_BAD_HINT"
  | "E_INVALID_INSTANCE"
  | "E_REMOTE_CONTEXT"
  | "E_SCHEMA_INVALID"
  | "E_KEYWORD_IN_INSTANCE";

export type WarningCode =
  | "W_UNION_TYPE"
  | "W_MIXED_TUPLE"
  | "W_NESTED_ARRAY"
  | "W_ENUM_NOT_IRI"
  | "W_UNMAPPABLE_NAME"
  | "W_CONFLICT"
  | "W_PREFIX_SHADOWED"
  | "W_COMPOSITION_STATIC"
  | "W_CONDITIONAL"
  | "W_UNMAPPED_KEYS"
  | "W_IGNORED_KEYWORD";

export class JsonLdSchemaError extends Error {
  readonly code: ErrorCode;
  readonly path: string;
  readonly details?: unknown;

  constructor(code: ErrorCode, path: string, message: string, details?: unknown) {
    super(message);
    this.name = "JsonLdSchemaError";
    this.code = code;
    this.path = path;
    this.details = details;
  }
}

export interface Warning {
  code: WarningCode;
  path: string;
  message: string;
}

export function sortWarnings(warnings: Warning[]): Warning[] {
  return [...warnings].sort((a, b) => {
    const pc = a.path < b.path ? -1 : a.path > b.path ? 1 : 0;
    if (pc !== 0) return pc;
    return a.code < b.code ? -1 : a.code > b.code ? 1 : 0;
  });
}
