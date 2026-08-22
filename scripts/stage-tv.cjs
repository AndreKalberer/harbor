const fs = require('node:fs');
const path = require('node:path');
const JSZip = require('jszip');

const root = path.join(__dirname, '..');
const tvRoot = path.join(root, 'tv');
const buildRoot = path.join(tvRoot, 'build');
const releaseRoot = path.join(tvRoot, 'release');
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;

const assertGeneratedTarget = (target) => {
  const relative = path.relative(tvRoot, path.resolve(target));
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing generated-file operation outside tv/: ${target}`);
  }
};

const resetDirectory = (target) => {
  assertGeneratedTarget(target);
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });
};

const copyDirectory = (source, destination) => {
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isDirectory()) copyDirectory(from, to);
    else fs.copyFileSync(from, to);
  }
};

const addDirectoryToZip = (zip, source, prefix = '') => {
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) addDirectoryToZip(zip, from, name);
    else zip.file(name, fs.readFileSync(from));
  }
};

const run = async () => {
  resetDirectory(buildRoot);
  fs.mkdirSync(releaseRoot, { recursive: true });

  for (const platform of ['lg', 'samsung']) {
    copyDirectory(path.join(tvRoot, platform), path.join(buildRoot, platform));
  }

  const icon = path.join(root, 'assets', 'icon.png');
  fs.copyFileSync(icon, path.join(buildRoot, 'lg', 'icon.png'));
  fs.copyFileSync(icon, path.join(buildRoot, 'lg', 'largeIcon.png'));
  fs.copyFileSync(icon, path.join(buildRoot, 'samsung', 'icon.png'));

  const samsungZip = new JSZip();
  addDirectoryToZip(samsungZip, path.join(buildRoot, 'samsung'));
  const archive = await samsungZip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.rmSync(path.join(releaseRoot, 'Harbor-TV-Samsung-Tizen-source.zip'), { force: true });
  fs.writeFileSync(path.join(releaseRoot, `Harbor-TV-Samsung-Tizen-${version}-source.zip`), archive);

  process.stdout.write(`TV staging ready at ${buildRoot}\n`);
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
