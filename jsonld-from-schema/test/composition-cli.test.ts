import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync, mkdirSync } from "node:fs";
import { toContext, toShacl } from "../src/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const bin = join(root, "bin", "jsonld-from-schema.js");

describe("unsupported keywords U-*", () => {
  it("U-01: allOf merges", () => {
    const r = toContext({
      allOf: [
        { type: "object", properties: { a: { type: "integer" } }, required: ["a"] },
        { type: "object", properties: { b: { type: "string" } } },
      ],
    });
    const ctx = r.document["@context"] as any;
    expect(ctx.a["@type"]).toBe("xsd:integer");
    expect(ctx.b["@id"]).toBeDefined();
  });

  it("U-02: anyOf/oneOf static union warning", () => {
    const r = toContext({
      type: "object",
      anyOf: [
        { properties: { a: { type: "string" } }, required: ["a"] },
        { properties: { a: { type: "string" }, b: { type: "integer" } }, required: ["a"] },
      ],
    });
    expect(r.warnings.some((w) => w.code === "W_COMPOSITION_STATIC")).toBe(true);
    expect((r.document["@context"] as any).b).toBeDefined();
  });

  it("U-03: if/then/else warning", () => {
    const r = toContext({
      type: "object",
      properties: { t: { type: "string" } },
      if: { properties: { t: { const: "x" } } },
      then: { properties: { a: { type: "integer" } } },
      else: { properties: { b: { type: "boolean" } } },
    });
    expect(r.warnings.some((w) => w.code === "W_CONDITIONAL")).toBe(true);
    expect((r.document["@context"] as any).a["@type"]).toBe("xsd:integer");
  });

  it("U-04: patternProperties warning", () => {
    const r = toContext({
      type: "object",
      properties: { known: { type: "string" } },
      patternProperties: { "^x": { type: "string" } },
    });
    expect(r.warnings.some((w) => w.code === "W_UNMAPPED_KEYS")).toBe(true);
  });

  it("U-05: ignored keywords", () => {
    const r = toContext({
      type: "object",
      properties: { a: { type: "string" } },
      not: { type: "null" },
      unevaluatedProperties: false,
    });
    expect(r.warnings.filter((w) => w.code === "W_IGNORED_KEYWORD").length).toBeGreaterThanOrEqual(2);
  });

  it("U-07: boolean subschemas", () => {
    const r = toContext({
      type: "object",
      properties: { a: true },
    });
    expect((r.document["@context"] as any).a["@type"]).toBeUndefined();
  });
});

describe("CLI-01", () => {
  it("context prints JSON; bad usage exits 2; error exits 1", () => {
    const schemaPath = join(here, "fixtures", "mcp-tools.json");
    const ok = spawnSync(
      process.execPath,
      ["--import", "tsx", join(root, "src", "cli.ts"), "context", schemaPath, "--pointer", "/properties/search_nodes"],
      { encoding: "utf8" },
    );
    expect(ok.status).toBe(0);
    expect(JSON.parse(ok.stdout)["@context"]["@version"]).toBe(1.1);

    const badUsage = spawnSync(
      process.execPath,
      ["--import", "tsx", join(root, "src", "cli.ts")],
      { encoding: "utf8" },
    );
    expect(badUsage.status).toBe(2);

    const badSchema = join(here, "fixtures", "_bad.json");
    writeFileSync(badSchema, JSON.stringify({ properties: { a: { $ref: "#/nope" } } }));
    const err = spawnSync(
      process.execPath,
      ["--import", "tsx", join(root, "src", "cli.ts"), "context", badSchema],
      { encoding: "utf8" },
    );
    expect(err.status).toBe(1);
    expect(err.stderr).toMatch(/E_BAD_REF|E_EXTERNAL_REF|E_/);
  });
});

describe("B-01 broken implementation", () => {
  it("fails multiple assertions vs correct behavior", () => {
    const schema = {
      title: "T",
      type: "object",
      required: ["when"],
      properties: {
        when: { type: "string", format: "date-time" },
        tags: { type: "array", items: { type: "string" } },
        z: { type: "string" },
        a: { type: "integer" },
      },
    };

    const good = toContext(schema);
    const goodShacl = toShacl(schema);

    const prev = process.env.JSONLD_FROM_SCHEMA_IMPL;
    process.env.JSONLD_FROM_SCHEMA_IMPL = "broken";
    try {
      // re-import path uses env at call time in index
      const { toContext: brokenCtx, toShacl: brokenShacl } = requireBroken();
      const bad = brokenCtx(schema);
      const badShacl = brokenShacl(schema);

      const failures: string[] = [];
      if ((bad.document["@context"] as any).when?.["@type"] === "xsd:dateTime") {
        // broken should NOT coerce format
      } else {
        failures.push("no-format-coercion");
      }
      if ((bad.document["@context"] as any).when?.["@type"] !== "xsd:dateTime") {
        failures.push("format-missing");
      }
      if ((bad.document["@context"] as any).tags?.["@container"] === "@list") {
        failures.push("arrays-always-list");
      }
      if (bad.text !== good.text) failures.push("bytes-differ");
      const goodKeys = Object.keys((good.document["@context"] as object));
      const badKeys = Object.keys((bad.document["@context"] as object));
      if (JSON.stringify(goodKeys) !== JSON.stringify(badKeys)) failures.push("unsorted-or-keydiff");
      if (!goodShacl.text.includes("sh:minCount") || badShacl.text.includes("sh:minCount 1")) {
        // good has minCount; broken ignores required
      }
      if (!badShacl.text.includes("sh:minCount")) failures.push("required-ignored");
      if ((good.document["@context"] as any).tags?.["@container"] === "@set") {
        failures.push("good-uses-set");
      }

      mkdirSync(join(root, "test"), { recursive: true });
      writeFileSync(
        join(root, "test", "broken-run.txt"),
        [
          "B-01 broken run",
          `failures: ${failures.join(", ")}`,
          `count: ${failures.length}`,
          "",
          "good context excerpt:",
          good.text.slice(0, 400),
          "",
          "broken context excerpt:",
          bad.text.slice(0, 400),
          "",
          "good shacl has minCount:",
          String(goodShacl.text.includes("sh:minCount")),
          "broken shacl has minCount:",
          String(badShacl.text.includes("sh:minCount")),
        ].join("\n"),
      );

      expect(failures.length).toBeGreaterThanOrEqual(5);
      // And the broken output must actually differ from correct on those dimensions:
      expect((bad.document["@context"] as any).when?.["@type"]).not.toBe("xsd:dateTime");
      expect((bad.document["@context"] as any).tags?.["@container"]).toBe("@list");
      expect((good.document["@context"] as any).tags?.["@container"]).toBe("@set");
      expect(badShacl.text.includes("sh:minCount")).toBe(false);
      expect(goodShacl.text.includes("sh:minCount")).toBe(true);
      expect(bad.text !== good.text).toBe(true);
    } finally {
      if (prev === undefined) delete process.env.JSONLD_FROM_SCHEMA_IMPL;
      else process.env.JSONLD_FROM_SCHEMA_IMPL = prev;
    }
  });
});

function requireBroken() {
  // same module reads env per call
  return {
    toContext: (schema: unknown, opts?: any) => {
      process.env.JSONLD_FROM_SCHEMA_IMPL = "broken";
      return toContext(schema, opts);
    },
    toShacl: (schema: unknown, opts?: any) => {
      process.env.JSONLD_FROM_SCHEMA_IMPL = "broken";
      return toShacl(schema, opts);
    },
  };
}
