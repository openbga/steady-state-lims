---
date: 2026-11-17
type: changed
impact: high
title: The project is licensed under AGPL-3.0-only
pr: 112
---
The application is now licensed under the GNU Affero General Public License version 3 only, with the copyright and trademark notice of BGASoft Inc. and OpenBGA contributors in the README, NOTICE, website, installer metadata and release notes.

## Technical notes

- `LICENSE` is the unmodified AGPLv3 text; the Cargo workspace, npm packages, lockfile, Tauri bundle and dependency policy use the `AGPL-3.0-only` identifier.
- Builds published earlier remain under GPL-3.0-only.
- The documentation now describes AGPLv3 section 13 for network use, and the notice states that the product name, OpenBGA and their logos are trademarks of BGASoft Inc. that the license does not grant (section 7(e)).
