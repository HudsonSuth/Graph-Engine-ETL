// Dismissible start-to-finish tour. Next moves the studio to the screen for that step.
(function () {
  const STEPS = [
    { id: 'source', hash: '#home', title: 'Sources', body: 'Home lists every connected source. This snapshot loaded the maritime AIS files (vessels, positions, ports, types, watchlist) and the sample documents through the real engine.' },
    { id: 'schema', hash: '#link', title: 'Schema and links', body: 'Connect your sources is the schema step: same things across files, and links such as Position to Vessel, Vessel to VesselType, and Position to Port. The advanced flow editor is under Advanced.' },
    { id: 'policy', hash: '#access', title: 'Policy', body: 'Access rules list people, clearance, and field sensitivity. Vessel call sign and IMO are high, so an analyst does not see them. The matrix is the engine\'s decision for the person you pick.' },
    { id: 'sinks', hash: '#syncout', title: 'Sync and sinks', body: 'Send data out includes an OpenSearch sink. Test, Save, and Send now run in this tab only. Search itself is MiniSearch (MIT), standing in for OpenSearch, and it stays filtered by the access rules.' },
    { id: 'graph', hash: '#explore-graph', title: 'Explore graph', body: 'Graph explorer draws the engine snapshot. Switch the renderer to WebGPU (it falls back to WebGL when the browser has no adapter), then Map for positions and ports. The time slider uses each position\'s timestamp.' },
    { id: 'search', hash: '#explore', title: 'Search', body: 'Use the header search, or Search and ask on this page. Try a ship name such as MERCURIUS. Results are grouped by type and labeled as MiniSearch.' },
    { id: 'viewas', hash: '#access', title: 'View as', body: 'On Access rules, Test as… is the x-sg-as switch. Choose Analyst and Preview Explore. You should see vessels, with call sign and IMO hidden. Stop preview returns you to the owner.' },
  ];
  const KEY = 'sg-tour-step';
  let step = Number(sessionStorage.getItem(KEY) || 0);
  if (sessionStorage.getItem('sg-tour-off') === '1') step = -1;

  function el(html) {
    const d = document.createElement('div');
    d.innerHTML = html;
    return d.firstElementChild;
  }
  function paint() {
    let card = document.getElementById('sg-tour');
    if (step < 0) { card?.remove(); return; }
    const s = STEPS[Math.min(step, STEPS.length - 1)];
    if (!card) {
      card = el('<aside id="sg-tour" role="dialog" aria-label="Demo tour"></aside>');
      document.body.appendChild(card);
      const css = document.createElement('style');
      css.textContent = '#sg-tour{position:fixed;right:16px;bottom:16px;width:min(380px,calc(100vw - 32px));background:#fff;color:#1d2430;border:1px solid #c5ccd6;border-radius:12px;box-shadow:0 12px 40px #0003;padding:14px 16px;z-index:30;font:14px/1.45 system-ui,sans-serif}#sg-tour h2{margin:0 0 6px;font-size:16px}#sg-tour p{margin:0 0 10px}#sg-tour .row{display:flex;gap:8px;align-items:center}#sg-tour button{font:inherit;border:1px solid #c5ccd6;background:#fff;border-radius:7px;padding:6px 12px;cursor:pointer}#sg-tour button.primary{background:#2563eb;border-color:#2563eb;color:#fff}';
      document.head.appendChild(css);
    }
    card.innerHTML = `<h2>Tour ${step + 1} of ${STEPS.length}: ${s.title}</h2><p>${s.body}</p><div class="row"><button type="button" class="primary" id="sg-tour-next">${step === STEPS.length - 1 ? 'Done' : 'Next'}</button><button type="button" id="sg-tour-hide">Dismiss</button><span style="margin-left:auto;color:#5b6576;font-size:12px">${s.hash}</span></div>`;
    card.querySelector('#sg-tour-next').onclick = () => {
      if (step >= STEPS.length - 1) { step = -1; sessionStorage.setItem('sg-tour-off', '1'); sessionStorage.removeItem(KEY); paint(); return; }
      step += 1; sessionStorage.setItem(KEY, String(step));
      const next = STEPS[step];
      if (location.hash !== next.hash) location.hash = next.hash;
      paint();
    };
    card.querySelector('#sg-tour-hide').onclick = () => { step = -1; sessionStorage.setItem('sg-tour-off', '1'); sessionStorage.removeItem(KEY); paint(); };
  }
  function go(i) {
    step = i;
    sessionStorage.removeItem('sg-tour-off');
    sessionStorage.setItem(KEY, String(i));
    const s = STEPS[i];
    if (s && location.hash !== s.hash) location.hash = s.hash;
    paint();
  }
  function boot() {
    if (!document.body || document.getElementById('sg-tour-reopen')) return;
    const b = document.createElement('button');
    b.id = 'sg-tour-reopen'; b.type = 'button'; b.textContent = 'Tour';
    b.title = 'Start the demo tour';
    b.style.cssText = 'position:fixed;left:16px;bottom:16px;z-index:30;font:13px system-ui,sans-serif;border:1px solid #c5ccd6;background:#fff;border-radius:7px;padding:6px 10px;cursor:pointer';
    b.onclick = () => go(0);
    document.body.appendChild(b);
    if (step >= 0 && location.hash !== STEPS[Math.min(step, STEPS.length - 1)].hash && (location.hash === '' || location.hash === '#home') && step === 0) { /* stay */ }
    paint();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.__sgTour = { steps: STEPS, go, hide() { step = -1; sessionStorage.setItem('sg-tour-off', '1'); paint(); } };
})();
