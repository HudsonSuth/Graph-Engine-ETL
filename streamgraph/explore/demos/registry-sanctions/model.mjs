// Turns parsed source records into StreamGraph nodes and edges. Every node and edge gets provenance.
import { GraphStore } from '../../../src/graph.js';
import { SOURCES } from './sources.mjs';
import { countryCode, countryFromEdgar, safeKey, shortHash } from './text.mjs';
import { cleanCompany } from './duke-style.mjs';
import { parseOfac, parseBis, parseFcc, parseGleif, parseEdgarTickers, parseEdgarSubmission } from './parse.mjs';
import { resolveOrganizations } from './resolve.mjs';

const COUNTRY_LABEL = {
  CN: 'China', HK: 'Hong Kong', US: 'United States', GB: 'United Kingdom', SG: 'Singapore',
  IN: 'India', DE: 'Germany', FR: 'France', CH: 'Switzerland', CA: 'Canada', AU: 'Australia',
  IR: 'Iran', CU: 'Cuba', NL: 'Netherlands', MX: 'Mexico', RU: 'Russia', KR: 'South Korea',
  JP: 'Japan', IT: 'Italy', ES: 'Spain', AE: 'United Arab Emirates', TW: 'Taiwan', MO: 'Macau',
  CY: 'Cyprus', RO: 'Romania', CZ: 'Czechia', PH: 'Philippines', ZA: 'South Africa',
  NG: 'Nigeria', HU: 'Hungary', CO: 'Colombia', ID: 'Indonesia', PL: 'Poland',
};

function prov(sourceId, nativeId, retrieved) {
  const src = SOURCES[sourceId];
  return {
    source: sourceId,
    url: src.url,
    retrieved,
    license: src.license,
    nativeId: String(nativeId),
  };
}

export function loadParsed(files, retrieved) {
  const ofac = parseOfac(files.ofacXml);
  const bis = parseBis(files.bisCsv);
  const fcc = parseFcc(files.fccHtml);
  const gleif = parseGleif(files.gleif);
  const tickers = parseEdgarTickers(files.tickers);
  const submissions = (files.submissions || []).map(parseEdgarSubmission).filter(Boolean);
  return { ofac, bis, fcc, gleif, tickers, submissions, retrieved };
}

export function buildModel(parsed) {
  const retrieved = parsed.retrieved;
  const nodes = new Map();
  const edges = [];
  const seenE = new Set();
  const orgs = [];
  const orgByClean = new Map();

  function addNode(node) {
    const prev = nodes.get(node.id);
    if (!prev) { nodes.set(node.id, node); return node; }
    const have = prev.props.provenance;
    for (const p of node.props.provenance) {
      if (!have.some(x => x.source === p.source && x.nativeId === p.nativeId)) have.push(p);
    }
    return prev;
  }
  function addEdge(type, from, to, props) {
    if (!nodes.has(from) || !nodes.has(to)) return;
    const id = `${from}-[${type}]->${to}`;
    if (seenE.has(id)) return;
    seenE.add(id);
    edges.push({ type, from, to, props });
  }
  function countryNode(code, sourceId, nativeId) {
    const iso = countryCode(code) || code;
    if (!iso) return '';
    const id = `Country:${iso}`;
    addNode({
      id, label: 'Country', key: iso,
      props: {
        name: COUNTRY_LABEL[iso] || iso,
        code: iso,
        provenance: [prov(sourceId, nativeId, retrieved)],
      },
    });
    return id;
  }
  function addressNode(raw, country, sourceId, nativeId) {
    const text = String(raw || '').replace(/\s+/g, ' ').trim();
    if (!text) return '';
    const id = `Address:${shortHash(`${sourceId}|${text}`)}`;
    addNode({
      id, label: 'Address', key: id.slice(8),
      props: {
        name: text,
        country: country || '',
        provenance: [prov(sourceId, nativeId, retrieved)],
      },
    });
    if (country) {
      const cid = countryNode(country, sourceId, nativeId);
      if (cid) addEdge('located_in', id, cid, { provenance: [prov(sourceId, nativeId, retrieved)] });
    }
    return id;
  }
  function identifierNode(scheme, value, sourceId, nativeId, extra = {}) {
    const id = `Identifier:${scheme}:${safeKey(value)}`;
    addNode({
      id, label: 'Identifier', key: `${scheme}:${value}`,
      props: {
        name: `${scheme.toUpperCase()} ${value}`,
        scheme, value: String(value),
        ...extra,
        provenance: [prov(sourceId, nativeId, retrieved)],
      },
    });
    return id;
  }
  function rememberOrg(id, display, names, countries, addresses, sourceId, nativeId) {
    let rec = orgs.find(o => o.id === id);
    if (!rec) {
      rec = { id, label: display, names: [], countries: [], addresses: [], dataSource: sourceId, recordId: String(nativeId) };
      orgs.push(rec);
    }
    for (const n of names) if (!rec.names.includes(n)) rec.names.push(n);
    for (const c of countries) if (c && !rec.countries.includes(c)) rec.countries.push(c);
    for (const a of addresses) if (a.raw && !rec.addresses.includes(a.raw)) rec.addresses.push(a.raw);
    if (names.includes(display) && /[A-Za-z]{3}/.test(display)) rec.label = display;
  }
  function orgNode({ sourceId, nativeId, kind, name, aliases, countries, addresses, list }) {
    const names = [...new Set([name, ...(aliases || [])].map(s => String(s || '').trim()).filter(Boolean))];
    const display = names.find(n => /[A-Za-z]{3}/.test(n)) || names[0];
    const cleaned = cleanCompany(display);
    const dedupeKey = `${sourceId}|${kind}|${cleaned}`;
    if (kind !== 'person' && cleaned && orgByClean.has(dedupeKey)) {
      const id = orgByClean.get(dedupeKey);
      const node = nodes.get(id);
      if (cleanCompany(display) === cleanCompany(node.props.name) && display.length < node.props.name.length && !/\(/.test(display)) {
        if (!node.props.aliases.includes(node.props.name)) node.props.aliases.push(node.props.name);
        node.props.name = display;
      }
      for (const n of names) if (n !== node.props.name && !node.props.aliases.includes(n)) node.props.aliases.push(n);
      for (const c of countries) if (c && !node.props.countries.includes(c)) node.props.countries.push(c);
      const p = prov(sourceId, nativeId, retrieved);
      if (!node.props.provenance.some(x => x.nativeId === p.nativeId)) node.props.provenance.push(p);
      const ident = identifierNode(list.scheme, list.value, sourceId, nativeId, { list: list.name });
      addEdge('listed_on', id, ident, { list: list.name, program: list.program, date: list.date || '', provenance: [p] });
      for (const c of countries) {
        const cid = countryNode(c, sourceId, nativeId);
        if (cid) addEdge('located_in', id, cid, { provenance: [p] });
      }
      for (const addr of addresses) {
        const aid = addressNode(addr.raw, addr.country, sourceId, nativeId);
        if (aid) addEdge('located_in', id, aid, { provenance: [p] });
      }
      rememberOrg(id, display, names, countries, addresses, sourceId, nativeId);
      return id;
    }
    const id = `${kind === 'person' ? 'Person' : 'Organization'}:${sourceId}:${safeKey(nativeId)}`;
    addNode({
      id,
      label: kind === 'person' ? 'Person' : 'Organization',
      key: `${sourceId}:${nativeId}`,
      props: {
        name: display,
        aliases: names.filter(n => n !== display),
        source: sourceId,
        list: list.name,
        program: list.program,
        listed: list.date || '',
        countries: countries.filter(Boolean),
        provenance: [prov(sourceId, nativeId, retrieved)],
      },
    });
    const ident = identifierNode(list.scheme, list.value, sourceId, nativeId, { list: list.name });
    addEdge('listed_on', id, ident, {
      list: list.name,
      program: list.program,
      date: list.date || '',
      provenance: [prov(sourceId, nativeId, retrieved)],
    });
    for (const c of countries) {
      const cid = countryNode(c, sourceId, nativeId);
      if (cid) addEdge('located_in', id, cid, { provenance: [prov(sourceId, nativeId, retrieved)] });
    }
    for (const addr of addresses) {
      const aid = addressNode(addr.raw, addr.country, sourceId, nativeId);
      if (aid) addEdge('located_in', id, aid, { provenance: [prov(sourceId, nativeId, retrieved)] });
    }
    if (kind !== 'person') {
      orgByClean.set(dedupeKey, id);
      rememberOrg(id, display, names, countries, addresses, sourceId, nativeId);
    }
    return id;
  }

  for (const row of parsed.fcc) {
    orgNode({
      sourceId: 'fcc',
      nativeId: row.id,
      kind: 'organization',
      name: row.name,
      aliases: [],
      countries: [],
      addresses: [],
      list: {
        name: 'FCC Covered List',
        program: 'Secure and Trusted Communications Networks Act',
        date: row.date || '',
        scheme: 'fcc',
        value: row.id,
      },
    });
  }
  const fccByName = new Map();
  for (const row of parsed.fcc) fccByName.set(row.name.toLowerCase(), `Organization:fcc:${safeKey(row.id)}`);
  for (const row of parsed.fcc) {
    if (!row.subsidiaryOf) continue;
    const child = fccByName.get(row.name.toLowerCase());
    const parent = fccByName.get(row.subsidiaryOf.toLowerCase());
    if (child && parent) addEdge('parent_of', parent, child, {
      relationship: 'wholly-owned subsidiary',
      provenance: [prov('fcc', row.id, retrieved)],
    });
  }

  for (const row of parsed.bis) {
    const countries = [...new Set(row.addresses.map(a => a.country).filter(Boolean))];
    const listing = {
      name: 'BIS Entity List',
      program: row.federalRegister || 'Entity List',
      date: row.startDate || '',
      scheme: 'el',
      value: row.id,
    };
    orgNode({
      sourceId: 'bis', nativeId: row.id, kind: 'organization', name: row.name, aliases: row.aliases,
      countries, addresses: row.addresses, list: listing,
    });
    if (row.affiliate) orgNode({
      sourceId: 'bis', nativeId: `${row.id}:affiliate`, kind: 'organization', name: row.affiliate, aliases: [],
      countries: [], addresses: [], list: listing,
    });
  }

  for (const row of parsed.ofac) {
    const countries = [...new Set(row.addresses.map(a => a.country).filter(Boolean))];
    const lei = row.ids.find(i => /lei/i.test(i.type));
    const id = orgNode({
      sourceId: 'ofac',
      nativeId: row.uid,
      kind: row.kind,
      name: row.name,
      aliases: row.aliases,
      countries,
      addresses: row.addresses,
      list: {
        name: 'OFAC SDN List',
        program: row.programs.join(', ') || 'SDN',
        date: row.published || '',
        scheme: 'sdn',
        value: row.uid,
      },
    });
    if (lei && row.kind === 'organization') {
      const ident = identifierNode('lei', lei.value, 'ofac', row.uid);
      addEdge('listed_on', id, ident, {
        list: 'GLEIF LEI',
        program: lei.type,
        date: row.published || '',
        provenance: [prov('ofac', row.uid, retrieved)],
      });
    }
  }

  const leiOrg = new Map();
  for (const row of parsed.gleif.records) {
    const countries = [...new Set([row.country, ...row.addresses.map(a => a.country)].filter(Boolean))];
    const id = orgNode({
      sourceId: 'gleif',
      nativeId: row.lei,
      kind: 'organization',
      name: row.name,
      aliases: row.aliases,
      countries,
      addresses: row.addresses,
      list: {
        name: 'GLEIF LEI',
        program: row.status || 'LEI',
        date: row.lastUpdate || row.initialRegistration || '',
        scheme: 'lei',
        value: row.lei,
      },
    });
    leiOrg.set(row.lei, id);
  }
  for (const rel of parsed.gleif.parents) {
    const parent = leiOrg.get(rel.parentLei);
    const child = leiOrg.get(rel.childLei);
    if (!parent || !child) continue;
    addEdge('parent_of', parent, child, {
      relationship: rel.type || 'IS_DIRECTLY_CONSOLIDATED_BY',
      date: rel.start || '',
      provenance: [prov('gleif', `${rel.childLei}->${rel.parentLei}`, retrieved)],
    });
  }

  for (const row of parsed.submissions) {
    const country = countryFromEdgar(row.business) || countryFromEdgar(row.mailing);
    const address = formatEdgarAddress(row.business) || formatEdgarAddress(row.mailing);
    const latest = row.filings.find(f => f.filingDate)?.filingDate || '';
    orgNode({
      sourceId: 'edgar',
      nativeId: row.cikPadded,
      kind: 'organization',
      name: row.name,
      aliases: [...row.formerNames, ...row.tickers],
      countries: country ? [country] : [],
      addresses: address ? [{ raw: address, country }] : [],
      list: {
        name: 'SEC EDGAR',
        program: row.sic || 'registrant',
        date: latest,
        scheme: 'cik',
        value: row.cikPadded,
      },
    });
  }

  return { nodes: [...nodes.values()], edges, orgs };
}

function formatEdgarAddress(address) {
  if (!address) return '';
  return [address.street1, address.street2, address.city, address.stateOrCountry, address.zipCode].filter(Boolean).join(', ');
}

export async function materialize(parsed) {
  const model = buildModel(parsed);
  const resolved = await resolveOrganizations(model.orgs);
  const g = new GraphStore(':memory:');
  for (const n of model.nodes) g.upsertNode(n.id, n.label, n.key, n.props);
  for (const e of model.edges) g.upsertEdge(e.type, e.from, e.to, e.props);
  for (const [id, entityId] of resolved.entityOf) {
    const node = g.getNode(id);
    if (node) g.upsertNode(id, node.label, node.key, { resolvedEntity: entityId });
  }
  for (const link of resolved.sameAs) {
    const left = model.orgs.find(o => o.id === link.from);
    const right = model.orgs.find(o => o.id === link.to);
    g.upsertEdge('same_as', link.from, link.to, {
      score: link.score,
      matchKey: link.matchKey,
      explanation: link.why,
      entityId: link.entityId,
      provenance: [{
        source: 'streamgraph-er',
        method: 'duke-style',
        url: 'explore/er/engine.js',
        retrieved: parsed.retrieved,
        license: 'MIT',
        nativeId: `${link.from}|${link.to}`,
        records: [
          left ? { source: left.dataSource, nativeId: left.recordId } : null,
          right ? { source: right.dataSource, nativeId: right.recordId } : null,
        ].filter(Boolean),
      }],
    });
  }
  return { graph: g, resolved, model };
}
