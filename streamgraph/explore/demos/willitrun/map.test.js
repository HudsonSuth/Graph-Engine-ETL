import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileStyle } from '../../shared/style.js';
import { mapFixture, speedProps, indexExactBenchmarks, SOURCE_ID } from './map.js';

const DIR = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(DIR, 'fixture.json');
const STYLE = JSON.parse(readFileSync(join(DIR, 'style.json'), 'utf8'));

function tinyFixture() {
  return {
    fetchedAt: '2026-11-13T00:00:00.000Z',
    config: { minq: 'q4', ctx: 4096, kv: 'f16', ram: 32, rambw: 50 },
    models: [
      { slug: 'small-7b', name: 'Small 7B', params: 7e9, moe: false, released: '2026-01-01', maxCtx: 8192 },
      { slug: 'huge-70b', name: 'Huge 70B', params: 70e9, moe: true, released: '2026-02-01', maxCtx: 32768 },
    ],
    hardware: [
      { id: 'rtx-5060', name: 'RTX 5060', type: 'gpu', memGB: 8, gpuUsableGB: 8, gpuUsableIsEstimate: false },
      { id: 'rtx-4090', name: 'RTX 4090', type: 'gpu', memGB: 24, gpuUsableGB: 24, gpuUsableIsEstimate: false },
    ],
    benchmarks: [
      { hw: 'rtx-5060', model: 'small-7b', quant: 'Q4_K_M', kind: 'measured', tg128: 55.5, pp512: 400, source: 'https://example.test/bench' },
      { hw: 'unknown-card', model: 'small-7b', quant: 'Q4_K_M', kind: 'measured', tg128: 99, source: 'https://example.test/ignore' },
      { hw: 'rtx-5060', model: 'small-7b', quant: 'Q4_K_M', kind: 'guess', tg128: 123 },
    ],
    fits: {
      'rtx-5060': {
        ctx: 4096, kv: 'f16', ramGB: 32, minQuant: 'q4',
        models: [
          { model: 'small-7b', name: 'Small 7B', bestQuant: 'Q4_K_M', verdict: 'fits', needGB: 5.2, gpuUsableGB: 8, speed: { kind: 'none' }, checkerUrl: 'https://willitrunllm.com/?hw=rtx-5060&model=small-7b' },
          { model: 'huge-70b', name: 'Huge 70B', bestQuant: 'Q4_K_M', verdict: 'offload', needGB: 40, gpuUsableGB: 8, speed: { kind: 'ESTIMATE', tg128_high: 3.1, basis: 'RAM bandwidth' }, checkerUrl: 'https://willitrunllm.com/?hw=rtx-5060&model=huge-70b' },
        ],
      },
      'rtx-4090': {
        ctx: 4096, kv: 'f16', ramGB: 32, minQuant: 'q4',
        models: [
          { model: 'small-7b', name: 'Small 7B', bestQuant: 'Q8_0', verdict: 'tight', needGB: 22, gpuUsableGB: 24, memory: { kind: 'ESTIMATE', needGB: 22, weightsGB: 20, kvCacheGB: 1, gpuUsableGB: 24, headroomGB: 2 }, speed: { kind: 'measured', tg128: 80, source: 'https://example.test/4090' } },
        ],
      },
    },
  };
}

test('counts match the fixture: two models, two GPUs, quants, and inferred no edges', () => {
  const f = tinyFixture();
  const { nodes, links, stats, warnings } = mapFixture(f);
  assert.equal(warnings.length, 0);
  assert.equal(stats.models, 2);
  assert.equal(stats.hardware, 2);
  assert.equal(stats.quantizations, 2); // Q4_K_M and Q8_0
  assert.equal(nodes.filter(n => n.type === 'Model').length, 2);
  assert.equal(nodes.filter(n => n.type === 'GPU').length, 2);
  assert.equal(nodes.filter(n => n.type === 'Quantization').length, 2);
  assert.equal(nodes.length, stats.nodes);
  // 2 hw * 2 models = 4 fit edges, plus AT_QUANT for (small, Q4_K_M), (huge, Q4_K_M), (small, Q8_0)
  assert.equal(stats.verdicts.fits, 1);
  assert.equal(stats.verdicts.tight, 1);
  assert.equal(stats.verdicts.offload, 1);
  assert.equal(stats.verdicts.no, 1); // huge-70b was not returned for rtx-4090
  assert.equal(links.filter(l => l.type !== 'AT_QUANT').length, 4);
  assert.equal(links.length, stats.links);
});

test('verdict mapping is taken from the fit row; missing rows become no without invented memory', () => {
  const { links } = mapFixture(tinyFixture());
  const fit = Object.fromEntries(links.filter(l => l.type !== 'AT_QUANT').map(l => [`${l.fromId}->${l.toId}`, l]));
  const m = s => `${SOURCE_ID}:node:model:${s}`;
  const h = s => `${SOURCE_ID}:node:hw:${s}`;
  assert.equal(fit[`${m('small-7b')}->${h('rtx-5060')}`].type, 'fits');
  assert.equal(fit[`${m('huge-70b')}->${h('rtx-5060')}`].type, 'offload');
  assert.equal(fit[`${m('small-7b')}->${h('rtx-4090')}`].type, 'tight');
  const no = fit[`${m('huge-70b')}->${h('rtx-4090')}`];
  assert.equal(no.type, 'no');
  assert.equal(no.properties.verdict, 'no');
  assert.equal(no.properties.needGB, undefined);
  assert.equal(no.properties.tg128, undefined);
  assert.equal(no.properties.speedKind, undefined);
  assert.equal(fit[`${m('huge-70b')}->${h('rtx-5060')}`].properties.needGB, 40);
});

test('speeds are copied only when measured or ESTIMATE; unmatched benches are ignored', () => {
  assert.deepEqual(speedProps({ kind: 'none', note: 'no data' }), {});
  assert.deepEqual(speedProps(null), {});
  assert.deepEqual(speedProps({ kind: 'guess', tg128: 99 }), {});
  assert.deepEqual(speedProps({ kind: 'measured', tg128: 55.5, source: 'https://x' }), { speedKind: 'measured', tg128: 55.5, speedSource: 'https://x' });

  const f = tinyFixture();
  assert.equal(indexExactBenchmarks(f).size, 1); // unknown-card and kind:guess dropped
  const { links } = mapFixture(f);
  const edge = links.find(l => l.id.endsWith('small-7b->rtx-5060'));
  // fit row had kind:none, but an exact measured bench fills it in
  assert.equal(edge.properties.speedKind, 'measured');
  assert.equal(edge.properties.tg128, 55.5);
  assert.equal(edge.properties.speedSource, 'https://example.test/bench');
  const tight = links.find(l => l.id.endsWith('small-7b->rtx-4090'));
  assert.equal(tight.properties.speedKind, 'measured');
  assert.equal(tight.properties.tg128, 80);
  const off = links.find(l => l.id.endsWith('huge-70b->rtx-5060'));
  assert.equal(off.properties.speedKind, 'ESTIMATE');
  assert.equal(off.properties.tg128_high, 3.1);
  assert.equal(off.properties.tg128, undefined);
  for (const l of links) {
    if (l.properties.tg128 != null || l.properties.tg128_high != null || l.properties.speedKind) {
      assert.ok(l.properties.speedKind === 'measured' || l.properties.speedKind === 'ESTIMATE', l.id);
    }
  }
});

test('style colours edges by verdict and sizes models by params', () => {
  const s = compileStyle(STYLE);
  assert.deepEqual(s.warnings, []);
  const model = { kind: 'node', type: 'Model', properties: { paramsB: 7 } };
  const big = { kind: 'node', type: 'Model', properties: { paramsB: 70 } };
  assert.ok(s.nodeStyle(big).size > s.nodeStyle(model).size);
  assert.equal(s.linkStyle({ kind: 'link', type: 'fits', properties: {} }).color, '#4FD1A1');
  assert.equal(s.linkStyle({ kind: 'link', type: 'tight', properties: {} }).color, '#F5C451');
  assert.equal(s.linkStyle({ kind: 'link', type: 'offload', properties: {} }).color, '#FF8A5B');
  assert.equal(s.linkStyle({ kind: 'link', type: 'no', properties: {} }).color, '#5B6475');
});

test('cached fixture maps 1:1 and does not invent speeds', { skip: !existsSync(FIXTURE) }, () => {
  const f = JSON.parse(readFileSync(FIXTURE, 'utf8'));
  const { nodes, links, stats, warnings } = mapFixture(f);
  assert.ok(warnings.every(w => w.code !== 'unknown_verdict'), JSON.stringify(warnings.filter(w => w.code === 'unknown_verdict')));
  assert.equal(stats.models, f.models.length);
  assert.equal(stats.hardware, f.hardware.length);
  assert.equal(nodes.filter(n => n.type === 'Model').length, f.models.length);
  const hwTypes = new Set(f.hardware.map(h => h.type));
  assert.ok(hwTypes.has('gpu'));
  const fitLinks = links.filter(l => l.type !== 'AT_QUANT');
  assert.equal(fitLinks.length, f.models.length * f.hardware.length);
  let expected = { fits: 0, tight: 0, offload: 0, no: 0 };
  for (const hw of f.hardware) {
    const rows = f.fits[hw.id]?.models || [];
    const seen = new Set();
    for (const row of rows) {
      if (!f.models.some(m => m.slug === row.model)) continue;
      seen.add(row.model);
      expected[row.verdict]++;
      const edge = fitLinks.find(l => l.id === `${SOURCE_ID}:link:fit:${row.model}->${hw.id}`);
      assert.ok(edge, `missing edge ${row.model}->${hw.id}`);
      assert.equal(edge.type, row.verdict);
      assert.equal(edge.properties.needGB ?? null, row.needGB ?? row.memory?.needGB ?? null);
      if (edge.properties.speedKind === 'measured' && row.speed?.kind === 'measured') {
        assert.equal(edge.properties.tg128, row.speed.tg128);
        assert.equal(edge.properties.speedSource, row.speed.source);
      }
      if (row.speed?.kind === 'none' || row.speed == null) {
        // may still have a measured bench, but never a made-up number
        if (edge.properties.speedKind) assert.equal(edge.properties.speedKind, 'measured');
      }
    }
    expected.no += f.models.length - seen.size;
  }
  assert.deepEqual(stats.verdicts, expected);
  for (const l of fitLinks) {
    if (l.type === 'no') {
      assert.equal(l.properties.needGB, undefined);
      assert.equal(l.properties.tg128, undefined);
      assert.equal(l.properties.speedKind, undefined);
    }
    if (l.properties.speedKind) assert.ok(l.properties.speedKind === 'measured' || l.properties.speedKind === 'ESTIMATE');
  }
  // featured pair from the live catalog (only assert if present)
  const qwen = (f.fits['rtx-5060']?.models || []).find(r => r.model === 'qwen3-6-35b-a3b');
  if (qwen) {
    const edge = fitLinks.find(l => l.id.endsWith('qwen3-6-35b-a3b->rtx-5060'));
    assert.equal(edge.type, qwen.verdict);
    assert.equal(edge.properties.needGB, qwen.needGB ?? qwen.memory?.needGB);
  }
});

test('benchmarks attach only when the hardware label uniquely matches a catalog card', () => {
  const f = tinyFixture();
  f.hardware.push(
    { id: 'rtx-5060-ti-8gb', name: 'RTX 5060 Ti 8GB', type: 'gpu', memGB: 8, gpuUsableGB: 8 },
    { id: 'rtx-5060-ti-16gb', name: 'RTX 5060 Ti 16GB', type: 'gpu', memGB: 16, gpuUsableGB: 16 },
  );
  f.models.push({ slug: 'gpt-oss-20b', name: 'GPT-OSS 20B', params: 21e9, moe: true, released: '2025-01-01', maxCtx: 131072 });
  f.benchmarks = [
    { hw: 'RTX 5060', model: 'gpt-oss-20b', quant: 'Q4_K_M', kind: 'measured', tg128: 40, source: 'https://example.test/5060' },
    { hw: 'NVIDIA GeForce RTX 5060', model: 'gpt-oss-20b', quant: 'Q8_0', kind: 'measured', tg128: 30, source: 'https://example.test/5060-q8' },
    { hw: 'RTX 5060 Ti', model: 'gpt-oss-20b', quant: 'Q4_K_M', kind: 'measured', tg128: 99, source: 'https://example.test/ti' },
    { hw: 'unknown-card', model: 'gpt-oss-20b', quant: 'Q4_K_M', kind: 'measured', tg128: 1, source: 'https://example.test/x' },
  ];
  const idx = indexExactBenchmarks(f);
  assert.equal(idx.has('gpt-oss-20b::rtx-5060::Q4_K_M'), true);
  assert.equal(idx.get('gpt-oss-20b::rtx-5060::Q4_K_M').tg128, 40);
  assert.equal(idx.has('gpt-oss-20b::rtx-5060::Q8_0'), true);
  assert.equal(idx.has('gpt-oss-20b::rtx-5060-ti-8gb::Q4_K_M'), false, 'ambiguous Ti must not attach');
  assert.equal(idx.has('gpt-oss-20b::rtx-5060-ti-16gb::Q4_K_M'), false);
});
