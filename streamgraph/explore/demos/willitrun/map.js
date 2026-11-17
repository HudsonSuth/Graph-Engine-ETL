// Pure mapping: a Will It Run? API/MCP fixture -> canonical explore items.
// Never invents memory or speed figures: only fields present on a fit row or an
// exact (model slug, hardware id, quant) benchmark match are copied.
export const SOURCE_ID = 'willitrun';
export const VERDICTS = new Set(['fits', 'tight', 'offload', 'no']);
export const HW_TYPES = { gpu: 'GPU', mac: 'Mac', 'unified-apu': 'UnifiedAPU' };

export const DEFAULT_CONFIG = Object.freeze({
  minq: 'q4',
  ctx: 4096,
  kv: 'f16',
  ram: 32,     // system RAM for discrete-GPU offload; the API ignores this for Macs
  rambw: 50,
});

const nodeId = (kind, native) => `${SOURCE_ID}:node:${kind}:${native}`;
const linkId = (kind, native) => `${SOURCE_ID}:link:${kind}:${native}`;
const prov = (native, fetchedAt) => [{ sourceId: SOURCE_ID, nativeId: String(native), fetchedAt }];
const defined = obj => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ''));

/** Copy speed fields only when the API labelled them measured or ESTIMATE. */
export function speedProps(speed) {
  if (!speed || typeof speed !== 'object') return {};
  const kind = speed.kind;
  if (kind !== 'measured' && kind !== 'ESTIMATE') return {};
  return defined({
    speedKind: kind,
    tg128: speed.tg128,
    pp512: speed.pp512,
    tg128_low: speed.tg128_low,
    tg128_high: speed.tg128_high,
    speedBasis: speed.basis,
    speedSource: speed.source,
    speedNote: kind === 'measured' ? speed.note : undefined,
  });
}

function benchKey(model, hw, quant) {
  return `${model}::${hw}::${String(quant || '').toUpperCase()}`;
}

/** Lowercase label with vendor prefixes stripped, for unique-name matching only. */
export function normHwLabel(s) {
  let t = String(s || '').toLowerCase().trim();
  t = t.replace(/^(nvidia geforce|nvidia tesla|nvidia quadro|nvidia|geforce|tesla|quadro|amd|intel|apple)\s+/, '');
  return t.replace(/-/g, ' ').replace(/\s+/g, ' ');
}

/** Resolve a benchmark hardware label to a catalog id only when the match is unique. */
export function resolveHardwareId(benchHw, hardware) {
  if (!benchHw || !Array.isArray(hardware)) return null;
  if (hardware.some(h => h.id === benchHw)) return benchHw;
  const nameHits = hardware.filter(h => h.name && h.name.toLowerCase() === String(benchHw).toLowerCase());
  if (nameHits.length === 1) return nameHits[0].id;
  if (nameHits.length > 1) return null;
  const n = normHwLabel(benchHw);
  const ids = [...new Set(hardware.filter(h => normHwLabel(h.name) === n || normHwLabel(String(h.id).replace(/-/g, ' ')) === n).map(h => h.id))];
  return ids.length === 1 ? ids[0] : null;
}

/** Index measured benchmarks that uniquely match a catalog model slug and hardware id. */
export function indexExactBenchmarks(fixture) {
  const hardware = fixture.hardware || [];
  const modelSlugs = new Set((fixture.models || []).map(m => m.slug));
  const index = new Map();
  for (const b of fixture.benchmarks || []) {
    if (!b || b.kind !== 'measured') continue;
    if (!modelSlugs.has(b.model) || !b.quant) continue;
    const hwId = resolveHardwareId(b.hw, hardware);
    if (!hwId) continue;
    const k = benchKey(b.model, hwId, b.quant);
    if (!index.has(k)) index.set(k, { ...b, hw: hwId }); // first matching row wins; never invent a substitute
  }
  return index;
}

function fitQuant(row) {
  return row.bestQuant || row.quant || null;
}

function fitNeedGB(row) {
  if (row.needGB != null) return row.needGB;
  if (row.memory && row.memory.needGB != null) return row.memory.needGB;
  return undefined;
}

function fitGpuUsable(row) {
  if (row.gpuUsableGB != null) return row.gpuUsableGB;
  if (row.memory && row.memory.gpuUsableGB != null) return row.memory.gpuUsableGB;
  return undefined;
}

function memoryProps(row) {
  const mem = row.memory && typeof row.memory === 'object' ? row.memory : null;
  const needGB = fitNeedGB(row);
  const gpuUsableGB = fitGpuUsable(row);
  const out = defined({
    needGB,
    gpuUsableGB,
    memoryKind: mem?.kind,
    weightsGB: mem?.weightsGB,
    kvCacheGB: mem?.kvCacheGB,
    headroomGB: mem?.headroomGB,
    ramFreeForOffloadGB: mem?.ramFreeForOffloadGB,
  });
  const off = row.offload && typeof row.offload === 'object' ? row.offload : null;
  if (off) {
    Object.assign(out, defined({
      offloadKind: off.kind,
      offloadPlacement: off.placement,
      offloadStatus: off.status,
      offloadRamGB: off.ramGB,
      offloadVramGB: off.vramGB,
      pctLayersOnGpu: off.pctLayersOnGpu,
    }));
  }
  return out;
}

/**
 * Map a cached Will It Run? fixture to explore nodes and links.
 * Options: { includeNo = true, fetchedAt, sourceId }.
 */
export function mapFixture(fixture, opts = {}) {
  if (!fixture || typeof fixture !== 'object') throw new Error('fixture is required');
  const includeNo = opts.includeNo !== false;
  const fetchedAt = opts.fetchedAt || fixture.fetchedAt || fixture.meta?.fetchedAt || fixture.meta?.dataDate || null;
  const config = { ...DEFAULT_CONFIG, ...(fixture.config || {}) };
  const models = fixture.models || [];
  const hardware = fixture.hardware || [];
  const fitsByHw = fixture.fits || {};
  const benches = indexExactBenchmarks(fixture);
  const warnings = [];
  const nodes = [];
  const links = [];
  const quants = new Set();
  const modelSet = new Set();

  for (const m of models) {
    if (!m?.slug) { warnings.push({ code: 'missing_id', message: 'model without slug' }); continue; }
    modelSet.add(m.slug);
    const params = typeof m.params === 'number' ? m.params : undefined;
    nodes.push({
      id: nodeId('model', m.slug),
      kind: 'node',
      type: 'Model',
      label: m.name || m.slug,
      properties: defined({
        slug: m.slug,
        params,
        paramsB: params != null ? params / 1e9 : undefined,
        moe: m.moe,
        released: m.released,
        maxCtx: m.maxCtx,
        family: m.family,
        hf: m.hf,
        source: m.source,
      }),
      sources: prov(m.slug, fetchedAt),
    });
  }

  const hwSet = new Set();
  for (const h of hardware) {
    if (!h?.id) { warnings.push({ code: 'missing_id', message: 'hardware without id' }); continue; }
    hwSet.add(h.id);
    const type = HW_TYPES[h.type] || 'Hardware';
    nodes.push({
      id: nodeId('hw', h.id),
      kind: 'node',
      type,
      label: h.name || h.id,
      properties: defined({
        hwId: h.id,
        hwType: h.type,
        memGB: h.memGB,
        gpuUsableGB: h.gpuUsableGB,
        gpuUsableIsEstimate: h.gpuUsableIsEstimate,
        memBandwidthGBs: h.memBandwidthGBs,
        chipKey: h.chipKey,
        os: h.os,
      }),
      sources: prov(h.id, fetchedAt),
    });
  }

  const usedModelQuant = new Set();
  let verdictCounts = { fits: 0, tight: 0, offload: 0, no: 0 };
  const fitted = new Map(); // hwId -> Set(model slug)

  for (const hwId of hwSet) {
    const block = fitsByHw[hwId];
    const rows = Array.isArray(block) ? block : block?.models || [];
    const seen = new Set();
    fitted.set(hwId, seen);
    for (const row of rows) {
      const slug = row.model;
      if (!slug || !modelSet.has(slug)) {
        warnings.push({ code: 'unknown_model', message: `fit for ${hwId} references ${slug}` });
        continue;
      }
      const verdict = row.verdict;
      if (!VERDICTS.has(verdict)) {
        warnings.push({ code: 'unknown_verdict', message: `${slug}->${hwId} verdict ${verdict}` });
        continue;
      }
      seen.add(slug);
      const quant = fitQuant(row);
      if (quant) { quants.add(quant); usedModelQuant.add(`${slug}::${quant}`); }
      const props = defined({
        verdict,
        quant,
        ctx: block?.ctx ?? config.ctx,
        kv: block?.kv ?? config.kv,
        ramGB: block?.ramGB ?? config.ram,
        minQuant: block?.minQuant ?? config.minq,
        checkerUrl: row.checkerUrl,
        ...memoryProps(row),
        ...speedProps(row.speed),
      });
      // Exact benchmark match may fill measured speed when the fit row had none.
      if (!props.speedKind && quant) {
        const b = benches.get(benchKey(slug, hwId, quant));
        if (b) Object.assign(props, speedProps(b));
      }
      links.push({
        id: linkId('fit', `${slug}->${hwId}`),
        kind: 'link',
        type: verdict,
        fromId: nodeId('model', slug),
        toId: nodeId('hw', hwId),
        properties: props,
        sources: prov(`${slug}->${hwId}`, fetchedAt),
      });
      verdictCounts[verdict]++;
    }
  }

  if (includeNo) {
    for (const hwId of hwSet) {
      const seen = fitted.get(hwId) || new Set();
      for (const slug of modelSet) {
        if (seen.has(slug)) continue;
        links.push({
          id: linkId('fit', `${slug}->${hwId}`),
          kind: 'link',
          type: 'no',
          fromId: nodeId('model', slug),
          toId: nodeId('hw', hwId),
          properties: defined({
            verdict: 'no',
            ctx: config.ctx,
            kv: config.kv,
            ramGB: config.ram,
            minQuant: config.minq,
            // no memory or speed: the catalog list did not return this pair
          }),
          sources: prov(`${slug}->${hwId}`, fetchedAt),
        });
        verdictCounts.no++;
      }
    }
  }

  for (const q of [...quants].sort()) {
    nodes.push({
      id: nodeId('quant', q),
      kind: 'node',
      type: 'Quantization',
      label: q,
      properties: { quant: q },
      sources: prov(q, fetchedAt),
    });
  }
  for (const key of [...usedModelQuant].sort()) {
    const [slug, quant] = key.split('::');
    links.push({
      id: linkId('quant', `${slug}->${quant}`),
      kind: 'link',
      type: 'AT_QUANT',
      fromId: nodeId('model', slug),
      toId: nodeId('quant', quant),
      properties: { quant },
      sources: prov(`${slug}->${quant}`, fetchedAt),
    });
  }

  const stats = {
    nodes: nodes.length,
    links: links.length,
    models: modelSet.size,
    hardware: hwSet.size,
    quantizations: quants.size,
    atQuantLinks: usedModelQuant.size,
    verdicts: verdictCounts,
    exactBenchmarksIndexed: benches.size,
    config,
  };
  return { nodes, links, stats, warnings };
}

export function itemByNative(items, kind, native) {
  const id = kind === 'link' || String(native).includes('->') ? linkId(kind, native) : nodeId(kind, native);
  return items.find(i => i.id === id);
}
