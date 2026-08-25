const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const workflow = read('.github/workflows/build-desktop.yml');
const androidGradle = read('tv/android/app/build.gradle.kts');
const androidActivity = read('tv/android/app/src/main/java/com/harbor/tv/MainActivity.java');
const stageTv = read('scripts/stage-tv.cjs');
const sourcePackage = read('scripts/package-current-release.cjs');
const renderer = read('app/renderer.js');
const main = read('electron/main.cjs');
const landing = read('index.html');
const icon = fs.readFileSync(path.join(root, 'assets', 'icon.png'));

assert(icon.readUInt32BE(16) === 1024 && icon.readUInt32BE(20) === 1024, 'Desktop icon must be a 1024x1024 square.');
assert(!androidGradle.includes('signingConfigs.getByName("debug")'), 'Android release still uses the debug signing key.');
assert(androidGradle.includes('HARBOR_ANDROID_KEYSTORE') && androidGradle.includes('harborVersion'), 'Android signing or version propagation is missing.');
assert(androidGradle.includes('file("../../build/android-assets")'), 'Android assets path does not point to tv/build/android-assets.');
assert(workflow.includes('Require signing for tagged desktop releases'), 'Tagged desktop releases can still publish unsigned.');
assert(workflow.includes('WIN_CSC_LINK') && workflow.includes('MAC_CSC_LINK'), 'Windows and macOS do not use separate signing identities.');
assert(workflow.includes('Android signing credentials are required for a tagged release.'), 'Tagged Android releases do not require a release key.');
assert(/\n  verify:\r?\n[\s\S]*Validate release tag and package version/.test(workflow), 'Tag/version parity is not enforced by the verify job.');
assert(/\n  build:\r?\n    needs: verify/.test(workflow) && /\n  tv:\r?\n    needs: verify/.test(workflow), 'Build jobs can bypass tag/version verification.');
assert((workflow.match(/GITHUB_EVENT_NAME[^\n]*pull_request/g) || []).length >= 2, 'Pull-request catalog fallback is missing from a build job.');
assert(!workflow.includes('com.harbor.tv_2.0.0_all.ipk'), 'TV artifact naming is hardcoded to one version.');
assert(androidActivity.includes('https://appassets.androidplatform.net/assets/index.html') && androidActivity.includes('WebViewAssetLoader'), 'Android TV does not load its bundled interface from a secure app-assets origin.');
assert(stageTv.includes("buildRoot, 'android-assets'") && stageTv.includes("buildRoot, 'samsung'"), 'Self-contained TV assets are not staged.');
assert(stageTv.includes('lgManifest.version = version') && stageTv.includes('stagedSamsungManifest'), 'TV manifest versions are not derived during staging.');
assert(stageTv.includes("replaceAll('src=\"../assets/harbor-mark.svg\"'"), 'LG staging does not inline every Harbor logo.');
assert(!sourcePackage.includes("new Set(['.png', '.log'])") && sourcePackage.includes("'LICENSE'"), 'Source archives omit runtime artwork or the license.');
assert(sourcePackage.includes("normalizedArchivePath.startsWith('tests/')"), 'Source archives should omit generated QA screenshots.');
assert(renderer.includes('inspectStreamGuest') && !renderer.includes("addEventListener('dom-ready', markStreamReady)"), 'Desktop player still treats DOM readiness as playback readiness.');
assert(main.includes("permission === 'fullscreen'") && !main.includes("['media', 'fullscreen', 'autoplay']"), 'Electron grants unnecessary media permissions.');
assert(!landing.includes('Universal DMG and ZIP builds.'), 'Landing page incorrectly claims a universal macOS binary.');

process.stdout.write('Release, signing, icon, and self-contained TV configuration verified.\n');
