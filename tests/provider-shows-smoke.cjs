const assert = require('node:assert/strict');
const connect = async (port, predicate) => {
  const targets = await fetch(`http://127.0.0.1:${port}/json`).then((response) => response.json());
  const target = targets.find(predicate);
  assert(target, `Debug target missing on port ${port}`);
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map();
  let sequence = 0;
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data.toString());
    if (!pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error || message.result?.exceptionDetails) {
      reject(new Error(message.error?.message || message.result.exceptionDetails.exception?.description));
    } else resolve(message.result?.identifier ?? message.result?.result?.value);
  });
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  return {
    command: (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequence;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    }),
    evaluate: (expression) => new Promise((resolve, reject) => {
      const id = ++sequence;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: {
        expression, awaitPromise: true, returnByValue: true, userGesture: true
      } }));
    }),
    close: () => socket.close()
  };
};


const run = async () => {
 let renderer, main;
 try {
  renderer = await connect(process.argv[2], t => t.type === 'page' && /\/app\/index\.html(?:$|[?#])/i.test(t.url));
  main = await connect(process.env.HARBOR_QA_MAIN_PORT, () => true);
  await renderer.command('Page.enable');
  for (const configured of [false, true]) {
  await main.evaluate(`(() => {
   const net = process.mainModule.require('electron').net;
   if (!globalThis.__showsOriginalFetch) globalThis.__showsOriginalFetch = net.fetch;
   globalThis.__showsRequests = []; globalThis.__showsFailNext = true;
   net.fetch = async (url, options) => {
    if (!String(url).startsWith('https://vidapi.ru/tvshows/latest/')) return globalThis.__showsOriginalFetch.call(net, url, options);
    const page = Number(String(url).match(/page-(\\d+)/)[1]);
    globalThis.__showsRequests.push(page);
    if (page === 2 && globalThis.__showsFailNext) { globalThis.__showsFailNext = false; return {ok:false,status:503}; }
    const row = id => ({tmdb_id:id,title:'Harbor Fixture Series '+id,genre:'Drama',rating:'7.5'});
    return {ok:true,json:async()=>({page,total_pages:3,total:3,items:page===1?[row(910001),row(910001)]:page===2?[row(910001),row(910002)]:[]})};
   }; return true;
  })()`);
  // Override only this isolated QA document, before production config loads.
  // Exercise both key modes regardless of the CI/release build configuration.
  const injection = await renderer.command('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__showsMode = ${configured};
    Object.defineProperty(window, 'HARBOR_CONFIG', {
      get: () => Object.freeze({ tmdbApiKey: ${JSON.stringify(configured ? 'harborfixturecatalogkey00000000000' : '')} }),
      set: () => {}, configurable: true
    });
    const originalFetch = window.fetch;
    window.__showsTmdbRequests = 0;
    window.fetch = (input, options) => {
      const url = new URL(typeof input === 'string' ? input : input.url, location.href);
      if (url.origin !== 'https://api.themoviedb.org') return originalFetch(input, options);
      if (url.pathname.endsWith('/search/tv')) window.__showsTmdbRequests++;
      const results = url.pathname.endsWith('/search/tv')
        ? [{ id: 910002, name: 'Harbor Fixture Series 910002', genre_ids: [18], first_air_date: '2024-01-01', vote_average: 7.5 }] : [];
      return Promise.resolve(new Response(JSON.stringify({ page: 1, total_pages: 1, total_results: results.length, results }),
        { status: 200, headers: { 'content-type': 'application/json' } }));
    };
  ` });
  await renderer.command('Page.reload');
  const deadline = Date.now() + 12000;
  while (true) {
    try { if (await renderer.evaluate(`window.__showsMode === ${configured} && typeof setActiveSection === 'function'`)) break; } catch { /* Navigation replaces the old context. */ }
    if (Date.now() > deadline) throw new Error('QA document-start injection did not become ready');
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  const result = await renderer.evaluate(`(async () => {
   const wait = async predicate => { const end=Date.now()+12000; while(!predicate()) { if(Date.now()>end) throw new Error('Shows UI did not settle'); await new Promise(r=>setTimeout(r,25)); } };
   await wait(()=>typeof setActiveSection==='function');
   if(Boolean(TMDB_API_KEY)!==${configured}) throw new Error('QA key-mode injection did not apply');
   setActiveSection('Watch');
   const category=[...document.querySelectorAll('.category-button')].find(b=>b.querySelector('.category-name')?.textContent==='TV Shows');
   if(!category) throw new Error('TV Shows category missing'); category.click();
   await wait(()=>watchBrowseLoaded&&!watchBrowseLoading&&watchBrowsePage===1);
   const names=()=>[...document.querySelectorAll('#resource-list .category-grid .media-card-title')].map(n=>n.textContent.trim());
   const search = term => { searchInput.value=term; searchInput.dispatchEvent(new Event('input',{bubbles:true})); };
   const pageOne=names(); const filter=document.querySelector('#watch-filter-list .active')?.textContent.trim();
   search('Harbor Fixture Series 910002'); await wait(()=>!searchState.loading); const missing=[...document.querySelectorAll('#resource-list .media-card-title')].map(n=>n.textContent.trim()); search('');
   document.querySelector('#resource-list .load-more-button').click();
   await wait(()=>!watchBrowseLoading&&Boolean(seriesCatalogError));
   const outage=names(); const retry=[...document.querySelectorAll('#resource-list button')].find(b=>b.textContent==='Retry TV library');
   if(!retry) throw new Error('Production retry button missing'); retry.click();
   await wait(()=>!watchBrowseLoading&&!seriesCatalogError&&watchBrowsePage===2);
   const pageTwo=names();
   search('Harbor Fixture Series 910002'); await wait(()=>!searchState.loading); const found=[...document.querySelectorAll('#resource-list .media-card-title')].map(n=>n.textContent.trim());
   const placeholder=searchInput.placeholder; const summary=document.querySelector('#resource-list').textContent;
   search(''); document.querySelector('#resource-list .load-more-button').click();
   await wait(()=>!watchBrowseLoading&&watchBrowsePage===3);
   return {configured:${configured},tmdbRequests:window.__showsTmdbRequests,pageOne,filter,missing,outage,pageTwo,found,placeholder,summary,final:names(),more:Boolean(document.querySelector('#resource-list .load-more-button'))};
  })()`);
  const first='Harbor Fixture Series 910001', second='Harbor Fixture Series 910002';
  assert.deepEqual(result.pageOne,[first]); assert.match(result.filter,/Latest Library/);
  assert.deepEqual(result.missing,configured?[second]:[]); assert.deepEqual(result.outage,[first]);
  assert.deepEqual(result.pageTwo,[first,second]); assert.deepEqual(result.found,[second]);
  assert.match(result.placeholder,configured?/Search TV Shows/:/Search loaded TV shows/); assert.match(result.summary,/1 match in TV Shows/);
  assert.deepEqual(result.final,[first,second]); assert.equal(result.more,false);
  if (!configured) assert.equal(result.tmdbRequests,0,'No-key Shows search must not contact TMDB');
  else assert(result.tmdbRequests > 0,'Configured-key mode must exercise the metadata search fixture');
  const requests=await main.evaluate('globalThis.__showsRequests'); assert.deepEqual(requests,[1,2,2,3]);
  await renderer.command('Page.removeScriptToEvaluateOnNewDocument', { identifier: injection });
  console.log(JSON.stringify({production:'renderer -> preload IPC -> main net.fetch fixture',...result,requests},null,2));
  }
 } finally {
  if(main) { await main.evaluate(`if(globalThis.__showsOriginalFetch)process.mainModule.require('electron').net.fetch=globalThis.__showsOriginalFetch; true`).catch(()=>{}); main.close(); }
  if(renderer)renderer.close();
 }
};
run().catch(error=>{console.error(error);process.exitCode=1;});
