const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const userState = require('../shared/user-state.js');

const connect = async (port, predicate) => {
  const targets = await fetch(`http://127.0.0.1:${port}/json`).then((response) => response.json());
  const target = targets.find(predicate);
  assert(target, `Debug target missing on port ${port}`);
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map();
  let sequence = 0;
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data.toString());
    if (!pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error || message.result?.exceptionDetails) {
      reject(new Error(message.error?.message || message.result.exceptionDetails.exception?.description));
    } else resolve(message.result.result.value);
  });
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  return {
    evaluate: (expression) => new Promise((resolve, reject) => {
      const id = ++sequence;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: {
        expression, awaitPromise: true, returnByValue: true, userGesture: true
      } }));
    }),
    close: () => socket.close()
  };
};

const run = async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'harbor-backup-fixtures-'));
  let renderer;
  let main;
  try {
    renderer = await connect(process.argv[2], (target) => target.type === 'page'
      && /\/app\/index\.html(?:$|[?#])/i.test(target.url));
    main = await connect(process.env.HARBOR_QA_MAIN_PORT, () => true);
    await renderer.evaluate(`(async () => {
      const deadline = Date.now() + 15000;
      while (typeof persistUserState !== 'function' && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 25));
      if (typeof persistUserState !== 'function') throw new Error('Backup controls did not become ready');
    })()`);
    const original = userState.normalize({
      favorites: [{ id: 'saved', name: 'Saved Movie' }],
      history: [{ id: 'seen', name: 'Seen Movie' }],
      progress: { saved: { item: { id: 'saved', name: 'Saved Movie' }, progress: 0.4, updatedAt: 123 } },
      settings: { autoplayNext: false, rememberProgress: false, reduceMotion: true, onboardingComplete: true }
    });
    await renderer.evaluate(`(() => {
      if (welcomeDialog.open) welcomeDialog.close();
      userState = userStateApi.normalize(${JSON.stringify(original)});
      persistUserState();
      document.querySelector('#my-harbor-tab-settings').click();
      window.__backupConfirmations = 0;
      window.__backupOriginalConfirm = window.confirm;
      window.confirm = () => { window.__backupConfirmations += 1; return true; };
    })()`);
    // Replace only the OS file picker. The real preload bridge, IPC handler,
    // filesystem read, parser, and renderer restore handler still execute.
    await main.evaluate(`globalThis.__backupOriginalDialog = process.mainModule.require('electron').dialog.showOpenDialog; true`);
    const cases = [
      { label: 'invalid favorites', document: { favorites: 42 }, invalid: true },
      { label: 'invalid envelope', document: { format: userState.BACKUP_FORMAT, version: 1, state: [] }, invalid: true },
      { label: 'invalid progress', document: { progress: { lost: {} } }, invalid: true },
      { label: 'invalid settings', document: { settings: { rememberProgress: 'false' } }, invalid: true },
      { label: 'legacy', document: { favorites: [{ id: 'legacy', name: 'Legacy Favorite' }], settings: { reduceMotion: false } } },
      { label: 'current', document: userState.createBackup(original, 'test') }
    ];
    let expected = original;
    let confirmations = 0;
    for (const [index, fixture] of cases.entries()) {
      const fixturePath = path.join(directory, `${index}.json`);
      fs.writeFileSync(fixturePath, JSON.stringify(fixture.document));
      await main.evaluate(`process.mainModule.require('electron').dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [${JSON.stringify(fixturePath)}] }); true`);
      const result = await renderer.evaluate(`(async () => {
        const button = [...document.querySelectorAll('.settings-data-actions button')].find((entry) => entry.textContent === 'Restore backup');
        if (!button) throw new Error('Restore backup button missing');
        button.click();
        const deadline = Date.now() + 5000;
        while (button.disabled && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 25));
        if (button.disabled) throw new Error('Restore did not finish');
        return { state: userState, stored: JSON.parse(localStorage.getItem(USER_STATE_KEY)), confirmations: window.__backupConfirmations, toast: document.querySelector('.status-toast')?.textContent || '' };
      })()`);
      if (!fixture.invalid) {
        expected = userState.parseBackup(fixture.document);
        confirmations += 1;
      }
      assert.deepEqual(result.state, expected, `${fixture.label}: in-memory data`);
      assert.deepEqual(result.stored, expected, `${fixture.label}: saved data`);
      assert.equal(result.confirmations, confirmations, `${fixture.label}: confirmation count`);
      assert.match(result.toast, fixture.invalid ? /Backup could not be restored/ : /Harbor data restored/, fixture.label);
      console.log(`${fixture.label}: ${fixture.invalid ? 'rejected without changing library, activity or preferences' : 'restored through real IPC and UI'}`);
    }
  } finally {
    if (main) {
      await main.evaluate(`if (globalThis.__backupOriginalDialog) process.mainModule.require('electron').dialog.showOpenDialog = globalThis.__backupOriginalDialog; true`).catch(() => {});
      main.close();
    }
    if (renderer) {
      await renderer.evaluate(`if (window.__backupOriginalConfirm) window.confirm = window.__backupOriginalConfirm; true`).catch(() => {});
      renderer.close();
    }
    fs.rmSync(directory, { recursive: true, force: true });
  }
};
run().catch((error) => { console.error(error); process.exitCode = 1; });
