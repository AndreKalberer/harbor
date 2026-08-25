---
name: develop-harbor-cross-surface
description: Implement Harbor features that must stay behaviorally aligned across the Electron desktop client and remote-first TV client. Use when a request changes shared categories, catalog behavior, navigation, labels, or interaction patterns in both app/ and tv/.
---

# Develop Harbor Cross-Surface Features

Preserve unrelated changes in the dirty worktree and treat desktop pointer/keyboard behavior and TV D-pad behavior as equally important.

1. Inspect the affected desktop and TV render, state, styling, and test paths before editing. Prefer shared data or helpers when both clients can consume them without weakening Electron or TV compatibility.
2. Define one canonical behavior and vocabulary for both surfaces. Adapt layout and focus mechanics to each device instead of forking the underlying meaning.
   - For public live-catalog integrations, normalize upstream metadata into a shared Harbor model; validate URL schemes and stream formats; reject missing, blocked, unsafe, duplicate, or stale entries; and cache the last successful catalog so upstream outages do not erase the UI.
   - Treat guide data as optional and freshness-bounded. A playable channel must remain discoverable when current programme data is unavailable.
   - Present live schedules consistently across desktop and TV: separate the current programme from upcoming entries, group future listings into same-day and seven-day windows, and never manufacture schedule data when the upstream guide is sparse.
   - For installed desktop updates, keep checks background-only and installation user-controlled. Use signed release metadata, expose download progress through the isolated preload bridge, retain a manual verified-installer fallback, and require an explicit restart-to-install action.
3. Keep TV actions reachable with arrows, OK/Enter, and Back; keep desktop actions usable by pointer and keyboard. Avoid focus targets that remain active while hidden.
4. Add regression coverage for shared taxonomy or state logic and client-specific checks for rendered controls and labels. Run `npm test` plus the relevant smoke or harness checks.
5. Follow `ship-harbor-tv` for TV packaging or device installation and `package-electron-releases` for desktop versioning, packaging, installation, shortcut verification, and launch testing.
6. Report source behavior, tests, packaged artifacts, installed versions, and any platform validation that still requires physical hardware.

Example prompts:

- "Add the same genre filters to Harbor desktop and TV, with D-pad navigation on TV."
- "Rename a Harbor section and keep its catalog behavior synchronized across both clients."
- "Integrate a public live-channel catalog with safe native playback, filters, favorites, and guide data on Harbor desktop and TV."
