---
date: 2026-11-17
type: changed
impact: high
title: The application is named OpenBGA Toxicology LIMS
link: /about
pr: 113
release: 0.1.2
---
The application, its window titles, installers, website and documentation use the name **OpenBGA Toxicology LIMS**, with the full-name lockup on the sign-in card and top bar. Existing installations and data carry over without changes to stored records or credentials.

## Technical notes

- Download filenames are `toxicology-lims_<version>_<os>-<arch>.<ext>`. New recovery kit files use `toxicology-lims-recovery-kit-` and new exit-export folders `toxicology-lims-exit-`; older names stay valid because readers do not depend on the prefix.
- The data folder, bundle identifier, executable name (`lis-desktop`), key-store and security-key identities, saved preference keys and data formats are unchanged. Credentials are not rotated and stored records are not rewritten.
- The Windows installer migrates a recognized earlier per-user installation: it keeps its directory, moves matching shortcuts and retires the old uninstall entry. Ambiguous installations or a different chosen directory stop the installation for manual reconciliation. Application data is never removed.
- The Debian package declares Conflicts, Replaces and Provides for the earlier package names so the new package can take over `lis-desktop`.
