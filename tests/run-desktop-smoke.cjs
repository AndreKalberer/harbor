const { spawn } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');

const projectRoot = path.join(__dirname, '..');
const electronPath = require('electron');
const packagedExecutable = process.env.HARBOR_QA_EXECUTABLE
  ? path.resolve(process.env.HARBOR_QA_EXECUTABLE)
  : '';
const defaultSmokes = [
  'search-smoke.cjs',
  'watch-filters-smoke.cjs',
  'smoke-library.cjs'
];

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const reservePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.unref();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    server.close((error) => {
      if (error) reject(error);
      else resolve(address.port);
    });
  });
});

const waitForDebugTarget = async (port, child, output) => {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Harbor exited before its debug target was ready.\n${output.join('')}`);
    }
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json`);
      if (response.ok) {
        const targets = await response.json();
        if (targets.some((target) => target.type === 'page'
          && target.title === 'Harbor'
          && /\/app\/index\.html(?:$|[?#])/i.test(target.url))) return;
      }
    } catch {
      // The Electron debug server is still starting.
    }
    await delay(100);
  }
  throw new Error(`Timed out waiting for Harbor on debug port ${port}.\n${output.join('')}`);
};

const stopProcess = async (child) => {
  if (child.exitCode !== null) return;
  child.kill();
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    delay(5_000)
  ]);
  if (child.exitCode === null) child.kill('SIGKILL');
};

const runCommand = (command, args, options) => new Promise((resolve, reject) => {
  const child = spawn(command, args, options);
  let settled = false;
  const finish = (callback) => {
    if (settled) return;
    settled = true;
    clearTimeout(timeout);
    callback();
  };
  const timeout = setTimeout(() => {
    child.kill('SIGKILL');
    finish(() => reject(new Error(`${path.basename(args[0])} exceeded the 60 second smoke-test limit.`)));
  }, 60_000);
  child.once('error', (error) => finish(() => reject(error)));
  child.once('exit', (code, signal) => {
    finish(() => {
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(args[0])} failed with ${signal || `exit code ${code}`}.`));
    });
  });
});

const runSmoke = async (smokeName) => {
  const smokePath = path.resolve(__dirname, smokeName);
  if (!smokePath.startsWith(__dirname + path.sep) || !fs.existsSync(smokePath)) {
    throw new Error(`Unknown desktop smoke test: ${smokeName}`);
  }

  const port = await reservePort();
  const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'harbor-desktop-smoke-'));
  const output = [];
  if (packagedExecutable && !fs.existsSync(packagedExecutable)) {
    throw new Error(`Packaged Harbor executable was not found: ${packagedExecutable}`);
  }
  const executable = packagedExecutable || electronPath;
  const harborArgs = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDirectory}`
  ];
  if (!packagedExecutable) harborArgs.push(projectRoot);
  const harbor = spawn(executable, harborArgs, {
    cwd: projectRoot,
    env: {
      ...process.env,
      HARBOR_QA_SHOW: '0'
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });

  harbor.stdout.on('data', (chunk) => output.push(chunk.toString()));
  harbor.stderr.on('data', (chunk) => output.push(chunk.toString()));

  try {
    await waitForDebugTarget(port, harbor, output);
    await runCommand(process.execPath, [smokePath, String(port)], {
      cwd: projectRoot,
      env: process.env,
      stdio: 'inherit',
      windowsHide: true
    });
  } finally {
    await stopProcess(harbor);
    fs.rmSync(profileDirectory, { recursive: true, force: true });
  }
};

const run = async () => {
  const requestedSmokes = process.argv.slice(2);
  const smokes = requestedSmokes.length ? requestedSmokes : defaultSmokes;
  for (const smoke of smokes) {
    process.stdout.write(`\nDesktop smoke: ${smoke}\n`);
    await runSmoke(smoke);
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
