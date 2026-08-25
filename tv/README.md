# Harbor TV sideloading

Harbor TV is a remote-first client. Android, LG, and Samsung release packages bundle the interface so startup does not depend on GitHub Pages. Catalog artwork, provider searches, and playback still require a network connection, and interface updates require installing a new package.

## Android TV and Fire TV

Use `Harbor-TV-Android-Fire-<version>.apk`.

1. Enable Developer options and USB or network debugging on the TV.
2. Connect with Android Debug Bridge.
3. Run `adb install -r Harbor-TV-Android-Fire-<version>.apk`.
4. Harbor appears in the TV launcher because the package declares the Leanback launcher category and does not require a touchscreen.

Pull-request APKs are debug builds for QA. Tagged release APKs require a private long-lived signing key so sideloaded upgrades keep the same application identity.

## LG webOS

Use `Harbor-TV-LG-webOS-<version>.ipk`.

1. Install LG's **Developer Mode** app on the TV, sign in with an LG developer account, and enable Developer Mode.
2. Install the current `@webos-tools/cli` on a computer connected to the same network.
3. Add the TV with `ares-setup-device`, retrieve its key with `ares-novacom --getkey`, then install Harbor with `ares-install -d <device> Harbor-TV-LG-webOS-<version>.ipk`.
4. Launch it with `ares-launch -d <device> com.harbor.tv`.

Developer Mode is time-limited. Extend the session before it expires or developer-installed apps are removed. This is an LG platform restriction, not a Harbor restriction.

Official setup: https://webostv.developer.lge.com/develop/getting-started/developer-mode-app

## Samsung Tizen

Samsung TVs require every sideloaded WGT to be signed for the target TV, so Harbor ships `Harbor-TV-Samsung-Tizen-<version>-source.zip` instead of pretending one generic WGT will install everywhere.

1. Install Tizen Studio, the TV Extensions, and the Samsung Certificate Extension.
2. In the TV's Apps settings, enter `12345`, enable Developer Mode, enter the computer's IP address, and reboot.
3. Create a Samsung TV certificate profile tied to the TV.
4. Import the Harbor source ZIP, build it, then run `tizen package -t wgt -s <profile> -- <build-directory>`.
5. Install the signed WGT from Tizen Studio or with `tizen install` while the TV and computer are on the same network.

Samsung no longer supports installing TV widgets directly from USB. Developer Mode plus a TV-specific certificate is the supported sideload route.

Official setup: https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/tv-device.html

## Browser-only fallback

Any modern smart TV browser can open `https://andrekalberer.github.io/harbor/tv/` directly. Bookmark it if the platform does not support one of the packages above.
