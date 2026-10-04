// Explicit live integration check; keep this out of the offline default suite.
const assert = require('node:assert/strict');
async function run() {
  const port=process.argv[2];
  const targets=await fetch(`http://127.0.0.1:${port}/json`).then(r=>r.json());
  const target=targets.find(x=>x.type==='page' && /\/app\/index\.html(?:$|[?#])/i.test(x.url));
  if(!target) throw new Error('Harbor window was not found');
  const socket=new WebSocket(target.webSocketDebuggerUrl);
  let sequence=0; const pending=new Map();
  socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(pending.has(message.id)){pending.get(message.id)(message);pending.delete(message.id);}});
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  const evaluate=expression=>new Promise((resolve,reject)=>{
    const id=++sequence;
    pending.set(id,message=>{
      const result=message.result;
      if(message.error || result.exceptionDetails) reject(new Error(message.error?.message || result.exceptionDetails.exception?.description));
      else resolve(result.result.value);
    });
    socket.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression,returnByValue:true,awaitPromise:true,userGesture:true}}));
  });
  try {
    const result=await evaluate(`(async()=>{
      const deadline=Date.now()+10000;
      while(typeof setActiveSection!=='function' && Date.now()<deadline) await new Promise(r=>setTimeout(r,25));
      if(welcomeDialog.open) welcomeDialog.close();
      setActiveSection('Watch');
      // Exercise the actual Movies rail's See all handler.
      const moviesRail=[...document.querySelectorAll('.content-rail')].find(r=>r.querySelector('h2')?.textContent==='Movies');
      moviesRail.querySelector('.rail-link').click();
      while(watchBrowseLoading && Date.now()<deadline+12000) await new Promise(r=>setTimeout(r,25));
      if(movieCatalogError) throw new Error(movieCatalogError);
      const first={count:watchBrowseItems.length,ids:watchBrowseItems.map(x=>x.tmdbId),info:movieCatalogInfo,
        filter:activeWatchFilter,title:document.querySelector('.category-grid')?.parentElement.querySelector('h2').textContent,
        pageControl:document.querySelector('.movie-page-navigation input')?.max};
      await loadActiveWatchBrowse({append:true});
      const second={page:watchBrowsePage,count:watchBrowseItems.length,unique:new Set(watchBrowseItems.map(x=>x.tmdbId)).size};
      const sample=watchBrowseItems[0];
      await openDetailDialog(sample);
      const detail={title:detailTitle.textContent,canPlay:!detailPlayBtn.hidden};
      mediaDetailDialog.close();
      inAppStreamDialog.showModal();
      const serverSelector={visible:!streamServerSelect.hidden && getComputedStyle(streamServerSelect).display!=='none',options:[...streamServerSelect.options].map(x=>x.textContent)};
      inAppStreamDialog.close();
      const finalPage=movieCatalogInfo.totalPages;
      const pageInput=document.querySelector('.movie-page-navigation input');
      pageInput.value=String(finalPage);
      pageInput.form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
      const lastDeadline=Date.now()+15000;
      while(watchBrowseLoading && Date.now()<lastDeadline) await new Promise(r=>setTimeout(r,25));
      const last={page:watchBrowsePage,count:watchBrowseItems.length,more:watchBrowseCanLoadMore,error:movieCatalogError};
      return {first,second,last,detail,serverSelector};
    })()`);
    assert.equal(result.first.filter,'all-movies');
    assert.equal(result.first.title,'All movies');
    assert(result.first.count>10,'The live catalog must replace the ten featured titles');
    assert(result.first.info.total>1000);
    assert.equal(Number(result.first.pageControl),result.first.info.totalPages);
    assert.equal(result.second.page,2);
    assert(result.second.count>result.first.count);
    assert.equal(result.second.unique,result.second.count);
    assert.equal(result.last.page,result.first.info.totalPages);
    assert.equal(result.last.error,'');
    assert.equal(result.last.more,false);
    assert(result.last.count>0);
    assert(result.detail.canPlay && result.serverSelector.visible && result.serverSelector.options.length>=9);
    console.log(JSON.stringify(result));
  } finally {socket.close();}
}
run().catch(error=>{console.error(error);process.exit(1);});
