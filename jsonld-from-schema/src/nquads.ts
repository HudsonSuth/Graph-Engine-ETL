import jsonld from "jsonld";
import { JsonLdSchemaError } from "./errors.js";

const offlineLoader = async (url: string) => {
  throw new JsonLdSchemaError(
    "E_REMOTE_CONTEXT",
    "",
    `remote context refused: ${url}`,
  );
};

export async function toNQuads(doc: Record<string, unknown>): Promise<string> {
  try {
    const nquads = await jsonld.canonize(doc, {
      algorithm: "URDNA2015",
      format: "application/n-quads",
      documentLoader: offlineLoader,
    });
    return typeof nquads === "string" ? nquads : String(nquads);
  } catch (e) {
    if (e instanceof JsonLdSchemaError) throw e;
    // jsonld may wrap loader errors
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("E_REMOTE_CONTEXT") || msg.includes("remote context")) {
      throw new JsonLdSchemaError("E_REMOTE_CONTEXT", "", msg);
    }
    throw e;
  }
}
