# Harbor

Harbor is a cinematic entertainment hub for Windows, macOS, Linux, and TVs. Home, Watch, Listen, Read, and Play share one scoped search, while My Harbor keeps favorites, progress, history, local media, and installed games on the device.

Watch includes movies, television, anime, sports, and live TV. Listen includes music, soundtracks, radio, podcasts, and audiobooks. Read includes books, comics, manga, and light novels. Play browses games and can reopen installed titles without exposing their paths to the page.

Sports and Live TV use IPTV-org's public playlists inside Harbor's native HLS/video player. Category and sport chips can be combined with country, language, and scoped search filters. Harbor rejects non-HTTPS, adult, blocked, header-dependent, duplicate, and unsupported stream formats; groups alternate feeds by channel; and temporarily quarantines feeds after repeated playback failures. Favorites remain on the device. Programme-guide listings appear when IPTV-org publishes a current XMLTV source for the selected channel; most channels currently show an honest schedule-unavailable state while remaining playable.

## Downloading

The public download site is prepared for `https://andrekalberer.github.io/harbor/`. Tagged builds publish to `https://github.com/AndreKalberer/harbor/releases/latest` with SHA-256 checksums.

Windows users should normally choose `Harbor-Setup-<version>-Windows-x64.exe`. A portable Windows build, macOS DMG/ZIP files for Apple Silicon and Intel, Linux AppImage/tar.gz files, an LG webOS IPK, and an Android/Fire TV APK are produced by the release workflow. Versioned Samsung Tizen source is included because each sideloaded WGT must be signed with the certificate profile for the target TV.

The workflow refuses to publish a tagged Windows, macOS, or Android release without the appropriate signing credentials. Development and pull-request artifacts can remain unsigned or debug-signed for QA. Configure these repository secrets before the first public tag:

- `TMDB_API_KEY` for expanded Watch catalog metadata in packaged desktop builds
- `WIN_CSC_LINK` and `WIN_CSC_KEY_PASSWORD` for Windows Authenticode signing
- `MAC_CSC_LINK` and `MAC_CSC_KEY_PASSWORD` for Apple Developer ID signing
- `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID` for Apple notarization
- `ANDROID_KEYSTORE_BASE64`, `ANDROID_STORE_PASSWORD`, `ANDROID_KEY_ALIAS`, and `ANDROID_KEY_PASSWORD` for Android/Fire TV release signing

Harbor keeps updates user-controlled. Open **About and updates**, use **Open downloads**, then select the downloaded release in Harbor. Harbor validates its platform, filename, and SHA-256 hash against the official GitHub release before opening it.

The About screen checks the Stable release channel automatically, identifies newer official releases, explains Harbor's privacy boundaries and configured playback providers, and provides privacy-safe device diagnostics for support.

## Personal data and resilience

My List, viewing history, playback progress, preferences, and installed-game paths remain in the local Harbor profile. Harbor migrates older profile data into its current versioned schema and retains unreadable state for recovery instead of silently overwriting it.

**My Harbor → Settings** can create or restore a validated JSON backup containing favorites, history, progress, and preferences. Installed-game paths are deliberately excluded. Trusted TMDB, Open Library, and iTunes artwork is cached locally with a 100 MB limit; unavailable artwork always falls back to a labeled card.

Playback is still provided by Harbor's existing third-party routes. Harbor does not operate those services or control their availability, content, privacy practices, or terms.

## Run locally

Install Node.js 22 or later, then run:

```sh
npm install
npm run test:all
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

Release QA uses fresh temporary profiles and bounded timeouts:

```sh
npm test                       # syntax, security, data, and release checks
npm run test:desktop-smoke     # source-mode desktop behavior
npm run test:packaged-smoke    # current packaged Windows app
npm run test:tv-smoke          # TV D-pad, Back, search, player, and episode behavior
```

CI runs the isolated desktop smoke suite before Windows packaging, the packaged-app suite before Windows artifact upload, and the TV remote-navigation suite before TV packaging.

## TV clients

The remote-first TV interface lives in `tv/`. Release packages bundle the interface locally for faster, more resilient startup; catalog artwork, search providers, and playback still require a network connection. It has large-screen layouts, D-pad navigation, scoped categories, live country/language filters, My Harbor, and an in-app player that hands remote focus to the playback controls. Samsung packages use an explicit CDN allowlist and automatically hide other unsupported IPTV feeds; Android uses the secure `appassets.androidplatform.net` origin for bundled assets and network catalogs.

```sh
npm run tv:stage
npm run tv:lg
npm run tv:android
```

TV artifacts are written to `tv/release/`. See [tv/README.md](tv/README.md) for sideload instructions and platform limitations.

## Security model

The Electron renderer uses context isolation, no Node integration, and the Chromium sandbox. Embedded playback denies popup windows and downloads. Local EPUB markup is sanitized, remote book content is discarded, and game launches use temporary renderer-bound tokens. External support, TMDB, release, and curated-directory destinations are resolved from fixed or validated allowlists rather than arbitrary renderer URLs.

## Credits

This product uses the TMDB API but is not endorsed or certified by TMDB. Catalog and playback disclosures are available inside **About and updates**. Additional functionality uses HLS.js, JSZip, PDF.js, Open Library, iTunes Search, IPTV-org, and the curated YarrList directory.
