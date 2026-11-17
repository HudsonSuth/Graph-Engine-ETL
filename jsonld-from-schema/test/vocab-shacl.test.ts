import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { toShacl, toVocab } from "../src/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) =>
  JSON.parse(readFileSync(join(here, "fixtures", name), "utf8"));

describe("vocabulary V-*", () => {
  it("V-01/V-02/V-03: classes and properties", () => {
    const r = toVocab({
      title: "Person",
      description: "A person",
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string", description: "display name" },
        age: { type: "integer" },
        friend: {
          title: "Friend",
          type: "object",
          properties: { name: { type: "string" } },
        },
      },
    });
    expect(r.text).toContain("rdfs:Class");
    expect(r.text).toContain("owl:Class");
    expect(r.text).toContain("rdfs:label");
    expect(r.text).toContain("rdf:Property");
    expect(r.text).toContain("owl:DatatypeProperty");
    expect(r.text).toContain("owl:ObjectProperty");
    expect(r.text).toContain("rdfs:domain");
    expect(r.text).toContain("rdfs:range");
  });

  it("V-01: foreign IRIs never described", () => {
    const r = toVocab({
      type: "object",
      "x-jsonld": { "@type": "schema:Person" },
      properties: {
        name: { type: "string", "x-jsonld": { "@id": "schema:name" } },
      },
    });
    expect(r.text).not.toMatch(/schema:Person a rdfs:Class/);
    expect(r.text).not.toContain("<https://schema.org/Person>");
  });
});

describe("SHACL S-*", () => {
  it("S-01/S-02/S-03: shapes, counts, datatypes", () => {
    const r = toShacl({
      title: "Item",
      type: "object",
      required: ["name"],
      additionalProperties: false,
      properties: {
        name: { type: "string", minLength: 1, maxLength: 32, pattern: "^[A-Z]" },
        score: { type: "number", minimum: 0, exclusiveMaximum: 100.5 },
        tags: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5 },
        nested: {
          type: "object",
          properties: { x: { type: "integer" } },
        },
      },
    });
    expect(r.text).toContain("sh:NodeShape");
    expect(r.text).toContain("sh:targetClass");
    expect(r.text).toContain("sh:minCount");
    expect(r.text).toContain("sh:maxCount");
    expect(r.text).toContain("sh:datatype");
    expect(r.text).toContain("sh:pattern");
    expect(r.text).toContain("sh:minLength");
    expect(r.text).toContain("sh:closed");
    expect(r.text).toContain("sh:ignoredProperties");
    expect(r.text).toContain("-node");
  });

  it("S-04: enum → sh:in", () => {
    const r = toShacl({
      title: "T",
      type: "object",
      properties: {
        from: { type: "string", enum: ["graph", "cache", "both"] },
      },
    });
    expect(r.text).toContain("sh:in");
    expect(r.text).toContain("graph");
  });

  it("S-01: untitled nested uses -node suffix distinct from property shape", () => {
    const r = toShacl({
      title: "Root",
      type: "object",
      properties: {
        payload: {
          type: "object",
          properties: { id: { type: "string" } },
        },
      },
    });
    expect(r.text).toMatch(/payload-node/);
    expect(r.text).toMatch(/Shape-payload>/);
  });
});

describe("fixtures F-03", () => {
  it("MCP tool schemas produce vocab and shapes", () => {
    const doc = fixture("mcp-tools.json");
    for (const name of ["search_nodes", "upsert_edge", "get_state"]) {
      const pointer = `/properties/${name}`;
      const v = toVocab(doc, { pointer });
      const s = toShacl(doc, { pointer });
      expect(v.text.length).toBeGreaterThan(0);
      expect(s.text).toContain("sh:NodeShape");
    }
    const s = toShacl(doc, { pointer: "/properties/search_nodes" });
    expect(s.text).toContain("sh:in");
  });
});
