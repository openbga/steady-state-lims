---
date: 2026-11-20
type: changed
impact: medium
title: The Windows installer lists duplicate earlier installations
area: System
---
When a Windows computer has more than one installation under an earlier product name (Vibe Tox LIS, OpenBGA Tox or Steady State LIMS) in different folders, the installer still stops, but its message now lists each installation with its version and folder, names the one to keep and tells you to remove the others in Windows Settings › Apps › Installed apps. Leave **Delete the application data** unchecked when uninstalling; the laboratory data is then not removed. The installer does not uninstall anything itself.

## Technical notes

The NSIS pre-install hook collects every validated former registration and keeps the newest version (the most recent product name on equal versions). The downgrade check now runs once against the kept installation.
