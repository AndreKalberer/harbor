# Harbor

Harbor is an entertainment hub with an Electron desktop app for Windows, macOS, and Linux, plus a remote-first TV client for Android TV/Fire TV, LG webOS, and Samsung Tizen.

Browse **Watch**, **Listen**, **Read**, and **Play** with search scoped to the current section. The desktop **My Harbor** library keeps favorites, history, playback progress, preferences, local media, and installed-game shortcuts on the device. TV clients provide their own local favorites and history; they do not sync with the desktop profile.

Harbor uses external catalog and playback services. A working interface or passing smoke test does not guarantee that a particular third-party stream is available. Catalog artwork, online searches, live channels, and provider playback require a network connection.

## Downloads

- [Official releases](https://github.com/AndreKalberer/harbor/releases/latest): tagged builds include SHA-256 checksums.
- [Download site](https://andrekalberer.github.io/harbor/): desktop and TV downloads.
- [TV sideloading guide](tv/README.md): platform setup and installation instructions.

For Windows, choose `Harbor-Setup-<version>-Windows-x64.exe` for an installed app or `Harbor-<version>-Windows-x64.exe` for the portable build. macOS builds provide DMG and ZIP files for Intel and Apple Silicon; Linux builds provide an x64 AppImage and tar.gz archive.

The desktop About screen checks the Stable GitHub release channel. Packaged apps expose update download and restart/install controls; users choose when to update. Third-party services have their own availability, privacy practices, and terms.

## Run from source

Use Node.js 22 or later and npm. GitHub Actions currently uses Node.js 22. Clone this repository, then run from its root:

```sh
npm ci
npm test
npm start
```

`npm ci` uses the committed lockfile and replaces an existing `node_modules/` directory. `npm start` launches Electron; it needs a graphical desktop session. There is no frontend bundler or separate development server for the desktop app.

The checked-in configuration has an empty TMDB key. The built-in desktop catalog remains available without a key; expanded TMDB search and metadata require configuration. TV TMDB discovery also needs a key. Other external catalogs and live channels depend on their respective services.

For a browser preview of the TV interface:

```sh
npm run qa:serve
```

Open [http://127.0.0.1:4382/tv/](http://127.0.0.1:4382/tv/). The root URL shows the download site. This is a development server, not the Electron desktop app or a TV-device compatibility test. Stop it with Ctrl+C.

### Optional TMDB configuration

Set `TMDB_API_KEY` in your shell, then run the appropriate command:

```sh
npm run configure:build                             # writes app/config.js
node scripts/configure-build.cjs --tv                # writes tv/config.js
node scripts/configure-build.cjs --desktop --tv      # writes both
```

Configuration is written into tracked client JavaScript and bundled into distributed applications. It is readable by recipients; it is not a server-side secret. Do not commit a populated `app/config.js` or `tv/config.js`, include credentials in screenshots, or distribute privileged credentials. With `TMDB_API_KEY` unset, rerun the same command to restore an empty configuration. Review `git diff` before committing. `--require` makes the script fail when a key is missing and is used by release CI.

## Repository map

- `app/`: desktop HTML/CSS, renderer, built-in catalog, artwork metadata, and generated catalog configuration.
- `electron/`: main process and preload bridge for native dialogs, media/game access, updates, and security boundaries.
- `shared/`: reusable browser/CommonJS modules for metadata, ranking, live TV, browsing, playback providers, saved state, artwork, and release information. Desktop and TV load different subsets of these modules.
- `tv/`: remote-driven HTML/CSS/JavaScript, webOS/Tizen manifests, and the Android WebView host.
- `scripts/`: configuration, icon rendering, TV staging, release archives, and generated-download cleanup.
- `tests/`: Node regression checks and Electron-driven desktop/player/TV smoke harnesses.
- `.github/workflows/build-desktop.yml`: validation, platform packaging, tagged releases, and GitHub Pages deployment.
- `index.html`: public download-site source.

Desktop entry points are `electron/main.cjs`, `electron/preload.cjs`, and `app/renderer.js`. The TV interface starts at `tv/index.html` and `tv/tv.js`. Browser assets are loaded directly; shared modules must remain compatible with every client that imports them.

## Verification and contributing

Read [AGENTS.md](AGENTS.md) for repository rules. Keep changes focused, preserve saved profiles, and use the check that covers the affected behavior:

```sh
npm test                       # syntax, shared logic, static audits, release configuration
npm run test:desktop-smoke     # desktop search, filters, library, and artwork
npm run test:player            # local player-fixture smoke test
npm run test:consumer          # npm test + desktop smoke + player fixture
npm run test:tv-smoke          # TV remote navigation, search, player, and episodes
npm run test:all               # consumer suite + TV smoke
npm run test:packaged-smoke    # previously built unpacked desktop app
```

The smoke runners launch Electron with temporary profiles and bounded timeouts. `test:packaged-smoke` requires an existing native build: on Windows it looks for `release/win-unpacked/Harbor.exe`. Browser-based TV smoke coverage does not replace testing on an actual TV or Android device. The local player-fixture test does not prove live provider availability.

For desktop behavior changes, run `npm run test:consumer`; for TV behavior changes, run `npm run test:tv-smoke`. Changes to shared navigation, categories, or browsing should be checked on both clients. Review the diff for generated files and configured keys. Publishing requires user approval under the repository instructions; use a working branch and draft PR when publishing work started from `main`.

## Build desktop packages

Run on the target operating system after installing dependencies and optionally configuring catalog access:

```sh
npm run dist:win:release        # Windows x64 installer and portable app
npm run dist:linux              # Linux x64 AppImage and tar.gz
npm run dist:mac                # macOS Intel/Apple Silicon DMG and ZIP
```

Desktop output goes to `release/`. Verify affected behavior in the unpacked app with `npm run test:packaged-smoke` before handing off an installer. The user performs installations and updates; do not run installers on their behalf.

The build hook prunes older generated Windows installers and matching blockmaps after a successful build. `node scripts/prune-old-downloads.cjs` runs that cleanup manually. Keep generated packages, local profiles, and dependencies out of commits.

### Release workflow

[Build and release Harbor](.github/workflows/build-desktop.yml) runs on pull requests, pushes to `main`, `v*` tags, and manual dispatch. Tags must match the version in `package.json`. The workflow builds desktop and TV artifacts and publishes a GitHub release only after the tagged build jobs succeed. GitHub Pages deployment runs on `main` after the desktop build job.

Pull-request builds permit an absent TMDB key; other workflow builds require `TMDB_API_KEY`. Tagged Windows, macOS, and Android releases also require signing credentials. Repository administrators configure these GitHub Actions secrets:

- Catalog: `TMDB_API_KEY`.
- Windows: `WIN_CSC_LINK`, `WIN_CSC_KEY_PASSWORD`.
- macOS signing: `MAC_CSC_LINK`, `MAC_CSC_KEY_PASSWORD`.
- Apple notarization: `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`.
- Android signing: `ANDROID_KEYSTORE_BASE64`, `ANDROID_STORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.

A local build command alone does not prove that an artifact is signed or notarized. CI uploads build artifacts for development/PR QA; non-tag Android builds use debug signing.

## Build TV packages

The interface is bundled locally in TV packages. Stage it after installing npm dependencies:

```sh
npm run tv:stage
```

This regenerates `tv/build/` and writes a versioned Samsung Tizen source ZIP to `tv/release/`.

- **LG webOS:** `npm run tv:lg` stages the client and invokes `@webos-tools/cli@3.2.5` through npx, which may download the CLI. Local IPKs are emitted to `tv/release/` as `com.harbor.tv_<version>_all.ipk`; CI renames the download to `Harbor-TV-LG-webOS-<version>.ipk`.
- **Android TV / Fire TV:** install Java 17, Gradle, and the Android SDK separately. CI uses Gradle 8.10.2 and the project targets SDK 35; no Gradle wrapper is checked in. After staging, `npm run tv:android` assembles a release variant in `tv/android/app/build/outputs/apk/release/`. Release signing is configured through `HARBOR_ANDROID_KEYSTORE`, `HARBOR_ANDROID_STORE_PASSWORD`, `HARBOR_ANDROID_KEY_ALIAS`, and `HARBOR_ANDROID_KEY_PASSWORD`. Without these variables, a local release variant is unsigned. For local debug QA use `gradle -p tv/android :app:assembleDebug`. CI copies its APK to `tv/release/Harbor-TV-Android-Fire-<version>.apk`.
- **Samsung Tizen:** staging creates `tv/release/Harbor-TV-Samsung-Tizen-<version>-source.zip`. Package/sign it using a certificate profile for the target TV; this repository has no generic pre-signed WGT build command.

See [the TV guide](tv/README.md) for sideloading and platform limitations. Platform tool installation and device installation are user-managed.

## Saved data and security

Desktop favorites, viewing history, progress, preferences, artwork cache, and installed-game paths stay in the local profile. Settings can export and restore validated JSON backups of favorites, history, progress, and preferences; installed-game paths are excluded. TV favorites/history use the TV client's local storage. There is no account-based cross-device sync.

The Electron renderer uses context isolation, the Chromium sandbox, and no Node integration. Native operations go through the preload bridge and main-process handlers. Embedded playback blocks popup windows and downloads; local EPUB content is sanitized. These boundaries do not make external providers controlled or operated by Harbor.

## Credits and license

Harbor is distributed under the [MIT license](LICENSE). It uses Electron, electron-updater, HLS.js, JSZip, PDF.js, TMDB, Open Library, iTunes Search, IPTV-org, and the curated YarrList directory. This product uses the TMDB API but is not endorsed or certified by TMDB. Catalog and playback disclosures are available inside the app.
