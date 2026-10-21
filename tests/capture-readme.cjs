// Capture the real application with a temporary profile; never use personal state.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');

const projectRoot = path.resolve(__dirname, '..');

if (!process.versions.electron) {
  const { spawnSync } = require('node:child_process');
  const temporaryRoot = path.resolve(os.tmpdir());
  const profile = fs.mkdtempSync(path.join(temporaryRoot, 'harbor-readme-'));
  try {
    const result = spawnSync(require('electron'), [__filename, '--disable-gpu'], {
      cwd: projectRoot,
      env: { ...process.env, HARBOR_QA_SHOW: '0', HARBOR_CAPTURE_PROFILE: profile },
      stdio: 'inherit',
      windowsHide: true,
      timeout: 30000,
    });
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  } finally {
    const resolvedProfile = path.resolve(profile);
    assert.equal(path.dirname(resolvedProfile), temporaryRoot);
    assert.ok(path.basename(resolvedProfile).startsWith('harbor-readme-'));
    try {
      fs.rmSync(resolvedProfile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch (error) {
      if (!['EBUSY', 'EPERM', 'ENOTEMPTY'].includes(error.code)) throw error;
      console.warn('Temporary QA profile cleanup deferred:', error.code);
    }
  }
} else {
  const { app } = require('electron');
  const profile = process.env.HARBOR_CAPTURE_PROFILE;
  assert.ok(profile && path.basename(profile).startsWith('harbor-readme-'), 'Launch with node tests/capture-readme.cjs');
  app.setPath('userData', profile);
  app.setAppPath(projectRoot);
  const timeout = setTimeout(() => app.exit(1), 20000);
  app.once('browser-window-created', (_event, window) => {
    window.webContents.setBackgroundThrottling(false);
    window.webContents.once('did-finish-load', async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        // Complete first-run onboarding normally in this disposable profile.
        await window.webContents.executeJavaScript(
          "document.querySelector('#welcome-dialog').open && document.querySelector('#welcome-start-button').click()"
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const state = await window.webContents.executeJavaScript(
          "({ title: document.title, cards: document.querySelectorAll('#resource-list .media-card').length, welcomeOpen: document.querySelector('#welcome-dialog').open })"
        );
        assert.equal(state.title, 'Harbor');
        assert.ok(state.cards > 0, 'Capture must show loaded media cards.');
        assert.equal(state.welcomeOpen, false, 'Capture must show the home screen after onboarding.');
        // Windows can retain an old compositor frame while a window is hidden.
        // Show without taking focus so the capture reflects the current interface.
        window.showInactive();
        await new Promise((resolve) => setTimeout(resolve, 750));
        const image = await window.webContents.capturePage(undefined, { stayHidden: true, stayAwake: true });
        assert.equal(image.isEmpty(), false, 'Capture must contain pixels.');
        const output = path.join(projectRoot, 'docs', 'harbor-desktop.png');
        fs.mkdirSync(path.dirname(output), { recursive: true });
        fs.writeFileSync(output, image.toPNG());
        console.log('Captured Harbor desktop:', JSON.stringify(state), image.getSize());
        clearTimeout(timeout);
        app.exit(0);
      } catch (error) {
        console.error(error);
        clearTimeout(timeout);
        app.exit(1);
      }
    });
  });
  require('../electron/main.cjs');
}
