import { S2020 } from './helpers.js';
export const PERSON = {
  $schema: S2020, title: 'Person', type: 'object', 'x-jsonld': { '@type': 'schema:Person', '@idProperty': 'id' }, required: ['id', 'name'], additionalProperties: false,
  properties: {
    id: { type: 'string' }, name: { type: 'string', 'x-jsonld': { '@id': 'schema:name' }, description: 'Full name' },
    born: { type: 'string', format: 'date' }, homepage: { type: 'string', format: 'uri' }, age: { type: 'integer', minimum: 0, maximum: 150 },
    tags: { type: 'array', items: { type: 'string', pattern: '^[a-z]+$' }, minItems: 1, maxItems: 5 },
    address: { $ref: '#/$defs/Address' }, status: { enum: ['active', 'retired'] }, friends: { type: 'array', items: { $ref: '#' } },
  },
  $defs: { Address: { type: 'object', description: 'A postal address', properties: { city: { type: 'string', minLength: 1, maxLength: 80 }, geo: { type: 'array', prefixItems: [{ type: 'number' }, { type: 'number' }] } } } },
};
export const ANN = { id: 'p1', name: 'Ann', born: '1990-01-02', homepage: 'https://ann.example/', age: 36, tags: ['x', 'y'], address: { city: 'Norfolk', geo: [36.8, -76.3] }, status: 'active', friends: [{ id: 'p2', name: 'Bob' }] };
