// StreamGraph Explore - Apache Flink stream processor for graph.changes (SPEC section 18).
// Clean-room implementation written for this project. Pipeline:
//   graph.changes (read_committed) -> parse + JSON Schema validation (same v1 contract file as the Node side; invalid -> graph.dlq)
//   -> keyed by item ((sourceId|linkId) / nodeId): dedupe by eventId (TTL map state) + link endpoints, effect, node deltas
//   -> graph.enriched (event + resolved endpoints + effect)
//   -> node metrics keyed by nodeId (degree / in / out / total changes; coalesced) -> graph.metrics  (key = nodeId)
//   -> event-time tumbling + sliding windows per node (changes, degree gained/lost) -> graph.metrics (key = nodeId|window|start)
//   -> degree.spike alerts from tumbling windows -> graph.alerts (key = deterministic alertId)
//   -> OPTIONAL (geoMetrics set): node.upsert events with a position -> H3 cell (Uber H3, Apache-2.0) -> event-time tumbling
//      count per cell -> graph.geo-metrics (key = cell|windowStart)   (SPEC section 22.7)
// Checkpointed (exactly-once by default: Kafka transactions committed on checkpoint; at-least-once optional, outputs keyed
// and deterministic so consumers can upsert idempotently). Restart resumes from the latest retained checkpoint.
// --impl wrong builds a deliberately WRONG pipeline (no dedupe, every link upsert counts as a new link, processing-time windows,
// at-least-once sink) used only to prove the tests are meaningful.
package streamgraph.flink;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.networknt.schema.JsonSchema;
import com.networknt.schema.JsonSchemaFactory;
import com.networknt.schema.SchemaValidatorsConfig;
import com.networknt.schema.SpecVersion;
import com.networknt.schema.ValidationMessage;
import org.apache.flink.api.common.JobID;
import org.apache.flink.api.common.eventtime.WatermarkStrategy;
import org.apache.flink.api.common.functions.AggregateFunction;
import org.apache.flink.api.common.functions.OpenContext;
import org.apache.flink.api.common.serialization.DeserializationSchema;
import org.apache.flink.api.common.state.MapState;
import org.apache.flink.api.common.state.MapStateDescriptor;
import org.apache.flink.api.common.state.StateTtlConfig;
import org.apache.flink.api.common.state.ValueState;
import org.apache.flink.api.common.state.ValueStateDescriptor;
import org.apache.flink.api.common.typeinfo.TypeInformation;
import org.apache.flink.configuration.Configuration;
import org.apache.flink.connector.base.DeliveryGuarantee;
import org.apache.flink.connector.kafka.sink.KafkaRecordSerializationSchema;
import org.apache.flink.connector.kafka.sink.KafkaSink;
import org.apache.flink.connector.kafka.source.KafkaSource;
import org.apache.flink.connector.kafka.source.enumerator.initializer.OffsetsInitializer;
import org.apache.flink.connector.kafka.source.reader.deserializer.KafkaRecordDeserializationSchema;
import org.apache.flink.core.execution.JobClient;
import org.apache.flink.kafka.shaded.org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.flink.kafka.shaded.org.apache.kafka.clients.consumer.OffsetResetStrategy;
import org.apache.flink.kafka.shaded.org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.flink.kafka.shaded.org.apache.kafka.common.header.Header;
import org.apache.flink.kafka.shaded.org.apache.kafka.common.header.internals.RecordHeader;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.datastream.SingleOutputStreamOperator;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.functions.KeyedProcessFunction;
import org.apache.flink.streaming.api.functions.ProcessFunction;
import org.apache.flink.streaming.api.functions.windowing.ProcessWindowFunction;
import org.apache.flink.streaming.api.windowing.assigners.SlidingEventTimeWindows;
import org.apache.flink.streaming.api.windowing.assigners.TumblingEventTimeWindows;
import org.apache.flink.streaming.api.windowing.assigners.TumblingProcessingTimeWindows;
import org.apache.flink.streaming.api.windowing.assigners.SlidingProcessingTimeWindows;
import org.apache.flink.streaming.api.windowing.windows.TimeWindow;
import org.apache.flink.util.Collector;
import org.apache.flink.util.OutputTag;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.Set;

public class GraphStreamProcessor {
  public static final int OUT_SCHEMA_VERSION = 1;
  static final ObjectMapper M = new ObjectMapper().configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

  // ------------------------------------------------------------------ records (Flink POJOs)
  /** Raw Kafka record from graph.changes. */
  public static class In {
    public String raw; public long eventTimeMs; public long producedAt; public int partition; public long offset;
    public In() {}
  }
  /** A validated graph change. */
  public static class Change {
    public String eventId, op, sourceId, eventTime, itemId, fromId, toId, raw;
    public boolean partial;
    public long eventTimeMs, producedAt;
    public double lat = Double.NaN, lon = Double.NaN; // node.upsert position (properties lat/lon | latitude/longitude | geometry Point)
    public Change() {}
  }
  /** Effect of one change on one node. */
  public static class NodeDelta {
    public String nodeId, eventId, eventTime;
    public int degreeDelta, inDelta, outDelta, changes;
    public boolean nodeRemoved, nodeUpserted;
    public long eventTimeMs, producedAt;
    public NodeDelta() {}
  }
  /** Node aggregate state. */
  public static class NodeAgg {
    public int degree, inDegree, outDegree; public long changes; public boolean removed;
    public String lastEventId, lastEventTime; public long pendingProducedAt; public boolean dirty;
    public NodeAgg() {}
  }
  /** One positioned node.upsert (after dedupe), already mapped to its H3 cell. */
  public static class GeoHit { public String cell, eventId; public long eventTimeMs; public GeoHit() {} }
  public static class LinkState { public String fromId, toId; public boolean alive; public LinkState() {} }
  public static class WinAcc { public long changes; public int gained, lost; public WinAcc() {} }
  /** Anything written to Kafka: topic, key, value (null = tombstone), schema id header. */
  public static class Out {
    public String topic, key, value, schemaId, dlqReason, dlqStage;
    public Out() {}
    static Out of(String topic, String key, String value, String schemaId) { Out o = new Out(); o.topic = topic; o.key = key; o.value = value; o.schemaId = schemaId; return o; }
  }

  // ------------------------------------------------------------------ config
  public static class Cfg implements java.io.Serializable {
    public String brokers = "localhost:9092", processorId = "graph-processor", groupId = null, impl = "correct", delivery = "exactly-once";
    public String changes = "graph.changes", enriched = "graph.enriched", metrics = "graph.metrics", alerts = "graph.alerts", dlq = "graph.dlq";
    public String schemaPath, checkpointDir, restoreFrom = null, startFrom = "committed-or-earliest";
    public long checkpointMs = 1000, windowMs = 60000, slidingMs = 300000, slideMs = 60000, outOfOrdernessMs = 2000, idleMs = 2000;
    public long maxFutureSkewMs = 3600000, dedupeTtlMs = 24L * 3600 * 1000, emitEveryMs = 200, transactionTimeoutMs = 600000;
    public int parallelism = 2, maxParallelism = 128, spikeThreshold = 5;
    public String geoMetrics = null; public int geoResolution = 3; public long geoWindowMs = 60000; // geo metrics off unless geoMetrics is set
    public boolean wrong() { return "wrong".equals(impl); }
  }

  static String iso(long ms) { return Instant.ofEpochMilli(ms).toString(); }

  // ------------------------------------------------------------------ source deserializer
  public static class InDeser implements KafkaRecordDeserializationSchema<In> {
    final long maxFutureSkewMs; InDeser(long maxFutureSkewMs) { this.maxFutureSkewMs = maxFutureSkewMs; }
    @Override public void deserialize(ConsumerRecord<byte[], byte[]> r, Collector<In> out) {
      In in = new In();
      in.raw = r.value() == null ? "" : new String(r.value(), StandardCharsets.UTF_8);
      in.partition = r.partition(); in.offset = r.offset();
      Header h = r.headers().lastHeader("x-produced-at");
      long produced = r.timestamp();
      if (h != null) try { produced = Long.parseLong(new String(h.value(), StandardCharsets.UTF_8)); } catch (Exception ignore) {}
      in.producedAt = produced;
      // Event time for watermarks. Records without a parseable eventTime get Long.MIN_VALUE so they can never advance the
      // watermark (bug found by test F3->F4: a junk record stamped with the Kafka time pushed the watermark to "now" and made
      // every later event-time window late). Future skew is clamped to Kafka time + maxFutureSkewMs for the same reason.
      in.eventTimeMs = Long.MIN_VALUE;
      try {
        JsonNode n = M.readTree(in.raw); JsonNode et = n == null ? null : n.get("eventTime");
        if (et != null && et.isTextual()) in.eventTimeMs = Math.min(Instant.parse(et.asText()).toEpochMilli(), r.timestamp() + maxFutureSkewMs);
      } catch (Exception ignore) {}
      out.collect(in);
    }
    @Override public TypeInformation<In> getProducedType() { return TypeInformation.of(In.class); }
  }

  // ------------------------------------------------------------------ validation
  static final OutputTag<Out> DLQ = new OutputTag<Out>("dlq") {};

  public static class Validate extends ProcessFunction<In, Change> {
    final Cfg cfg; final String schemaJson;
    transient Map<String, JsonSchema> byOp;
    Validate(Cfg cfg, String schemaJson) { this.cfg = cfg; this.schemaJson = schemaJson; }
    @Override public void open(OpenContext ctx) throws Exception {
      JsonNode root = M.readTree(schemaJson);
      JsonSchemaFactory f = JsonSchemaFactory.getInstance(SpecVersion.VersionFlag.V7);
      SchemaValidatorsConfig sc = SchemaValidatorsConfig.builder().formatAssertionsEnabled(true).build();
      byOp = new HashMap<>();
      Iterator<Map.Entry<String, JsonNode>> it = root.get("events").fields();
      while (it.hasNext()) { Map.Entry<String, JsonNode> e = it.next(); byOp.put(e.getKey(), f.getSchema(e.getValue(), sc)); }
    }
    void dlq(Context ctx, In in, String reason, JsonNode parsed, String eventId) {
      ObjectNode m = M.createObjectNode();
      m.put("stage", "process"); m.put("reason", reason); m.put("at", Instant.now().toString()); m.put("instance", cfg.processorId);
      if (eventId != null) m.put("eventId", eventId);
      m.put("partition", in.partition); m.put("offset", in.offset);
      if (parsed != null) m.set("value", parsed); else m.put("value", in.raw);
      Out o = Out.of(cfg.dlq, eventId, m.toString(), "dlq/v1"); o.dlqReason = reason; o.dlqStage = "process";
      ctx.output(DLQ, o);
    }
    @Override public void processElement(In in, Context ctx, Collector<Change> out) {
      JsonNode n;
      try { n = M.readTree(in.raw); } catch (com.fasterxml.jackson.core.JsonProcessingException e) { dlq(ctx, in, "invalid JSON: " + e.getOriginalMessage(), null, null); return; }
      if (n == null || !n.isObject()) { dlq(ctx, in, "not a JSON object", null, null); return; }
      String eventId = n.path("eventId").isTextual() ? n.get("eventId").asText() : null;
      JsonNode sv = n.get("schemaVersion");
      if (sv == null || !sv.isInt() || sv.asInt() != 1) { dlq(ctx, in, "unsupported schemaVersion " + sv + " (supported: 1)", n, eventId); return; }
      String op = n.path("op").asText(null);
      JsonSchema s = op == null ? null : byOp.get(op);
      if (s == null) { dlq(ctx, in, "unknown op " + n.get("op"), n, eventId); return; }
      Set<ValidationMessage> errs = s.validate(n);
      if (!errs.isEmpty()) {
        StringBuilder sb = new StringBuilder(op).append(": ");
        int i = 0; for (ValidationMessage v : errs) { if (i++ > 0) sb.append("; "); sb.append(v.getMessage()); if (i >= 5) break; }
        dlq(ctx, in, sb.toString(), n, eventId); return;
      }
      Change c = new Change();
      c.eventId = eventId; c.op = op; c.sourceId = n.get("sourceId").asText(); c.eventTime = n.get("eventTime").asText();
      c.eventTimeMs = in.eventTimeMs; c.producedAt = in.producedAt; c.raw = in.raw; c.partial = n.path("partial").asBoolean(false);
      JsonNode p = n.path("payload");
      c.itemId = p.path("id").asText(null); c.fromId = p.path("fromId").asText(null); c.toId = p.path("toId").asText(null);
      if (cfg.geoMetrics != null && "node.upsert".equals(op)) { double[] ll = position(p.path("properties")); c.lat = ll[0]; c.lon = ll[1]; }
      out.collect(c);
    }
  }

  static double num(JsonNode n) { if (n == null || n.isNull() || n.isMissingNode()) return Double.NaN; if (n.isNumber()) return n.asDouble(); if (n.isTextual()) try { return Double.parseDouble(n.asText().trim()); } catch (Exception e) { return Double.NaN; } return Double.NaN; }
  static JsonNode first(JsonNode o, String... keys) { for (String k : keys) { JsonNode v = o.get(k); if (v != null && !v.isNull()) return v; } return null; }
  /** same rules as explore/shared/geo-core.js geoOf (points only): lat/latitude + lon/lng/long/longitude, or geometry Point */
  static double[] position(JsonNode props) {
    double[] none = { Double.NaN, Double.NaN };
    if (props == null || !props.isObject()) return none;
    double lat = num(first(props, "lat", "latitude", "y_lat")), lon = num(first(props, "lon", "lng", "long", "longitude", "x_lon"));
    if (!(lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180)) {
      JsonNode g = props.get("geometry");
      if (g != null && g.isTextual()) try { g = M.readTree(g.asText()); } catch (Exception e) { g = null; }
      if (g == null || !"Point".equals(g.path("type").asText()) || !g.path("coordinates").isArray()) return none;
      lon = num(g.path("coordinates").get(0)); lat = num(g.path("coordinates").get(1));
      if (!(lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180)) return none;
    }
    return new double[] { lat, lon };
  }

  // ------------------------------------------------------------------ item state: link endpoints + effect + node deltas
  static final OutputTag<Out> ENRICHED = new OutputTag<Out>("enriched") {};
  static final OutputTag<GeoHit> GEO = new OutputTag<GeoHit>("geo") {};
  static String routeKey(Change c) {
    if (c.op.startsWith("link.")) return "L:" + c.sourceId + "|" + c.itemId;
    if (c.op.startsWith("node.")) return "N:" + c.itemId;
    return "X:" + c.sourceId; // heartbeat / snapshot marker: watermark carriers only
  }
  /**
   * Keyed by item (routeKey). Dedupe lives HERE, keyed by the item rather than by eventId: a separate keyBy(eventId) stage
   * would scatter one item's events over subtasks and lose per-item order (found in the first smoke run: a re-upsert overtook
   * the original create). A duplicate eventId always carries the same item, so per-item dedupe is equivalent.
   */
  public static class ItemState extends KeyedProcessFunction<String, Change, NodeDelta> {
    final Cfg cfg; transient ValueState<LinkState> link; transient MapState<String, Boolean> seen; transient com.uber.h3core.H3Core h3;
    ItemState(Cfg cfg) { this.cfg = cfg; }
    @Override public void open(OpenContext ctx) throws Exception {
      if (cfg.geoMetrics != null) h3 = com.uber.h3core.H3Core.newInstance();
      link = getRuntimeContext().getState(new ValueStateDescriptor<>("link", LinkState.class));
      MapStateDescriptor<String, Boolean> d = new MapStateDescriptor<>("seen-event-ids", String.class, Boolean.class);
      d.enableTimeToLive(StateTtlConfig.newBuilder(Duration.ofMillis(cfg.dedupeTtlMs)).setUpdateType(StateTtlConfig.UpdateType.OnCreateAndWrite).build());
      seen = getRuntimeContext().getMapState(d);
    }
    NodeDelta d(Change c, String node, int deg, int in, int out) {
      NodeDelta x = new NodeDelta(); x.nodeId = node; x.eventId = c.eventId; x.eventTime = c.eventTime; x.eventTimeMs = c.eventTimeMs; x.producedAt = c.producedAt;
      x.degreeDelta = deg; x.inDelta = in; x.outDelta = out; x.changes = 1; return x;
    }
    void enriched(Context ctx, Change c, String kind, String from, String to, String effect) throws Exception {
      ObjectNode m = M.createObjectNode();
      m.put("schemaVersion", OUT_SCHEMA_VERSION); m.put("kind", "graph.enriched"); m.put("eventId", c.eventId); m.put("op", c.op);
      m.put("sourceId", c.sourceId); m.put("eventTime", c.eventTime); m.put("itemKind", kind); m.put("itemId", c.itemId);
      if (from != null) m.put("fromId", from); if (to != null) m.put("toId", to);
      m.put("effect", effect); m.put("processor", cfg.processorId); m.set("event", M.readTree(c.raw));
      ctx.output(ENRICHED, Out.of(cfg.enriched, "link".equals(kind) && from != null ? from : c.itemId, m.toString(), "graph.enriched/v1"));
    }
    @Override public void processElement(Change c, Context ctx, Collector<NodeDelta> out) throws Exception {
      if (!cfg.wrong() && c.op.contains(".")) { // WRONG impl: no dedupe
        if (seen.contains(c.eventId)) return; // duplicate: redelivery, producer retry outside a transaction, replayed batch
        seen.put(c.eventId, Boolean.TRUE);
      }
      switch (c.op) {
        case "node.upsert": { NodeDelta x = d(c, c.itemId, 0, 0, 0); x.nodeUpserted = true; out.collect(x); enriched(ctx, c, "node", null, null, "upserted");
          if (h3 != null && !Double.isNaN(c.lat) && c.eventTimeMs != Long.MIN_VALUE) { // one hit per (deduplicated) positioned upsert
            GeoHit g = new GeoHit(); g.eventId = c.eventId; g.eventTimeMs = c.eventTimeMs;
            g.cell = cfg.wrong() ? h3.latLngToCellAddress(Math.max(-90, Math.min(90, c.lon)), c.lat, cfg.geoResolution) // WRONG: lat/lon swapped
                                 : h3.latLngToCellAddress(c.lat, c.lon, cfg.geoResolution);
            ctx.output(GEO, g);
          }
          return; }
        case "node.remove": { NodeDelta x = d(c, c.itemId, 0, 0, 0); x.nodeRemoved = true; out.collect(x); enriched(ctx, c, "node", null, null, "removed"); return; }
        case "link.upsert": {
          if (cfg.wrong()) { // WRONG: no link state - every upsert is counted as a new link
            out.collect(d(c, c.fromId, 1, 0, 1)); out.collect(d(c, c.toId, 1, 1, 0)); enriched(ctx, c, "link", c.fromId, c.toId, "created"); return;
          }
          LinkState s = link.value();
          String from = c.fromId != null ? c.fromId : s != null ? s.fromId : null, to = c.toId != null ? c.toId : s != null ? s.toId : null;
          if (from == null || to == null) { enriched(ctx, c, "link", from, to, "unresolved"); return; } // partial upsert for an unknown link
          String effect;
          if (s == null || !s.alive) { out.collect(d(c, from, 1, 0, 1)); out.collect(d(c, to, 1, 1, 0)); effect = "created"; }
          else if (!from.equals(s.fromId) || !to.equals(s.toId)) {
            out.collect(d(c, s.fromId, -1, 0, -1)); out.collect(d(c, s.toId, -1, -1, 0)); out.collect(d(c, from, 1, 0, 1)); out.collect(d(c, to, 1, 1, 0)); effect = "endpoints-changed";
          } else { out.collect(d(c, from, 0, 0, 0)); if (!to.equals(from)) out.collect(d(c, to, 0, 0, 0)); effect = "updated"; }
          LinkState n = new LinkState(); n.fromId = from; n.toId = to; n.alive = true; link.update(n);
          enriched(ctx, c, "link", from, to, effect); return;
        }
        case "link.remove": {
          if (cfg.wrong()) { if (c.fromId != null) out.collect(d(c, c.fromId, -1, 0, -1)); enriched(ctx, c, "link", c.fromId, null, "removed"); return; }
          LinkState s = link.value();
          if (s == null || !s.alive) { enriched(ctx, c, "link", s != null ? s.fromId : c.fromId, s != null ? s.toId : null, "noop"); return; } // unknown / repeated remove
          out.collect(d(c, s.fromId, -1, 0, -1)); out.collect(d(c, s.toId, -1, -1, 0));
          s.alive = false; link.update(s);
          enriched(ctx, c, "link", s.fromId, s.toId, "removed"); return;
        }
        default: return; // heartbeat / snapshot.marker: not graph items (they still advanced the watermark at the source)
      }
    }
  }

  // ------------------------------------------------------------------ node metrics (current degree etc.), coalesced per node
  public static class NodeMetrics extends KeyedProcessFunction<String, NodeDelta, Out> {
    final Cfg cfg; transient ValueState<NodeAgg> agg;
    NodeMetrics(Cfg cfg) { this.cfg = cfg; }
    @Override public void open(OpenContext ctx) { agg = getRuntimeContext().getState(new ValueStateDescriptor<>("agg", NodeAgg.class)); }
    @Override public void processElement(NodeDelta x, Context ctx, Collector<Out> out) throws Exception {
      NodeAgg a = agg.value(); if (a == null) a = new NodeAgg();
      a.degree += x.degreeDelta; a.inDegree += x.inDelta; a.outDegree += x.outDelta; a.changes += x.changes;
      if (x.nodeRemoved) a.removed = true; if (x.nodeUpserted) a.removed = false;
      a.lastEventId = x.eventId; a.lastEventTime = x.eventTime;
      if (!a.dirty) { a.dirty = true; a.pendingProducedAt = x.producedAt; } else a.pendingProducedAt = Math.min(a.pendingProducedAt, x.producedAt);
      agg.update(a);
      if (cfg.emitEveryMs <= 0) { emit(ctx.getCurrentKey(), a, out); return; }
      long now = ctx.timerService().currentProcessingTime();
      ctx.timerService().registerProcessingTimeTimer(now - (now % cfg.emitEveryMs) + cfg.emitEveryMs); // one timer per node per tick
    }
    @Override public void onTimer(long ts, OnTimerContext ctx, Collector<Out> out) throws Exception {
      NodeAgg a = agg.value(); if (a != null && a.dirty) emit(ctx.getCurrentKey(), a, out);
    }
    void emit(String nodeId, NodeAgg a, Collector<Out> out) throws Exception {
      ObjectNode m = M.createObjectNode();
      m.put("schemaVersion", OUT_SCHEMA_VERSION); m.put("kind", "node.metrics"); m.put("nodeId", nodeId);
      m.put("degree", a.degree); m.put("inDegree", a.inDegree); m.put("outDegree", a.outDegree); m.put("changes", a.changes); m.put("removed", a.removed);
      m.put("lastEventId", a.lastEventId); m.put("lastEventTime", a.lastEventTime); m.put("updatedAt", Instant.now().toString());
      m.put("sourceProducedAt", a.pendingProducedAt); m.put("processor", cfg.processorId);
      a.dirty = false; agg.update(a);
      out.collect(Out.of(cfg.metrics, nodeId, m.toString(), "node.metrics/v1"));
    }
  }

  // ------------------------------------------------------------------ windows
  public static class WinAgg implements AggregateFunction<NodeDelta, WinAcc, WinAcc> {
    public WinAcc createAccumulator() { return new WinAcc(); }
    public WinAcc add(NodeDelta x, WinAcc a) { a.changes += x.changes; if (x.degreeDelta > 0) a.gained += x.degreeDelta; else a.lost -= x.degreeDelta; return a; }
    public WinAcc getResult(WinAcc a) { return a; }
    public WinAcc merge(WinAcc a, WinAcc b) { a.changes += b.changes; a.gained += b.gained; a.lost += b.lost; return a; }
  }
  public static class WinOut extends ProcessWindowFunction<WinAcc, Out, String, TimeWindow> {
    final Cfg cfg; final String kind; final boolean alerts;
    WinOut(Cfg cfg, String kind, boolean alerts) { this.cfg = cfg; this.kind = kind; this.alerts = alerts; }
    @Override public void process(String nodeId, Context ctx, Iterable<WinAcc> it, Collector<Out> out) {
      WinAcc a = it.iterator().next(); TimeWindow w = ctx.window();
      ObjectNode m = M.createObjectNode();
      m.put("schemaVersion", OUT_SCHEMA_VERSION); m.put("kind", "node.window"); m.put("window", kind); m.put("nodeId", nodeId);
      m.put("windowStart", iso(w.getStart())); m.put("windowEnd", iso(w.getEnd())); m.put("changes", a.changes);
      m.put("degreeGained", a.gained); m.put("degreeLost", a.lost); m.put("degreeDelta", a.gained - a.lost); m.put("processor", cfg.processorId);
      out.collect(Out.of(cfg.metrics, nodeId + "|" + kind + "|" + w.getStart(), m.toString(), "node.window/v1"));
      if (alerts && a.gained >= cfg.spikeThreshold) {
        String alertId = "degree.spike:" + nodeId + ":" + w.getStart();
        ObjectNode al = M.createObjectNode();
        al.put("schemaVersion", OUT_SCHEMA_VERSION); al.put("kind", "degree.spike"); al.put("alertId", alertId); al.put("nodeId", nodeId);
        al.put("windowStart", iso(w.getStart())); al.put("windowEnd", iso(w.getEnd())); al.put("degreeGained", a.gained); al.put("threshold", cfg.spikeThreshold);
        al.put("severity", a.gained >= 2 * cfg.spikeThreshold ? "high" : "warn"); al.put("raisedAt", Instant.now().toString()); al.put("processor", cfg.processorId);
        out.collect(Out.of(cfg.alerts, alertId, al.toString(), "degree.spike/v1"));
      }
    }
  }

  // ------------------------------------------------------------------ geo windows (optional)
  public static class GeoAgg implements AggregateFunction<GeoHit, long[], long[]> {
    public long[] createAccumulator() { return new long[1]; }
    public long[] add(GeoHit x, long[] a) { a[0]++; return a; }
    public long[] getResult(long[] a) { return a; }
    public long[] merge(long[] a, long[] b) { a[0] += b[0]; return a; }
  }
  public static class GeoOut extends ProcessWindowFunction<long[], Out, String, TimeWindow> {
    final Cfg cfg; GeoOut(Cfg cfg) { this.cfg = cfg; }
    @Override public void process(String cell, Context ctx, Iterable<long[]> it, Collector<Out> out) {
      long n = it.iterator().next()[0]; TimeWindow w = ctx.window();
      ObjectNode m = M.createObjectNode();
      m.put("schemaVersion", OUT_SCHEMA_VERSION); m.put("kind", "geo.window"); m.put("grid", "h3"); m.put("cell", cell); m.put("resolution", cfg.geoResolution);
      m.put("windowStart", iso(w.getStart())); m.put("windowEnd", iso(w.getEnd())); m.put("count", n); m.put("processor", cfg.processorId);
      out.collect(Out.of(cfg.geoMetrics, cell + "|" + w.getStart(), m.toString(), "geo.window/v1"));
    }
  }

  // ------------------------------------------------------------------ sink serializer
  public static class OutSer implements KafkaRecordSerializationSchema<Out> {
    @Override public ProducerRecord<byte[], byte[]> serialize(Out o, KafkaSinkContext ctx, Long ts) {
      List<Header> hs = new ArrayList<>();
      hs.add(new RecordHeader("content-type", "application/json".getBytes(StandardCharsets.UTF_8)));
      hs.add(new RecordHeader("schema.id", o.schemaId.getBytes(StandardCharsets.UTF_8)));
      hs.add(new RecordHeader("schema.version", "1".getBytes(StandardCharsets.UTF_8)));
      if (o.dlqReason != null) { String r = o.dlqReason.length() > 500 ? o.dlqReason.substring(0, 500) : o.dlqReason;
        hs.add(new RecordHeader("x-dlq-reason", r.getBytes(StandardCharsets.UTF_8))); hs.add(new RecordHeader("x-dlq-stage", o.dlqStage.getBytes(StandardCharsets.UTF_8))); }
      return new ProducerRecord<>(o.topic, null, null, o.key == null ? null : o.key.getBytes(StandardCharsets.UTF_8),
        o.value == null ? null : o.value.getBytes(StandardCharsets.UTF_8), hs);
    }
  }

  // ------------------------------------------------------------------ main
  public static void main(String[] args) throws Exception {
    String cfgPath = null; boolean watchStdin = false;
    for (int i = 0; i < args.length; i++) { if ("--config".equals(args[i])) cfgPath = args[++i]; else if ("--exit-on-stdin-eof".equals(args[i])) watchStdin = true; }
    if (watchStdin) { // launched by the Node app: exit when the parent goes away (its end of our stdin closes), even after kill -9
      Thread w = new Thread(() -> { try { while (System.in.read() >= 0) {} } catch (Exception ignore) {} Runtime.getRuntime().halt(0); }, "parent-watchdog");
      w.setDaemon(true); w.start();
    }
    if (cfgPath == null) { System.err.println("usage: GraphStreamProcessor --config processor.json"); System.exit(2); }
    Cfg cfg = M.readValue(new File(cfgPath), Cfg.class);
    if (cfg.groupId == null) cfg.groupId = cfg.processorId;
    String schemaJson = new String(Files.readAllBytes(new File(cfg.schemaPath).toPath()), StandardCharsets.UTF_8);
    boolean wrong = cfg.wrong();

    Configuration conf = new Configuration();
    conf.setString("state.backend.type", "hashmap");
    conf.setString("execution.checkpointing.dir", new File(cfg.checkpointDir).toURI().toString());
    conf.setString("execution.checkpointing.interval", cfg.checkpointMs + " ms");
    conf.setString("execution.checkpointing.mode", "EXACTLY_ONCE");
    conf.setString("execution.checkpointing.externalized-checkpoint-retention", "RETAIN_ON_CANCELLATION");
    conf.setString("execution.checkpointing.num-retained", "3");
    conf.setString("execution.checkpointing.min-pause", Math.min(200, cfg.checkpointMs / 2) + " ms");
    conf.setString("restart-strategy.type", "fixed-delay");
    conf.setString("restart-strategy.fixed-delay.attempts", "10");
    conf.setString("restart-strategy.fixed-delay.delay", "2 s");
    conf.setString("pipeline.max-parallelism", String(cfg.maxParallelism));
    conf.setString("pipeline.name", "streamgraph-graph-processor[" + cfg.processorId + "]");
    if (cfg.restoreFrom != null) conf.setString("execution.state-recovery.path", cfg.restoreFrom);
    StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment(conf);
    env.setParallelism(cfg.parallelism);

    OffsetsInitializer start = "earliest".equals(cfg.startFrom) ? OffsetsInitializer.earliest()
      : "latest".equals(cfg.startFrom) ? OffsetsInitializer.latest() : OffsetsInitializer.committedOffsets(OffsetResetStrategy.EARLIEST);
    KafkaSource<In> source = KafkaSource.<In>builder().setBootstrapServers(cfg.brokers).setTopics(cfg.changes).setGroupId(cfg.groupId)
      .setStartingOffsets(start).setDeserializer(new InDeser(cfg.maxFutureSkewMs))
      .setProperty("isolation.level", "read_committed").setProperty("partition.discovery.interval.ms", "10000")
      .setProperty("client.id.prefix", cfg.processorId + "-src").setProperty("commit.offsets.on.checkpoint", "true").build();
    WatermarkStrategy<In> wm = WatermarkStrategy.<In>forBoundedOutOfOrderness(Duration.ofMillis(cfg.outOfOrdernessMs))
      .withTimestampAssigner((e, ts) -> e.eventTimeMs).withIdleness(Duration.ofMillis(cfg.idleMs));
    DataStream<In> raw = env.fromSource(source, wm, "graph.changes").uid("src-graph-changes");

    SingleOutputStreamOperator<Change> valid = raw.process(new Validate(cfg, schemaJson)).uid("validate").name("validate (JSON Schema v1)");
    SingleOutputStreamOperator<NodeDelta> deltas = valid.keyBy(GraphStreamProcessor::routeKey).process(new ItemState(cfg)).uid("item-state").name("dedupe + item state + enrichment");
    DataStream<Out> metrics = deltas.keyBy(x -> x.nodeId).process(new NodeMetrics(cfg)).uid("node-metrics").name("node metrics");
    DataStream<Out> tumbling = deltas.keyBy(x -> x.nodeId)
      .window(wrong ? TumblingProcessingTimeWindows.of(Duration.ofMillis(cfg.windowMs)) : TumblingEventTimeWindows.of(Duration.ofMillis(cfg.windowMs)))
      .aggregate(new WinAgg(), new WinOut(cfg, "tumbling", true)).uid("win-tumbling").name("tumbling window + spike alerts");
    DataStream<Out> sliding = deltas.keyBy(x -> x.nodeId)
      .window(wrong ? SlidingProcessingTimeWindows.of(Duration.ofMillis(cfg.slidingMs), Duration.ofMillis(cfg.slideMs)) : SlidingEventTimeWindows.of(Duration.ofMillis(cfg.slidingMs), Duration.ofMillis(cfg.slideMs)))
      .aggregate(new WinAgg(), new WinOut(cfg, "sliding", false)).uid("win-sliding").name("sliding window");
    DataStream<Out> all = metrics.union(tumbling, sliding, deltas.getSideOutput(ENRICHED), valid.getSideOutput(DLQ));
    if (cfg.geoMetrics != null) { // per-cell event-time tumbling counts (the WRONG impl uses processing time, like its other windows)
      DataStream<Out> geo = deltas.getSideOutput(GEO).keyBy(g -> g.cell)
        .window(wrong ? TumblingProcessingTimeWindows.of(Duration.ofMillis(cfg.geoWindowMs)) : TumblingEventTimeWindows.of(Duration.ofMillis(cfg.geoWindowMs)))
        .aggregate(new GeoAgg(), new GeoOut(cfg)).uid("geo-window").name("geo cells (H3 r" + cfg.geoResolution + ")");
      all = all.union(geo);
    }

    boolean eos = !wrong && !"at-least-once".equals(cfg.delivery);
    Properties pp = new Properties();
    pp.setProperty("transaction.timeout.ms", String.valueOf(cfg.transactionTimeoutMs));
    pp.setProperty("enable.idempotence", "true"); pp.setProperty("acks", "all"); pp.setProperty("linger.ms", "5");
    KafkaSink<Out> sink = KafkaSink.<Out>builder().setBootstrapServers(cfg.brokers).setKafkaProducerConfig(pp)
      .setDeliveryGuarantee(eos ? DeliveryGuarantee.EXACTLY_ONCE : DeliveryGuarantee.AT_LEAST_ONCE)
      .setTransactionalIdPrefix(cfg.processorId + "-tx").setRecordSerializer(new OutSer()).build();
    all.sinkTo(sink).uid("sink-kafka").name("kafka sink (" + (eos ? "exactly-once" : "at-least-once") + ")");

    JobClient jc = env.executeAsync(conf.getString("pipeline.name", "graph-processor"));
    ObjectNode st = M.createObjectNode();
    st.put("event", "started"); st.put("jobId", jc.getJobID().toString()); st.put("impl", cfg.impl); st.put("delivery", eos ? "exactly-once" : "at-least-once");
    st.put("restoredFrom", cfg.restoreFrom); st.put("flinkVersion", org.apache.flink.runtime.util.EnvironmentInformation.getVersion());
    System.out.println(st.toString()); System.out.flush();
    jc.getJobExecutionResult().get();
  }
  static String String(int i) { return java.lang.String.valueOf(i); }
}
