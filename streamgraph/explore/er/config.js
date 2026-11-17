// Entity resolution (SPEC §21): defaults, paths and Java lookup. Off unless explore.config.json { "er": { "enabled": true } }.
import { existsSync } from 'node:fs';
import { join, dirname, delimiter } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ER_DIR = dirname(fileURLToPath(import.meta.url));
export const ER_LIB = process.env.STREAMGRAPH_ER_LIB || join(ER_DIR, 'lib');
export const SIDECAR_JAR = join(ER_DIR, 'build', 'duke-sidecar.jar');
const FLINK_RUNTIME = process.env.STREAMGRAPH_FLINK_RUNTIME || join(ER_DIR, '..', 'flink', '.runtime');

/**
 * Comparators (Duke): exact, levenshtein, weighted-levenshtein, jaro-winkler, jaro-winkler-tokenized, person-name, qgram, dice,
 * jaccard, numeric, soundex, metaphone, lcs; plus "date" (sidecar). Cleaners: lowercase, person-name (Duke, nickname mapping),
 * digits, trim (Duke); phone, email, address, company, date (sidecar). low/high = Duke probabilities when values differ / agree.
 * lookup = Duke candidate search: "true" (always searched), "false", "required", "default" (Duke picks).
 * "from" lists the graph properties concatenated into one Duke property (default [name]); arrays become multi-values.
 */
export const PERSON = {
  threshold: 0.9, maybeThreshold: 0.6,
  duke: { threshold: 0.9, maybeThreshold: 0.75 },  // per-engine overrides (scores are calibrated differently)
  splink: { threshold: 0.99, maybeThreshold: 0.6, omit: ['given'] }, // Splink's FS model double-counts a given-name feature that the full-name comparison already covers
  properties: [
    { name: 'name', from: ['name'], comparator: 'jaro-winkler', cleaner: 'person-name', low: 0.25, high: 0.8, lookup: 'true' },
    { name: 'given', from: ['name'], comparator: 'jaro-winkler', cleaner: ['person-name', 'first-token'], low: 0.15, high: 0.6, lookup: 'false' },
    { name: 'email', from: ['email'], comparator: 'exact', cleaner: 'email', low: 0.45, high: 0.93, lookup: 'true' },
    { name: 'phone', from: ['phone'], comparator: 'exact', cleaner: 'phone', low: 0.45, high: 0.85, lookup: 'true' },
    { name: 'address', from: ['address'], comparator: 'qgram', cleaner: 'address', low: 0.4, high: 0.72, lookup: 'false' },
    { name: 'dob', from: ['dob'], comparator: 'date', cleaner: 'date', low: 0.15, high: 0.8, lookup: 'false' },
  ],
};
export const ORGANIZATION = {
  threshold: 0.88, maybeThreshold: 0.6,
  properties: [
    { name: 'name', from: ['name'], comparator: 'jaro-winkler-tokenized', cleaner: 'company', low: 0.2, high: 0.85, lookup: 'true' },
    { name: 'domain', from: ['domain'], comparator: 'exact', cleaner: 'email', low: 0.4, high: 0.93, lookup: 'true' },
    { name: 'phone', from: ['phone'], comparator: 'exact', cleaner: 'phone', low: 0.45, high: 0.8, lookup: 'true' },
    { name: 'address', from: ['address'], comparator: 'qgram', cleaner: 'address', low: 0.4, high: 0.7, lookup: 'false' },
  ],
};

export const ER_DEFAULTS = {
  enabled: false,
  sourceId: 'er',                  // derived-writer source id; every ER item id starts with "er:"
  engine: 'splink',                // matching engine: 'splink' (Splink 5, MIT; default) | 'duke' (Duke 1.2, Apache-2.0). Same interface.
  impl: 'correct',                 // 'wrong' = deliberately wrong resolver (tests / proof only)
  modelsDir: null,                 // splink: trained models <Type>.splink.json (default explore/er/models); missing -> trained on first load
  minTrainRecords: 200,
  types: { Person: PERSON, Organization: ORGANIZATION },
  maxCandidates: 50,               // Duke Lucene max search hits per record
  flushMs: 30, maxBatch: 1000,     // in-process stage: coalesce graph changes before resolving
  entityType: 'Entity', resolvesType: 'RESOLVES_TO', possibleType: 'POSSIBLY_SAME',
  dataSourceProperty: 'dataSource', recordIdProperty: 'recordId', // optional record properties (default: first source id / node id)
  featureValues: 5,                // distinct values per feature copied onto the entity
  kafka: { runWorker: true, groupId: null }, // kafka mode: one ER worker (singleton, transactional id fenced) per cluster
  java: null, heap: '512m',
};

export function erConfig(cfg = {}) {
  const c = { ...ER_DEFAULTS, ...cfg, kafka: { ...ER_DEFAULTS.kafka, ...(cfg.kafka || {}) } };
  c.types = cfg.types || ER_DEFAULTS.types;
  if (process.env.EXPLORE_ER === '1') c.enabled = true;
  if (process.env.ER_IMPL) c.impl = process.env.ER_IMPL;
  if (process.env.ER_ENGINE) c.engine = process.env.ER_ENGINE;
  c.modelsDir = c.modelsDir || join(ER_DIR, 'models');
  c.types = Object.fromEntries(Object.entries(c.types).map(([t, tc]) => { const o = tc[c.engine] || {}; const x = { ...tc, ...o }; if (o.omit) x.properties = tc.properties.filter(p => !o.omit.includes(p.name)); return [t, x]; }));
  for (const [t, tc] of Object.entries(c.types)) {
    if (!(tc.threshold > 0 && tc.threshold < 1) || !(tc.maybeThreshold > 0 && tc.maybeThreshold <= tc.threshold)) throw new Error(`er.types.${t}: need 0 < maybeThreshold <= threshold < 1`);
    for (const p of tc.properties || []) if (!p.name) throw new Error(`er.types.${t}: property without name`);
  }
  return c;
}

export function javaBin(c = {}) {
  const exe = process.platform === 'win32' ? 'java.exe' : 'java';
  const cands = [c.java, process.env.STREAMGRAPH_JAVA, process.env.JAVA_HOME && join(process.env.JAVA_HOME, 'bin', exe), join(ER_DIR, '.runtime', 'jdk', 'bin', exe), join(FLINK_RUNTIME, 'jdk', 'bin', exe)];
  for (const p of cands) if (p && existsSync(p)) return p;
  return 'java';
}
export function pythonBin(c = {}) {
  const win = process.platform === 'win32';
  const cands = [c.python, process.env.STREAMGRAPH_PYTHON, join(ER_DIR, '.venv', win ? 'Scripts' : 'bin', win ? 'python.exe' : 'python')];
  for (const p of cands) if (p && existsSync(p)) return p;
  return win ? 'python' : 'python3';
}
export function sidecarClasspath() {
  if (!existsSync(join(ER_LIB, 'duke-1.2.jar'))) throw new Error(`Duke not found in ${ER_LIB}. Run: npm run er:setup`);
  if (!existsSync(SIDECAR_JAR)) throw new Error(`sidecar jar missing (${SIDECAR_JAR}). Run: npm run er:build`);
  return [SIDECAR_JAR, join(ER_LIB, '*')].join(delimiter);
}
export function erAvailable() { try { sidecarClasspath(); return true; } catch { return false; } }
