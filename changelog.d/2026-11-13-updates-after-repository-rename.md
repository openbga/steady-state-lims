---
date: 2026-11-13
type: fixed
impact: medium
title: In-app updates keep working after the repository is renamed
area: System
link: /operations/versions
pr: 105
release: 0.1.2
---
Available updates stopped listing new builds after the project repository was renamed. Updates are found again, and packages are still installed only with the project's signature.

## Technical notes

- Builds from this version on read the repository named in the update feeds (`latest.json` and `nightly.json` now carry a `repository` field) and accept it for the download address.
- For builds that predate this change, the feed also lists the newest nightly under each former repository name and publishes `latest-<owner>-<name>.json` copies with the nightly release.
