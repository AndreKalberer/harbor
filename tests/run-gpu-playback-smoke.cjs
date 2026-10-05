const { spawnSync } = require('node:child_process');
const path = require('node:path');
const result = spawnSync(process.execPath, [path.join(__dirname, 'run-desktop-smoke.cjs'), 'gpu-playback-smoke.cjs'], {
  env: { ...process.env, HARBOR_QA_GPU: 'native', HARBOR_QA_SHOW: '1' },
  stdio: 'inherit', windowsHide: true
});
if (result.error) throw result.error;
process.exitCode = result.status === null ? 1 : result.status;
