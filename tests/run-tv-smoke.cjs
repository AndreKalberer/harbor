const { spawn } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');

const projectRoot = path.join(__dirname, '..');
const electronPath = require('electron');
const harnessPath = path.join(__dirname, 'tv-harness.cjs');
const capturePath = path.join(__dirname, 'capture-tv.cjs');
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const reservePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.unref();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    server.close((error) => error ? reject(error) : resolve(address.port));
  });
});

const stopProcess = async (child) => {
  if (child.exitCode !== null) return;
  child.kill();
  await Promise.race([new Promise((resolve) => child.once('exit', resolve)), delay(5000)]);
  if (child.exitCode === null) {
    child.kill('SIGKILL');
    await Promise.race([new Promise((resolve) => child.once('exit', resolve)), delay(5000)]);
  }
};

const removeProfileDirectory = (profileDirectory) => {
  try {
    fs.rmSync(profileDirectory, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 200
    });
  } catch (error) {
    if (!['EBUSY', 'ENOTEMPTY', 'EPERM'].includes(error.code)) throw error;
    console.warn(`Harbor TV smoke profile cleanup deferred: ${error.code}`);
  }
};

const runCapture = (port) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [capturePath, String(port)], {
    cwd: projectRoot,
    env: process.env,
    stdio: 'inherit',
    windowsHide: true
  });
  const timeout = setTimeout(() => {
    child.kill('SIGKILL');
    reject(new Error('TV smoke test exceeded its 75 second limit.'));
  }, 75000);
  child.once('error', (error) => { clearTimeout(timeout); reject(error); });
  child.once('exit', (code) => {
    clearTimeout(timeout);
    if (code === 0) resolve();
    else reject(new Error(`TV smoke test failed with exit code ${code}.`));
  });
});

const run = async () => {
  const port = await reservePort();
  const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'harbor-tv-smoke-'));
  const output = [];
  const electronArgs = process.platform === 'linux' && process.env.CI
    ? ['--no-sandbox', harnessPath, String(port)]
    : [harnessPath, String(port)];
  const harbor = spawn(electronPath, electronArgs, {
    cwd: projectRoot,
    env: { ...process.env, HARBOR_QA_PROFILE: profileDirectory },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  harbor.stdout.on('data', (chunk) => output.push(chunk.toString()));
  harbor.stderr.on('data', (chunk) => output.push(chunk.toString()));
  try {
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      if (harbor.exitCode !== null) throw new Error(`Harbor TV exited before startup.\n${output.join('')}`);
      try {
        const targets = await fetch(`http://127.0.0.1:${port}/json`).then((response) => response.json());
        if (targets.some((target) => target.type === 'page' && target.title === 'Harbor TV')) break;
      } catch {
        // The debug target is still starting.
      }
      await delay(100);
    }
    if (Date.now() >= deadline) throw new Error(`Timed out waiting for Harbor TV.\n${output.join('')}`);
    await runCapture(port);
  } finally {
    await stopProcess(harbor);
    removeProfileDirectory(profileDirectory);
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
