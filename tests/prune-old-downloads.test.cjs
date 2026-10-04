const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pruneOldDownloads } = require('../scripts/prune-old-downloads.cjs');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'harbor-prune-test-'));
try {
  const old = ['Harbor-Setup-2.3.2-Windows-x64.exe', 'Harbor-Setup-2.3.2-Windows-x64.exe.blockmap', 'Harbor-2.3.3-Windows-x64.exe'];
  const unrelated = ['My downloads.exe', 'Harbor-2.3.1-Linux-x64.AppImage', 'Harbor-Setup-2.3.5-Windows-x64.exe'];
  for (const file of [...old, ...unrelated]) fs.writeFileSync(path.join(directory, file), 'fixture');
  assert.deepEqual(pruneOldDownloads(directory, '2.3.4'), [], 'A failed/missing current build must preserve existing installers');
  const current = ['Harbor-Setup-2.3.4-Windows-x64.exe', 'Harbor-Setup-2.3.4-Windows-x64.exe.blockmap'];
  for (const file of current) fs.writeFileSync(path.join(directory, file), 'fixture');
  assert.deepEqual(pruneOldDownloads(directory, '2.3.4').sort(), old.sort());
  for (const file of [...unrelated, ...current]) assert(fs.existsSync(path.join(directory, file)), file + ' must remain');
  assert.deepEqual(pruneOldDownloads(directory, '2.3.4'), []);
  assert.throws(() => pruneOldDownloads(directory, '../2.3.4'));
  console.log('Old installer cleanup preserves the current build, newer files, and unrelated downloads.');
} finally {
  for (const entry of fs.readdirSync(directory)) fs.unlinkSync(path.join(directory, entry));
  fs.rmdirSync(directory);
}
