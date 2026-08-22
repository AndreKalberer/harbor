const fs = require('node:fs');
const path = require('node:path');

const port = process.argv[2] || '9343';

const run = async () => {
  const targets = await fetch(`http://127.0.0.1:${port}/json`).then((response) => response.json());
  const target = targets.find((item) => item.type === 'page' && item.title === 'Harbor TV');
  if (!target) throw new Error('Harbor TV debug target was not found.');
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  let sequence = 0;
  const pending = new Map();
  socket.addEventListener('message', (event) => {
    const payload = JSON.parse(event.data.toString());
    if (!payload.id || !pending.has(payload.id)) return;
    const handlers = pending.get(payload.id);
    pending.delete(payload.id);
    if (payload.error) handlers.reject(new Error(payload.error.message));
    else handlers.resolve(payload.result);
  });
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  const command = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const response = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
    return response.result.value;
  };
  await command('Runtime.enable');
  await command('Page.enable');
  await evaluate(`(() => {
    document.querySelector('[data-section="Home"]').click();
    window.scrollTo(0, 0);
  })()`);
  await evaluate(`new Promise((resolve) => {
    const ready = () => document.querySelectorAll('#card-grid .media-card').length > 0;
    if (ready()) return resolve();
    const timeout = setTimeout(resolve, 12000);
    const timer = setInterval(() => { if (ready()) { clearInterval(timer); clearTimeout(timeout); resolve(); } }, 100);
  })`);
  const shell = await evaluate(`({
    title: document.title,
    viewport: [innerWidth, innerHeight],
    nav: [...document.querySelectorAll('[data-section]')].map((node) => node.textContent.trim()),
    categories: [...document.querySelectorAll('#subcategory-row button')].map((node) => node.textContent.trim()),
    cards: document.querySelectorAll('#card-grid .media-card').length,
    playerSandbox: document.querySelector('#tv-frame').getAttribute('sandbox'),
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
  })`);
  if (shell.cards < 1 || shell.horizontalOverflow || /allow-popups/.test(shell.playerSandbox)) {
    throw new Error('TV shell regression failed: ' + JSON.stringify(shell));
  }
  await evaluate(`(() => {
    window.__originalTvState = localStorage.getItem('harbor:tv-state:v1');
    document.querySelector('#card-grid .media-card').click();
    document.querySelector('#detail-save').click();
    document.querySelector('#detail-panel').hidden = true;
    document.querySelector('[data-section="Watch"]').focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  })()`);
  const interaction = await evaluate(`({
    saved: JSON.parse(localStorage.getItem('harbor:tv-state:v1')).saved.length,
    detailTitle: document.querySelector('#detail-title').textContent,
    focused: document.activeElement.textContent.trim()
  })`);
  if (interaction.saved < 1 || !interaction.detailTitle || interaction.focused === 'Watch') {
    throw new Error('TV remote or My Harbor interaction failed: ' + JSON.stringify(interaction));
  }
  const screenshot = await command('Page.captureScreenshot', { format: 'png', fromSurface: true });
  fs.writeFileSync(path.join(__dirname, 'ui-tv.png'), Buffer.from(screenshot.data, 'base64'));
  await evaluate(`(() => {
    if (window.__originalTvState === null) localStorage.removeItem('harbor:tv-state:v1');
    else localStorage.setItem('harbor:tv-state:v1', window.__originalTvState);
    delete window.__originalTvState;
  })()`);
  socket.close();
  process.stdout.write(JSON.stringify({ shell, interaction }, null, 2) + '\n');
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
