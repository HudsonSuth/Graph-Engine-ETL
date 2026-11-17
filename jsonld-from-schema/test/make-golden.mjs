// Regenerates golden files. Run only after reviewing a deliberate behavior change: node test/make-golden.mjs
import { writeFileSync, readFileSync } from 'node:fs';
import { instanceToNQuads } from '../src/index.js';
const fx = f => JSON.parse(readFileSync(new URL(`./fixtures/${f}`, import.meta.url)));
writeFileSync(new URL('./golden/node-upsert.nq', import.meta.url), await instanceToNQuads(fx('node-upsert.instance.json'), fx('graph-events.v1.json'), { pointer: '/events/node.upsert' }));
const { PERSON, ANN } = await import('./person-fixture.mjs');
writeFileSync(new URL('./golden/person.nq', import.meta.url), await instanceToNQuads(ANN, PERSON));
console.log('golden written');
