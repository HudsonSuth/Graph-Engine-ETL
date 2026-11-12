# Graph-Engine-ETL

This repository holds two projects side by side.

## StreamGraph

[StreamGraph](streamgraph/) is a clean-room, MIT-licensed streaming-to-graph ETL app. It is plain JavaScript for Node 24, with no build step. Sources are files, HTTP APIs, Kafka, SQL and polling CDC. A schema maps those records into an embedded SQLite property graph and links the same entity across sources. The guided UI sets that up without writing a flow by hand. Live sync-out keeps Neo4j, Memgraph, PostgreSQL or Kafka in step with the graph, and an attribute-based access rules engine filters and masks the data.

```bash
cd streamgraph
npm install
npm test
npm run demo
```

`npm run demo` serves the sample retail pipeline at http://localhost:8080. Behavior, the HTTP API and known gaps are in [streamgraph/README.md](streamgraph/README.md). The license audit is [streamgraph/LICENSES.md](streamgraph/LICENSES.md) (project license: MIT).

## Graph-backed Kafka ABAC

[`abac/`](abac/) is a graph-backed Kafka ABAC stack. Neo4j is the attribute source of truth, OPA is the policy decision point, the Kafka authorizer is the enforcement point, and a Flink job masks high-sensitivity fields onto a downstream topic.

```bash
cd abac
docker compose up --build -d
./scripts/step6-checks.sh
```

Requires Docker with Compose v2. Layout, principals and the full bring-up order are in [`abac/README.md`](abac/README.md).
