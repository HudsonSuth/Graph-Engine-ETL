# Graph-Engine-ETL

Graph-backed Kafka ABAC stack: Neo4j as attribute source of truth, OPA as PDP, Kafka authorizer as PEP, and a Flink job that masks high-sensitivity fields.

All runtime code lives under [`abac/`](abac/). See [`abac/README.md`](abac/README.md) for layout, principals, and the full bring-up order.

## Quick start

```bash
cd abac
docker compose up --build -d
./scripts/step6-checks.sh
```

Requires Docker with Compose v2.
