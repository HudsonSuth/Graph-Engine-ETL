import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  annotate,
  annotateToNQuads,
  toContext,
  toNQuads,
  JsonLdSchemaError,
} from "../src/index.js";
import { normalizeOptions } from "../src/options.js";
import { parse as parseYaml } from "yaml";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) =>
  JSON.parse(readFileSync(join(here, "fixtures", name), "utf8"));

describe("annotation A-*", () => {
  const schema = {
    title: "Event",
    type: "object",
    required: ["eventTime", "seq"],
    properties: {
      eventTime: { type: "string", format: "date-time" },
      seq: { type: "integer" },
      payload: {
        type: "object",
        properties: {
          id: { type: "string" },
          properties: { type: "object", additionalProperties: true },
        },
      },
    },
    "x-jsonld": {
      "@idProperty": "seq",
      "@idPrefix": "https://streamgraph.local/events/",
    },
  };

  it("A-01/E-05: invalid instance errors", () => {
    expect(() => annotate({ seq: "nope" }, schema)).toThrow(JsonLdSchemaError);
    try {
      annotate({ seq: "nope" }, schema);
    } catch (e) {
      expect((e as JsonLdSchemaError).code).toBe("E_INVALID_INSTANCE");
    }
  });

  it("A-02/A-03/A-04: context embedded, types, @id", () => {
    const r = annotate(
      {
        eventTime: "2026-11-16T10:00:00Z",
        seq: 7,
        payload: { id: "n1", properties: { a: 1 } },
      },
      schema,
    );
    expect(r.document["@context"]).toBeDefined();
    expect(r.document["@type"]).toContain("Event");
    expect(r.document["@id"]).toBe("https://streamgraph.local/events/7");
    expect((r.document.payload as any)["@type"]).toBeUndefined(); // untitled nested may still get type if titled
  });

  it("A-05/E-08: @ key in instance", () => {
    expect(() =>
      annotate(
        { eventTime: "2026-11-16T10:00:00Z", seq: 1, "@foo": 1 },
        schema,
        { validate: false },
      ),
    ).toThrow(JsonLdSchemaError);
    try {
      annotate(
        { eventTime: "2026-11-16T10:00:00Z", seq: 1, "@foo": 1 },
        schema,
        { validate: false },
      );
    } catch (e) {
      expect((e as JsonLdSchemaError).code).toBe("E_KEYWORD_IN_INSTANCE");
    }
  });

  it("A-06: YAML-LD double-quoted strings", () => {
    const r = annotate(
      { eventTime: "2026-11-16T10:00:00Z", seq: 1 },
      schema,
      { format: "yaml" },
    );
    expect(r.text).toContain('"2026-11-16T10:00:00Z"');
    const doc = parseYaml(r.text);
    expect(doc.eventTime).toBe("2026-11-16T10:00:00Z");
    expect(typeof doc.seq).toBe("number");
  });

  it("A-07/A-09: N-Quads stable with typed literals", async () => {
    const { nquads } = await annotateToNQuads(
      { eventTime: "2026-11-16T10:00:00Z", seq: 1 },
      schema,
    );
    const again = await annotateToNQuads(
      { eventTime: "2026-11-16T10:00:00Z", seq: 1 },
      schema,
    );
    expect(nquads).toBe(again.nquads);
    expect(nquads).toMatch(/dateTime|XMLSchema#dateTime/);
  });

  it("A-08: x-jsonld does not affect validation", () => {
    const s = {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string", "x-jsonld": { "@id": "schema:name" } },
      },
    };
    expect(() => annotate({ name: "x" }, s)).not.toThrow();
  });

  it("E-06: remote context refused", async () => {
    await expect(
      toNQuads({
        "@context": "https://example.com/context.jsonld",
        name: "x",
      }),
    ).rejects.toMatchObject({ code: "E_REMOTE_CONTEXT" });
  });
});

function expectCode(fn: () => unknown, code: string) {
  try {
    fn();
    expect.fail("expected throw");
  } catch (e) {
    expect(e).toBeInstanceOf(JsonLdSchemaError);
    expect((e as JsonLdSchemaError).code).toBe(code);
  }
}

describe("errors E-*", () => {
  it("E-01: bad options", () => {
    expectCode(() => normalizeOptions({ vocab: "not-absolute" }), "E_BAD_OPTION");
    expectCode(() => normalizeOptions({ arrays: "bag" as any }), "E_BAD_OPTION");
  });

  it("E-02: bad / external ref", () => {
    expectCode(
      () => toContext({ type: "object", properties: { a: { $ref: "#/$defs/Missing" } } }),
      "E_BAD_REF",
    );
    expectCode(
      () =>
        toContext({
          type: "object",
          properties: { a: { $ref: "https://example.com/schema.json" } },
        }),
      "E_EXTERNAL_REF",
    );
  });

  it("E-04: bad hint", () => {
    expectCode(
      () =>
        toContext({
          type: "object",
          properties: { a: { type: "string", "x-jsonld": { "@foo": 1 } } },
        }),
      "E_BAD_HINT",
    );
  });

  it("E-07: invalid schema / pointer", () => {
    expectCode(() => toContext("nope" as any), "E_SCHEMA_INVALID");
    expectCode(
      () => toContext({ type: "object" }, { pointer: "/missing" }),
      "E_SCHEMA_INVALID",
    );
  });
});

describe("fixtures F-02", () => {
  it("node.upsert annotates and N-Quads contain typed eventTime", async () => {
    const schema = fixture("graph-events.v1.json");
    const instance = fixture("node.upsert.instance.json");
    const { nquads, document } = await annotateToNQuads(instance, schema, {
      pointer: "/properties/events/properties/node.upsert",
    });
    expect(document["@context"]).toBeDefined();
    expect(nquads).toMatch(/2026-11-16T10:00:00Z/);
    expect(nquads).toMatch(/dateTime|XMLSchema#dateTime/);
    const again = await annotateToNQuads(instance, schema, {
      pointer: "/properties/events/properties/node.upsert",
    });
    expect(nquads).toBe(again.nquads);
  });
});
