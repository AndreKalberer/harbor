const assert=require('node:assert/strict');
async function run(){
  const targets=await fetch(`http://127.0.0.1:${process.argv[2]}/json`).then(r=>r.json());
  const target=targets.find(x=>x.type==='page' && /\/app\/index\.html(?:$|[?#])/i.test(x.url));
  const socket=new WebSocket(target.webSocketDebuggerUrl);let sequence=0;const pending=new Map();
  socket.addEventListener('message',e=>{const p=JSON.parse(e.data);if(pending.has(p.id)){pending.get(p.id)(p);pending.delete(p.id);}});
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  const evaluate=expression=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,p=>{
    if(p.error || p.result.exceptionDetails) reject(new Error(p.error?.message || p.result.exceptionDetails.exception?.description));
    else resolve(p.result.result.value);
  });socket.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression,returnByValue:true,awaitPromise:true,userGesture:true}}));});
  try{
    const results=await evaluate(`(async()=>{
      const wait=async predicate=>{const until=Date.now()+5000;while(!predicate() && Date.now()<until)await new Promise(r=>setTimeout(r,25));if(!predicate())throw new Error('Player fixture timed out: '+activeProviderKey);};
      await wait(()=>typeof startStreamPlayback==='function');
      if(welcomeDialog.open)welcomeDialog.close();
      const movie=formatVidSrcMovie({tmdb_id:'231519',title:'Catalog movie',genre:'Drama'});
      // Follow the same card → details → Watch flow as the user.
      await handleMediaClick(movie);detailPlayBtn.click();
      if(activeProviderKey!=='vidapi')throw new Error('Catalog titles must start with their own player');
      if(streamServerSelect.querySelectorAll('optgroup').length!==2 || streamServerSelect.querySelector('optgroup option').value!=='vidapi')throw new Error('Catalog listing must be separated from unknown fallback servers');
      if(streamServerSelect.querySelectorAll('option').length!==10)throw new Error('Unknown providers must remain available to try');
      const result=[];
      for(const provider of playbackProvidersApi.providers){
        streamServerSelect.value=provider.id;
        streamServerSelect.dispatchEvent(new Event('change',{bubbles:true}));
        await wait(()=>streamStatusOverlay.hidden && selectedStreamDestinationMatches(streamInAppWebview.getURL()));
        const before={provider:provider.id,overlayHidden:streamStatusOverlay.hidden,confirmed:streamPlaybackConfirmed,timeout:streamLoadTimeout,selected:activeProviderKey};
        const media=await streamInAppWebview.executeJavaScript(\`(async()=>{
          let root=document;const frame=document.querySelector('#nested-player');
          if(frame){const end=Date.now()+3000;while(!frame.contentDocument?.querySelector('#play') && Date.now()<end)await new Promise(r=>setTimeout(r,25));root=frame.contentDocument;}
          root.querySelector('#play').click();
          const audio=root.querySelector('#media');const end=Date.now()+3000;
          while((audio.paused||audio.readyState<2) && Date.now()<end)await new Promise(r=>setTimeout(r,25));
          return {playing:!audio.paused && audio.readyState>=2,nested:Boolean(frame),url:location.href};
        })()\`,true);
        if(!media.nested) await wait(()=>streamPlaybackConfirmed);
        result.push({...before,...media});
      }
      closeStreamDialogBtn.click();
      return result;
    })()`);
    assert.equal(results.length,10);
    for(const result of results){
      assert(result.overlayHidden,result.provider+': Play control was covered');
      assert(!result.confirmed,result.provider+': playback was falsely recorded before Play');
      assert.equal(result.timeout,null);
      assert.equal(result.selected,result.provider);
      assert(result.playing,result.provider+': test media failed to play');
    }
    console.log(JSON.stringify(results));
  }finally{socket.close();}
}
run().catch(error=>{console.error(error);process.exit(1);});
