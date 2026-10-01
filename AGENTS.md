# Harbor project instructions

These instructions apply throughout this repository.

## Finish and publish verified work

- After a change is confirmed working and its relevant checks pass, commit the completed changes and push them to GitHub as part of finishing the task.
- Review the diff and include only changes belonging to the task. Keep secrets, local profiles, dependencies, and generated installers out of commits.
- Use a working branch and a draft pull request for changes started from the default branch. Report the commit and pull request when finished.
- If a check fails or behavior remains unverified, fix it before publishing or clearly report what is blocked; do not describe it as confirmed working.

## The user performs installations

- The user performs all software installations and updates.
- Do not run installers from the terminal, use silent or unattended installation, or install an application on the user's behalf.
- You may prepare, build, download, and verify an installer using tools that are already installed.
- When an installer is ready, open its containing folder in File Explorer with the installer selected. Let the user open the file and complete installation themselves.
- Give the user the exact installer filename and folder. Do not launch the installer or claim installation is complete until the user confirms it.
- For Harbor Windows builds, use the installer in `release/`, named `Harbor-Setup-<version>-Windows-x64.exe`.

## Verification

- Run checks appropriate to the change; desktop behavior changes normally use `npm run test:consumer`.
- When producing a desktop installer, verify the affected behavior in the packaged app before handing the installer to the user.
- Preserve the user's saved library, settings, and profile data during testing; use isolated temporary test profiles.
