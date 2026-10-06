const assert = require('node:assert/strict');

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
  const result = await evaluate(`(${pdfCancellationChecks.toString()})()`);
  for (const race of result.races) assert.deepEqual(race.after, race.before, race.label);
  assert.equal(result.destroyCalls, 1, 'Clear destroys the real PDF loading task');
  assert.deepEqual(result.latestRender, { status: 'Page 2 of 2', zoom: '145%', width: 580, height: 725 });
  assert.equal(result.currentFailure.mode, 'error');
  assert.equal(result.currentFailure.pdfHidden, true);
  assert.equal(result.currentFailure.document, false);
  socket.close();
  console.log(JSON.stringify(result, null, 2));
};

async function pdfCancellationChecks() {
  if (welcomeDialog.open) welcomeStartButton.click();
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << >> /Contents 5 0 R >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 500] /Resources << >> /Contents 5 0 R >>',
    '<< /Length 22 >>\nstream\n0 0 100 100 re 0.5 g f\n\nendstream'
  ];
  let source = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, i) => { offsets.push(source.length); source += `${i + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = source.length;
  source += 'xref\n0 6\n0000000000 65535 f \n';
  for (let i = 1; i < 6; i++) source += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  source += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const makePdf = (name = 'real.pdf') => new File([source], name, { type: 'application/pdf' });
  const pixels = () => {
    const data = pdfCanvas.getContext('2d').getImageData(0, 0, pdfCanvas.width, pdfCanvas.height).data;
    let hash = 2166136261;
    for (const value of data) hash = Math.imul(hash ^ value, 16777619);
    return hash >>> 0;
  };
  const documentIds = new WeakMap();
  let nextDocumentId = 0;
  const documentId = () => {
    if (!pdfDocument) return null;
    if (!documentIds.has(pdfDocument)) documentIds.set(pdfDocument, ++nextDocumentId);
    return documentIds.get(pdfDocument);
  };
  const snapshot = () => ({ mode: readerMode, name: mediaName.textContent, details: mediaDetails.textContent,
    pdfHidden: pdfViewerShell.hidden, epubHidden: epubViewerShell.hidden, audioHidden: audioPlayerShell.hidden,
    toolbarHidden: readerToolbar.hidden, status: pageStatus.textContent, zoom: zoomStatus.textContent,
    document: !!pdfDocument, documentId: documentId(), canvas: [pdfCanvas.width, pdfCanvas.height], pixels: pixels() });
  const gate = () => {
    let release, enter;
    const wait = new Promise(resolve => { release = resolve; });
    const started = new Promise(resolve => { enter = resolve; });
    return { release, started, delay: async value => { enter(); await wait; return value; } };
  };
  const replace = async action => {
    if (action === 'clear') return clearMediaButton.click();
    if (action === 'pdf') return openLocalFile(makePdf('replacement.pdf'));
    if (action === 'epub') {
      const zip = new JSZip();
      zip.file('META-INF/container.xml', '<container><rootfiles><rootfile full-path="book.opf"/></rootfiles></container>');
      zip.file('book.opf', '<package><manifest><item id="c" href="c.xhtml"/></manifest><spine><itemref idref="c"/></spine></package>');
      zip.file('c.xhtml', '<html><body><h1>Replacement chapter</h1></body></html>');
      return openLocalFile(new File([await zip.generateAsync({ type: 'blob' })], 'replacement.epub'));
    }
    const wav = new Uint8Array(16044), view = new DataView(wav.buffer);
    const write = (offset, text) => [...text].forEach((c, i) => { wav[offset + i] = c.charCodeAt(0); });
    write(0, 'RIFF'); view.setUint32(4, 16036, true); write(8, 'WAVEfmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, 8000, true); view.setUint32(28, 16000, true);
    view.setUint16(32, 2, true); view.setUint16(34, 16, true); write(36, 'data'); view.setUint32(40, 16000, true);
    return openLocalFile(new File([wav], 'replacement.wav', { type: 'audio/wav' }));
  };
  const races = [];
  // Real byte decoding and page rendering continue after the file-read gate opens.
  for (const action of ['clear', 'epub', 'audio', 'pdf']) {
    for (const invalid of [false, true]) {
      await openLocalFile(makePdf());
      const file = invalid ? new File(['invalid'], 'bad.pdf', { type: 'application/pdf' }) : makePdf('delayed.pdf');
      const original = file.arrayBuffer.bind(file), hold = gate();
      file.arrayBuffer = async () => hold.delay(await original());
      const pending = openLocalFile(file);
      await hold.started;
      await replace(action);
      const before = snapshot();
      hold.release(); await pending;
      races.push({ label: `file bytes ${action} ${invalid ? 'failure' : 'success'}`, before, after: snapshot() });
    }
  }
  // Delay the actual decoder's resolved document, with its real loading task.
  await openLocalFile(makePdf());
  const taskPrototype = Object.getPrototypeOf(pdfDocument.loadingTask);
  const descriptor = Object.getOwnPropertyDescriptor(taskPrototype, 'promise');
  for (const action of ['clear', 'epub', 'audio', 'pdf']) {
    const hold = gate(); let first = true;
    Object.defineProperty(taskPrototype, 'promise', { ...descriptor, get() {
      const promise = descriptor.get.call(this);
      if (!first) return promise;
      first = false;
      return promise.then(document => hold.delay(document));
    } });
    const pending = openLocalFile(makePdf('decoder-delayed.pdf'));
    try {
      await hold.started;
      await replace(action);
      const before = snapshot();
      hold.release(); await pending;
      races.push({ label: `decoder ${action}`, before, after: snapshot() });
    } finally { hold.release(); Object.defineProperty(taskPrototype, 'promise', descriptor); }
  }
  for (const phase of ['page', 'render', 'paint']) {
    for (const action of ['clear', 'epub', 'audio', 'pdf']) {
      await openLocalFile(makePdf());
      const document = pdfDocument, original = document.getPage.bind(document), hold = gate();
      document.getPage = async number => {
        const page = await original(number);
        if (phase === 'page') return hold.delay(page);
        const render = page.render.bind(page);
        page.render = options => {
          page.render = render;
          const task = render(options), promise = task.promise;
          if (phase === 'paint') task.onContinue = async continuation => { await hold.delay(); continuation(); };
          else Object.defineProperty(task, 'promise', { value: promise.then(() => hold.delay()) });
          return task;
        };
        return page;
      };
      const pending = renderPdfPage();
      await hold.started;
      await replace(action);
      const before = snapshot();
      hold.release(); await pending;
      races.push({ label: `${phase} ${action}`, before, after: snapshot() });
    }
  }
  await openLocalFile(makePdf());
  const document = pdfDocument, original = document.getPage.bind(document), hold = gate();
  let first = true;
  document.getPage = async number => { const page = await original(number); if (!first) return page; first = false; return hold.delay(page); };
  const older = renderPdfPage(); await hold.started;
  pdfPageNumber = 2; pdfZoom = 1.45; await renderPdfPage();
  const before = snapshot(); hold.release(); await older;
  races.push({ label: 'reverse page completion', before, after: snapshot() });
  const latestRender = { status: pageStatus.textContent, zoom: zoomStatus.textContent, width: pdfCanvas.width, height: pdfCanvas.height };
  const task = pdfDocument.loadingTask, destroy = task.destroy.bind(task); let destroyCalls = 0;
  task.destroy = (...args) => { destroyCalls++; return destroy(...args); };
  clearMediaButton.click();
  await openLocalFile(new File(['invalid'], 'invalid.pdf', { type: 'application/pdf' }));
  const currentFailure = snapshot();
  resetLocalLibrary();
  return { races, destroyCalls, latestRender, currentFailure };
}

run().catch(error => { console.error(error); process.exit(1); });
