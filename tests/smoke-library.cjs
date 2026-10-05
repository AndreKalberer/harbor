const assert = require('node:assert/strict');
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
  const shell = await evaluate(`({
    title: document.title,
    version: document.querySelector('#app-version').textContent,
    catalog: document.querySelectorAll('#resource-list .media-card').length,
    jszip: typeof JSZip,
    bridge: [typeof harbor.chooseGame, typeof harbor.launchGame, typeof harbor.listGames, typeof harbor.launchSavedGame, typeof harbor.removeGame, typeof harbor.exportUserData, typeof harbor.importUserData, typeof harbor.getUpdateState, typeof harbor.downloadUpdate, typeof harbor.installUpdate, typeof harbor.onUpdateState]
  })`);
  if (shell.bridge.some((entry) => entry !== 'function')) {
    throw new Error('The isolated Harbor bridge is incomplete: ' + JSON.stringify(shell.bridge));
  }

  const updaterUi = await evaluate(`(() => {
    renderDesktopUpdateState({ status: 'available', currentVersion: '2.2.0', latestVersion: '2.3.0', percent: 0 });
    const available = { label: updateActionButton.textContent, disabled: updateActionButton.disabled, highlighted: updateButton.classList.contains('update-available') };
    renderDesktopUpdateState({ status: 'downloading', latestVersion: '2.3.0', percent: 42.4 });
    const downloading = { label: updateActionButton.textContent, progress: updateProgress.value, visible: !updateProgressWrap.hidden };
    renderDesktopUpdateState({ status: 'downloaded', latestVersion: '2.3.0', percent: 100 });
    const downloaded = { label: updateActionButton.textContent, disabled: updateActionButton.disabled };
    return { available, downloading, downloaded };
  })()`);
  if (updaterUi.available.label !== 'Download update' || updaterUi.available.disabled || !updaterUi.available.highlighted
      || updaterUi.downloading.label !== 'Downloading 42%' || updaterUi.downloading.progress !== 42 || !updaterUi.downloading.visible
      || updaterUi.downloaded.label !== 'Restart and install' || updaterUi.downloaded.disabled) {
    throw new Error('Desktop one-click update states failed: ' + JSON.stringify(updaterUi));
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

  assert.equal(epub.status, 'Chapter 1 of 1');
  assert.equal(epub.scripts + epub.eventAttributes + epub.remoteImages, 0);
  const epubNavigation = await evaluate(`(async () => {
    const zip = new JSZip();
    zip.file('mimetype', 'application/epub+zip');
    zip.file('META-INF/container.xml', '<container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>');
    // Manifest order deliberately differs from the spine's reading order.
    zip.file('OEBPS/content.opf', '<package><manifest><item id="c3" href="third.xhtml"/><item id="c1" href="first.xhtml"/><item id="c2" href="second.xhtml"/></manifest><spine><itemref idref="c1"/><itemref idref="c2"/><itemref idref="c3"/></spine></package>');
    zip.file('OEBPS/first.xhtml', '<html><body><h1>First chapter</h1></body></html>');
    zip.file('OEBPS/second.xhtml', '<html><body><h1>Second chapter</h1><script>window.epubUnsafe = true</script><p onclick="alert(1)">Safe text</p><img src="https://example.com/tracker.png"></body></html>');
    zip.file('OEBPS/third.xhtml', '<html><body><h1>Third chapter</h1></body></html>');
    const makeBook = async (name) => new File([await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' })], name, { type: 'application/epub+zip' });
    const book = await makeBook('three-chapters.epub');
    const snapshot = () => ({ heading: epubDocument.querySelector('h1')?.textContent, status: pageStatus.textContent, previous: previousPageButton.disabled, next: nextPageButton.disabled });
    const clickAndWait = async (button, status) => {
      button.click();
      const deadline = Date.now() + 2000;
      while (pageStatus.textContent !== status) {
        if (Date.now() > deadline) throw new Error('EPUB navigation did not reach ' + status);
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    };
    await openLocalFile(book);
    const first = snapshot();
    previousPageButton.click();
    const firstBoundary = snapshot();
    await clickAndWait(nextPageButton, 'Chapter 2 of 3');
    const second = { ...snapshot(), unsafe: epubDocument.querySelectorAll('script, [onclick], img[src^="http"]').length };
    await clickAndWait(nextPageButton, 'Chapter 3 of 3');
    const last = snapshot();
    nextPageButton.click();
    const lastBoundary = snapshot();
    await clickAndWait(previousPageButton, 'Chapter 2 of 3');
    const backwards = snapshot();
    await openLocalFile(book);
    const reopened = snapshot();
    // Repeated clicks during decompression must not skip a chapter.
    nextPageButton.click();
    nextPageButton.click();
    const deadline = Date.now() + 2000;
    while (pageStatus.textContent !== 'Chapter 2 of 3') {
      if (Date.now() > deadline) throw new Error('Rapid EPUB navigation did not finish.');
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    const rapid = snapshot();
    resetLocalLibrary();
    const cleared = { mode: readerMode, text: epubDocument.textContent, toolbarHidden: readerToolbar.hidden };
    // A missing later chapter retains the last successfully rendered chapter.
    zip.remove('OEBPS/second.xhtml');
    await openLocalFile(await makeBook('missing-chapter.epub'));
    nextPageButton.click();
    await new Promise((resolve) => setTimeout(resolve, 25));
    const missing = { ...snapshot(), error: mediaDetails.textContent };
    await openLocalFile(book);
    nextPageButton.click();
    resetLocalLibrary();
    await new Promise((resolve) => setTimeout(resolve, 25));
    const stale = { mode: readerMode, text: epubDocument.textContent, toolbarHidden: readerToolbar.hidden };
    const opening = openLocalFile(book);
    resetLocalLibrary();
    await opening;
    const staleOpen = { mode: readerMode, text: epubDocument.textContent, toolbarHidden: readerToolbar.hidden };
    return { first, firstBoundary, second, last, lastBoundary, backwards, reopened, rapid, cleared, missing, stale, staleOpen };
  })()`);
  const firstChapter = { heading: 'First chapter', status: 'Chapter 1 of 3', previous: true, next: false };
  const secondChapter = { heading: 'Second chapter', status: 'Chapter 2 of 3', previous: false, next: false };
  const lastChapter = { heading: 'Third chapter', status: 'Chapter 3 of 3', previous: false, next: true };
  assert.deepEqual(epubNavigation.first, firstChapter);
  assert.deepEqual(epubNavigation.firstBoundary, firstChapter);
  assert.deepEqual(epubNavigation.second, { ...secondChapter, unsafe: 0 });
  assert.deepEqual(epubNavigation.last, lastChapter);
  assert.deepEqual(epubNavigation.lastBoundary, lastChapter);
  assert.deepEqual(epubNavigation.backwards, secondChapter);
  assert.deepEqual(epubNavigation.reopened, firstChapter);
  assert.deepEqual(epubNavigation.rapid, secondChapter);
  assert.deepEqual(epubNavigation.cleared, { mode: 'empty', text: '', toolbarHidden: true });
  assert.deepEqual(epubNavigation.missing, { ...firstChapter, error: 'EPUB chapter content is missing.' });
  assert.deepEqual(epubNavigation.stale, { mode: 'empty', text: '', toolbarHidden: true });
  assert.deepEqual(epubNavigation.staleOpen, { mode: 'empty', text: '', toolbarHidden: true });

  const epubResources = await evaluate(`(async () => {
    const zip = new JSZip();
    const pixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    zip.file('mimetype', 'application/epub+zip');
    zip.file('META-INF/container.xml', '<container><rootfiles><rootfile full-path="OEBPS/book.opf"/></rootfiles></container>');
    zip.file('OEBPS/book.opf', '<package><manifest><item id="a" href="text/first.xhtml"/><item id="b" href="text/second.xhtml"/></manifest><spine><itemref idref="a"/><itemref idref="b"/></spine></package>');
    const chapter = '<html><body><h1>Illustrated</h1><img id="picture" src="../images/picture%20one.png"/><img id="duplicate" src="../images/./picture%20one.png"/><img src="//example.com/tracker.png"/><img src="file:///tmp/picture.png"/><img src="data:image/svg+xml,test"/><img src="../../../escape.png"/><img src="../images/missing.png"/><img src="../images/bad.png"/><p style="background:url(https://example.com)">text</p><svg><image href="https://example.com"/></svg><script>window.epubUnsafe = true</script><a href="javascript:alert(1)" onclick="alert(1)">unsafe</a></body></html>';
    zip.file('OEBPS/text/first.xhtml', chapter);
    zip.file('OEBPS/text/second.xhtml', chapter);
    zip.file('OEBPS/images/picture one.png', pixel, { base64: true });
    zip.file('OEBPS/images/bad.png', 'not an image');
    const book = new File([await zip.generateAsync({ type: 'blob' })], 'illustrated.epub');
    const originalRevoke = URL.revokeObjectURL;
    const originalCreate = URL.createObjectURL;
    const mimes = new Map();
    const liveUrls = new Set(activeObjectUrls);
    URL.createObjectURL = (blob) => { const url = originalCreate.call(URL, blob); mimes.set(url, blob.type); liveUrls.add(url); return url; };
    const revoked = [];
    URL.revokeObjectURL = (url) => { revoked.push(url); liveUrls.delete(url); originalRevoke.call(URL, url); };
    const inspect = async () => {
      const image = epubDocument.querySelector('#picture');
      await image.decode();
      const url = image.src;
      const bad = epubDocument.querySelector('img[src]:last-of-type');
      let invalidImageRejected = false;
      try { await bad.decode(); } catch { invalidImageRejected = true; }
      return { width: image.naturalWidth, mime: mimes.get(url), url,
        duplicate: epubDocument.querySelector('#duplicate').src === url,
        unsafe: epubDocument.querySelectorAll('script, svg, [onclick], [style], [href], img[src]:not([src^="blob:"])').length,
        invalidImageRejected, urls: activeObjectUrls.size, live: liveUrls.size };
    };
    try {
      await openLocalFile(book);
      const first = await inspect();
      await navigateEpubChapter(1);
      const second = await inspect();
      const firstReleased = revoked.includes(first.url);
      await navigateEpubChapter(-1);
      const previous = await inspect();
      const secondReleased = revoked.includes(second.url);
      resetLocalLibrary();
      const reset = { released: revoked.includes(previous.url), urls: activeObjectUrls.size, live: liveUrls.size, text: epubDocument.textContent };
      const stale = [];
      for (const action of ['clear', 'replace']) {
        await openLocalFile(book);
        const entry = epubState.archive.file('OEBPS/images/bad.png');
        const original = entry.internalStream;
        let resume;
        entry.internalStream = function (...args) {
          const stream = original.apply(this, args);
          const originalResume = stream.resume;
          stream.resume = function () { resume = () => originalResume.call(stream); return stream; };
          return stream;
        };
        const pending = navigateEpubChapter(1);
        while (!resume) await new Promise(resolve => setTimeout(resolve, 5));
        if (action === 'clear') resetLocalLibrary();
        else await openLocalFile(new File(['audio'], 'new.mp3', { type: 'audio/mpeg' }));
        const before = { mode: readerMode, urls: activeObjectUrls.size, text: epubDocument.textContent };
        resume();
        await pending;
        if (liveUrls.size !== activeObjectUrls.size) throw new Error('Stale EPUB resource URLs leaked.');
        stale.push({ before, after: { mode: readerMode, urls: activeObjectUrls.size, text: epubDocument.textContent } });
      }
      // Inflation is bounded even when metadata falsely advertises a small size.
      const oversized = new JSZip();
      oversized.file('large.txt', 'x'.repeat(2048));
      const loaded = await JSZip.loadAsync(await oversized.generateAsync({ type: 'uint8array', compression: 'DEFLATE' }));
      loaded.file('large.txt')._data.uncompressedSize = 1;
      let bounded = false;
      try { await readEpubEntry(loaded.file('large.txt'), 100); } catch (error) { bounded = /size limit/.test(error.message); }
      await openLocalFile(book);
      epubState.archive.file('OEBPS/images/bad.png').internalStream = () => { throw new Error('Resource read failed'); };
      const preserved = epubDocument.querySelector('#picture').src;
      await navigateEpubChapter(1);
      const failure = { preserved: epubDocument.querySelector('#picture').src === preserved, urls: activeObjectUrls.size, live: liveUrls.size, error: mediaDetails.textContent };
      await openLocalFile(book);
      const originalReplaceChildren = epubDocument.replaceChildren;
      const previousImage = epubDocument.querySelector('#picture');
      const previousUrls = [...liveUrls];
      epubDocument.replaceChildren = () => { throw new Error('DOM insertion failed'); };
      try { await navigateEpubChapter(1); } finally { epubDocument.replaceChildren = originalReplaceChildren; }
      await previousImage.decode();
      const insertionFailure = { sameImage: epubDocument.querySelector('#picture') === previousImage,
        width: previousImage.naturalWidth, urlsUnchanged: JSON.stringify([...liveUrls]) === JSON.stringify(previousUrls),
        activeUnchanged: JSON.stringify([...activeObjectUrls]) === JSON.stringify(previousUrls),
        status: pageStatus.textContent, error: mediaDetails.textContent };
      // This valid chapter is below the byte cap but exceeds JS call-argument limits.
      epubState.archive.file('OEBPS/text/second.xhtml', '<html><body><h1>Many nodes</h1>' + '<br>'.repeat(300000) + '</body></html>');
      await navigateEpubChapter(1);
      const manyNodes = { nodes: epubDocument.querySelectorAll('br').length, heading: epubDocument.querySelector('h1')?.textContent,
        status: pageStatus.textContent, urls: activeObjectUrls.size, live: liveUrls.size };
      resetLocalLibrary();
      const originalLoad = JSZip.loadAsync;
      JSZip.loadAsync = async (...args) => {
        const archive = await originalLoad(...args);
        archive.file('OEBPS/images/bad.png').internalStream = () => { throw new Error('Initial resource failed'); };
        return archive;
      };
      try { await openLocalFile(book); } finally { JSZip.loadAsync = originalLoad; }
      const initialFailure = { mode: readerMode, text: epubDocument.textContent, urls: activeObjectUrls.size, live: liveUrls.size, stateCleared: epubState === null };
      return { first, second, previous, firstReleased, secondReleased, reset, stale, bounded, failure, insertionFailure, manyNodes, initialFailure };
    } finally { URL.revokeObjectURL = originalRevoke; URL.createObjectURL = originalCreate; resetLocalLibrary(); }
  })()`);
  for (const chapter of [epubResources.first, epubResources.second, epubResources.previous]) {
    assert.equal(chapter.width, 1);
    assert.equal(chapter.mime, 'image/png');
    assert.equal(chapter.duplicate, true);
    assert.equal(chapter.unsafe, 0);
    assert.equal(chapter.urls, 2);
    assert.equal(chapter.live, 2);
    assert.equal(chapter.invalidImageRejected, true);
  }
  assert.equal(epubResources.firstReleased, true);
  assert.equal(epubResources.secondReleased, true);
  assert.deepEqual(epubResources.reset, { released: true, urls: 0, live: 0, text: '' });
  for (const result of epubResources.stale) assert.deepEqual(result.after, result.before);
  assert.equal(epubResources.bounded, true);
  assert.deepEqual(epubResources.failure, { preserved: true, urls: 2, live: 2, error: 'Resource read failed' });
  assert.deepEqual(epubResources.insertionFailure, { sameImage: true, width: 1, urlsUnchanged: true, activeUnchanged: true, status: 'Chapter 1 of 2', error: 'DOM insertion failed' });
  assert.deepEqual(epubResources.manyNodes, { nodes: 300000, heading: 'Many nodes', status: 'Chapter 2 of 2', urls: 0, live: 0 });
  assert.deepEqual(epubResources.initialFailure, { mode: 'error', text: '', urls: 0, live: 0, stateCleared: true });

  const comic = await evaluate(`(async () => {
    const zip = new JSZip();
    const pixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    zip.file('page10.png', pixel, { base64: true });
    zip.file('page2.png', pixel, { base64: true });
    const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.comicbook+zip' });
    await openLocalFile(new File([blob], 'sample.cbz'));
    return { mode: readerMode, pages: comicEntries, status: pageStatus.textContent, source: comicPage.src.startsWith('blob:') };
  })()`);

  const comicCancellation = await evaluate(`(async () => {
    const zip = new JSZip();
    const pixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    for (const name of ['1.png', '2.png', '3.png']) zip.file(name, pixel, { base64: true });
    const buffer = await zip.generateAsync({ type: 'arraybuffer' });
    const makeComic = () => new File([buffer], 'comic.cbz');
    const snapshot = () => ({ mode: readerMode, name: mediaName.textContent,
      comicHidden: comicViewerShell.hidden, audioHidden: audioPlayerShell.hidden,
      toolbarHidden: readerToolbar.hidden, urls: activeObjectUrls.size, details: mediaDetails.textContent });
    const replace = async () => openLocalFile(new File([new Uint8Array([1])], 'newer.mp3', { type: 'audio/mpeg' }));
    const results = [];
    for (const action of ['clear', 'replace']) {
      for (const rejects of [false, true]) {
        resetLocalLibrary();
        let complete;
        const file = makeComic();
        Object.defineProperty(file, 'arrayBuffer', { value: () => new Promise((resolve, reject) => {
          complete = () => rejects ? reject(new Error('Old archive failed')) : resolve(buffer);
        }) });
        const opening = openLocalFile(file);
        if (action === 'clear') clearMediaButton.click(); else await replace();
        const expected = snapshot();
        complete();
        await opening;
        results.push({ phase: 'open', action, rejects, expected, actual: snapshot() });
      }
      for (const rejects of [false, true]) {
        await openLocalFile(makeComic());
        const entry = comicArchive.file('2.png');
        const original = entry.async;
        let complete;
        entry.async = () => new Promise((resolve, reject) => { complete = async () => rejects
          ? reject(new Error('Old page failed')) : resolve(await original.call(entry, 'blob')); });
        const rendering = navigateComicPage(1);
        if (action === 'clear') clearMediaButton.click(); else await replace();
        const expected = snapshot();
        await complete();
        await rendering;
        results.push({ phase: 'render', action, rejects, expected, actual: snapshot() });
      }
    }
    await openLocalFile(makeComic());
    const entry = comicArchive.file('2.png');
    const original = entry.async;
    let complete;
    entry.async = () => new Promise(resolve => { complete = async () => resolve(await original.call(entry, 'blob')); });
    comicPageNumber = 1;
    const olderRender = renderComicPage();
    comicPageNumber = 2;
    await renderComicPage();
    const latestSource = comicPage.src;
    await complete();
    await olderRender;
    const reverseOrder = { sourceUnchanged: comicPage.src === latestSource, status: pageStatus.textContent, alt: comicPage.alt, urls: activeObjectUrls.size };
    await openLocalFile(makeComic());
    const goodSource = comicPage.src;
    comicArchive.file('2.png').async = async () => { throw new Error('Current page failed'); };
    await navigateComicPage(1);
    const navigationFailure = { page: comicPageNumber, status: pageStatus.textContent,
      sourceUnchanged: comicPage.src === goodSource, urls: activeObjectUrls.size, details: mediaDetails.textContent };
    const originalLoad = JSZip.loadAsync;
    JSZip.loadAsync = async (...args) => {
      const archive = await originalLoad(...args);
      archive.file('1.png').async = async () => { throw new Error('Initial page failed'); };
      return archive;
    };
    try { await openLocalFile(makeComic()); } finally { JSZip.loadAsync = originalLoad; }
    const initialFailure = snapshot();
    await openLocalFile(new File([new Uint8Array([1])], 'broken.cbz'));
    return { results, reverseOrder, navigationFailure, initialFailure, failure: snapshot() };
  })()`);
  for (const result of comicCancellation.results) {
    assert.deepEqual(result.actual, result.expected, 'Stale CBZ ' + result.phase + ' after ' + result.action + (result.rejects ? ' rejection' : ''));
  }
  assert.deepEqual(comicCancellation.reverseOrder, { sourceUnchanged: true, status: 'Page 3 of 3', alt: 'Comic page 3', urls: 1 });
  assert.deepEqual(comicCancellation.navigationFailure, { page: 0, status: 'Page 1 of 3', sourceUnchanged: true, urls: 1, details: 'Current page failed' });
  assert.equal(comicCancellation.initialFailure.mode, 'error');
  assert.equal(comicCancellation.initialFailure.comicHidden, true);
  assert.equal(comicCancellation.initialFailure.toolbarHidden, true);
  assert.equal(comicCancellation.initialFailure.urls, 0);
  assert.equal(comicCancellation.failure.mode, 'error');
  assert.equal(comicCancellation.failure.comicHidden, true);
  assert.equal(comicCancellation.failure.toolbarHidden, true);
  assert.equal(comicCancellation.failure.urls, 0);

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
  process.stdout.write(`${JSON.stringify({ shell, onboarding, epub, epubNavigation, epubResources, comic, comicCancellation, pdf, gameBoundary, savedGameBoundary }, null, 2)}\n`);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
