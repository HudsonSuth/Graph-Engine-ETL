// (c) Annotate a JSON instance with the generated context. SPEC §7 (A-01..A-06, A-08).
import Ajv from 'ajv';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import YAML from 'yaml';
import { fail } from './errors.js';
import { pctEncode, ptrJoin, ptrGet, sortDeep, isAbsIri } from './util.js';
import { isObj } from './model.js';

export function validator(M) {
  const Cls = M.draft === 'draft-07' ? Ajv : Ajv2020;
  const ajv = new Cls({ strict: false, allErrors: true, validateFormats: true });
  addFormats(ajv);
  const doc = M.doc;
  if (!M.pointer) return ajv.compile(doc);
  try { ajv.addSchema(doc, 'urn:jsonld-from-schema:root'); const v = ajv.getSchema('urn:jsonld-from-schema:root#' + M.pointer); if (v) return v; } catch { /* fall back */ }
  const fresh = new Cls({ strict: false, allErrors: true }); addFormats(fresh);
  return fresh.compile(ptrGet(doc, M.pointer).value);
}

const absId = v => typeof v === 'string' && (/^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(v) || /^urn:/i.test(v)) && isAbsIri(v);

export function annotateInstance(M, ctxDoc, instance) {
  const o = M.opts;
  if (o.validate) {
    const v = validator(M);
    if (!v(instance)) fail('E_INVALID_INSTANCE', v.errors?.[0]?.instancePath || '', `instance does not validate: ${(v.errors || []).map(e => `${e.instancePath || '/'} ${e.message}`).join('; ')}`, v.errors);
  }
  const obj = (val, node, path) => {
    const out = {};
    for (const [k, x] of Object.entries(val)) {
      if (k.startsWith('@')) fail('E_KEYWORD_IN_INSTANCE', ptrJoin(path, k), `instance key ${k} looks like a JSON-LD keyword`);
      const pi = node ? node.props.get(k) : undefined;
      out[k] = pi && !pi.excluded ? value(x, pi, ptrJoin(path, k)) : x;
    }
    if (node && node.cls && o.addTypes) out['@type'] = node.cls.full;
    if (node && node.idProperty && val[node.idProperty] !== undefined && val[node.idProperty] !== null) {
      const raw = val[node.idProperty];
      out['@id'] = absId(raw) ? raw : (node.idPrefix || o.vocab + 'id/') + pctEncode(String(raw));
    }
    return out;
  };
  const value = (x, pi, path) => {
    if (pi.coercion === '@json') return x;
    if (Array.isArray(x)) return x.map((y, i) => value(y, pi, ptrJoin(path, i)));
    if (isObj(x)) return obj(x, pi.nested || null, path);
    return x;
  };
  if (!isObj(instance)) fail('E_INVALID_INSTANCE', '', 'instance must be a JSON object to annotate');
  const body = obj(instance, M.root, '');
  return sortDeep({ '@context': ctxDoc['@context'], ...body });
}

// A-06: JSON-compatible YAML only. Every string value is double-quoted so YAML 1.1 readers cannot retype it
// (timestamps, yes/no booleans, octal-looking numbers).
export const toYaml = doc => YAML.stringify(doc, { aliasDuplicateObjects: false, lineWidth: 0, sortMapEntries: false, defaultStringType: 'QUOTE_DOUBLE', defaultKeyType: 'PLAIN', version: '1.2' });
