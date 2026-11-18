---
date: 2026-10-27
type: added
impact: high
title: Check, download and install updates from Versions and updates
area: System
link: /operations/versions
pr: 11
release: 0.1.2
---
**Versions and updates** has an **Available updates** tab that checks for official releases and nightly builds, downloads the package and installs it. Every installation still needs a recorded approval and a verified pre-update backup.

## Technical notes

Update packages are verified with a Minisign signature and signed version. The package workflow signs packages and publishes `latest.json` and `nightly.json` only when the secrets `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` and the variable `TAURI_UPDATER_PUBKEY` are set; with only one set the build fails. The newest ten `nightly-<date>.<run>` releases are kept. Adds `tauri-plugin-updater` 2.14. Installation needs the manage-configuration capability and is audited as `ops.install_update`.
