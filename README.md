# Harbor

Harbor is a cinematic entertainment hub for Windows, macOS, Linux, and TVs. Home, Watch, Listen, Read, and Play share one scoped search, while My Harbor keeps favorites, progress, history, local media, and installed games on the device.

Watch includes movies, television, anime, sports, and live TV. Listen includes music, soundtracks, radio, podcasts, and audiobooks. Read includes books, comics, manga, and light novels. Play browses games and can reopen installed titles without exposing their paths to the page.

## Downloading

The public download site is prepared for `https://andrekalberer.github.io/harbor/`. Tagged builds publish to `https://github.com/AndreKalberer/harbor/releases/latest` with SHA-256 checksums.

Windows users should normally choose `Harbor-Setup-<version>-Windows-x64.exe`. A portable Windows build, a universal macOS DMG/ZIP, Linux AppImage/tar.gz files, an LG webOS IPK, and an Android/Fire TV APK are produced by the release workflow. Versioned Samsung Tizen source is included because each sideloaded WGT must be signed with the certificate profile for the target TV.

Releases are currently unsigned. Windows SmartScreen and macOS Gatekeeper may show a first-run warning. The workflow is ready to use these repository secrets when signing credentials are available:

- `TMDB_API_KEY` for expanded Watch catalog metadata in packaged desktop builds
- `CSC_LINK` and `CSC_KEY_PASSWORD` for desktop signing
- `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID` for Apple notarization

Harbor deliberately keeps updates user-controlled until signed releases are available. Open **About and updates**, use **Open downloads**, then select the downloaded release in Harbor so its platform and filename can be validated before launch.

## Run locally

Install Node.js 22 or later, then run:

```sh
npm install
npm test
npm start
```

The checked-in catalog configuration contains no credential. For expanded Watch metadata in a local packaged build, set `TMDB_API_KEY` in the environment and run `npm run configure:build` before building. Harbor keeps its built-in catalog available when the key is absent.

## Build desktop downloads

Build on the operating system being targeted:

```sh
npm run dist:win:release
npm run dist:linux
npm run dist:mac
```

Desktop artifacts are written to `release/`.

## TV clients

The remote-first TV interface lives in `tv/` and is deployed with the download site. It has large-screen layouts, D-pad navigation, scoped categories, My Harbor, and a sandboxed in-app player.

```sh
npm run tv:stage
npm run tv:lg
npm run tv:android
```

TV artifacts are written to `tv/release/`. See [tv/README.md](tv/README.md) for sideload instructions and platform limitations.

## Security model

The Electron renderer uses context isolation, no Node integration, and the Chromium sandbox. Embedded playback denies popup windows and downloads. Local EPUB markup is sanitized, remote book content is discarded, and game launches use temporary renderer-bound tokens. Only the fixed official Harbor Releases URL can be opened externally from the update screen.
