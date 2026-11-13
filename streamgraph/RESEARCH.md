# RESEARCH: Tom Sawyer Data Streams (public sources only)

Date: 2026-11-12. Method: read public marketing pages and press releases. No binaries, trials, demos, docs behind login or code were downloaded, run or read.

Sources
- S1 https://www.tomsawyer.com/data-streams (product page, 1.1.0)
- S2 https://www.tomsawyer.com/news/tom-sawyer-data-streams-1.0-etl-streaming-data-pipelines-in-real-time (1.0 GA press release, Feb 11 2026)
- S3 https://natlawreview.com/press-releases/tom-sawyer-software-announces-new-data-streams-10-beta (beta press release, Nov 26 2025)
- S4 https://app.dealroom.co/news/feed/tom-sawyer-software-launches-data-streams-1-0-for-real-time-etl-and-knowledge-graph-integration — NOT EXAMINED: blocked by a Cloudflare JavaScript challenge. The 1.1.0 facts below come from S1 instead.

## Observed behaviors

| # | Behavior | Status | Evidence |
|---|---|---|---|
| B1 | Schema-driven ETL of structured and unstructured data into one query-ready knowledge graph | CONFIRMED | S1: "a schema-driven platform to ETL your structured and unstructured data into a single, governed, query-ready knowledge graph" |
| B2 | Subscribes to Kafka or Confluent topics | CONFIRMED | S1: "Subscribe to Apache Kafka (or Confluent) topics sourced from databases, files, and APIs" |
| B3 | Direct SQL connectors: Db2, SQL Server, MySQL, Oracle, PostgreSQL (added in 1.1.0) | CONFIRMED | S1: "The release adds connectors for IBM Db2, Microsoft SQL Server, MySQL, Oracle, and PostgreSQL" |
| B4 | Other systems (NoSQL, warehouses, files, APIs) arrive via Kafka using Kafka Connect, CDC tools or custom producers, not native connectors | CONFIRMED | S1: "For additional data sources, use integration tools such as Kafka Connect, Change Data Capture (CDC) tools, or custom producers to publish data to Kafka topics" |
| B5 | Continuous or batch execution | CONFIRMED | S3: "Data flows can be run in batch or continuously to ingest and transform events as they arrive" |
| B6 | CRUD events (create, update, delete) propagate to the graph in real time (1.0) | CONFIRMED | S2: "fully propagates CRUD events through streaming pipelines in real time" |
| B7 | Typed attributes: String, Integer, Long, Boolean, Double, Float, Short, Date, Timestamp | CONFIRMED | S2 (same bullet) |
| B8 | Transformations and filters use SpEL | CONFIRMED | S3: "applying advanced filters and rules with Spring Expression Language (SpEL)" |
| B9 | Transformations include rename fields and convert node types (topics) to edges | CONFIRMED | S3: "renaming fields, converting node types to edges"; S1: "Transform topics to convert them from nodes to edges. Rename topics" |
| B10 | Merge or split tables and convert properties into edges | CONFIRMED | S1: "rename, merge or split tables, convert properties into edges" |
| B11 | Users choose which topics are nodes, edges or attributes | CONFIRMED | S3: "Users control which topics represent nodes, edges, or attributes" |
| B12 | Schemas are extracted automatically from Kafka topics | CONFIRMED | S3: "automatically extracts schemas from Kafka topics" |
| B13 | Web-based visual flow designer with sources, transformations, conditions and sinks, with automatic layout | CONFIRMED | S1: "visually assemble sources, transformations, conditions, and sinks"; "Automatic graph layout organizes complex pipelines" |
| B14 | Dynamic schema view: input schema on sink, condition and transformation nodes; output schema on condition, transformation and source nodes; graph or tree view | CONFIRMED | S1 bullet list; "See a graph or tree view of the schema" |
| B15 | Entity resolution: normalize identifiers, matching rules, persist deduplicated nodes | CONFIRMED | S1: "Normalize identifiers, apply matching rules in SpEL, and persist deduplicated nodes and relationships" |
| B16 | Output persisted to a graph database sink; optional publish back to Kafka | CONFIRMED | S3: "persisted into a graph database, and optionally users can publish results back to Kafka" |
| B17 | OAuth 2.0 and Keycloak authentication | CONFIRMED | S1 and S3 |
| B18 | Copy and rename flow projects; export or print flow diagrams; dialog shortcuts | CONFIRMED | S2 bullets |
| B19 | Validation of sources and sinks before a flow is created | CONFIRMED | S2: "verify that data flow sources and sinks are correctly defined before a flow is created" |
| B20 | Docker-based, air-gapped installer | CONFIRMED | S3 |
| B21 | Pairs with Perspectives and Explorations for visualization | CONFIRMED | S1, S3 |
| B22 | Which graph databases are supported as sinks | HYPOTHESIS | Not named on S1–S3. The ArcadeDB blog cited by Hudson suggests ArcadeDB is one; not examined. |
| B23 | Entity linking works by upsert on a key so records from different topics land on one node | HYPOTHESIS | Implied by B11 and B15; mechanism not described. |
| B24 | Deletes remove the node or edge (vs soft-delete) | HYPOTHESIS | B6 says deletes propagate; semantics not described. |
| B25 | Kafka message format (JSON, Avro, Debezium envelope) | HYPOTHESIS | S1 mentions Debezium for PostgreSQL; envelope handling not described. |
| B26 | "Optimized string and hash map calculations" and "searchable suggestions" | CONFIRMED (exists) / HYPOTHESIS (meaning) | S1 names them; no detail. |

## Not examined
- Any binary, trial, Docker image, installer, demo video or API docs. The intro video on S1 was not watched.
- The dealroom article (S4, blocked) and the ArcadeDB blog post.
- Performance, scale, error handling, retry semantics, schema versioning details and the RAG integration internals. None are described in detail publicly.
