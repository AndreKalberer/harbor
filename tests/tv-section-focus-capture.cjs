const assert = require('node:assert/strict');

async function run() {
  const targets = await fetch('http://127.0.0.1:' + process.argv[2] + '/json').then(r => r.json());
  const target = targets.find(t => t.type === 'page' && t.url.includes('/tv/index.html'));
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let id = 0;
  const pending = new Map();
  socket.addEventListener('message', e => { const message = JSON.parse(e.data); const p = pending.get(message.id); if (p) { pending.delete(message.id); message.error ? p.reject(new Error(message.error.message)) : p.resolve(message.result); } });
  const command = (method, params = {}) => new Promise((resolve, reject) => { const seq = ++id; pending.set(seq, { resolve, reject }); socket.send(JSON.stringify({ id: seq, method, params })); });
  const evaluate = async expression => { const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text); return result.result.value; };
  try {
    await command('Page.enable');
    await command('Page.addScriptToEvaluateOnNewDocument', { source: `
      window.fetch = () => Promise.reject(new Error('Controlled offline fixture'));
      localStorage.setItem('harbor:tv-state:v1', JSON.stringify({ saved: [], history: [{ id: 'focus-fixture', name: 'Focus fixture', category: 'Watch', type: 'movie', tmdbId: 550 }] }));
    ` });
    await command('Page.reload');
    const waitFor = expression => evaluate(`new Promise((resolve, reject) => { let attempts=0; const check=()=>{ if (${expression}) return resolve(true); if (++attempts > 100) return reject(new Error('TV state timeout: ' + ${JSON.stringify(expression)})); setTimeout(check, 25); }; check(); })`);
    await waitFor(`document.querySelector('#card-grid .media-card')`);
    // Let the startup brand-focus timer settle before beginning user transitions.
    await new Promise(resolve => setTimeout(resolve, 200));
    const nav = section => `.tv-nav button[data-section="${section}"]`;
    const assertNav = async section => {
      const state = await evaluate(`(() => { const nav=document.querySelector(${JSON.stringify(nav(section))}); const body=document.body; return { section: body.dataset.section, focus: document.activeElement===nav, visible:!!nav.getClientRects().length, navCount:document.querySelectorAll('.tv-nav button.active[aria-current="page"]').length, bodyActive:body.classList.contains('active'), bodyCurrent:body.hasAttribute('aria-current') }; })()`);
      assert.deepEqual(state, { section, focus: true, visible: true, navCount: 1, bodyActive: false, bodyCurrent: false });
    };
    const transition = async (section, action) => {
      await evaluate(action);
      await waitFor(`document.body.dataset.section===${JSON.stringify(section)} && document.querySelector('#card-grid .media-card')`);
      await new Promise(resolve => setTimeout(resolve, 80));
      await assertNav(section);
    };
    await transition('Home', `document.querySelector(${JSON.stringify(nav('Home'))}).click()`);
    await transition('Watch', `document.querySelector('#card-grid .media-card').focus(); document.dispatchEvent(new KeyboardEvent('keydown',{keyCode:461,bubbles:true}))`);
    await transition('Listen', `document.querySelector('#card-grid .media-card').focus(); document.querySelector(${JSON.stringify(nav('Listen'))}).click()`);
    await transition('Home', `document.querySelector('#card-grid .media-card').focus(); document.querySelector('#list-button').click()`);
    await transition('Watch', `document.querySelector('#card-grid .media-card').focus(); document.querySelector('[data-action="watch"]').click()`);
    await evaluate(`document.querySelector('#card-grid .media-card').focus(); document.querySelector('#card-grid .media-card').click()`);
    await waitFor(`!document.querySelector('#detail-panel').hidden && document.activeElement.id==='detail-play'`);
    await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown',{keyCode:461,bubbles:true}))`);
    await waitFor(`document.querySelector('#detail-panel').hidden && document.activeElement.classList.contains('media-card')`);
    await transition('Watch', `document.dispatchEvent(new KeyboardEvent('keydown',{keyCode:461,bubbles:true}))`);
    await evaluate(`document.querySelector('#search-button').focus(); document.querySelector('#search-button').click()`);
    await waitFor(`document.activeElement.id==='search-input'`);
    await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown',{keyCode:461,bubbles:true}))`);
    await waitFor(`document.querySelector('#search-panel').hidden && document.activeElement.id==='search-button'`);
    console.log('TV section focus: global LG Back, navigation clicks, removed cards, My List, brand, detail/search return passed.');
  } finally { socket.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
