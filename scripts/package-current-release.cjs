const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const JSZip = require('jszip');

const root = path.join(__dirname, '..');
const releaseRoot = path.join(root, 'release');
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const sourceName = `Harbor-${version}-Source.zip`;
const sourcePath = path.join(releaseRoot, sourceName);

const ignoredNames = new Set(['node_modules', 'release', 'build', '.gradle', '.tv-test-profile']);
const ignoredExtensions = new Set(['.log']);
const sourceEntries = ['.github', 'app', 'assets', 'electron', 'scripts', 'shared', 'tests', 'tv', '.gitignore', 'index.html', 'package.json', 'package-lock.json', 'README.md', 'LICENSE'];

const addToZip = (zip, absolutePath, archivePath) => {
  const stats = fs.statSync(absolutePath);
  if (stats.isDirectory()) {
    const directoryName = path.basename(absolutePath);
    if (ignoredNames.has(directoryName) || directoryName.startsWith('.desktop-test-profile')) return;
    for (const entry of fs.readdirSync(absolutePath)) {
      addToZip(zip, path.join(absolutePath, entry), `${archivePath}/${entry}`);
    }
    return;
  }
  const normalizedArchivePath = archivePath.replace(/\\/g, '/');
  const extension = path.extname(absolutePath).toLowerCase();
  if (ignoredExtensions.has(extension)) return;
  if (normalizedArchivePath.startsWith('tests/') && extension === '.png') return;
  zip.file(normalizedArchivePath, fs.readFileSync(absolutePath));
};

const sha256 = (filePath) => crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');

const run = async () => {
  fs.mkdirSync(releaseRoot, { recursive: true });
  const zip = new JSZip();
  for (const entry of sourceEntries) {
    const absolutePath = path.join(root, entry);
    if (fs.existsSync(absolutePath)) addToZip(zip, absolutePath, entry);
  }
  const sourceArchive = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 7 } });
  fs.writeFileSync(sourcePath, sourceArchive);

  const artifactRoots = [releaseRoot, path.join(root, 'tv', 'release')];
  const releaseArtifacts = [];
  for (const artifactRoot of artifactRoots) {
    if (!fs.existsSync(artifactRoot)) continue;
    for (const entry of fs.readdirSync(artifactRoot)) {
      if (!entry.includes(version) || entry.endsWith('.blockmap') || entry.startsWith('SHA256SUMS')) continue;
      const filePath = path.join(artifactRoot, entry);
      if (fs.statSync(filePath).isFile()) releaseArtifacts.push(filePath);
    }
  }
  const checksumLines = releaseArtifacts
    .sort((left, right) => path.basename(left).localeCompare(path.basename(right)))
    .map((filePath) => `${sha256(filePath)}  ${path.basename(filePath)}`);
  fs.writeFileSync(path.join(releaseRoot, `SHA256SUMS-${version}.txt`), checksumLines.join('\n') + '\n', 'utf8');
  process.stdout.write(checksumLines.join('\n') + '\n');
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
