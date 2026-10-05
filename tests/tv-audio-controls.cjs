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
    await command('Page.addScriptToEvaluateOnNewDocument', { source: `
      window.fetch = () => Promise.reject(Error('Offline transport fixture'));
      ${process.env.HARBOR_AUDIO_CONFIGURED === '1' ? "Object.defineProperty(window, 'HARBOR_CONFIG', { get: () => ({ tmdbApiKey: 'fixture-key' }), set: () => {} });" : ''}
      const samples = 8000 * 60, buffer = new ArrayBuffer(44 + samples * 2), view = new DataView(buffer);
      const put = (offset, text) => [...text].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
      put(0, 'RIFF'); view.setUint32(4, 36 + samples * 2, true); put(8, 'WAVE'); put(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, 8000, true); view.setUint32(28, 16000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); put(36, 'data'); view.setUint32(40, samples * 2, true);
      window.audioFixture = URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
      const source = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
      Object.defineProperty(HTMLMediaElement.prototype, 'src', { ...source, set(value) { source.set.call(this, this.tagName === 'AUDIO' ? window.audioFixture : value); } });
    ` });
    if (process.env.HARBOR_AUDIO_STAGED === '1') await command('Page.navigate', { url: pathToFileURL(path.join(root, 'tv/build/lg/index.html')).href });
    else await command('Page.reload');
    await delay(500);
    await evaluate(`document.querySelector('.tv-nav [data-section="Listen"]').click()`); await delay(150);
    await evaluate(`document.querySelector('.media-card').click(); document.querySelector('#detail-play').click()`); await delay(1400);
    const ready = await evaluate(`({ focus: document.activeElement.id, controls: !!document.querySelector('#audio-controls') && !document.querySelector('#audio-controls').hidden, playing: !document.querySelector('#tv-audio').paused, duration: document.querySelector('#tv-audio').duration })`);
    assert.equal(ready.controls, true, 'Audio has visible transport controls');
    assert.equal(ready.focus, 'audio-toggle', 'Readiness deliberately focuses audio playback');
    assert.equal(ready.playing, true); assert.equal(ready.duration, 60);
    assert.deepEqual(await evaluate(`(() => { const key = code => document.dispatchEvent(new KeyboardEvent('keydown', { keyCode: code, bubbles: true })); document.querySelector('#audio-toggle').focus(); key(37); const left = document.activeElement.id; key(39); const right = document.activeElement.id; return { left, right }; })()`), { left: 'audio-rewind', right: 'audio-toggle' }, 'D-pad moves among transport buttons');
    const remote = await evaluate(`(async () => {
      const a = document.querySelector('#tv-audio'); const key = (code, name, repeat = false) => document.dispatchEvent(new KeyboardEvent('keydown', { keyCode: code, key: name, repeat, bubbles: true }));
      key(179, 'MediaPlayPause'); const paused = a.paused; key(179, 'MediaPlayPause', true); const repeatIgnored = a.paused; document.dispatchEvent(new KeyboardEvent('keyup', { keyCode: 179, key: 'MediaPlayPause', bubbles: true })); const keyupIgnored = a.paused;
      document.querySelector('#audio-toggle').focus(); key(13, 'Enter'); await new Promise(r => setTimeout(r, 50)); const resumed = !a.paused;
      key(19, 'MediaPause'); a.currentTime = 20; await new Promise(r => setTimeout(r, 100));
      document.querySelector('#audio-forward').click(); const forward = a.currentTime; document.querySelector('#audio-rewind').click(); const rewind = a.currentTime;
      a.currentTime = 58; document.querySelector('#audio-forward').click(); const bounded = a.currentTime <= a.duration;
      key(179, 'MediaPlayPause'); await new Promise(r => setTimeout(r, 30)); const restarted = !a.paused;
      let trapped = true; for (let i = 0; i < 9; i++) { key(0, 'Tab'); trapped = trapped && document.querySelector('#player-panel').contains(document.activeElement); }
      return { paused, repeatIgnored, keyupIgnored, resumed, forward, rewind, bounded, restarted, trapped, label: document.querySelector('#audio-toggle').textContent };
    })()`);
    assert.equal(remote.paused, true); assert.equal(remote.repeatIgnored, true); assert.equal(remote.keyupIgnored, true); assert.equal(remote.resumed, true); assert.equal(remote.forward, 30); assert.equal(remote.rewind, 20); assert.equal(remote.bounded, true); assert.equal(remote.restarted, true); assert.equal(remote.trapped, true); assert.equal(remote.label, 'Pause');
    assert.equal(await evaluate(`(() => { const a = document.querySelector('#tv-audio'); Object.defineProperty(a, 'duration', { configurable: true, value: Infinity }); a.dispatchEvent(new Event('durationchange')); const disabled = document.querySelector('#audio-forward').disabled && document.querySelector('#audio-rewind').disabled; delete a.duration; a.dispatchEvent(new Event('durationchange')); return disabled; })()`), true, 'Unknown duration disables seek');
    for (const width of [1920, 1280, 720]) {
      await command('Emulation.setDeviceMetricsOverride', { width, height: width === 1920 ? 1080 : 720, deviceScaleFactor: 1, mobile: false });
      await delay(120);
      const layout = await evaluate(`({ overflow: document.documentElement.scrollWidth > innerWidth, buttons: [...document.querySelectorAll('#audio-controls button')].every(b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight; }) })`);
      assert.equal(layout.overflow, false); assert.equal(layout.buttons, true);
      if (process.env.HARBOR_AUDIO_SCREENSHOTS === '1') { const folder = path.join(root, 'release', 'qa', 'tv-audio-controls'); fs.mkdirSync(folder, { recursive: true }); const screenshot = await command('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(folder, `${width}.png`), Buffer.from(screenshot.data, 'base64')); }
    }
    const interrupted = await evaluate(`(async () => {
      const a = document.querySelector('#tv-audio'), nativePlay = a.play, attempts = [];
      const key = code => document.dispatchEvent(new KeyboardEvent('keydown', { keyCode: code, bubbles: true }));
      const tick = () => new Promise(r => setTimeout(r, 60));
      const abort = index => attempts[index].reject(new DOMException('Fixture interrupted play', 'AbortError'));
      const usable = () => !document.querySelector('#audio-controls').hidden && document.querySelector('#player-status').hidden;
      key(19);
      a.play = function () { nativePlay.call(this).catch(() => {}); return new Promise((resolve, reject) => attempts.push({ resolve, reject })); };
      key(179); key(179); abort(0); await tick();
      const deliberatePause = a.paused && usable();
      key(179); key(179); key(179); abort(1); await tick();
      const rapidResume = !a.paused && usable();
      document.querySelector('#player-retry').click(); await new Promise(r => setTimeout(r, 1300));
      abort(2); await tick();
      const replacement = !a.paused && usable() && document.activeElement.id === 'audio-toggle';
      attempts[3].resolve(); a.play = nativePlay;
      key(19); a.play = () => Promise.reject(new DOMException('Fixture unsupported source', 'NotSupportedError'));
      key(179); await tick();
      const genuineFailure = a.paused && document.querySelector('#audio-controls').hidden && document.activeElement.id === 'player-retry';
      a.play = nativePlay;
      return { deliberatePause, rapidResume, replacement, genuineFailure };
    })()`);
    assert.deepEqual(interrupted, { deliberatePause: true, rapidResume: true, replacement: true, genuineFailure: true }, 'Pending play cancellation does not overwrite newer intent, while genuine rejection exposes retry');
    await evaluate(`document.querySelector('#player-retry').click()`); await delay(1400);
    await evaluate(`document.querySelector('#tv-audio').dispatchEvent(new Event('error'))`);
    const failure = await evaluate(`({ retry: document.activeElement.id, hidden: document.querySelector('#audio-controls').hidden, paused: document.querySelector('#tv-audio').paused })`);
    assert.deepEqual(failure, { retry: 'player-retry', hidden: true, paused: true });
    await evaluate(`document.querySelector('#player-retry').click()`); await delay(1400);
    assert.equal(await evaluate(`document.activeElement.id`), 'audio-toggle');
    await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 461, bubbles: true }))`);
    const closed = await evaluate(`({ hidden: document.querySelector('#player-panel').hidden, audioHidden: document.querySelector('#audio-controls').hidden, paused: document.querySelector('#tv-audio').paused, src: document.querySelector('#tv-audio').hasAttribute('src'), focus: document.activeElement.id })`);
    assert.deepEqual(closed, { hidden: true, audioHidden: true, paused: true, src: false, focus: 'detail-play' });
    await evaluate(`document.querySelector('#tv-audio').dispatchEvent(new Event('error')); document.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 179, key: 'MediaPlayPause', bubbles: true })); document.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 461, bubbles: true })); document.querySelector('.tv-nav [data-section="Watch"]').click()`); await delay(150);
    await evaluate(`document.querySelector('.media-card').click(); document.querySelector('#detail-play').click()`);
    assert.equal(await evaluate(`document.querySelector('#audio-controls').hidden`), true, 'Movie route does not expose audio controls');
    console.log('TV audio controls: local WAV readiness, 179/repeat/Enter, seek, end restart, Tab, three viewport layouts, pending play cancellation, genuine failure/retry, Back cleanup, and movie separation passed.');
  } finally { socket?.close(); child.kill(); await Promise.race([new Promise(resolve => child.once('exit', resolve)), delay(3000)]); fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); }
})().catch(error => { console.error(error); process.exitCode = 1; });
