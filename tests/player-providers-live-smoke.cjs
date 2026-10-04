// Public player-page checks. Optional Play attempts use normal controls only;
// never bypass provider challenges or extract stream URLs.
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
    await evaluate(`(async()=>{const end=Date.now()+10000;while(typeof startStreamPlayback!=='function' && Date.now()<end)await new Promise(r=>setTimeout(r,25));if(welcomeDialog.open)welcomeDialog.close();await handleMediaClick(WATCH_CATALOG.find(x=>x.tmdbId==='693134'));detailPlayBtn.click();})()`);
    const ids=await evaluate('playbackProvidersApi.providers.map(p=>p.id)');
    for(const id of ids){
      const result=await evaluate(`(async()=>{
        streamServerSelect.value=${JSON.stringify(id)};
        streamServerSelect.dispatchEvent(new Event('change',{bubbles:true}));
        await new Promise(r=>setTimeout(r,3500));
        let page={};
        try{page=await Promise.race([streamInAppWebview.executeJavaScript('({host:location.hostname,title:document.title.slice(0,120),media:Boolean(document.querySelector("video, audio")),frames:document.querySelectorAll("iframe").length})',true),new Promise(r=>setTimeout(()=>r({initializing:true}),700))]);}catch{page={notReady:true};}
        let playback;
        if(${Boolean(process.env.HARBOR_QA_TRY_PLAY)} && page.media && activeProviderKey===${JSON.stringify(id)}){
          try{playback=await streamInAppWebview.executeJavaScript(\`(async()=>{
            const media=document.querySelector('video, audio');
            const button=document.querySelector('.vjs-big-play-button,.plyr__control--overlaid,.jw-icon-display,button[aria-label="Play"],button[title="Play"]');
            button?.click();
            if(media?.currentSrc || media?.getAttribute('src')) void media.play().catch(()=>{});
            await new Promise(r=>setTimeout(r,1200));
            return {playing:Boolean(media && !media.paused && media.readyState>=2),readyState:media?.readyState,time:media?.currentTime};
          })()\`,true);}catch{playback={notReady:true};}
        }
        return {requested:${JSON.stringify(id)},active:activeProviderKey,playerRevealed:streamStatusOverlay.hidden,terminalFailure:!streamRetryButton.hidden,awaitingUsablePlayer:streamLoadTimeout!==null,page,playback};
      })()`);
      console.log(JSON.stringify(result));
    }
    await evaluate('closeStreamDialogBtn.click()');
  }finally{socket.close();}
}
run().catch(error=>{console.error(error);process.exit(1);});
