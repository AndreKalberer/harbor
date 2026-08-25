const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.join(__dirname, '..');

const packagedCandidates = process.platform === 'win32'
  ? [path.join(projectRoot, 'release', 'win-unpacked', 'Harbor.exe')]
  : process.platform === 'darwin'
    ? [
        path.join(projectRoot, 'release', 'mac', 'Harbor.app', 'Contents', 'MacOS', 'Harbor'),
        path.join(projectRoot, 'release', 'mac-arm64', 'Harbor.app', 'Contents', 'MacOS', 'Harbor')
      ]
    : [path.join(projectRoot, 'release', 'linux-unpacked', 'harbor-desktop')];

const executable = packagedCandidates.find((candidate) => fs.existsSync(candidate));
if (!executable) {
  throw new Error(`No packaged Harbor executable was found. Checked:\n${packagedCandidates.join('\n')}`);
}

const result = spawnSync(process.execPath, [path.join(__dirname, 'run-desktop-smoke.cjs')], {
  cwd: projectRoot,
  env: { ...process.env, HARBOR_QA_EXECUTABLE: executable },
  stdio: 'inherit',
  windowsHide: true
});

if (result.error) throw result.error;
process.exitCode = result.status === null ? 1 : result.status;
