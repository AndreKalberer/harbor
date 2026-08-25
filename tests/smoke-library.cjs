const fs = require('node:fs');
const path = require('node:path');

const port = process.argv[2] || '9333';

const run = async () => {
  const targets = await fetch(`http://127.0.0.1:${port}/json`).then((response) => response.json());
  const target = targets.find((item) => item.type === 'page'
    && item.title === 'Harbor'
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
  const shell = await evaluate(`({
    title: document.title,
    version: document.querySelector('#app-version').textContent,
    catalog: document.querySelectorAll('#resource-list .media-card').length,
    jszip: typeof JSZip,
    bridge: [typeof harbor.chooseGame, typeof harbor.launchGame, typeof harbor.listGames, typeof harbor.launchSavedGame, typeof harbor.removeGame, typeof harbor.exportUserData, typeof harbor.importUserData]
  })`);
  if (shell.bridge.some((entry) => entry !== 'function')) {
    throw new Error('The isolated Harbor bridge is incomplete: ' + JSON.stringify(shell.bridge));
  }

  const onboarding = await evaluate(`(() => {
    const before = {
      open: welcomeDialog.open,
      title: document.querySelector('#welcome-title')?.textContent,
      steps: document.querySelectorAll('.welcome-grid article').length
    };
    if (welcomeDialog.open) welcomeStartButton.click();
    const stored = JSON.parse(localStorage.getItem(USER_STATE_KEY) || '{}');
    return { ...before, completed: stored.settings?.onboardingComplete === true, closed: !welcomeDialog.open };
  })()`);
  if (!onboarding.open || onboarding.steps !== 3 || !onboarding.completed || !onboarding.closed) {
    throw new Error('First-run onboarding did not complete correctly: ' + JSON.stringify(onboarding));
  }

  const epub = await evaluate(`(async () => {
    if (!playerDialog.open) playerDialog.showModal();
    const zip = new JSZip();
    zip.file('META-INF/container.xml', '<?xml version="1.0"?><container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>');
    zip.file('OEBPS/content.opf', '<?xml version="1.0"?><package><manifest><item id="c1" href="chapter.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="c1"/></spine></package>');
    zip.file('OEBPS/chapter.xhtml', '<html><body><h1>Local Book</h1><p onclick="alert(1)">Safe chapter text.</p><script>document.body.textContent="unsafe"</script><img src="https://example.com/tracker.png"></body></html>');
    const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
    await openLocalFile(new File([blob], 'sample.epub', { type: 'application/epub+zip' }));
    return {
      mode: readerMode,
      heading: epubDocument.querySelector('h1')?.textContent,
      text: epubDocument.textContent.trim(),
      scripts: epubDocument.querySelectorAll('script').length,
      eventAttributes: epubDocument.querySelectorAll('[onclick]').length,
      remoteImages: epubDocument.querySelectorAll('img[src^="http"]').length,
      status: pageStatus.textContent
    };
  })()`);

  const comic = await evaluate(`(async () => {
    const zip = new JSZip();
    const pixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    zip.file('page10.png', pixel, { base64: true });
    zip.file('page2.png', pixel, { base64: true });
    const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.comicbook+zip' });
    await openLocalFile(new File([blob], 'sample.cbz'));
    return { mode: readerMode, pages: comicEntries, status: pageStatus.textContent, source: comicPage.src.startsWith('blob:') };
  })()`);

  const pdf = await evaluate(`(async () => {
    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
      '<< /Length 53 >>\\nstream\\nBT /F1 24 Tf 72 720 Td (Harbor PDF) Tj ET\\nendstream'
    ];
    let source = '%PDF-1.4\\n';
    const offsets = [0];
    objects.forEach((object, index) => { offsets.push(source.length); source += (index + 1) + ' 0 obj\\n' + object + '\\nendobj\\n'; });
    const xref = source.length;
    source += 'xref\\n0 6\\n0000000000 65535 f \\n';
    for (let index = 1; index <= 5; index += 1) source += String(offsets[index]).padStart(10, '0') + ' 00000 n \\n';
    source += 'trailer\\n<< /Size 6 /Root 1 0 R >>\\nstartxref\\n' + xref + '\\n%%EOF';
    await openLocalFile(new File([source], 'sample.pdf', { type: 'application/pdf' }));
    return { mode: readerMode, status: pageStatus.textContent, canvas: [pdfCanvas.width, pdfCanvas.height], details: mediaDetails.textContent };
  })()`);

  const gameBoundary = await evaluate(`harbor.launchGame('not-a-selection-token')`);
  const savedGameBoundary = await evaluate(`(async () => ({
    libraryIsArray: Array.isArray(await harbor.listGames()),
    invalidLaunch: await harbor.launchSavedGame('not-a-library-id')
  }))()`);
  const artifactDirectory = process.env.HARBOR_QA_ARTIFACT_DIR;
  if (artifactDirectory) {
    fs.mkdirSync(artifactDirectory, { recursive: true });
    const screenshot = await command('Page.captureScreenshot', { format: 'png', fromSurface: true });
    fs.writeFileSync(path.join(artifactDirectory, 'library-smoke.png'), Buffer.from(screenshot.data, 'base64'));
  }
  socket.close();
  process.stdout.write(`${JSON.stringify({ shell, onboarding, epub, comic, pdf, gameBoundary, savedGameBoundary }, null, 2)}\n`);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
