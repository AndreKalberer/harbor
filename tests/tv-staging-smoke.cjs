const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const reservePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const port = server.address().port;
    server.close(error => error ? reject(error) : resolve(port));
  });
});

(async () => {
  const stagedPage = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'tv/build/lg/index.html');
  assert.ok(fs.existsSync(stagedPage), 'Run tv:stage before staged-page smoke verification');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'harbor-staging-smoke-'));
  const port = await reservePort();
  const args = [path.join(root, 'tests/tv-harness.cjs'), String(port), '--in-process-gpu', '--disable-gpu-sandbox'];
  if (process.platform === 'linux' && process.env.CI) args.unshift('--no-sandbox');
  const child = spawn(require('electron'), args, { cwd: root, env: { ...process.env, HARBOR_QA_PROFILE: profile }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '', socket;
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  child.on('error', error => { output += error.message; });
  const watchdog = setTimeout(() => child.kill(), 45000);
  try {
    let target;
    for (let i = 0; i < 200; i++) {
      try { target = (await fetch(`http://127.0.0.1:${port}/json`).then(r => r.json())).find(t => /\/tv\/index.html/.test(t.url)); } catch {}
      if (target || child.exitCode !== null) break;
      await delay(100);
    }
    assert.ok(target, `TV renderer loaded: ${output}`);
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    const pending = new Map(), exceptions = [];
    let id = 0;
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.text);
      if (pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
    });
    const command = async (method, params = {}) => {
      const key = ++id;
      const result = new Promise(resolve => pending.set(key, resolve));
      socket.send(JSON.stringify({ id: key, method, params }));
      let timeout;
      const message = await Promise.race([result, new Promise((_, reject) => { timeout = setTimeout(() => reject(Error(`CDP timeout: ${method}`)), 10000); })]).finally(() => clearTimeout(timeout));
      if (message.error) throw Error(JSON.stringify(message.error));
      return message.result;
    };
    const evaluate = async expression => {
      const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
      if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };
    await command('Runtime.enable');
    await command('Page.enable');
    await command('Page.addScriptToEvaluateOnNewDocument', { source: `
      window.fetch = () => Promise.reject(Error('Offline staging fixture'));
      const samples = 8000 * 60, buffer = new ArrayBuffer(44 + samples * 2), view = new DataView(buffer);
      const put = (offset, text) => [...text].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
      put(0, 'RIFF'); view.setUint32(4, 36 + samples * 2, true); put(8, 'WAVE'); put(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, 8000, true); view.setUint32(28, 16000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); put(36, 'data'); view.setUint32(40, samples * 2, true);
      window.audioFixture = URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
      const source = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
      Object.defineProperty(HTMLMediaElement.prototype, 'src', { ...source, set(value) { source.set.call(this, this.tagName === 'AUDIO' ? window.audioFixture : value); } });
    ` });
    exceptions.length = 0;
    await command('Page.navigate', { url: pathToFileURL(stagedPage).href });
    await delay(700);
    const page = await evaluate(`({ hls: typeof Hls, scripts: document.scripts.length, external: [...document.scripts].filter(s => s.src).length, bogusText: [...document.body.childNodes].filter(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim()).length })`);
    assert.deepEqual(page, { hls: 'function', scripts: 6, external: 0, bogusText: 0 }, 'Actual staged HLS executes without injected tags or leaked JS text');
    for (const width of [1920, 1280, 720]) {
      await command('Emulation.setDeviceMetricsOverride', { width, height: width === 1920 ? 1080 : 720, deviceScaleFactor: 1, mobile: false });
      await delay(80);
      assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, `Generated page has no overflow at ${width}px`);
    }
    await evaluate(`document.querySelector('.tv-nav [data-section="Listen"]').click()`);
    await delay(200);
    await evaluate(`document.querySelector('.media-card').click(); document.querySelector('#detail-play').click()`);
    await delay(1600);
    assert.deepEqual(await evaluate(`({ playing: !document.querySelector('#tv-audio').paused, duration: document.querySelector('#tv-audio').duration, statusHidden: document.querySelector('#player-status').hidden })`), { playing: true, duration: 60, statusHidden: true }, 'Staged page retains local WAV playback readiness');
    assert.deepEqual(exceptions, [], 'Generated scripts raise no uncaught runtime exceptions');
    console.log('Actual LG staged page passed: Hls defined, six inline scripts, no bogus nodes, three viewport sizes, local WAV playback.');
  } finally {
    clearTimeout(watchdog);
    socket?.close();
    if (child.exitCode === null) { child.kill(); await Promise.race([new Promise(resolve => child.once('exit', resolve)), delay(3000)]); }
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
