// Data contracts: JSON Schema (draft-07, versioned) for every graph event, command and command result.
// Validated on produce (publisher, MCP command emit) and on consume (view consumer, worker). Invalid -> DLQ with reason.
import { readFileSync } from 'node:fs';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

export const SCHEMA_VERSION = 1;
export const SCHEMAS = JSON.parse(readFileSync(new URL(`./schemas/graph-events.v${SCHEMA_VERSION}.json`, import.meta.url), 'utf8'));
const ajv = new Ajv({ allErrors: false, strict: false });
addFormats(ajv);
const eventValidators = Object.fromEntries(Object.entries(SCHEMAS.events).map(([op, s]) => [op, ajv.compile(s)]));
const commandV = ajv.compile(SCHEMAS.command), resultV = ajv.compile(SCHEMAS.commandResult), stateV = ajv.compile(SCHEMAS.stateRecord);
const msg = v => (v.errors || []).map(e => `${e.instancePath || '/'} ${e.message}`).join('; ');

/** -> { ok: true } | { ok: false, reason } */
export function validateEvent(e) {
  if (!e || typeof e !== 'object') return { ok: false, reason: 'not a JSON object' };
  if (e.schemaVersion !== SCHEMA_VERSION) return { ok: false, reason: `unsupported schemaVersion ${e.schemaVersion} (supported: ${SCHEMA_VERSION})` };
  const v = eventValidators[e.op];
  if (!v) return { ok: false, reason: `unknown op ${JSON.stringify(e.op)}` };
  return v(e) ? { ok: true } : { ok: false, reason: `${e.op}: ${msg(v)}` };
}
export function validateCommand(c) { return commandV(c) ? { ok: true } : { ok: false, reason: `command: ${msg(commandV)}` }; }
export function validateResult(r) { return resultV(r) ? { ok: true } : { ok: false, reason: `result: ${msg(resultV)}` }; }
export function validateState(s) { return stateV(s) ? { ok: true } : { ok: false, reason: `state: ${msg(stateV)}` }; }
/** Parse a Kafka message value. */
export function parseJson(buf) { try { return { ok: true, value: JSON.parse(buf.toString('utf8')) }; } catch (e) { return { ok: false, reason: `invalid JSON: ${e.message}` }; } }
export const headers = kind => ({ 'content-type': 'application/json', 'schema.id': `${kind}/v${SCHEMA_VERSION}`, 'schema.version': String(SCHEMA_VERSION) });
