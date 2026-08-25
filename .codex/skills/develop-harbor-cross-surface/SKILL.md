---
name: develop-harbor-cross-surface
description: Implement Harbor features that must stay behaviorally aligned across the Electron desktop client and remote-first TV client. Use when a request changes shared categories, catalog behavior, navigation, labels, or interaction patterns in both app/ and tv/.
---

# Develop Harbor Cross-Surface Features

Preserve unrelated changes in the dirty worktree and treat desktop pointer/keyboard behavior and TV D-pad behavior as equally important.

1. Inspect the affected desktop and TV render, state, styling, and test paths before editing. Prefer shared data or helpers when both clients can consume them without weakening Electron or TV compatibility.
2. Define one canonical behavior and vocabulary for both surfaces. Adapt layout and focus mechanics to each device instead of forking the underlying meaning.
3. Keep TV actions reachable with arrows, OK/Enter, and Back; keep desktop actions usable by pointer and keyboard. Avoid focus targets that remain active while hidden.
4. Add regression coverage for shared taxonomy or state logic and client-specific checks for rendered controls and labels. Run `npm test` plus the relevant smoke or harness checks.
5. Follow `ship-harbor-tv` for TV packaging or device installation and `package-electron-releases` for desktop versioning, packaging, installation, shortcut verification, and launch testing.
6. Report source behavior, tests, packaged artifacts, installed versions, and any platform validation that still requires physical hardware.

Example prompts:

- "Add the same genre filters to Harbor desktop and TV, with D-pad navigation on TV."
- "Rename a Harbor section and keep its catalog behavior synchronized across both clients."
