// Edge middleware for the static demo: fail closed when DEMO_PASSWORD is unset.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authorize, basicValue, safeEqual } from '../demo/vercel-full/middleware.js';

const req = (authorization) => new Request('https://demo.example/', { headers: authorization ? { authorization } : {} });

test('safeEqual rejects different lengths and values', () => {
  assert.equal(safeEqual('demo:secret', 'demo:secret'), true);
  assert.equal(safeEqual('demo:secret', 'demo:secreT'), false);
  assert.equal(safeEqual('demo:secret', 'demo:secret-extra'), false);
  assert.equal(safeEqual('', 'x'), false);
});

test('authorize returns 401 when DEMO_PASSWORD is unset', () => {
  for (const env of [{}, { DEMO_PASSWORD: '' }, { DEMO_PASSWORD: undefined }]) {
    const res = authorize(req(basicValue('demo', 'anything')), env);
    assert.equal(res.status, 401);
    assert.match(res.headers.get('www-authenticate'), /Basic/);
    assert.equal(res.headers.get('x-robots-tag'), 'noindex, nofollow');
    assert.equal(res.headers.get('referrer-policy'), 'no-referrer');
  }
});

test('authorize returns 401 for a missing, wrong, or non-demo user', () => {
  const env = { DEMO_PASSWORD: 'correct-horse' };
  assert.equal(authorize(req(), env).status, 401);
  assert.equal(authorize(req(basicValue('demo', 'nope')), env).status, 401);
  assert.equal(authorize(req(basicValue('admin', 'correct-horse')), env).status, 401);
  assert.equal(authorize(req('Bearer correct-horse'), env).status, 401);
});

test('authorize continues when username demo and DEMO_PASSWORD match', () => {
  const res = authorize(req(basicValue('demo', 'correct-horse')), { DEMO_PASSWORD: 'correct-horse' });
  assert.equal(res, null);
});
