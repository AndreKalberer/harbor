const fs = require('node:fs');
const path = require('node:path');
const JSZip = require('jszip');

const root = path.join(__dirname, '..');
const tvRoot = path.join(root, 'tv');
const buildRoot = path.join(tvRoot, 'build');
const releaseRoot = path.join(tvRoot, 'release');
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const stagedApiKey = String(process.env.TMDB_API_KEY || '').trim();
if (stagedApiKey && !/^[a-zA-Z0-9_-]{20,}$/.test(stagedApiKey)) {
  throw new Error('TMDB_API_KEY has an unexpected format.');
}

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

  const stagedLgManifest = path.join(buildRoot, 'lg', 'appinfo.json');
  const lgManifest = JSON.parse(fs.readFileSync(stagedLgManifest, 'utf8'));
  lgManifest.version = version;
  fs.writeFileSync(stagedLgManifest, JSON.stringify(lgManifest, null, 2) + '\n');
  const stagedSamsungManifest = path.join(buildRoot, 'samsung', 'config.xml');
  const samsungManifest = fs.readFileSync(stagedSamsungManifest, 'utf8')
    .replace(/(<widget\b[^>]*\bversion=")[^"]+("[^>]*>)/, `$1${version}$2`);
  fs.writeFileSync(stagedSamsungManifest, samsungManifest);

  const icon = path.join(root, 'assets', 'tv-icon.png');
  const androidAssets = path.join(buildRoot, 'android-assets');
  resetDirectory(androidAssets);
  fs.mkdirSync(path.join(androidAssets, 'assets'), { recursive: true });
  fs.mkdirSync(path.join(androidAssets, 'shared'), { recursive: true });
  const bundledTvHtml = fs.readFileSync(path.join(tvRoot, 'index.html'), 'utf8')
    .replaceAll('../assets/', 'assets/')
    .replaceAll('../shared/', 'shared/')
    .replace('../node_modules/hls.js/dist/hls.min.js', 'shared/hls.min.js');
  fs.writeFileSync(path.join(androidAssets, 'index.html'), bundledTvHtml);
  for (const file of ['config.js', 'tv.css', 'tv.js']) fs.copyFileSync(path.join(tvRoot, file), path.join(androidAssets, file));
  for (const file of ['series-metadata.js', 'watch-browse.js']) fs.copyFileSync(path.join(root, 'shared', file), path.join(androidAssets, 'shared', file));
  fs.copyFileSync(path.join(root, 'node_modules', 'hls.js', 'dist', 'hls.min.js'), path.join(androidAssets, 'shared', 'hls.min.js'));
  fs.copyFileSync(path.join(root, 'assets', 'harbor-mark.svg'), path.join(androidAssets, 'assets', 'harbor-mark.svg'));
  fs.copyFileSync(icon, path.join(androidAssets, 'assets', 'icon.png'));
  const lgRoot = path.join(buildRoot, 'lg');
  const lgAssets = path.join(lgRoot, 'assets');
  fs.mkdirSync(lgAssets, { recursive: true });
  const lgNonce = 'harbor-lg-bundle';
  const inlineScript = (source) => source.replaceAll('</script', '<\\/script');
  const seriesMetadataSource = fs.readFileSync(path.join(root, 'shared', 'series-metadata.js'), 'utf8');
  const watchBrowseSource = fs.readFileSync(path.join(root, 'shared', 'watch-browse.js'), 'utf8');
  const hlsSource = fs.readFileSync(path.join(root, 'node_modules', 'hls.js', 'dist', 'hls.min.js'), 'utf8');
  const tvConfigSource = stagedApiKey
    ? `window.HARBOR_CONFIG = Object.freeze({\n  tmdbApiKey: ${JSON.stringify(stagedApiKey)}\n});\n`
    : fs.readFileSync(path.join(tvRoot, 'config.js'), 'utf8');
  const logoData = `data:image/svg+xml;base64,${fs.readFileSync(path.join(root, 'assets', 'harbor-mark.svg')).toString('base64')}`;
  const iconData = `data:image/png;base64,${fs.readFileSync(icon).toString('base64')}`;
  const lgHtml = fs.readFileSync(path.join(tvRoot, 'index.html'), 'utf8')
    .replace("script-src 'self'; style-src 'self';", `script-src 'nonce-${lgNonce}'; style-src 'nonce-${lgNonce}';`)
    .replace('<link rel="icon" href="../assets/icon.png" />', `<link rel="icon" href="${iconData}" />`)
    .replace('<link rel="stylesheet" href="tv.css" />', `<style nonce="${lgNonce}">${fs.readFileSync(path.join(tvRoot, 'tv.css'), 'utf8')}</style>`)
    .replaceAll('src="../assets/harbor-mark.svg"', `src="${logoData}"`)
    .replace('<script src="../shared/series-metadata.js"></script>', `<script nonce="${lgNonce}">${inlineScript(seriesMetadataSource)}</script>`)
    .replace('<script src="../shared/watch-browse.js"></script>', `<script nonce="${lgNonce}">${inlineScript(watchBrowseSource)}</script>`)
    .replace('<script src="config.js"></script>', `<script nonce="${lgNonce}">${inlineScript(tvConfigSource)}</script>`)
    .replace('<script src="../node_modules/hls.js/dist/hls.min.js"></script>', `<script nonce="${lgNonce}">${inlineScript(hlsSource)}</script>`)
    .replace('<script src="tv.js"></script>', `<script nonce="${lgNonce}">${inlineScript(fs.readFileSync(path.join(tvRoot, 'tv.js'), 'utf8'))}</script>`);
  fs.writeFileSync(path.join(lgRoot, 'index.html'), lgHtml);
  for (const file of ['config.js', 'tv.css', 'tv.js']) {
    fs.copyFileSync(path.join(tvRoot, file), path.join(lgRoot, file));
  }
  fs.copyFileSync(path.join(root, 'assets', 'harbor-mark.svg'), path.join(lgAssets, 'harbor-mark.svg'));
  fs.copyFileSync(icon, path.join(lgAssets, 'icon.png'));
  fs.copyFileSync(icon, path.join(lgRoot, 'icon.png'));
  fs.copyFileSync(icon, path.join(lgRoot, 'largeIcon.png'));
  fs.copyFileSync(icon, path.join(buildRoot, 'samsung', 'icon.png'));
  copyDirectory(androidAssets, path.join(buildRoot, 'samsung'));

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
