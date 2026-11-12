// Compiles the no-code workspace (sources, entities, links, clean-up presets, questions)
// down to the engine's flow + schema-driven mapping + pattern queries. Users never see JSONata.
const f = name => '`' + String(name).replace(/`/g, '') + '`';          // JSONata field reference
const lit = v => JSON.stringify(v);
export const RULES = {
  exact: { label: 'Exactly the same', expr: c => `$string(${f(c)})` },
  ignoreCase: { label: 'Ignore upper/lower case and spaces', expr: c => `$lowercase($replace($string(${f(c)}), /\\s+/, ""))` },
  normalizedId: { label: 'Same ID once punctuation is removed', expr: c => `$lowercase($replace($string(${f(c)}), /[^A-Za-z0-9]/, ""))` },
};
export const keyExpr = (col, rule = 'exact') => (RULES[rule] || RULES.exact).expr(col);

// ---- Clean up presets -> engine transform steps
export const PRESETS = {
  trim: { label: 'Remove extra spaces', fields: 1 },
  lowercase: { label: 'Make lowercase', fields: 1 },
  uppercase: { label: 'Make UPPERCASE', fields: 1 },
  number: { label: 'Treat as a number', fields: 1 },
  parseDate: { label: 'Read as a date', fields: 1, options: { format: ['auto', 'MM/DD/YYYY', 'DD/MM/YYYY'] } },
  combine: { label: 'Combine fields into one', fields: 2 },
  keepIf: { label: 'Keep only rows where…', fields: 1, options: { op: ['is', 'is not', 'contains', 'more than', 'less than', 'is not empty'] } },
};
const isNum = v => v !== '' && v != null && !isNaN(Number(v));
export function keepIfExpr({ field, op, value }) {
  const x = f(field);
  switch (op) {
    case 'is': return `$string(${x}) = ${lit(String(value))}`;
    case 'is not': return `$string(${x}) != ${lit(String(value))}`;
    case 'contains': return `$contains($lowercase($string(${x})), ${lit(String(value).toLowerCase())})`;
    case 'more than': if (!isNum(value)) throw new Error('"more than" needs a number'); return `$number(${x}) > ${Number(value)}`;
    case 'less than': if (!isNum(value)) throw new Error('"less than" needs a number'); return `$number(${x}) < ${Number(value)}`;
    case 'is not empty': return `$exists(${x}) and $string(${x}) != ""`;
    default: throw new Error(`Unknown condition "${op}"`);
  }
}
export function cleanupToSteps(cleanup = [], prefix = 'clean') {
  return cleanup.map((c, i) => {
    const id = `${prefix}_${i + 1}`, x = f(c.field), guard = e => `$exists(${x}) ? ${e} : ${x}`;
    switch (c.do) {
      case 'trim': return { id, type: 'map', config: { set: { [c.field]: guard(`$trim($string(${x}))`) } } };
      case 'lowercase': return { id, type: 'map', config: { set: { [c.field]: guard(`$lowercase($string(${x}))`) } } };
      case 'uppercase': return { id, type: 'map', config: { set: { [c.field]: guard(`$uppercase($string(${x}))`) } } };
      case 'number': return { id, type: 'map', config: { set: { [c.field]: guard(`$number($string(${x})) ? $number($string(${x})) : ${x}`) } } };
      case 'parseDate': return { id, type: 'map', config: { set: { [c.field]: `$sgDate(${x}, ${lit(c.format || 'auto')})` } } };
      case 'combine': {
        const fields = c.fields || [c.field, c.field2]; if (!c.into) throw new Error('Pick a name for the combined field');
        return { id, type: 'map', config: { set: { [c.into]: `$join([${fields.map(f).join(', ')}].$string($), ${lit(c.separator ?? ' ')})` } } };
      }
      case 'keepIf': return { id, type: 'filter', config: { expr: keepIfExpr(c) } };
      default: throw new Error(`Unknown clean-up step "${c.do}"`);
    }
  });
}

// ---- Source -> engine source step (secrets stay as {{secret:id}} placeholders)
export function sourceStep(s) {
  const id = `src_${s.id}`, every = (s.syncEverySec || 5) * 1000, sync = s.keepInSync !== false, st = s.settings || {};
  switch (s.kind) {
    case 'csv': case 'json': return { id, type: 'file', config: { path: st.path, topic: s.id, ...(sync ? { key: s.rawKey || s.key, intervalMs: every } : {}) } };
    case 'api': return { id, type: 'http', config: { url: st.url, topic: s.id, itemsPath: st.itemsPath || undefined, key: s.rawKey || s.key, intervalMs: every,
      headers: s.hasSecret ? { Authorization: `Bearer {{secret:${s.id}}}` } : undefined } };
    case 'database': {
      const conn = st.driver === 'sqlite' ? { driver: 'sqlite', database: st.file } : { driver: 'postgres', connectionString: `postgres://${encodeURIComponent(st.user || 'postgres')}:{{secret:${s.id}|url}}@${st.host || 'localhost'}:${st.port || 5432}/${st.database}` };
      if (!sync) return { id, type: 'sql', config: { ...conn, table: st.table, topic: s.id } };
      return { id, type: 'cdc', config: { ...conn, table: st.table, topic: s.id, key: s.rawKey || s.key, intervalMs: every, ...(st.changedColumn ? { updatedAt: st.changedColumn } : { fullScan: true }) } };
    }
    case 'stream': return { id, type: 'kafka', config: { brokers: String(st.brokers).split(',').map(x => x.trim()), topics: [st.feed], topicMap: { [st.feed]: s.id }, groupId: `streamgraph-${s.id}`,
      ...(s.hasSecret ? { ssl: true, sasl: { mechanism: 'plain', username: st.user, password: `{{secret:${s.id}}}` } } : {}) } };
    default: throw new Error(`Unknown source kind ${s.kind}`);
  }
}

// ---- Whole workspace -> flow
export function compileWorkspace(ws) {
  const steps = [], links = [], mapping = {};
  const rule = label => ws.entities?.[label]?.rule || 'exact';
  for (const s of ws.sources || []) {
    const src = sourceStep(s); steps.push(src);
    let prev = src.id;
    for (const c of cleanupToSteps(s.cleanup, `clean_${s.id}`)) { c.config.topics = [s.id]; steps.push(c); links.push({ from: prev, to: c.id }); prev = c.id; }
    links.push({ from: prev, to: 'saved_to_graph' });
    const props = Object.fromEntries(Object.entries(s.fields || {}).filter(([, col]) => col).map(([p, col]) => [p, f(col)]));
    props[`_src_${s.id}`] = 'true';
    const m = { nodes: [{ label: s.entity, key: keyExpr(s.key, rule(s.entity)), props }], edges: [] };
    for (const r of (ws.relationships || []).filter(r => r.source === s.id)) {
      m.edges.push({ type: r.type || `HAS_${s.entity.toUpperCase()}`, from: { label: r.toEntity, key: keyExpr(r.field, rule(r.toEntity)) }, to: { label: s.entity, key: keyExpr(s.key, rule(s.entity)) } });
    }
    mapping[s.id] = m;
  }
  steps.push({ id: 'saved_to_graph', type: 'graph', config: { mapping } });
  return { name: ws.name || 'my-knowledge-graph', steps, links };
}

// ---- Point-and-click question -> pattern query + where filters
const OPS = { is: '=', 'is not': '!=', contains: 'contains', 'more than': '>', 'less than': '<', 'has a value': 'exists' };
export function compileQuestion(q) {
  if (!q?.entity) throw new Error('Pick what you want to see');
  const where = [], node = (alias, label, filters = []) => {
    const eq = {};
    for (const x of filters) {
      if (!x.field || !OPS[x.op]) throw new Error('Each filter needs a field and a condition');
      if (x.op === 'is') eq[x.field] = x.value; else where.push({ alias, field: x.field, op: OPS[x.op], value: x.value });
    }
    const props = Object.entries(eq).map(([k, v]) => `${/^\w+$/.test(k) ? k : (() => { throw new Error(`Field "${k}" needs a simple name`); })()}:${lit(v)}`).join(', ');
    if (!/^\w+$/.test(label)) throw new Error(`Bad type ${label}`);
    return `(${alias}:${label}${props ? ' {' + props + '}' : ''})`;
  };
  let pattern = node('a', q.entity, q.filters);
  if (q.related?.entity) {
    const r = q.related; if (!/^\w+$/.test(r.edge)) throw new Error('Pick how they are connected');
    pattern += r.dir === 'in' ? `<-[:${r.edge}]-` : `-[:${r.edge}]->`;
    pattern += node('b', r.entity, r.filters);
  }
  return { pattern, where };
}
