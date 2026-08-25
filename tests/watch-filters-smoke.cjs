const port = process.argv[2] || '9333';

const run = async () => {
  const targets = await fetch(`http://127.0.0.1:${port}/json`).then((response) => response.json());
  const target = targets.find((item) => item.type === 'page'
    && item.title === 'Harbor'
    && /\/app\/index\.html(?:$|[?#])/i.test(item.url));
  if (!target) throw new Error('Harbor desktop debug target was not found.');

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
  await evaluate(`new Promise((resolve, reject) => {
    const deadline = Date.now() + 10000;
    const ready = () => typeof setActiveSection === 'function'
      && document.querySelectorAll('#resource-list .media-card').length > 0;
    if (ready()) return resolve();
    const timer = setInterval(() => {
      if (ready()) {
        clearInterval(timer);
        resolve();
      } else if (Date.now() >= deadline) {
        clearInterval(timer);
        reject(new Error('Harbor Watch controls did not become ready.'));
      }
    }, 25);
  })`);
  const result = await evaluate(`(() => {
    setActiveSection('Watch');
    const category = (name) => [...document.querySelectorAll('.category-button')]
      .find((button) => button.querySelector('.category-name')?.textContent === name);
    const filterLabels = () => [...document.querySelectorAll('#watch-filter-list button')].map((button) => button.textContent.trim());

    category('Movies').click();
    const movies = {
      labels: filterLabels(),
      active: document.querySelector('#watch-filter-list .active')?.textContent.trim(),
      hidden: document.querySelector('#watch-filter-list').hidden
    };
    [...document.querySelectorAll('#watch-filter-list button')].find((button) => button.textContent.trim() === 'Horror').click();
    const horror = {
      active: document.querySelector('#watch-filter-list .active')?.textContent.trim(),
      cards: [...document.querySelectorAll('.category-grid .media-card-title')].map((node) => node.textContent.trim())
    };

    category('Sports').click();
    const sports = filterLabels();
    category('Live TV').click();
    const liveTv = filterLabels();
    resetFilters();
    return { movies, horror, sports, liveTv, hlsLoaded: typeof Hls === 'function' };
  })()`);

  if (result.movies.labels.length < 8 || result.movies.active !== 'Popular' || result.movies.hidden
      || result.horror.active !== 'Horror' || result.sports.length < 8 || result.liveTv.length < 8 || !result.hlsLoaded) {
    throw new Error('Desktop Watch filter regression failed: ' + JSON.stringify(result));
  }
  socket.close();
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
