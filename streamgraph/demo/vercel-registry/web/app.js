const SOURCE_COLOR = { fcc: '#9a3412', bis: '#9f1239', ofac: '#7f1d1d', gleif: '#1e3a8a', edgar: '#166534' };
const SOURCE_LABEL = { fcc: 'FCC', bis: 'BIS', ofac: 'OFAC', gleif: 'GLEIF', edgar: 'EDGAR' };

async function main() {
const data = await fetch('/data/graph.json').then(r => r.json());
const MiniSearch = window.MiniSearch;
const cytoscape = window.cytoscape;
const nodes = new Map(data.nodes.map(n => [n.id, n]));
const edges = data.edges;

const orgs = data.nodes.filter(n => n.label === 'Organization' || n.label === 'Person');
const index = new MiniSearch({
  fields: ['name', 'aliases', 'list', 'country'],
  storeFields: ['id'],
  searchOptions: { fuzzy: 0.2, prefix: true, combineWith: 'AND' },
});
index.addAll(orgs.map(n => ({
  id: n.id,
  name: n.props.name || '',
  aliases: (n.props.aliases || []).join(' '),
  list: n.props.list || '',
  country: (n.props.countries || []).join(' '),
})));

const q = document.querySelector('#q');
const results = document.querySelector('#results');
const count = document.querySelector('#result-count');
const detail = document.querySelector('#detail');
const chains = document.querySelector('#chains');
let cy;
let selected = '';

document.querySelector('#foot').textContent = `${data.counts.sourceRecords} source records · ${data.counts.sameAs} cross-list matches · retrieved ${data.retrieved}. ${data.disclaimer}`;

for (const chain of data.chains || []) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = chain.title;
  btn.addEventListener('click', () => openId(chain.steps[0].id));
  chains.append(btn);
}

function badge(source) {
  return `<span class="badge ${source}">${SOURCE_LABEL[source] || source}</span>`;
}
function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function byId(id) { return nodes.get(id); }
function clusterOf(org) {
  const entity = org.props.resolvedEntity;
  return orgs.filter(n => n.props.resolvedEntity === entity);
}

function renderResults(list) {
  results.replaceChildren();
  count.textContent = list.length ? `${list.length} names` : 'No names';
  for (const hit of list.slice(0, 40)) {
    const n = byId(hit.id);
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'result' + (n.id === selected ? ' active' : '');
    btn.innerHTML = `<strong>${esc(n.props.name)}</strong>${badge(n.props.source)}`;
    btn.addEventListener('click', () => openId(n.id));
    li.append(btn);
    results.append(li);
  }
}

function search(text) {
  const query = text.trim();
  if (!query) {
    renderResults(orgs.filter(n => n.props.source === 'fcc').map(n => ({ id: n.id })));
    return;
  }
  renderResults(index.search(query));
}

q.addEventListener('input', () => search(q.value));

function uniqueEnds(list) {
  const out = [];
  const seen = new Set();
  for (const n of list) {
    if (!n || seen.has(n.id)) continue;
    seen.add(n.id);
    out.push(n);
  }
  return out;
}
function neighbors(id) {
  const org = byId(id);
  const members = clusterOf(org);
  const ids = new Set(members.map(n => n.id));
  const extra = [];
  for (const e of edges) {
    if (e.type !== 'parent_of') continue;
    if (ids.has(e.from)) extra.push(byId(e.to));
    if (ids.has(e.to)) extra.push(byId(e.from));
  }
  const keep = new Map();
  for (const n of [...members, ...extra]) if (n) keep.set(n.id, n);
  const countries = new Map();
  for (const e of edges) {
    if (e.type !== 'located_in' || !keep.has(e.from)) continue;
    const target = byId(e.to);
    if (target && target.label === 'Country') countries.set(target.id, target);
  }
  return { members, extra: extra.filter(Boolean), countries: [...countries.values()], ids: new Set([...keep.keys(), ...countries.keys()]) };
}

function openId(id) {
  selected = id;
  const org = byId(id);
  if (!org) return;
  const view = neighbors(id);
  const memberIds = new Set(view.members.map(n => n.id));
  const parents = uniqueEnds(edges.filter(e => e.type === 'parent_of' && memberIds.has(e.to) && !memberIds.has(e.from)).map(e => byId(e.from)));
  const children = uniqueEnds(edges.filter(e => e.type === 'parent_of' && memberIds.has(e.from) && !memberIds.has(e.to)).map(e => byId(e.to)));
  const lists = new Map();
  for (const member of view.members) {
    const key = member.props.source;
    if (!lists.has(key)) lists.set(key, []);
    lists.get(key).push(member);
  }
    const matches = edges.filter(e => e.type === 'same_as' && memberIds.has(e.from) && memberIds.has(e.to));
  detail.innerHTML = `
    <h2>${esc(org.props.name)}</h2>
    <p>${badge(org.props.source)} <span class="muted">${esc(org.props.list || '')}${org.props.program ? ' · ' + esc(org.props.program) : ''}${org.props.listed ? ' · ' + esc(org.props.listed) : ''}</span></p>
    ${(org.props.aliases || []).length ? `<p class="muted">Also known as ${esc(org.props.aliases.join(', '))}</p>` : ''}
    <h3>Lists in this resolved entity</h3>
    <ul>${[...lists.entries()].map(([source, group]) => `<li>${badge(source)} ${group.map(n => esc(n.props.name)).join('; ')}</li>`).join('') || '<li>Only this record</li>'}</ul>
    <h3>Parents</h3>
    <ul>${parents.map(n => `<li><button type="button" class="jump" data-id="${esc(n.id)}">${esc(n.props.name)}</button> ${badge(n.props.source)}</li>`).join('') || '<li class="muted">No parent link in this sample</li>'}</ul>
    <h3>Subsidiaries</h3>
    <ul>${children.map(n => `<li><button type="button" class="jump" data-id="${esc(n.id)}">${esc(n.props.name)}</button> ${badge(n.props.source)}</li>`).join('') || '<li class="muted">No subsidiary link in this sample</li>'}</ul>
    <h3>Why the matches were made</h3>
    <ul>${matches.map(e => {
      const other = e.from === id || view.members.some(n => n.id === e.from) ? byId(e.from === org.id ? e.to : e.from) : byId(e.to);
      const why = (e.props.explanation || []).map(w => `${esc(w.property)} “${esc(w.a)}” vs “${esc(w.b)}” (${esc(w.level)})`).join('; ');
      return `<li><strong>${esc(byId(e.from).props.name)}</strong> and <strong>${esc(byId(e.to).props.name)}</strong> · score ${esc(e.props.score)}<br><span class="muted">${why}</span></li>`;
    }).join('') || '<li class="muted">No cross-list match above the threshold.</li>'}</ul>
  `;
  detail.querySelectorAll('.jump').forEach(btn => btn.addEventListener('click', () => openId(btn.dataset.id)));
  draw(view, id);
  search(q.value);
}

function draw(view, focus) {
  const elements = [];
  const seen = new Set();
  const add = n => {
    if (!n || seen.has(n.id)) return;
    seen.add(n.id);
    const source = n.props.source || (n.label === 'Country' ? 'country' : '');
    elements.push({ data: { id: n.id, label: n.props.name || n.props.code || n.label, color: SOURCE_COLOR[source] || '#57534e', focus: n.id === focus ? 1 : 0 } });
  };
  for (const n of view.members) add(n);
  for (const n of view.extra) add(n);
  for (const n of view.countries) add(n);
  for (const e of edges) {
    if (!seen.has(e.from) || !seen.has(e.to)) continue;
    if (!['same_as', 'parent_of', 'located_in'].includes(e.type)) continue;
    if (e.type === 'located_in' && byId(e.to)?.label !== 'Country') continue;
    elements.push({ data: { id: e.id, source: e.from, target: e.to, label: e.type } });
  }
  if (cy) cy.destroy();
  cy = cytoscape({
    container: document.querySelector('#graph'),
    elements,
    style: [
      { selector: 'node', style: { 'background-color': 'data(color)', label: 'data(label)', color: '#1c1915', 'font-size': 11, 'text-wrap': 'wrap', 'text-max-width': 120, 'text-valign': 'bottom', 'text-margin-y': 6 } },
      { selector: 'node[?focus]', style: { width: 28, height: 28, 'border-width': 3, 'border-color': '#1c1915' } },
      { selector: 'edge', style: { width: 1.5, 'line-color': '#8a8175', 'target-arrow-color': '#8a8175', 'target-arrow-shape': 'triangle', 'curve-style': 'bezier', label: 'data(label)', 'font-size': 9, color: '#5c564c' } },
      { selector: 'edge[label = "same_as"]', style: { 'line-color': '#0f766e', 'target-arrow-shape': 'none', 'line-style': 'dashed' } },
    ],
    layout: { name: 'breadthfirst', directed: true, padding: 24, spacingFactor: 1.15 },
  });
  cy.on('tap', 'node', evt => {
    const n = byId(evt.target.id());
    if (n && (n.label === 'Organization' || n.label === 'Person')) openId(n.id);
  });
}

search('');
if (data.chains?.[0]) openId(data.chains[0].steps[0].id);
}
main();
