const fs = require('node:fs');
const path = require('node:path');

const artifactPattern = /^Harbor-(?:Setup-)?(\d+\.\d+\.\d+)-Windows-(x64|arm64)\.exe(?:\.blockmap)?$/;
const versionParts = version => {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Expected a release version.');
  return version.split('.').map(Number);
};
function olderThan(left, right) {
  const a = versionParts(left), b = versionParts(right);
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] < b[i];
  return false;
}
function pruneOldDownloads(directory, version) {
  versionParts(version);
  if (!fs.existsSync(directory)) return [];
  const root = fs.realpathSync(directory);
  const entries = fs.readdirSync(root, { withFileTypes: true });
  // Do not delete old downloads until the requested release has an installer.
  const hasCurrent = entries.some(entry => {
    const match = artifactPattern.exec(entry.name);
    return entry.isFile() && match && match[1] === version && entry.name.endsWith('.exe')
      && fs.statSync(path.join(root, entry.name)).size > 0;
  });
  if (!hasCurrent) return [];
  const removed = [];
  for (const entry of entries) {
    const match = artifactPattern.exec(entry.name);
    if (!entry.isFile() || !match || !olderThan(match[1], version)) continue;
    const target = path.resolve(root, entry.name);
    if (path.dirname(target) !== root) throw new Error('Download escaped its output directory.');
    fs.unlinkSync(target);
    removed.push(entry.name);
  }
  return removed;
}
async function afterAllArtifactBuild(context) {
  const projectRoot = fs.realpathSync(path.join(__dirname, '..'));
  const releaseRoot = path.join(projectRoot, 'release');
  if (!fs.existsSync(context.outDir) || fs.realpathSync(context.outDir) !== releaseRoot) return [];
  const version = require('../package.json').version;
  // Only act after the current build produced a Windows executable successfully.
  const builtCurrent = context.artifactPaths.some(file => {
    const match = artifactPattern.exec(path.basename(file));
    return path.dirname(path.resolve(file)) === path.resolve(context.outDir)
      && match && match[1] === version && file.endsWith('.exe');
  });
  if (builtCurrent) {
    const removed = pruneOldDownloads(releaseRoot, version);
    if (removed.length) console.log('Removed obsolete Harbor downloads: ' + removed.join(', '));
  }
  return [];
}
module.exports = afterAllArtifactBuild;
module.exports.pruneOldDownloads = pruneOldDownloads;
if (require.main === module) {
  const directory = path.join(__dirname, '..', 'release');
  console.log(JSON.stringify({ removed: pruneOldDownloads(directory, require('../package.json').version) }));
}
