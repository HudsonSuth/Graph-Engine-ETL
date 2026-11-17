package streamgraph.er;

// Duke entity-resolution sidecar (SPEC §21). A long-lived JVM that the Node ER stage talks to over stdin/stdout,
// one JSON object per line ({"rid":n,"op":...} -> {"rid":n,"ok":true,...}).
//
// Matching is done by Duke 1.2 (https://github.com/larsga/Duke, Apache-2.0): Duke comparators + cleaners, Duke's Bayesian
// per-property probabilities (Property.compare / Processor.compare) and Duke's Lucene candidate search (LuceneDatabase).
// This file only adds: the line protocol, incremental upsert/remove on top of Duke's index, three cleaners and one
// comparator Duke does not ship (phone, email, US address abbreviations, ISO dates), and a per-property explanation.
//
// Ops: config | upsert | remove | compare | stats | reset | exit   ("ns" selects an independent Duke configuration, e.g. per record type)
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import no.priv.garshol.duke.*;
import no.priv.garshol.duke.cleaners.*;
import no.priv.garshol.duke.comparators.*;
import no.priv.garshol.duke.databases.LuceneDatabase;
import no.priv.garshol.duke.utils.Utils;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import no.priv.garshol.duke.Record;
import no.priv.garshol.duke.Comparator;

public class DukeSidecar {
  static final ObjectMapper M = new ObjectMapper();
  static final String ID = "ID";

  ConfigurationImpl config;
  Processor proc;
  LuceneDatabase db;
  final Map<String, Record> live = new HashMap<>();
  final Map<String, List<Cleaner>> cleaners = new HashMap<>();
  final List<String> propNames = new ArrayList<>();
  double threshold = 0.85, maybe = 0.7;
  int maxCandidates = 100;
  float minRelevance = 0f;
  long stale = 0, comparisons = 0, queries = 0, rebuilds = 0;

  public static void main(String[] args) throws Exception {
    BufferedReader in = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8));
    PrintStream out = new PrintStream(new FileOutputStream(FileDescriptor.out), false, "UTF-8");
    System.setOut(new PrintStream(new FileOutputStream(FileDescriptor.err), true, "UTF-8")); // stray prints never corrupt the protocol
    Map<String, DukeSidecar> spaces = new HashMap<>(); // one Duke configuration + index per record type ("ns")
    out.println("{\"ready\":true,\"engine\":\"duke-1.2\"}"); out.flush();
    String line;
    while ((line = in.readLine()) != null) {
      if (line.isEmpty()) continue;
      ObjectNode res;
      JsonNode req = null;
      try { req = M.readTree(line); DukeSidecar s = spaces.computeIfAbsent(req.path("ns").asText("default"), k -> new DukeSidecar()); res = s.handle(req); res.put("ok", true); }
      catch (Throwable e) { res = M.createObjectNode(); res.put("ok", false); res.put("error", String.valueOf(e)); }
      if (req != null && req.has("rid")) res.set("rid", req.get("rid"));
      out.println(M.writeValueAsString(res)); out.flush();
      if (req != null && "exit".equals(req.path("op").asText())) break;
    }
  }

  ObjectNode handle(JsonNode req) throws Exception {
    String op = req.path("op").asText();
    switch (op) {
      case "config": return configure(req.get("config"));
      case "upsert": return upsert((ArrayNode) req.get("records"));
      case "remove": { ObjectNode r = M.createObjectNode(); int n = 0; for (JsonNode id : req.path("ids")) if (live.remove(id.asText()) != null) { stale++; n++; } r.put("removed", n); maybeCompact(); return r; }
      case "compare": return compareIds(req.path("a").asText(), req.path("b").asText());
      case "stats": { ObjectNode r = M.createObjectNode(); r.put("records", live.size()); r.put("staleIndexDocs", stale); r.put("comparisons", comparisons); r.put("queries", queries); r.put("rebuilds", rebuilds); return r; }
      case "reset": live.clear(); newDatabase(); return M.createObjectNode();
      case "exit": return M.createObjectNode();
      default: throw new IllegalArgumentException("unknown op " + op);
    }
  }

  // ------------------------------------------------------------------ configuration (Duke ConfigurationImpl)
  ObjectNode configure(JsonNode c) {
    if (c == null) throw new IllegalArgumentException("config missing");
    threshold = c.path("threshold").asDouble(0.85);
    maybe = c.path("maybeThreshold").asDouble(0.7);
    maxCandidates = c.path("maxCandidates").asInt(100);
    minRelevance = (float) c.path("minRelevance").asDouble(0.0);
    config = new ConfigurationImpl();
    config.setThreshold(threshold);          // before setProperties: Duke picks lookup properties against the threshold
    config.setMaybeThreshold(maybe);
    List<Property> props = new ArrayList<>();
    props.add(new PropertyImpl(ID));
    cleaners.clear(); propNames.clear();
    for (JsonNode p : c.path("properties")) {
      String name = p.path("name").asText();
      PropertyImpl prop = new PropertyImpl(name, comparator(p.path("comparator").asText("levenshtein")), p.path("low").asDouble(0.3), p.path("high").asDouble(0.8));
      String lk = p.path("lookup").asText("default");
      prop.setLookupBehaviour(lk.equals("true") ? Property.Lookup.TRUE : lk.equals("false") ? Property.Lookup.FALSE : lk.equals("required") ? Property.Lookup.REQUIRED : Property.Lookup.DEFAULT);
      props.add(prop);
      List<Cleaner> cl = new ArrayList<>();
      JsonNode cn = p.path("cleaner");
      if (cn.isArray()) for (JsonNode x : cn) cl.add(cleaner(x.asText())); else if (cn.isTextual()) cl.add(cleaner(cn.asText()));
      cleaners.put(name, cl); propNames.add(name);
    }
    config.setProperties(props);
    config.validate(); // Duke rejects configs whose best possible score is below the threshold
    live.clear();
    newDatabase();
    ObjectNode r = M.createObjectNode();
    ArrayNode lk = r.putArray("lookupProperties"); for (Property p : config.getLookupProperties()) lk.add(p.getName());
    r.put("engine", "duke-1.2");
    return r;
  }
  void newDatabase() {
    if (db != null) try { db.close(); } catch (Exception ignore) {}
    db = new LuceneDatabase(); // RAMDirectory (no path)
    db.setConfiguration(config); db.setOverwrite(true); db.setMaxSearchHits(maxCandidates); db.setMinRelevance(minRelevance);
    proc = new Processor(config, db);
    stale = 0;
  }
  void maybeCompact() { // Duke's RAM index cannot delete; superseded docs are filtered by id, and the index is rebuilt when they pile up
    if (stale <= Math.max(5000, 2L * live.size())) return;
    newDatabase(); for (Record r : live.values()) db.index(r); db.commit(); rebuilds++;
  }
  static Comparator comparator(String n) {
    switch (n) {
      case "exact": return new ExactComparator();
      case "levenshtein": return new Levenshtein();
      case "weighted-levenshtein": return new WeightedLevenshtein();
      case "jaro-winkler": return new JaroWinkler();
      case "jaro-winkler-tokenized": return new JaroWinklerTokenized();
      case "person-name": return new PersonNameComparator();
      case "qgram": return new QGramComparator();
      case "dice": return new DiceCoefficientComparator();
      case "jaccard": return new JaccardIndexComparator();
      case "numeric": return new NumericComparator();
      case "soundex": return new SoundexComparator();
      case "metaphone": return new MetaphoneComparator();
      case "lcs": return new LongestCommonSubstring();
      case "date": return new DateComparator();
      default: throw new IllegalArgumentException("unknown comparator " + n);
    }
  }
  static Cleaner cleaner(String n) {
    switch (n) {
      case "lowercase": return new LowerCaseNormalizeCleaner();
      case "person-name": return new PersonNameCleaner();   // Duke: lower-case + nickname mapping (bob -> robert ...)
      case "digits": return new DigitsOnlyCleaner();
      case "trim": return new TrimCleaner();
      case "phone": return v -> { String d = v == null ? "" : v.replaceAll("[^0-9]", ""); if (d.length() == 11 && d.startsWith("1")) d = d.substring(1); return d; };
      case "email": return v -> v == null ? "" : v.trim().toLowerCase(Locale.ROOT);
      case "address": return new AddressCleaner();
      case "company": return new CompanyCleaner();
      case "date": return DateComparator::iso;
      case "first-token": return v -> { if (v == null) return null; String[] t = v.trim().split("\\s+"); return t.length == 0 ? "" : t[0]; };
      case "last-token": return v -> { if (v == null) return null; String[] t = v.trim().split("\\s+"); return t.length == 0 ? "" : t[t.length - 1]; };
      default: throw new IllegalArgumentException("unknown cleaner " + n);
    }
  }

  // ------------------------------------------------------------------ records
  Record toRecord(JsonNode r) {
    Map<String, Collection<String>> data = new HashMap<>();
    String id = r.path("id").asText();
    data.put(ID, Collections.singletonList(id));
    JsonNode vals = r.path("values");
    for (String name : propNames) {
      JsonNode v = vals.get(name); if (v == null || v.isNull()) continue;
      List<String> out = new ArrayList<>();
      for (JsonNode x : (v.isArray() ? v : M.createArrayNode().add(v))) {
        String s = x.asText();
        for (Cleaner c : cleaners.get(name)) { if (s == null) break; s = c.clean(s); }
        if (s != null && !s.isEmpty()) out.add(s);
      }
      if (!out.isEmpty()) data.put(name, out);
    }
    return new RecordImpl(data);
  }

  ObjectNode upsert(ArrayNode records) {
    if (config == null) throw new IllegalStateException("config first");
    List<Record> batch = new ArrayList<>();
    for (JsonNode r : records) {
      Record rec = toRecord(r);
      if (live.put(rec.getValue(ID), rec) != null) stale++;
      db.index(rec); batch.add(rec);
    }
    db.commit();
    ObjectNode res = M.createObjectNode();
    ArrayNode results = res.putArray("results");
    for (Record a : batch) {
      String aid = a.getValue(ID);
      ObjectNode o = results.addObject(); o.put("id", aid);
      ArrayNode ms = o.putArray("matches");
      queries++;
      Set<String> seen = new HashSet<>();
      for (Record cand : db.findCandidateMatches(a)) {
        String bid = cand.getValue(ID);
        if (bid == null || bid.equals(aid) || !seen.add(bid)) continue;
        Record b = live.get(bid); if (b == null) continue; // removed (stale index doc)
        Record lo = aid.compareTo(bid) < 0 ? a : b, hi = lo == a ? b : a;
        double score = proc.compare(lo, hi); comparisons++;
        if (score < maybe) continue;
        ObjectNode m = ms.addObject(); m.put("id", bid); m.put("score", score); m.put("matchWeight", log2odds(score)); m.put("prior", 0.0);
        m.set("why", explain(lo, hi));
      }
    }
    maybeCompact();
    return res;
  }

  ObjectNode compareIds(String a, String b) {
    Record ra = live.get(a), rb = live.get(b);
    if (ra == null || rb == null) throw new IllegalArgumentException("unknown record " + (ra == null ? a : b));
    Record lo = a.compareTo(b) < 0 ? ra : rb, hi = lo == ra ? rb : ra;
    ObjectNode r = M.createObjectNode();
    double sc = proc.compare(lo, hi); comparisons++;
    r.put("score", sc); r.put("matchWeight", log2odds(sc)); r.put("prior", 0.0);
    r.set("why", explain(lo, hi));
    r.put("threshold", threshold); r.put("maybeThreshold", maybe);
    return r;
  }

  static double log2odds(double p) { p = Math.min(1 - 1e-15, Math.max(1e-15, p)); return Math.log(p / (1 - p)) / Math.log(2); }

  /** Per-property contribution, mirroring Duke's Processor.compare: best value pair per property, Bayes-combined. */
  ArrayNode explain(Record r1, Record r2) {
    ArrayNode out = M.createArrayNode();
    double prob = 0.5;
    for (String name : propNames) {
      Property prop = config.getPropertyByName(name);
      Collection<String> vs1 = r1.getValues(name), vs2 = r2.getValues(name);
      if (vs1 == null || vs1.isEmpty() || vs2 == null || vs2.isEmpty()) continue;
      double high = 0.0, bestSim = 0.0; String b1 = null, b2 = null;
      for (String v1 : vs1) for (String v2 : vs2) {
        if (v1.isEmpty() || v2.isEmpty()) continue;
        double p = prop.compare(v1, v2);
        if (b1 == null || p > high) { high = p; b1 = v1; b2 = v2; bestSim = prop.getComparator() == null ? 0 : prop.getComparator().compare(v1, v2); }
      }
      if (b1 == null) continue;
      prob = Utils.computeBayes(prob, high);
      ObjectNode e = out.addObject();
      e.put("property", name); e.put("a", b1); e.put("b", b2); e.put("similarity", bestSim); e.put("probability", high);
      e.put("level", String.format(Locale.ROOT, "%s similarity %.2f", prop.getComparator() == null ? "no comparator" : prop.getComparator().getClass().getSimpleName(), bestSim));
      e.put("weight", log2odds(high)); // engine-neutral explanation: log2 Bayes factor (Duke's prior is 0.5 -> weight 0)
    }
    return out;
  }

  // ------------------------------------------------------------------ helpers Duke does not ship
  /** US-style address normaliser on top of Duke's LowerCaseNormalizeCleaner. */
  static class AddressCleaner implements Cleaner {
    static final Map<String, String> AB = new HashMap<>();
    static { String[] kv = { "street", "st", "avenue", "ave", "av", "ave", "road", "rd", "drive", "dr", "lane", "ln", "court", "ct", "boulevard", "blvd", "place", "pl",
      "terrace", "ter", "parkway", "pkwy", "highway", "hwy", "circle", "cir", "apartment", "apt", "suite", "ste", "unit", "apt", "north", "n", "south", "s", "east", "e", "west", "w", "#", "apt" };
      for (int i = 0; i < kv.length; i += 2) AB.put(kv[i], kv[i + 1]); }
    final LowerCaseNormalizeCleaner sub = new LowerCaseNormalizeCleaner();
    public String clean(String v) {
      if (v == null) return null;
      v = sub.clean(v.replace(",", " ").replace(".", " ").replace("#", " apt "));
      if (v == null) return null;
      StringBuilder sb = new StringBuilder();
      for (String t : v.split("\\s+")) { if (t.isEmpty()) continue; String m = AB.getOrDefault(t, t); if (sb.length() > 0) sb.append(' '); sb.append(m); }
      return sb.toString();
    }
  }
  /** Organisation names: lower-case, drop legal suffixes and "the". */
  static class CompanyCleaner implements Cleaner {
    static final Set<String> DROP = new HashSet<>(Arrays.asList("inc", "incorporated", "llc", "ltd", "limited", "corp", "corporation", "co", "company", "plc", "gmbh", "the", "and", "&"));
    final LowerCaseNormalizeCleaner sub = new LowerCaseNormalizeCleaner();
    public String clean(String v) {
      if (v == null) return null;
      v = sub.clean(v.replace(",", " ").replace(".", " ").replace("&", " and "));
      if (v == null) return null;
      StringBuilder sb = new StringBuilder();
      for (String t : v.split("\\s+")) { if (t.isEmpty() || DROP.contains(t)) continue; if (sb.length() > 0) sb.append(' '); sb.append(t); }
      return sb.toString();
    }
  }
  /** ISO dates. Similarity 1 equal, 0.9 day/month swapped, 0.8 one digit differs, 0.6 same year+month, else 0. */
  static class DateComparator implements Comparator {
    static final String[] MON = { "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec" };
    public boolean isTokenized() { return false; }
    static String iso(String v) {
      if (v == null) return null;
      String s = v.trim().toLowerCase(Locale.ROOT);
      java.util.regex.Matcher m;
      if ((m = java.util.regex.Pattern.compile("^(\\d{4})[-/.](\\d{1,2})[-/.](\\d{1,2})").matcher(s)).find()) return fmt(m.group(1), m.group(2), m.group(3));
      if ((m = java.util.regex.Pattern.compile("^(\\d{1,2})/(\\d{1,2})/(\\d{4})$").matcher(s)).find()) return fmt(m.group(3), m.group(1), m.group(2));      // US mm/dd/yyyy
      if ((m = java.util.regex.Pattern.compile("^(\\d{1,2})\\.(\\d{1,2})\\.(\\d{4})$").matcher(s)).find()) return fmt(m.group(3), m.group(2), m.group(1)); // dd.mm.yyyy
      if ((m = java.util.regex.Pattern.compile("^([a-z]{3})[a-z]*\\.? (\\d{1,2}),? (\\d{4})$").matcher(s)).find()) { int i = Arrays.asList(MON).indexOf(m.group(1)); if (i >= 0) return fmt(m.group(3), String.valueOf(i + 1), m.group(2)); }
      return s;
    }
    static String fmt(String y, String mo, String d) { return String.format("%s-%02d-%02d", y, Integer.parseInt(mo), Integer.parseInt(d)); }
    public double compare(String a, String b) {
      if (a.equals(b)) return 1.0;
      if (a.length() == 10 && b.length() == 10) {
        if (a.substring(0, 4).equals(b.substring(0, 4)) && a.substring(5, 7).equals(b.substring(8, 10)) && a.substring(8, 10).equals(b.substring(5, 7))) return 0.9;
        int diff = 0; for (int i = 0; i < 10; i++) if (a.charAt(i) != b.charAt(i)) diff++;
        if (diff == 1) return 0.8;
        if (a.substring(0, 7).equals(b.substring(0, 7))) return 0.6;
      }
      return 0.0;
    }
  }
}
