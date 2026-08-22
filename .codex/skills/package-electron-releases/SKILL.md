---
name: package-electron-releases
description: Package an Electron desktop application for Windows, Linux, and macOS, and use for every HarborList desktop change so the installed Windows copy is refreshed and verified before handoff.
---

# Package Electron Releases

Preserve the existing package manager, lockfile, app structure, and product behavior.

## Release workflow

1. Confirm the Electron main process uses `contextIsolation: true`, `nodeIntegration: false`, and a sandboxed renderer. Open only validated `http:` or `https:` destinations through the operating system browser.
2. Configure `electron-builder` targets for Windows portable or NSIS, Linux AppImage, and macOS DMG/ZIP. Keep application data and platform paths portable; never hardcode Windows-only paths in runtime code.
3. Run the renderer build and package the release for the current operating system. Fix build failures and launch the current-platform artifact once before handoff.
4. Add or maintain a three-OS CI build matrix when the user wants native downloads for every platform. Do not claim that an artifact was tested on an operating system where it was not run.
5. Deliver the current-platform binary plus a source bundle containing the cross-platform build configuration. Keep unsigned-build caveats concise and explicit when signing credentials were not provided.
6. For HarborList, treat every material source change as a release: bump the application version, build the Windows installer, update the installed per-user copy, verify both shortcuts resolve to that copy, and launch-test the installed executable. Do not stop at a development preview or source-only handoff unless the user explicitly requests that.
7. If an installer-created shortcut resolves to a sandbox or build-account path, repair it to the actual per-user install path and verify the shortcut target before handoff.

## Example prompts

- "Turn this Electron project into downloadable Windows, Linux, and macOS releases."
- "Build me a portable Windows executable and configure the same app for AppImage and DMG releases."
- "Change HarborList's categories, then update the copy installed on my computer."
