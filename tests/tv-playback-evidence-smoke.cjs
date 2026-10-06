const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const net = require('node:net');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const reservePort = () => new Promise(resolve => { const server = net.createServer(); server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)); }); });

(async () => {
  const port = await reservePort();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'harbor-audio-controls-'));
  const child = spawn(require('electron'), [path.join(root, 'tests/tv-harness.cjs'), String(port), '--in-process-gpu', '--disable-gpu-sandbox'], { cwd: root, env: { ...process.env, HARBOR_QA_PROFILE: profile }, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  child.stderr.on('data', data => process.stderr.write(data));
  let socket;
  try {
    let target;
    for (let i = 0; i < 120; i++) { try { target = (await fetch(`http://127.0.0.1:${port}/json`).then(r => r.json())).find(t => /\/tv\/index.html/.test(t.url)); } catch {} if (target) break; await delay(100); }
    assert.ok(target, 'TV renderer loaded');
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
    let id = 0;
    const pending = new Map();
    socket.addEventListener('message', event => { const message = JSON.parse(event.data); if (pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); } });
    const command = async (method, params = {}) => { const key = ++id; const result = new Promise(resolve => pending.set(key, resolve)); socket.send(JSON.stringify({ id: key, method, params })); const message = await result; if (message.error) throw Error(JSON.stringify(message.error)); return message.result; };
    const evaluate = async expression => { const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true }); if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails)); return result.result.value; };
    await command('Page.enable');
    await command('Network.enable');
    await command('Network.setBlockedURLs', { urls:['https://*','http://*'] });
    await command('Page.addScriptToEvaluateOnNewDocument', { source: `
      window.fetch = () => Promise.reject(Error('Offline evidence fixture'));
      window.evidenceTimers=[];
      const nativeTimeout=window.setTimeout;
      window.setTimeout=function(fn,ms,...args) { window.evidenceTimers.push(ms); return nativeTimeout(fn,ms,...args); };
      const frameSrc=Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype,'src');
      Object.defineProperty(HTMLIFrameElement.prototype,'src',{...frameSrc,
        get() { return this.__fixtureSrc || frameSrc.get.call(this); },
        set(url) { this.__fixtureSrc=url; frameSrc.set.call(this,'about:blank'); }
      });
    ` });
    if (process.argv[2]) await command('Page.navigate',{url:pathToFileURL(path.resolve(process.argv[2])).href});
    else await command('Page.reload');
    await evaluate(`(async()=>{ for(let n=0;n<160;n++) { if(window.HarborPlaybackProviders && document.querySelector('.media-card')) return; await new Promise(r=>setTimeout(r,50)); } throw Error('Evidence UI did not load'); })()`);
    await evaluate(`document.querySelector('.media-card').click();document.querySelector('#detail-play').click()`);
    await delay(1200);
    assert.equal(await evaluate(`document.querySelector('#player-status').hidden`),true,'Loaded provider reveals usable controls');
    const results=await evaluate(`(()=>{
      const frame=document.querySelector('#tv-frame');
      const id=Number(new URL(frame.src).pathname.split('/')[2]);
      const payload={type:'PLAYER_EVENT',data:{event:'play',mtmdbId:id,mediaType:'movie',currentTime:0,duration:120}};
      const send=(data,extra={})=>{ evidenceTimers=[]; window.dispatchEvent(new MessageEvent('message',{origin:'https://vidlink.pro',source:frame.contentWindow,data,...extra})); return evidenceTimers.filter(n=>n===900).length; };
      const result={ wrongTitle:send({...payload,data:{...payload.data,mtmdbId:id+1}}),
        missingTitle:send({...payload,data:{...payload.data,mtmdbId:null}}),
        wrongOrigin:send(payload,{origin:'https://vidlink.pro.evil.test'}),
        wrongSource:send(payload,{source:window}),
        paused:send({...payload,data:{...payload.data,event:'pause'}}),
        metadata:send({type:'MEDIA_DATA',data:{[id]:{progress:{watched:10,duration:120}}}}),
        valid:send(payload) };
      return result;
    })()`);
    assert.deepEqual(results,{wrongTitle:0,missingTitle:0,wrongOrigin:0,wrongSource:0,paused:0,metadata:0,valid:1});
    await delay(1000);
    assert.equal(await evaluate(`document.activeElement.id`),'tv-frame','Confirmed playback focuses usable player');
    await evaluate(`document.querySelector('#player-back').click()`);
    assert.equal(await evaluate(`document.querySelector('#player-panel').hidden`),true);
    assert.equal(await evaluate(`(()=>{evidenceTimers=[];window.dispatchEvent(new MessageEvent('message',{origin:'https://vidlink.pro',source:document.querySelector('#tv-frame').contentWindow,data:{type:'PLAYER_EVENT',data:{event:'play',mtmdbId:1,mediaType:'movie',currentTime:0,duration:120}}}));return evidenceTimers.filter(n=>n===900).length;})()`),0,'Closed player ignores late messages');
    console.log('Offline real TV DOM: frame reveal, forged/mismatched/metadata/paused rejection, positive title-bound readiness, focus and Back cleanup passed.');
  } finally { socket?.close(); child.kill(); await Promise.race([new Promise(resolve => child.once('exit', resolve)), delay(3000)]); fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); }
})().catch(error => { console.error(error); process.exitCode = 1; });
