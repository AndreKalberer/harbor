const fs = require('node:fs');
const path = require('node:path');

const port = process.argv[2] || '9333';

const run = async () => {
  const targets = await fetch(`http://127.0.0.1:${port}/json`).then((response) => response.json());
  const target = targets.find((item) => item.type === 'page'
    && /\/app\/index\.html(?:$|[?#])/i.test(item.url));
  if (!target) throw new Error('Harbor debug target was not found.');

  const socket = new WebSocket(target.webSocketDebuggerUrl);
  let sequence = 0;
  const pending = new Map();

  socket.addEventListener('message', (event) => {
    const payload = JSON.parse(event.data.toString());
    if (!payload.id || !pending.has(payload.id)) return;
    const { resolve, reject } = pending.get(payload.id);
    pending.delete(payload.id);
    if (payload.error) reject(new Error(payload.error.message));
    else resolve(payload.result);
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
    const response = await command('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true
    });
    if (response.exceptionDetails) {
      throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
    }
    return response.result.value;
  };

  await command('Runtime.enable');
  await evaluate(`new Promise((resolve, reject) => {
    const deadline = Date.now() + 15000;
    const ready = () => typeof openLocalFile === 'function'
      && typeof window.harbor?.listGames === 'function';
    if (ready()) return resolve();
    const timer = setInterval(() => {
      if (ready()) {
        clearInterval(timer);
        resolve();
      } else if (Date.now() >= deadline) {
        clearInterval(timer);
        reject(new Error('Harbor local-library controls did not become ready.'));
      }
    }, 25);
  })`);
  const results = await evaluate(`(async () => {
    if (welcomeDialog.open) welcomeDialog.close();
    await loadDirectoryLinks();
    const inspect = async (images) => {
      images.forEach(image => image.loading = 'eager');
      const deadline = Date.now() + 10000;
      while (images.some(image => !image.complete || !image.naturalWidth || !image.parentElement.querySelector('.art-fallback').hidden) && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 25));
      }
      return { count:images.length, loaded:images.filter(image => image.complete && image.naturalWidth > 0).length,
        fallbackOverImage:images.filter(image => !image.parentElement.querySelector('.art-fallback').hidden).length };
    };
    const sections = {};
    for (const section of ['Listen', 'Read', 'Play']) {
      setActiveSection(section);
      sections[section] = await inspect([...document.querySelectorAll('#resource-list .media-art img')]);
    }
    const missing = window.HarborCatalogData.filter(item => !item.artworkUrl);
    const fixture = document.createElement('div');
    document.body.append(fixture);
    missing.forEach(item => fixture.append(buildCard(item)));
    fixture.append(buildCard({id:'broken-artwork',name:'Broken artwork',category:'Read',type:'book',artworkUrl:'data:image/png;base64,invalid',sections:['Book']}));
    const fallbacks = await inspect([...fixture.querySelectorAll('.media-art img')]);
    fixture.remove();
    return {sections, fallbacks};
  })()`);
  for (const [section, expected] of Object.entries({Listen:12,Read:24,Play:8})) {
    const result = results.sections[section];
    if (result.count !== expected || result.loaded !== expected || result.fallbackOverImage) {
      throw new Error(section + ' artwork failed: ' + JSON.stringify(result));
    }
  }
  if (results.fallbacks.count !== 37 || results.fallbacks.loaded !== 37 || results.fallbacks.fallbackOverImage) {
    throw new Error('Missing/broken artwork must display illustrations: ' + JSON.stringify(results.fallbacks));
  }
  console.log(JSON.stringify(results));
  socket.close();
};
run().catch(error => { console.error(error); process.exit(1); });
