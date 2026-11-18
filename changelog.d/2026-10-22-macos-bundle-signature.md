---
date: 2026-10-22
type: fixed
impact: medium
title: macOS app bundle passes signature verification
pr: 3
release: 0.1.1
---
The macOS download now carries an ad hoc signature that seals the whole application bundle, so it no longer reports a damaged signature. macOS still asks for a Gatekeeper exception because the publisher is not identified.

## Technical notes

Tauri's macOS signing identity is set to ad hoc (`-`), and the package workflow rejects a build whose app fails `codesign --verify --deep --strict`. Developer ID signing and notarization are not part of this change.
