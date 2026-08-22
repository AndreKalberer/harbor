const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const packageJson = JSON.parse(read('package.json'));
const packageLock = JSON.parse(read('package-lock.json'));
const catalog = JSON.parse(read(path.join('app', 'catalog.json')));
const appHtml = read(path.join('app', 'index.html'));
const appConfig = read(path.join('app', 'config.js'));
const renderer = read(path.join('app', 'renderer.js'));
const main = read(path.join('electron', 'main.cjs'));
const preload = read(path.join('electron', 'preload.cjs'));
const landing = read('index.html');
const workflow = read(path.join('.github', 'workflows', 'build-desktop.yml'));
const tvHtml = read(path.join('tv', 'index.html'));
const tvConfig = read(path.join('tv', 'config.js'));
const tvScript = read(path.join('tv', 'tv.js'));
const lgManifest = JSON.parse(read(path.join('tv', 'lg', 'appinfo.json')));
const samsungManifest = read(path.join('tv', 'samsung', 'config.xml'));
const androidManifest = read(path.join('tv', 'android', 'app', 'src', 'main', 'AndroidManifest.xml'));

assert(/^2\.\d+\.\d+$/.test(packageJson.version), 'Harbor 2.x version is required.');
assert(packageLock.version === packageJson.version, 'package-lock version does not match package.json.');
assert(packageLock.packages?.['']?.version === packageJson.version, 'lockfile root version does not match package.json.');
assert(packageJson.build?.appId === 'com.harbor.desktop', 'The legacy HarborList app id is still configured.');
assert(packageJson.build?.productName === 'Harbor', 'Packaged product name must be Harbor.');
assert(packageJson.repository?.url === 'https://github.com/AndreKalberer/harbor.git', 'Release repository is not configured.');

assert(main.includes('contextIsolation: true'), 'Electron context isolation is not enabled.');
assert(main.includes('nodeIntegration: false'), 'Electron node integration is not disabled.');
assert(main.includes('sandbox: true'), 'Electron sandbox is not enabled.');
assert(main.includes("guestContents.setWindowOpenHandler(() => ({ action: 'deny' }))"), 'Embedded popup blocking is missing.');
assert(main.includes("streamingSession.on('will-download'"), 'Embedded download blocking is missing.');
assert(!appHtml.includes('allowpopups'), 'The app webview still grants popup permission.');
assert(appHtml.includes('Content-Security-Policy'), 'The app Content Security Policy is missing.');
assert(preload.includes('contextBridge.exposeInMainWorld'), 'The isolated Harbor bridge is missing.');
assert(appHtml.includes('<script src="config.js"></script>'), 'Desktop build configuration is not loaded.');
assert(tvHtml.includes('<script src="config.js"></script>'), 'TV build configuration is not loaded.');
assert(renderer.includes('window.HARBOR_CONFIG?.tmdbApiKey'), 'Desktop catalog access is not using build configuration.');
assert(tvScript.includes('window.HARBOR_CONFIG.tmdbApiKey'), 'TV catalog access is not using build configuration.');
assert(!/const\s+TMDB_(?:API_)?KEY\s*=\s*['"][a-zA-Z0-9_-]{20,}['"]/.test(renderer + tvScript), 'A catalog credential is hardcoded in public source.');
assert(appConfig.includes('tmdbApiKey:') && tvConfig.includes('tmdbApiKey:'), 'Catalog build configuration is missing.');

for (const feature of ['USER_STATE_KEY', 'toggleFavorite', 'recordHistory', 'recordProgress', 'tryNextStreamRoute']) {
  assert(renderer.includes(feature), `Consumer feature is missing: ${feature}`);
}
for (const section of ['Watch', 'Listen', 'Read', 'Play']) {
  assert(renderer.includes(section), `Catalog section is missing: ${section}`);
}
assert(Array.isArray(catalog.items) && catalog.items.length > 25, 'Catalog seed data is unexpectedly small.');

for (const platform of ['Windows', 'macOS', 'Linux', 'TV']) {
  assert(landing.includes(`Download for ${platform}`), `Landing page is missing ${platform}.`);
}
assert(landing.includes('https://github.com/AndreKalberer/harbor/releases/latest'), 'Landing page does not use the official release URL.');
assert(!workflow.includes('HarborList-'), 'Legacy HarborList artifact names remain in CI.');
assert(workflow.includes('HARBOR_CSC_LINK') && workflow.includes('[[ -n "$HARBOR_CSC_LINK" ]]'), 'Optional release signing is not guarded against missing credentials.');
for (const artifact of ['Harbor-Windows', 'Harbor-Linux', 'Harbor-macOS', 'SHA256SUMS.txt']) {
  assert(workflow.includes(artifact), `Release workflow is missing ${artifact}.`);
}
assert(tvHtml.includes('sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"'), 'TV player iframe is not sandboxed.');
assert(!tvHtml.includes('allow-popups'), 'TV player grants popup permission.');
for (const feature of ['moveFocus', 'fetchWatch', 'fetchListen', 'fetchRead', 'toggleSaved']) {
  assert(tvScript.includes(feature), `TV consumer feature is missing: ${feature}`);
}
assert(lgManifest.id === 'com.harbor.tv' && lgManifest.version === packageJson.version, 'LG webOS manifest is out of sync.');
assert(samsungManifest.includes('tizen:profile name="tv-samsung"'), 'Samsung TV profile is missing.');
assert(androidManifest.includes('android.intent.category.LEANBACK_LAUNCHER'), 'Android TV launcher support is missing.');
assert(workflow.includes('Harbor-TV-LG-webOS') && workflow.includes('Harbor-TV-Android-Fire'), 'TV release downloads are missing from CI.');

process.stdout.write(JSON.stringify({
  version: packageJson.version,
  appId: packageJson.build.appId,
  catalogResources: catalog.items.length,
  security: 'isolated, sandboxed, popup and download blocked',
  releases: ['Windows', 'macOS', 'Linux', 'LG webOS', 'Android/Fire TV', 'Samsung source', 'checksums', 'Pages']
}, null, 2) + '\n');
