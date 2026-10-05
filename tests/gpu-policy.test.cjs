const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const main = fs.readFileSync(require('node:path').join(__dirname, '../electron/main.cjs'), 'utf8');
const startup = main.slice(0, main.indexOf('protocol.registerSchemesAsPrivileged'));
for (const platform of ['win32', 'darwin', 'linux']) {
  for (const software of [false, true]) {
    let disabled = 0;
    const app = {
      commandLine: { hasSwitch: (name) => name === 'disable-gpu' && software },
      disableHardwareAcceleration: () => { disabled += 1; }
    };
    vm.runInNewContext(startup, {
      process: { platform },
      require: (name) => name === 'electron' ? { app } : name === 'electron-updater' ? { autoUpdater: {} } : require(name)
    });
    assert.equal(disabled, software ? 1 : 0, `${platform}: respect explicit software mode while preserving default acceleration`);
  }
}
console.log('GPU startup policy passed: default acceleration and explicit software fallback.');
