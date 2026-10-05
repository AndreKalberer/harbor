const assert = require('node:assert/strict');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  const targets = await fetch(`http://127.0.0.1:${process.argv[2]}/json`).then(response => response.json());
  const target = targets.find(item => item.type === 'page' && /\/(app|tv)\/index\.html/.test(item.url));
  assert(target, 'Harbor debug target must exist');
  const tv = /\/tv\//.test(target.url);
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  let sequence = 0;
  const pending = new Map();
  socket.addEventListener('message', event => {
    const data = JSON.parse(event.data.toString());
    if (!pending.has(data.id)) return;
    const { resolve, reject } = pending.get(data.id); pending.delete(data.id);
    if (data.error || data.result?.exceptionDetails) reject(new Error(data.error?.message || data.result.exceptionDetails.exception?.description));
    else resolve(data.result);
  });
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  const command = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP command timed out: ${method}`)); }, 15000);
    pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject: error => { clearTimeout(timer); reject(error); } });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => (await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true })).result.value;
  const waitFor = async expression => {
    const deadline = Date.now() + 12000;
    while (Date.now() < deadline) {
      try { if (await evaluate(expression)) return; } catch { /* Reload changes the execution context. */ }
      await delay(50);
    }
    throw new Error(`Anime smoke timed out: ${expression}`);
  };
  try {
    await command('Page.enable');
    await command('Page.addScriptToEvaluateOnNewDocument', { source: `
      Object.defineProperty(window, 'HARBOR_CONFIG', { get: () => ({ tmdbApiKey: 'harbor-anime-qa-fixture' }), set: () => {}, configurable: true });
      window.__animeRequests = [];
      const originalFetch = window.fetch;
      window.fetch = (input, options) => {
        const url = new URL(typeof input === 'string' ? input : input.url, location.href);
        if (url.origin !== 'https://api.themoviedb.org') return originalFetch(input, options);
        window.__animeRequests.push(url.pathname + url.search.replace(/api_key=[^&]*/, 'api_key=fixture'));
        const film = { id: 128, title: 'Harbor Anime Film', genre_ids: [16], original_language: 'ja', release_date: '1997-07-12', vote_average: 8.2 };
        const series = { id: 128, name: 'Harbor Anime Series', genre_ids: [16], original_language: 'ja', first_air_date: '2000-01-01', vote_average: 8.4 };
        const results = url.pathname.includes('/movie') ? [film] : url.pathname.includes('/tv') ? [series] : [];
        const page = Number(url.searchParams.get('page') || 1);
        return Promise.resolve(new Response(JSON.stringify({ page, total_pages: 2, total_results: 2, results, seasons: [] }), { status: 200, headers: { 'content-type': 'application/json' } }));
      };
    ` });
    await command('Page.reload');
    await waitFor(tv ? 'Boolean(window.__animeRequests && document.querySelector("[data-action=watch]"))' : 'Boolean(window.__animeRequests && typeof setActiveSection === "function")');
    await evaluate(tv
      ? `document.querySelector('[data-action="watch"]').click()`
      : `setActiveSection('Watch')`);
    await waitFor(tv
      ? `Array.from(document.querySelectorAll('#subcategory-row button')).some(b => b.textContent.trim() === 'Anime')`
      : `Array.from(document.querySelectorAll('.category-button')).some(b => b.querySelector('.category-name')?.textContent === 'Anime')`);
    await evaluate(tv
      ? `Array.from(document.querySelectorAll('#subcategory-row button')).find(b => b.textContent.trim() === 'Anime').click()`
      : `Array.from(document.querySelectorAll('.category-button')).find(b => b.querySelector('.category-name')?.textContent === 'Anime').click()`);
    const filters = tv ? '#watch-filter-row' : '#watch-filter-list';
    await waitFor(`Array.from(document.querySelectorAll('${filters} button')).some(b => b.textContent.trim() === 'Movies')`);
    await evaluate(`Array.from(document.querySelectorAll('${filters} button')).find(b => b.textContent.trim() === 'Movies').click()`);
    await waitFor(`document.querySelector('${tv ? '#card-grid' : '.category-grid'}')?.textContent.includes('Harbor Anime Film')`);
    const browse = await evaluate(`({requests:window.__animeRequests, names: Array.from(document.querySelectorAll('${tv ? '#card-grid .media-card' : '.category-grid .media-card'}')).map(c=>c.textContent)})`);
    assert(browse.requests.some(url => url.includes('/discover/movie?') && url.includes('with_genres=16') && url.includes('with_original_language=ja')));
    assert(browse.names.every(name => name.includes('Harbor Anime Film') && !name.includes('Harbor Anime Series')));
    const more = tv ? '#more-button' : '.load-more-button';
    await waitFor(`Boolean(document.querySelector('${more}') && !document.querySelector('${more}').hidden)`);
    await evaluate(`document.querySelector('${more}').click()`);
    await waitFor(`window.__animeRequests.some(url => url.includes('/discover/movie?') && url.includes('page=2')) && ${tv ? "document.querySelector('#more-button').hidden" : "!document.querySelector('.load-more-button')"}`);
    assert.equal(await evaluate(`document.querySelectorAll('${tv ? '#card-grid .media-card' : '.category-grid .media-card'}').length`), 1, 'Repeated movie IDs on later pages must not duplicate cards');
    await evaluate(`document.querySelector('${tv ? '#card-grid .media-card' : '.category-grid .media-card .media-card-open'}').click()`);
    await waitFor(`document.querySelector('#detail-title')?.textContent === 'Harbor Anime Film'`);
    const detail = await evaluate(`({play: !document.querySelector('${tv ? '#detail-play' : '#detail-play-btn'}').hidden, episodesHidden: document.querySelector('${tv ? '#episode-browser' : '#detail-episodes-wrap'}').hidden, requests:window.__animeRequests})`);
    assert.equal(detail.play, true); assert.equal(detail.episodesHidden, true);
    assert(!detail.requests.some(url => /\/tv\/128(?:\/|\?)/.test(url)), 'Opening an anime film must not fetch TV seasons');
    await evaluate(tv ? `document.querySelector('[data-close="detail"]').click()` : `mediaDetailDialog.close()`);
    await evaluate(`Array.from(document.querySelectorAll('${filters} button')).find(b => b.textContent.trim() === 'Popular').click()`);
    await evaluate(tv ? `document.querySelector('#search-input').value='Harbor Anime'; document.querySelector('#search-form').dispatchEvent(new Event('submit', {bubbles:true,cancelable:true}))` : `beginSearch('Harbor Anime')`);
    await waitFor(`document.querySelector('${tv ? '#card-grid' : '.search-grid'}')?.textContent.includes('Harbor Anime Film') && document.querySelector('${tv ? '#card-grid' : '.search-grid'}')?.textContent.includes('Harbor Anime Series')`);
    const requests = await evaluate('window.__animeRequests');
    assert(requests.some(url => url.includes('/search/movie?')) && requests.some(url => url.includes('/search/tv?')));
    console.log(`${tv ? 'TV' : 'Desktop'} Anime films: rendered filter, movie detail controls, absence of season fetch, and mixed scoped search passed.`);
  } finally { socket.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
