import N3 from 'n3';
import { readFileSync } from 'node:fs';
export const XSD = l => 'http://www.w3.org/2001/XMLSchema#' + l;
export const RDF = l => 'http://www.w3.org/1999/02/22-rdf-syntax-ns#' + l;
export const RDFS = l => 'http://www.w3.org/2000/01/rdf-schema#' + l;
export const OWL = l => 'http://www.w3.org/2002/07/owl#' + l;
export const SH = l => 'http://www.w3.org/ns/shacl#' + l;
export const V = l => 'https://streamgraph.local/vocab/' + l;
export const fixture = f => JSON.parse(readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf8'));
export const golden = f => readFileSync(new URL(`./golden/${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
export const S2020 = 'https://json-schema.org/draft/2020-12/schema';
export const D7 = 'http://json-schema.org/draft-07/schema#';
/** parse Turtle -> N3.Store */
export const store = ttl => { const s = new N3.Store(); s.addQuads(new N3.Parser().parse(ttl)); return s; };
/** objects of (s, p) as strings (IRI value or literal value^^datatype) */
export const objs = (st, s, p) => st.getQuads(N3.DataFactory.namedNode(s), N3.DataFactory.namedNode(p), null, null)
  .map(q => (q.object.termType === 'Literal' ? `${q.object.value}^^${q.object.datatype.value}` : q.object.value)).sort();
/** read an RDF list starting at a term in a store */
export const list = (st, head) => { const out = []; let cur = head; for (let i = 0; i < 1000 && cur.value !== RDF('nil'); i++) { const f = st.getQuads(cur, N3.DataFactory.namedNode(RDF('first')), null, null)[0].object; out.push(f.termType === 'Literal' ? f.value : f.value); cur = st.getQuads(cur, N3.DataFactory.namedNode(RDF('rest')), null, null)[0].object; } return out; };
export const one = (st, s, p) => st.getQuads(N3.DataFactory.namedNode(s), N3.DataFactory.namedNode(p), null, null)[0]?.object;
export const codes = ws => ws.map(w => w.code);
export const reject = async (fn, code) => {
  try { await fn(); } catch (e) { if (e.code === code) return e; throw new Error(`expected ${code}, got ${e.code || e.message}`); }
  throw new Error(`expected ${code}, got success`);
};
