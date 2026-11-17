# Generates explore/test/fixtures/algo-reference.json: reference values computed with networkx 3.4.2 (BSD-3) and
# graspologic-native 1.3.1 (MIT, Leiden) for the algorithm correctness tests (SPEC §23.9). Run:
#   python3 -m venv /tmp/refvenv && /tmp/refvenv/bin/pip install networkx==3.4.2 graspologic-native==1.3.1
#   /tmp/refvenv/bin/python explore/tools/algo-reference.py
import json, sys, networkx as nx
import graspologic_native as gn
out = {'generator': f'networkx {nx.__version__}, graspologic-native (Leiden)', 'graphs': {}}
def ref(name, G, extra=None):
    G = nx.Graph(G)  # simple undirected, unweighted
    for u, v, d in G.edges(data=True): d.clear()
    nodes = [str(n) for n in G.nodes()]
    edges = [[str(u), str(v)] for u, v in G.edges()]
    r = {'nodes': nodes, 'edges': edges,
         'degree': {str(n): d for n, d in G.degree()},
         'pagerank': {str(k): v for k, v in nx.pagerank(G, alpha=0.85, tol=1e-12, max_iter=1000).items()},
         'betweenness': {str(k): v for k, v in nx.betweenness_centrality(G, normalized=True).items()},
         'components': sorted([sorted(str(x) for x in c) for c in nx.connected_components(G)], key=lambda c: (-len(c), c)),
         'jaccard': {f'{u}|{v}': p for u, v, p in nx.jaccard_coefficient(G, [(int(a) if a.isdigit() else a, int(b) if b.isdigit() else b) for a, b in edges])}}
    best = max((nx.community.modularity(G, nx.community.louvain_communities(G, seed=s)), s) for s in range(20))
    r['louvain_networkx_best_of_20_modularity'] = best[0]
    lq = []
    for s in range(20):
        q, part = gn.leiden([(str(u), str(v), 1.0) for u, v in G.edges()], seed=s, resolution=1.0, iterations=2)
        comms = {}
        for k, c in part.items(): comms.setdefault(c, set()).add(k)
        lq.append(nx.community.modularity(nx.relabel_nodes(G, str), list(comms.values())))
    r['leiden_graspologic_modularity'] = {'min': min(lq), 'max': max(lq), 'mean': sum(lq) / len(lq)}
    if extra: r.update(extra)
    out['graphs'][name] = r
K = nx.karate_club_graph()
ref('karate', K, {'club': {str(n): d['club'] for n, d in K.nodes(data=True)}, 'optimum_modularity': 0.4197896, 'optimum_source': 'Brandes et al. 2008, On Modularity Clustering, IEEE TKDE 20(2)'})
P = nx.planted_partition_graph(8, 40, 0.30, 0.01, seed=42)
ref('planted_8x40', P, {'truth': {str(n): n // 40 for n in P.nodes()}})
L = nx.les_miserables_graph()
ref('lesmis', L)
D = nx.DiGraph([(0, 1), (1, 2), (2, 0), (2, 3), (3, 4), (4, 2), (5, 4)]); D.add_node(6)
out['directed_pagerank'] = {'nodes': [str(n) for n in D.nodes()], 'edges': [[str(u), str(v)] for u, v in D.edges()], 'pagerank': {str(k): v for k, v in nx.pagerank(D, alpha=0.85, tol=1e-12, max_iter=1000).items()}}
json.dump(out, open(sys.argv[1] if len(sys.argv) > 1 else 'explore/test/fixtures/algo-reference.json', 'w'), indent=1)
print('ok', {k: (len(v['nodes']), len(v['edges'])) for k, v in out['graphs'].items()})
