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
      Object.defineProperty(window,'HARBOR_CONFIG',{get:()=>({tmdbApiKey:''}),set:()=>{},configurable:true});
      window.__animeMetadataRequests=[];
      const originalFetch=window.fetch;
      window.fetch=(input,options)=>{const url=String(typeof input==='string'?input:input.url);
        if(url.includes('query.wikidata.org')){window.__animeMetadataRequests.push(url);return Promise.reject(new Error('No runtime dataset query allowed'));}
        return originalFetch(input,options);};
    `});
    await command('Page.reload');
    await waitFor(tv ? 'Boolean(window.HarborAnimeCatalog && document.querySelector("[data-action=watch]"))' : 'Boolean(window.HarborAnimeCatalog && typeof setActiveSection === "function")');
    await evaluate(tv ? `document.querySelector('[data-action="watch"]').click()` : `setActiveSection('Watch')`);
    await waitFor(tv ? `Array.from(document.querySelectorAll('#subcategory-row button')).some(b=>b.textContent.trim()==='Anime')` : `Array.from(document.querySelectorAll('.category-button')).some(b=>b.querySelector('.category-name')?.textContent==='Anime')`);
    await evaluate(tv ? `Array.from(document.querySelectorAll('#subcategory-row button')).find(b=>b.textContent.trim()==='Anime').click()` : `Array.from(document.querySelectorAll('.category-button')).find(b=>b.querySelector('.category-name')?.textContent==='Anime').click()`);
    const filters=tv?'#watch-filter-row':'#watch-filter-list';
    let cards=tv?'#card-grid .media-card':'.category-grid .media-card';
    await waitFor(`document.querySelectorAll('${cards}').length===40`);
    assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('${filters} button')).map(x=>x.textContent.trim())`),['Library','Movies']);
    const more=tv?'#more-button':'.load-more-button';
    await evaluate(`document.querySelector('${more}').click()`);
    await waitFor(`document.querySelectorAll('${cards}').length===80`);
    await evaluate(`Array.from(document.querySelectorAll('${filters} button')).find(b=>b.textContent.trim()==='Movies').click()`);
    await waitFor(`document.querySelectorAll('${cards}').length===40`);
    if(tv){
      await evaluate(`document.querySelector('#search-button').click();document.querySelector('#search-input').value='Spirited Away';document.querySelector('#search-form').requestSubmit()`);
    }else{
      await evaluate(`const input=document.querySelector('#resource-search');input.value='Spirited Away';input.dispatchEvent(new Event('input',{bubbles:true}));`);
      cards='.search-grid .media-card';
    }
    await waitFor(`document.querySelectorAll('${cards}').length===1 && document.querySelector('${cards}').textContent.includes('Spirited Away')`);
    assert((await evaluate(`document.querySelector('${cards}').textContent`)).includes('Metadata only'));
    await evaluate(`document.querySelector('${tv?cards:cards+' .media-card-open'}').click()`);
    await waitFor(`document.querySelector('#detail-title').textContent==='Spirited Away'`);
    assert.equal(await evaluate(`document.querySelector('${tv?'#detail-play':'#detail-play-btn'}').hidden`),false);
    assert((await evaluate(`document.querySelector('${tv?'#detail-summary':'#detail-overview'}').textContent`)).includes('Playback availability has not been verified'));
    assert.equal(await evaluate('window.__animeMetadataRequests.length'),0);
    if(!tv){
      await evaluate(`document.querySelector('#detail-save-btn').click()`);
      assert.equal(await evaluate(`userState.favorites.find(x=>x.tmdbId==='129'&&x.type==='movie').id`),'vidsrc-movie-129');
      await command('Page.reload');
      await waitFor(`typeof openDetailDialog==='function'&&userState.favorites.some(x=>x.tmdbId==='129'&&x.type==='movie')`);
      await evaluate(`openDetailDialog(userState.favorites.find(x=>x.tmdbId==='129'&&x.type==='movie'))`);
      await waitFor(`document.querySelector('#detail-title').textContent==='Spirited Away'`);
      const subtitle=await evaluate(`document.querySelector('#detail-subtitle').textContent`);
      assert(subtitle.includes('Metadata only')&&!subtitle.includes('null')&&!subtitle.includes('★'));
    }
    console.log(`${tv?'TV':'Desktop'} no-key anime metadata: library/movie filters, paging, English search, honest metadata and movie controls passed.`);
  }finally{socket.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
