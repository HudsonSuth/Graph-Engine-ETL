import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { toContext, JsonLdSchemaError } from "../src/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) =>
  JSON.parse(readFileSync(join(here, "fixtures", name), "utf8"));

describe("context generation", () => {
  it("C-01: @version 1.1, xsd prefix, @vocab when vocabFallback", () => {
    const r = toContext({
      type: "object",
      properties: { a: { type: "string" } },
    });
    const ctx = r.document["@context"] as Record<string, unknown>;
    expect(ctx["@version"]).toBe(1.1);
    expect(ctx.xsd).toBe("http://www.w3.org/2001/XMLSchema#");
    expect(ctx["@vocab"]).toBe("https://streamgraph.local/vocab/");
    const r2 = toContext(
      { type: "object", properties: { a: { type: "string" } } },
      { vocabFallback: false },
    );
    expect((r2.document["@context"] as object)["@vocab" as keyof object]).toBeUndefined();
  });

  it("C-02: property terms get vocab + pctEncode", () => {
    const r = toContext({
      type: "object",
      properties: { "hello world": { type: "string" }, ok: { type: "string" } },
    });
    const ctx = r.document["@context"] as Record<string, any>;
    expect(ctx.ok["@id"]).toBe("https://streamgraph.local/vocab/ok");
    expect(ctx["hello world"]["@id"]).toBe(
      "https://streamgraph.local/vocab/hello%20world",
    );
  });

  it("C-03: type and format coercion", () => {
    const r = toContext({
      type: "object",
      properties: {
        i: { type: "integer" },
        n: { type: "number" },
        b: { type: "boolean" },
        dt: { type: "string", format: "date-time" },
        d: { format: "date" },
        t: { format: "time" },
        dur: { format: "duration" },
        u: { format: "uri" },
        bin: { type: "string", contentEncoding: "base64" },
        s: { type: "string" },
      },
    });
    const ctx = r.document["@context"] as Record<string, any>;
    expect(ctx.i["@type"]).toBe("xsd:integer");
    expect(ctx.n["@type"]).toBe("xsd:double");
    expect(ctx.b["@type"]).toBe("xsd:boolean");
    expect(ctx.dt["@type"]).toBe("xsd:dateTime");
    expect(ctx.d["@type"]).toBe("xsd:date");
    expect(ctx.t["@type"]).toBe("xsd:time");
    expect(ctx.dur["@type"]).toBe("xsd:duration");
    expect(ctx.u["@type"]).toBe("@id");
    expect(ctx.bin["@type"]).toBe("xsd:base64Binary");
    expect(ctx.s["@type"]).toBeUndefined();

    const r2 = toContext(
      { type: "object", properties: { u: { format: "iri" } } },
      { uriAs: "anyURI" },
    );
    expect((r2.document["@context"] as any).u["@type"]).toBe("xsd:anyURI");
  });

  it("C-04: nullable unwrap; union warns", () => {
    const r = toContext({
      type: "object",
      properties: {
        a: { type: ["integer", "null"] },
        b: { anyOf: [{ type: "string", format: "date" }, { type: "null" }] },
        c: { type: ["string", "integer"] },
      },
    });
    const ctx = r.document["@context"] as Record<string, any>;
    expect(ctx.a["@type"]).toBe("xsd:integer");
    expect(ctx.b["@type"]).toBe("xsd:date");
    expect(ctx.c["@type"]).toBeUndefined();
    expect(r.warnings.some((w) => w.code === "W_UNION_TYPE")).toBe(true);
  });

  it("C-05: arrays set/list and tuples", () => {
    const r = toContext({
      type: "object",
      properties: {
        tags: { type: "array", items: { type: "string" } },
        nums: { type: "array", items: { type: "integer" } },
        tup: {
          type: "array",
          prefixItems: [{ type: "integer" }, { type: "integer" }],
        },
        mixed: {
          type: "array",
          prefixItems: [{ type: "integer" }, { type: "string" }],
        },
      },
    });
    const ctx = r.document["@context"] as Record<string, any>;
    expect(ctx.tags["@container"]).toBe("@set");
    expect(ctx.nums["@type"]).toBe("xsd:integer");
    expect(ctx.tup["@container"]).toBe("@list");
    expect(ctx.tup["@type"]).toBe("xsd:integer");
    expect(ctx.mixed["@type"]).toBeUndefined();
    expect(r.warnings.some((w) => w.code === "W_MIXED_TUPLE")).toBe(true);

    const r2 = toContext(
      { type: "object", properties: { tags: { type: "array", items: { type: "string" } } } },
      { arrays: "list" },
    );
    expect((r2.document["@context"] as any).tags["@container"]).toBe("@list");
  });

  it("C-06: nested arrays → @json", () => {
    const r = toContext({
      type: "object",
      properties: {
        grid: { type: "array", items: { type: "array", items: { type: "number" } } },
      },
    });
    const ctx = r.document["@context"] as Record<string, any>;
    expect(ctx.grid["@type"]).toBe("@json");
    expect(r.warnings.some((w) => w.code === "W_NESTED_ARRAY")).toBe(true);
  });

  it("C-07: property-scoped context", () => {
    const r = toContext({
      type: "object",
      properties: {
        payload: {
          type: "object",
          properties: {
            id: { type: "string" },
            seq: { type: "integer" },
          },
        },
        seq: { type: "integer" },
      },
    });
    const ctx = r.document["@context"] as Record<string, any>;
    expect(ctx.payload["@context"]).toBeDefined();
    expect(ctx.payload["@context"].id["@id"]).toContain("id");
    // seq same as inherited — may be omitted from scoped context
    const scoped = ctx.payload["@context"];
    if (scoped.seq) {
      expect(scoped.seq["@type"]).toBe("xsd:integer");
    }
  });

  it("C-08: free-form object → @json", () => {
    const r = toContext({
      type: "object",
      properties: {
        props: { type: "object", additionalProperties: true },
      },
    });
    expect((r.document["@context"] as any).props["@type"]).toBe("@json");
  });

  it("C-09: local $ref resolution and cyclic without scoped context", () => {
    const schema = {
      $defs: {
        Node: {
          type: "object",
          properties: {
            name: { type: "string" },
            child: { $ref: "#/$defs/Node" },
          },
        },
      },
      type: "object",
      properties: {
        root: { $ref: "#/$defs/Node" },
      },
    };
    const r = toContext(schema);
    const ctx = r.document["@context"] as Record<string, any>;
    expect(ctx.root["@context"].name).toBeDefined();
    // cyclic child should not deepen forever; no or empty scoped context on child
    const child = ctx.root["@context"].child;
    expect(child["@id"]).toBeDefined();
  });

  it("C-10: class naming", () => {
    const r = toContext({
      title: "person record",
      type: "object",
      properties: {
        addr: {
          title: "postal address",
          type: "object",
          properties: { city: { type: "string" } },
        },
      },
    });
    expect(r.text).toContain("city");
  });

  it("C-11: enumAsIri", () => {
    const r = toContext(
      {
        type: "object",
        properties: {
          from: { type: "string", enum: ["graph", "cache"] },
          bad: { type: "string", enum: ["no spaces ok", "x"] },
        },
      },
      { enumAsIri: true },
    );
    const ctx = r.document["@context"] as Record<string, any>;
    expect(ctx.from["@type"]).toBe("@vocab");
    expect(ctx.from["@context"].graph).toContain("/from/graph");
    expect(r.warnings.some((w) => w.code === "W_ENUM_NOT_IRI")).toBe(true);
  });

  it("C-12/C-13: hints override and exclude", () => {
    const r = toContext({
      type: "object",
      properties: {
        name: {
          type: "string",
          "x-jsonld": { "@id": "schema:name", "@type": "xsd:string" },
        },
        secret: { type: "string", "x-jsonld": false },
      },
    });
    const ctx = r.document["@context"] as Record<string, any>;
    expect(ctx.name["@id"]).toBe("schema:name");
    expect(ctx.schema).toBe("https://schema.org/");
    expect(ctx.secret).toBeNull();
  });

  it("C-14: unmappable names and @ property error", () => {
    const r = toContext({
      type: "object",
      properties: {
        "a:b": { type: "string" },
        "": { type: "string" },
      },
    });
    expect(r.warnings.some((w) => w.code === "W_UNMAPPABLE_NAME")).toBe(true);
    expect(() =>
      toContext({ type: "object", properties: { "@id": { type: "string" } } }),
    ).toThrow(JsonLdSchemaError);
  });

  it("C-16/C-16b: conflict vs refinement", () => {
    const r = toContext({
      type: "object",
      properties: { payload: { type: "object", properties: { id: { type: "string" } } } },
      anyOf: [
        { properties: { payload: { type: "integer" } } },
        { properties: { payload: { type: "string" } } },
      ],
    });
    expect(r.warnings.some((w) => w.code === "W_CONFLICT")).toBe(true);

    const r2 = toContext({
      type: "object",
      properties: {
        payload: { type: "object", properties: { id: { type: "string" } } },
      },
      if: { properties: { eventType: { const: "x" } } },
      then: {},
      else: {
        properties: {
          payload: { required: ["id"] },
        },
      },
    });
    const ctx = r2.document["@context"] as Record<string, any>;
    expect(ctx.payload["@context"]).toBeDefined();
    expect(r2.warnings.some((w) => w.code === "W_CONFLICT")).toBe(false);
  });

  it("C-18: prefix shadowing", () => {
    const r = toContext({
      type: "object",
      properties: {
        xsd: { type: "string" },
        when: { type: "string", format: "date-time" },
      },
    });
    const ctx = r.document["@context"] as Record<string, any>;
    expect(ctx.xsd).toBeDefined();
    // prefix xsd should not be emitted as prefix mapping when shadowed — property wins
    // The property term is an object; the prefix would be a string IRI. After C-18, prefix absent.
    expect(typeof ctx.xsd).toBe("object");
    expect(r.warnings.some((w) => w.code === "W_PREFIX_SHADOWED")).toBe(true);
    expect(ctx.when["@type"]).toBe("http://www.w3.org/2001/XMLSchema#dateTime");
  });

  it("D-01: deterministic sorted JSON", () => {
    const schema = {
      type: "object",
      properties: { b: { type: "string" }, a: { type: "integer" } },
    };
    const t1 = toContext(schema).text;
    const t2 = toContext(schema).text;
    expect(t1).toBe(t2);
    expect(t1.endsWith("\n")).toBe(true);
    const keys = Object.keys(JSON.parse(t1)["@context"]);
    expect(keys[0]).toBe("@version");
  });
});

describe("fixtures F-01", () => {
  it("graph-events event schemas produce contexts", () => {
    const doc = fixture("graph-events.v1.json");
    const pointers = [
      "/properties/events/properties/node.upsert",
      "/properties/events/properties/node.delete",
      "/properties/events/properties/edge.upsert",
      "/properties/command",
      "/properties/commandResult",
      "/properties/stateRecord",
    ];
    for (const pointer of pointers) {
      const r = toContext(doc, { pointer });
      const ctx = r.document["@context"] as Record<string, any>;
      expect(ctx["@version"]).toBe(1.1);
      if (pointer.includes("node.upsert") || pointer.includes("command")) {
        expect(ctx.eventTime?.["@type"] || ctx.seq?.["@type"]).toBeTruthy();
      }
    }
    const upsert = toContext(doc, {
      pointer: "/properties/events/properties/node.upsert",
    });
    const ctx = upsert.document["@context"] as Record<string, any>;
    expect(ctx.eventTime["@type"]).toBe("xsd:dateTime");
    expect(ctx.seq["@type"]).toBe("xsd:integer");
    expect(ctx.payload["@context"]).toBeDefined();
    expect(ctx.payload["@context"].properties["@type"]).toBe("@json");
  });
});
