# Graph-Engine-ETL

This repository holds three projects side by side.

## StreamGraph

[StreamGraph](streamgraph/) is a clean-room, MIT-licensed streaming-to-graph ETL app with the Graph explorer, WebGPU renderer, OpenSearch search, and a Markdown wiki (Vault-LD and OKF). It is plain JavaScript for Node 24. Sources are files, HTTP APIs, Kafka, SQL, polling CDC, documents, and Markdown wiki folders. A schema maps those records into an embedded SQLite property graph. Live sync-out keeps Neo4j, Memgraph, PostgreSQL or Kafka in step with the graph, and an attribute-based access rules engine filters and masks the data.

```bash
cd streamgraph
npm ci
npm test
npm start
```

`npm start` serves the integrated app (studio, Graph explorer, and MCP) at http://127.0.0.1:8080. `npm run demo` is the original studio-only retail pipeline. Behavior, the HTTP API, the wiki, and known gaps are in [streamgraph/README.md](streamgraph/README.md) and [streamgraph/explore/WIKI.md](streamgraph/explore/WIKI.md). The license audit is [streamgraph/LICENSES.md](streamgraph/LICENSES.md) (project license: MIT).

StreamGraph can also run LLM models that you bring yourself, such as local Ollama, OpenAI-compatible endpoints or paid providers. They connect over MCP (the default) or through direct calls, with keys referenced from the environment and an export check before any data leaves the box. See [streamgraph/docs/llm-harness.md](streamgraph/docs/llm-harness.md). This covers phases L0–L1 of the LangChain + LangGraph plan; agent flows come later.

The Will It Run? catalog used by `npm run test:willitrun` and the saved-view browser tests is committed at `streamgraph/explore/demos/willitrun/fixture.json` (CC BY 4.0, attribution inside the file). Refresh it with `npm run fixtures:willitrun` when you want a newer snapshot. That fetch needs network access to https://willitrunllm.com.

A static Vercel demo of the studio and explorer UI is built with `npm run demo:vercel` (`streamgraph/demo/vercel-full/`). It reads `DEMO_PASSWORD` from the environment and fails closed when that is unset.

## JSON Schema to JSON-LD

[`jsonld-from-schema/`](jsonld-from-schema/) is the one clean-room converter from JSON Schema to JSON-LD 1.1. The hint keyword is a single `x-jsonld` object. StreamGraph imports this package. There is no second TypeScript copy.

```bash
cd jsonld-from-schema
npm ci
npm test
```

## Graph-backed Kafka ABAC

[`abac/`](abac/) is a graph-backed Kafka ABAC stack. Neo4j is the attribute source of truth, OPA is the policy decision point, the Kafka authorizer is the enforcement point, and a Flink job masks high-sensitivity fields onto a downstream topic.

```bash
cd abac
docker compose up --build -d
./scripts/step6-checks.sh
```

Requires Docker with Compose v2. Layout, principals and the full bring-up order are in [`abac/README.md`](abac/README.md).
