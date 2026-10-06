const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const providers = require('../shared/playback-providers.js');
const root = process.env.HARBOR_EVIDENCE_ROOT || path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'tv/tv.js'), 'utf8');
const handlers = {};
const timers = new Map();
let serial = 0, ready = 0, focused = 0;
const route = {provider:'vidlink',url:'https://vidlink.pro/tv/42/1/2'};
const frameWindow = {};
const context = vm.createContext({
  window:{addEventListener:(name,fn)=>handlers[name]=fn},
  playbackProvidersApi:providers,
  state:{active:{type:'anime',tmdbId:'42'},season:1,episode:2,playerMode:'embed',playerRoutes:[route],playerRouteIndex:0},
  tvFrame:{contentWindow:frameWindow,src:route.url,hidden:false},playerPanel:{hidden:false},
  playerStatus:{hidden:false},playerReady:false,playerRouteTimer:101,playerReadyTimer:102,playerControlTimer:103,
  clearTimeout:id=>timers.delete(id),setTimeout:fn=>{timers.set(++serial,fn);return serial;},
  focusPlayerFrame:()=>focused++,markPlayerReady:()=>ready++,
});
const listenerStart = source.indexOf("  window.addEventListener('message',");
vm.runInContext(source.slice(listenerStart,source.indexOf("  tvVideo.addEventListener('canplay'",listenerStart)),context);
const payload = {type:'PLAYER_EVENT',data:{event:'play',mtmdbId:42,mediaType:'tv',season:1,episode:2,currentTime:0,duration:120}};
const send = (data=payload, extra={})=>handlers.message({origin:'https://vidlink.pro',source:frameWindow,data,...extra});
// This fails against PR18: the old handler accepts a different episode.
send({...payload,data:{...payload.data,episode:3}});
assert.equal(ready,0,'Another episode must not confirm the active player');
for (const data of [null,{}, {type:'PLAYER_EVENT'}, {...payload,data:{...payload.data,mtmdbId:43}},
  {...payload,data:{...payload.data,mtmdbId:null}}, {...payload,data:{...payload.data,mediaType:'movie'}},
  {...payload,data:{...payload.data,season:2}}, {...payload,data:{...payload.data,event:'pause'}},
  {...payload,data:{...payload.data,duration:NaN}}, {...payload,data:{...payload.data,currentTime:-1}},
  {...payload,data:{...payload.data,mtmdbId:undefined,tmdbId:42}}]) send(data);
send(payload,{origin:'https://vidlink.pro.evil.test'}); send(payload,{source:{}});
assert.equal(ready,0,'Malformed, mismatched, paused and forged events stay unknown');
context.playerPanel.hidden=true;send(); context.playerPanel.hidden=false;
context.tvFrame.hidden=true;send();context.tvFrame.hidden=false;
context.state.playerMode='audio';send();context.state.playerMode='embed';
context.state.playerRouteIndex=1;send();context.state.playerRouteIndex=0;
context.tvFrame.src='https://vidsrc.to/embed/tv/42/1/2';send();context.tvFrame.src=route.url;
route.provider='vidsrc';send();route.provider='vidlink';
context.state.active.tmdbId='43';send({...payload,data:{...payload.data,mtmdbId:43}});context.state.active.tmdbId='42';
assert.equal(ready,0,'Inactive, superseded, hidden and other-provider frames stay unknown');
send(); assert.equal(ready,1,'Exact documented movie/episode identity confirms playback');
send({...payload,data:{...payload.data,event:'timeupdate',currentTime:4}});assert.equal(ready,2);
// Load must reveal controls without claiming playback or interrupting a Play click.
vm.runInContext(source.slice(source.indexOf('  function revealPlayerControls('),source.indexOf('  function activeAudio(')),context);
vm.runInContext('revealPlayerControls(state.playerRoutes[0])',context);
assert.equal(context.playerRouteTimer,null,'Loaded provider must not time out while the user clicks Play');
const reveal = timers.get(context.playerControlTimer);reveal();
assert.equal(context.playerStatus.hidden,true);assert.equal(focused,1);assert.equal(ready,2);
context.playerStatus.hidden=false;
vm.runInContext('revealPlayerControls(state.playerRoutes[0])',context);
context.state.playerRoutes[0]={provider:'vidsrc',url:'https://vidsrc.to/embed/tv/42/1/2'};
timers.get(context.playerControlTimer)();assert.equal(context.playerStatus.hidden,false,'Superseded load callback cannot hide new status');
// Execute the actual frame-load callback and drain its timers: a VidSrc page
// stays interactive while playback evidence remains unknown.
context.tvFrame.addEventListener=(name,fn)=>handlers['frame-'+name]=fn;
vm.runInContext(source.slice(source.indexOf("  tvFrame.addEventListener('load'"),source.indexOf("  tvFrame.addEventListener('focus'")),context);
context.tvFrame.src=context.state.playerRoutes[0].url;timers.clear();
handlers['frame-load']();for (const fn of [...timers.values()]) fn();
assert.equal(ready,2,'Iframe load must not confirm playback');
assert.equal(context.playerStatus.hidden,true,'Loaded VidSrc controls remain usable');
if (providers.vidLinkPlaybackEvidence) {
  const target={tmdbId:'42',type:'movie'};
  const movie={...payload,data:{...payload.data,mediaType:'movie'}};
  assert(providers.vidLinkPlaybackEvidence(movie,target));
  assert(!providers.vidLinkPlaybackEvidence(movie,{tmdbId:'43',type:'movie'}));
  assert(!providers.vidLinkPlaybackEvidence(movie,{tmdbId:42,type:'music'}));
  for (const patch of [{mtmdbId:true},{mtmdbId:'042'},{mtmdbId:Infinity},{duration:0},{currentTime:121},{event:'seeked'},{currentTime:'4'},{duration:Infinity}])
    assert(!providers.vidLinkPlaybackEvidence({...movie,data:{...movie.data,...patch}},target));
  assert(!providers.vidLinkPlaybackEvidence({...movie,data:{...movie.data,event:'timeupdate',currentTime:0}},target));
}
console.log('Title-bound VidLink evidence, source/origin/route guards, usable loaded controls and stale callback rejection passed.');
