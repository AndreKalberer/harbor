---
name: ship-harbor-tv
description: Implement, verify, package, and optionally install Harbor TV client changes. Use for Harbor LG webOS, Samsung Tizen, Android TV, Fire TV, remote-navigation, TV layout, or embedded-playback fixes; do not use for desktop-only Harbor changes.
---

# Ship Harbor TV

Keep TV source changes in `tv/`; treat `tv/build/` and `tv/release/` as generated outputs. Preserve unrelated work in the dirty worktree.

1. Inspect `package.json`, the affected source, staging scripts, and relevant tests before editing.
2. For remote behavior, preserve LG's 5-way key codes (37–40, OK 13, Back 461), ensure every visible action has a deterministic focus path, and verify focus transfers into or out of embedded content deliberately.
3. Update meaningful regression checks with the behavior change. Run `npm test`, then run targeted TV QA when its harness is available.
4. Build LG with `npm run tv:lg`; use `npm run tv:stage` when validating all staged platform assets. Do not hand-edit generated build files.
5. Install to the configured `harbor-tv` device only when the user asked to update their TV. Use `ares-install -d harbor-tv <ipk>` and launch `com.harbor.tv` only when live verification is in scope. Never place device passphrases or keys in source, logs, docs, or the skill.
6. Report the source behavior changed, tests run, artifact path, and whether the physical device was installed or launched. Distinguish source-level verification from proof on real TV hardware.

Example prompts:

- "Fix Harbor's LG remote focus and put the new build on my TV."
- "Package the latest Harbor TV UI for LG and verify the generated bundle without launching it."
