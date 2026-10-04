const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const providers=require('../shared/playback-providers.js');
const renderer=fs.readFileSync(require('node:path').join(__dirname,'../app/renderer.js'),'utf8');
const main=fs.readFileSync(require('node:path').join(__dirname,'../electron/main.cjs'),'utf8');
const policy=vm.createContext({URL,allowedStreamHosts:new Set(providers.allowedHosts)});
vm.runInContext(main.slice(main.indexOf('const isAllowedStreamUrl ='),main.indexOf('const savedGameLibraryPath =')),policy);
for(const host of providers.allowedHosts) assert(vm.runInContext(`isAllowedStreamUrl(${JSON.stringify('https://'+host+'/player')})`,policy));
assert(!vm.runInContext('isAllowedStreamUrl("http://player.vidlove.cc/player")',policy));
assert(!vm.runInContext('isAllowedStreamUrl("https://player.vidlove.cc.evil.test/player")',policy));
assert(!vm.runInContext('isAllowedStreamUrl("https://ad.example/player")',policy));
async function run() {
  let chromeTimer; let controlsHidden=false;
  const chrome=vm.createContext({
    streamChromeHideTimeout:null,inAppStreamDialog:{open:true,classList:{remove:()=>{controlsHidden=false;},add:()=>{controlsHidden=true;}}},
    streamStatusOverlay:{hidden:true},streamPlaybackConfirmed:true,streamInAppWebview:{hidden:false},
    clearTimeout:()=>{},setTimeout:callback=>{chromeTimer=callback;return 1;}
  });
  vm.runInContext(renderer.slice(renderer.indexOf('const showStreamChrome ='),renderer.indexOf('const syncSaveButton =')),chrome);
  vm.runInContext('showStreamChrome()',chrome);chromeTimer();
  assert(!controlsHidden,'Embedded-player mouse events cannot restore host controls: keep the server selector visible');
  chrome.streamInAppWebview.hidden=true;
  vm.runInContext('showStreamChrome()',chrome);chromeTimer();
  assert(controlsHidden,'Native video may still hide and restore its controls');
  for(const provider of providers.providers) {
    const scheduled=new Map(); let timerId=0; let plays=0; let failureMessage='';
    const source=providers.resolve(provider.id,'693134',false);
    const page={url:source,pageReady:true,playing:false,failed:false};
    let correctedUrl;
    const context=vm.createContext({
      URL,playbackProvidersApi:providers,activeProviderKey:provider.id,activeMedia:{name:'Movie',type:'movie',tmdbId:'693134'},activeSeason:1,activeEpisode:1,
      inAppStreamDialog:{open:true},streamInAppWebview:{hidden:false,src:source,executeJavaScript:async()=>page,loadURL:async url=>{correctedUrl=url;}},
      streamPlaybackConfirmed:false,streamLoadGeneration:1,streamReadinessPoll:null,
      streamLoadTimeout:99,streamStatusHideTimeout:null,streamRouteRetryTimeout:null,streamProviderAttempts:0,
      STREAM_PROVIDERS:Object.fromEntries(providers.providers.map(p=>[p.id,{...p,resolve:(id,tv,s,e)=>providers.resolve(p.id,id,tv,s,e)}])),streamServerSelect:{value:provider.id},
      streamStatusOverlay:{hidden:false,classList:{remove:()=>{}}},showStreamChrome:()=>{},
      markStreamReady:()=>{plays++;context.streamPlaybackConfirmed=true;},loadStreamSource:()=>{},
      showStreamStatus:(title)=>{failureMessage=title;},
      setTimeout:callback=>{scheduled.set(++timerId,callback);return timerId;},clearTimeout:id=>scheduled.delete(id)
    });
    vm.runInContext(renderer.slice(renderer.indexOf('const stopStreamReadinessPoll ='),renderer.indexOf('const currentLiveStream =')),context);
    await vm.runInContext('inspectStreamGuest()',context);
    assert.equal(context.streamStatusOverlay.hidden,true,provider.id+': paused player must be visible for the Play click');
    assert.equal(context.streamLoadTimeout,null,provider.id+': loading timeout must stop when the page is usable');
    assert.equal(plays,0,'Revealing a player must not invent playback progress');
    for(const host of provider.navigationHosts||[]) {
      page.url='https://'+host+new URL(source).pathname+new URL(source).search; context.streamStatusOverlay.hidden=false;
      await vm.runInContext('inspectStreamGuest()',context);
      assert(context.streamStatusOverlay.hidden,'Documented redirect must reveal the player');
    }
    page.url='https://vaplayer.ru/embed/movie/1'; context.streamStatusOverlay.hidden=false;context.streamLoadTimeout=99;
    await vm.runInContext('inspectStreamGuest()',context);
    assert.equal(correctedUrl,source,'A late page from the previous selection must navigate to the currently selected movie/server');
    assert.equal(context.streamStatusOverlay.hidden,false,'Do not reveal the stale player');
    page.url=source;
    page.interactive=false;context.streamLoadTimeout=99;context.streamStatusOverlay.hidden=false;
    await vm.runInContext('inspectStreamGuest()',context);
    assert(context.streamStatusOverlay.hidden,'A redirect/loading page may be seen');
    assert.equal(context.streamLoadTimeout,99,'A non-interactive page must retain its failover timeout');
    page.interactive=true;
    await vm.runInContext('inspectStreamGuest()',context);
    assert.equal(context.streamLoadTimeout,null);
    page.playing=true;
    await vm.runInContext('inspectStreamGuest()',context);
    assert.equal(plays,1,'Playing media must still confirm playback');
    context.streamPlaybackConfirmed=false; page.playing=false; page.failed=true;
    await vm.runInContext('inspectStreamGuest()',context);
    const attempts=context.streamProviderAttempts;
    vm.runInContext('tryNextStreamRoute()',context);
    assert.equal(context.streamProviderAttempts,attempts,'Duplicate failure events must not skip servers');
    assert(context.streamRouteRetryTimeout);
    context.streamRouteRetryTimeout=null; context.streamProviderAttempts=providers.providers.length-1;
    vm.runInContext('tryNextStreamRoute()',context);
    assert.equal(failureMessage,'No server responded','Terminal failure must offer usable server controls');
  }
  console.log('All '+providers.providers.length+' servers: paused player reveal, honest progress, redirect allowlist, and bounded failover verified.');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
