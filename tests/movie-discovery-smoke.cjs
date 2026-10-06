'use strict';
const assert = require('node:assert/strict');
async function connect(port, predicate) {
  const targets = await fetch(`http://127.0.0.1:${port}/json`).then(r => r.json());
  const target = targets.find(predicate); assert(target);
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map(); let serial = 0;
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data.toString()); const request = pending.get(message.id);
    if (!request) return; pending.delete(message.id);
    if (message.error || message.result?.exceptionDetails) request.reject(new Error(message.error?.message || message.result.exceptionDetails.exception?.description));
    else request.resolve(message.result?.identifier ?? message.result?.result?.value);
  });
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  const command = (method, params = {}) => new Promise((resolve, reject) => { const id = ++serial; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  return { command, evaluate: expression => command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true }), close: () => socket.close() };
}
async function run() {
  let main, renderer;
  try {
    main = await connect(process.env.HARBOR_QA_MAIN_PORT, () => true);
    renderer = await connect(process.argv[2], t => t.type === 'page' && /\/app\/index\.html/.test(t.url));
    await main.evaluate(`(() => {
      const fs=process.mainModule.require('node:fs'), path=process.mainModule.require('node:path');
      const {app,net}=process.mainModule.require('electron');
      const dir=path.join(app.getPath('userData'),'movie-discovery-v1');fs.mkdirSync(dir,{recursive:true});
      fs.writeFileSync(path.join(dir,'movies-v1.json'),JSON.stringify({version:1,sourceDate:'2026-10-04',validatedAt:Date.now(),providerIds:['910221','910222','496243'],movies:[
        {tmdb_id:'910221',title:'Loaded Movie',popularity:1},{tmdb_id:'910222',title:'Unloaded Original Movie',popularity:20},{tmdb_id:'496243',title:'기생충',popularity:10}]}));
      globalThis.__movieOriginalFetch=net.fetch;
      net.fetch=async(url,options)=>String(url).startsWith('https://vidapi.ru/movies/latest/')
        ? {ok:true,json:async()=>({page:1,total_pages:1,total:2,items:[{tmdb_id:910221,title:'Loaded Movie'},{tmdb_id:910223,title:'로컬 영화',year:1999,rating:7.2}]})}
        :globalThis.__movieOriginalFetch.call(net,url,options);
      const ipc=process.mainModule.require('electron').ipcMain;
      const channel='harbor:search-movie-discovery';
      const original=ipc._invokeHandlers.get(channel);
      ipc.removeHandler(channel);
      ipc.handle(channel,async(event,query)=>{await new Promise(resolve=>setTimeout(resolve,500));return original(event,query);});
      const directory=ipc._invokeHandlers.get('harbor:get-directory-links');
      globalThis.__movieDirectoryGate=new Promise(resolve=>{globalThis.__movieReleaseDirectory=resolve;});
      ipc.removeHandler('harbor:get-directory-links');
      ipc.handle('harbor:get-directory-links',async event=>{await globalThis.__movieDirectoryGate;return directory(event);});
      return true;
    })()`);
    await renderer.command('Page.enable');
    await renderer.command('Page.addScriptToEvaluateOnNewDocument', { source: `
      Object.defineProperty(window,'HARBOR_CONFIG',{get:()=>({tmdbApiKey:''}),set:()=>{},configurable:true});
      window.__movieTrendingGate=new Promise(resolve=>{window.__movieReleaseTrending=resolve;});
      const original=window.fetch;
      window.fetch=async(input,options)=>{
        if(String(input).includes('/trending/all/day')){
          window.__movieTrendingStarted=true;await window.__movieTrendingGate;
          return new Response(JSON.stringify({results:[{id:910224,title:'Late Startup Movie',media_type:'movie',genre_ids:[]}]}),{status:200});
        }
        return original(input,options);
      };
    ` });
    await renderer.command('Page.reload');
    let ready = false;
    for (let i = 0; i < 200 && !ready; i++) {
      try { ready = await renderer.evaluate(`typeof setActiveSection==='function' && !TMDB_API_KEY`); } catch {}
      if (!ready) await new Promise(r => setTimeout(r, 50));
    }
    assert(ready);
    const lifecycleBefore=await renderer.evaluate(`(async()=>{
      const wait=async p=>{const end=Date.now()+12000;while(!p()){if(Date.now()>end)throw new Error('Startup movie search did not settle');await new Promise(r=>setTimeout(r,25));}};
      setActiveSection('Watch');[...document.querySelectorAll('.category-button')].find(b=>b.querySelector('.category-name')?.textContent==='Movies').click();
      await wait(()=>watchBrowseLoaded&&!watchBrowseLoading);
      searchInput.value='기생충';searchInput.dispatchEvent(new Event('input',{bubbles:true}));await wait(()=>!searchState.loading);
      return {names:currentMediaList.map(item=>item.name),query,active:hasActiveSearchTerm()};
    })()`);
    assert.deepEqual(lifecycleBefore.names,['기생충']);assert.equal(lifecycleBefore.query,'기생충');assert(lifecycleBefore.active);
    await main.evaluate(`globalThis.__movieReleaseDirectory();true`);
    const lifecycleAfter=await renderer.evaluate(`(async()=>{
      const wait=async p=>{const end=Date.now()+12000;while(!p()){if(Date.now()>end)throw new Error('Late startup completion did not settle');await new Promise(r=>setTimeout(r,25));}};
      await wait(()=>window.__movieTrendingStarted);const directoryNames=currentMediaList.map(item=>item.name);
      window.__movieReleaseTrending();await wait(()=>discoveryMediaList.some(item=>item.name==='Late Startup Movie'));
      const trendingNames=currentMediaList.map(item=>item.name);const activeQuery=query;
      const category=name=>[...document.querySelectorAll('.category-button')].find(b=>b.querySelector('.category-name')?.textContent===name).click();
      category('TV Shows');category('Movies');const restarted=searchState.loading;await wait(()=>!searchState.loading);const returnedNames=currentMediaList.map(item=>item.name);
      const legacy=normalizeScopedSearchTerm('기생충',{category:'Watch',subcategory:'TV Shows'})===normalizeSearchText('기생충')
        &&normalizeScopedSearchTerm('Dune',{category:'Watch',subcategory:'Movies'})===normalizeSearchText('Dune');
      searchInput.value='';searchInput.dispatchEvent(new Event('input',{bubbles:true}));const empty=!hasActiveSearchTerm();
      await fetchTrendingMedia();const emptyRefresh=currentMediaList.some(item=>item.name==='Late Startup Movie');
      return {directoryNames,trendingNames,activeQuery,restarted,returnedNames,legacy,empty,emptyRefresh};
    })()`);
    assert.deepEqual(lifecycleAfter.directoryNames,['기생충']);assert.deepEqual(lifecycleAfter.trendingNames,['기생충']);assert.equal(lifecycleAfter.activeQuery,'기생충');
    assert(lifecycleAfter.restarted);assert.deepEqual(lifecycleAfter.returnedNames,['기생충']);assert(lifecycleAfter.legacy);assert(lifecycleAfter.empty);assert(lifecycleAfter.emptyRefresh);
    const result = await renderer.evaluate(`(async()=>{
      const wait=async predicate=>{const end=Date.now()+15000;while(!predicate()){if(Date.now()>end)throw new Error('Movie discovery UI did not settle');await new Promise(r=>setTimeout(r,25));}};
      setActiveSection('Watch');const movies=[...document.querySelectorAll('.category-button')].find(b=>b.querySelector('.category-name')?.textContent==='Movies');movies.click();
      await wait(()=>watchBrowseLoaded&&!watchBrowseLoading);
      const loaded=[...loadedProviderMovies.keys()];
      const saved=formatVidSrcMovie({tmdb_id:777,title:'Saved English Alias'});userState.favorites=[saved];userState.progress['movie:777']={position:31,duration:100};
      const before=JSON.stringify({favorites:userState.favorites,progress:userState.progress});
      const search=term=>{searchInput.value=term;searchInput.dispatchEvent(new Event('input',{bubbles:true}));};
      const names=()=>[...document.querySelectorAll('#resource-list .media-card-title')].map(n=>n.textContent.trim());
      search('Unloaded Original');await wait(()=>!searchState.loading);const original=names();const metadata=document.querySelector('#resource-list .media-card-meta').textContent;const dto=currentMediaList[0];
      search('tmdb:496243');await wait(()=>!searchState.loading);const id=names();
      search('기생충');await wait(()=>!searchState.loading);const native=names();
      search('Saved English Alias');await wait(()=>!searchState.loading);const alias=names();
      search('Unloaded Original');await new Promise(r=>setTimeout(r,400));search('');await new Promise(r=>setTimeout(r,800));const cleared=query===''&&!searchState.loading;
      search('Unloaded Original');await new Promise(r=>setTimeout(r,400));search('');setActiveSection('Listen');await new Promise(r=>setTimeout(r,800));const scope=activeCategory;
      const after=JSON.stringify({favorites:userState.favorites,progress:userState.progress});
      return {loaded,original,id,native,alias,metadata,dto,cleared,scope,before,after,placeholder:'Search original movie title or TMDB ID'};
    })()`);
    assert(!result.loaded.includes('910222'));
    assert.deepEqual(result.original, ['Unloaded Original Movie']); assert.deepEqual(result.id, ['기생충']); assert.deepEqual(result.native, ['기생충']);
    assert.deepEqual(result.alias, ['Saved English Alias']); assert.match(result.metadata, /Year unknown.*Playback unverified/);
    assert.equal(result.dto.id, 'vidsrc-movie-910222'); assert.equal(result.dto.artworkUrl, '');
    assert.deepEqual(result.dto.providerListings, [{ providerId: 'vidapi', mediaType: 'movie', tmdbId: '910222' }]);
    assert(result.cleared); assert.equal(result.scope, 'Listen'); assert.equal(result.before, result.after);
    await renderer.evaluate(`(async()=>{
      const wait=async p=>{const end=Date.now()+12000;while(!p()){if(Date.now()>end)throw new Error('Save did not settle');await new Promise(r=>setTimeout(r,25));}};
      setActiveSection('Watch');[...document.querySelectorAll('.category-button')].find(b=>b.querySelector('.category-name')?.textContent==='Movies').click();
      const search=term=>{searchInput.value=term;searchInput.dispatchEvent(new Event('input',{bubbles:true}));};
      search('Unloaded Original');await wait(()=>!searchState.loading);document.querySelector('#resource-list .card-save').click();
      search('tmdb:496243');await wait(()=>!searchState.loading);document.querySelector('#resource-list .card-save').click();
      if(!userState.favorites.filter(item=>item.movieDiscoveryMetadata===true).length)throw new Error('Actual Save discarded metadata marker');
      return true;
    })()`);
    await renderer.command('Page.reload');
    for (let i=0;i<200;i++) {
      let loaded=false;try {loaded=await renderer.evaluate(`typeof userState!=='undefined' && userState.favorites.some(item=>item.id==='vidsrc-movie-910222')`);}catch{}
      if(loaded)break;if(i===199)throw new Error('Saved movie did not reload');await new Promise(r=>setTimeout(r,50));
    }
    await main.evaluate(`(()=>{
      const {app,ipcMain}=process.mainModule.require('electron');const fs=process.mainModule.require('node:fs'),path=process.mainModule.require('node:path');
      fs.unlinkSync(path.join(app.getPath('userData'),'movie-discovery-v1','movies-v1.json'));
      ipcMain.removeHandler('harbor:search-movie-discovery');ipcMain.handle('harbor:search-movie-discovery',async()=>({status:'unavailable',sourceDate:null,results:[]}));return true;
    })()`);
    const savedResult=await renderer.evaluate(`(async()=>{
      const wait=async p=>{const end=Date.now()+12000;while(!p()){if(Date.now()>end)throw new Error('Offline saved search did not settle');await new Promise(r=>setTimeout(r,25));}};
      const saved=userState.favorites.find(item=>item.id==='vidsrc-movie-910222');
      openMyHarbor('list');const listLabel=[...document.querySelectorAll('#my-harbor-content .media-card')].find(card=>card.textContent.includes('Unloaded Original Movie'))?.querySelector('.media-card-meta')?.textContent;myHarborDialog.close();
      await openDetailDialog(saved);const detailLabel=detailSubtitle.textContent;document.querySelector('dialog[open]').close();
      setActiveSection('Watch');[...document.querySelectorAll('.category-button')].find(b=>b.querySelector('.category-name')?.textContent==='Movies').click();await wait(()=>watchBrowseLoaded&&!watchBrowseLoading);
      const search=term=>{searchInput.value=term;searchInput.dispatchEvent(new Event('input',{bubbles:true}));};
      const names=()=>[...document.querySelectorAll('#resource-list .media-card-title')].map(n=>n.textContent.trim());
      search('Unloaded Original');await wait(()=>!searchState.loading);const savedLabel=document.querySelector('#resource-list .media-card-meta')?.textContent;
      search('기생충');await wait(()=>!searchState.loading);const savedNative=names();const savedNativeLabel=document.querySelector('#resource-list .media-card-meta')?.textContent;
      search('로컬');await wait(()=>!searchState.loading);const loadedNative=names();const offlineNote=searchState.movieDiscoveryNote;
      search('');const cleared=query===''&&!searchState.loading;setActiveSection('Listen');
      return {marker:saved.movieDiscoveryMetadata,listLabel,detailLabel,savedLabel,savedNative,savedNativeLabel,loadedNative,offlineNote,cleared,scope:activeCategory};
    })()`);
    assert.equal(savedResult.marker,true);
    for(const label of [savedResult.listLabel,savedResult.savedLabel,savedResult.savedNativeLabel])assert.match(label,/Year unknown.*Playback unverified/);
    assert.match(savedResult.detailLabel,/Year and rating unknown.*Playback unverified/);
    assert.deepEqual(savedResult.savedNative,['기생충']);assert.deepEqual(savedResult.loadedNative,['로컬 영화']);assert.match(savedResult.offlineNote,/unavailable/);assert(savedResult.cleared);assert.equal(savedResult.scope,'Listen');
    console.log('Production movie discovery renderer -> preload -> trusted main IPC -> real worker/cache: unloaded original/ID, original language, saved alias, clear/scope race, unknown metadata, and saved state passed.');
  } finally {
    if (main) { await main.evaluate(`if(globalThis.__movieOriginalFetch)process.mainModule.require('electron').net.fetch=globalThis.__movieOriginalFetch;true`).catch(() => {}); main.close(); }
    renderer?.close();
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
