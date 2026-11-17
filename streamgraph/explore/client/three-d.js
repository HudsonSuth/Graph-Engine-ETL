// Optional 3D mode: 3d-force-graph (MIT, built on three.js, MIT). Loaded only when the user presses 3D.
import ForceGraph3D from '3d-force-graph';
export function mount3d(el, { nodes, links, dark, selected, onClick }) {
  let sel = selected || new Set();
  const g = new ForceGraph3D(el, { controlType: 'orbit' })
    .backgroundColor(dark ? '#0F1420' : '#f4f6f9').width(el.clientWidth).height(el.clientHeight)
    .graphData({ nodes, links }).nodeLabel(n => `${n.type}: ${n.name}`).nodeColor(n => sel.has(n.id) ? '#f59e0b' : (n.color || '#2563eb'))
    .nodeVal(n => sel.has(n.id) ? 6 : 2).linkColor(() => dark ? '#8A95AB' : '#94a3b8').linkDirectionalArrowLength(3).linkDirectionalArrowRelPos(1)
    .onNodeClick(n => onClick?.(n.id));
  let fitted = false; g.onEngineStop(() => { if (!fitted) { fitted = true; g.zoomToFit(400, 40); } });
  const ro = new ResizeObserver(() => g.width(el.clientWidth).height(el.clientHeight)); ro.observe(el);
  return { highlight(s) { sel = s; g.nodeColor(g.nodeColor()); g.nodeVal(g.nodeVal()); }, destroy() { ro.disconnect(); g._destructor?.(); el.innerHTML = ''; } };
}
