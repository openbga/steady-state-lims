---
date: 2026-11-05
type: added
impact: medium
title: Enable or disable listening for all instruments at once
area: Laboratory setup
link: /configuration/instruments
pr: 65
release: 0.1.2
---
**Enable all** and **Disable all** in the Instruments page header change every instrument that would change, after a confirmation that lists them. A message then reports how many changed, which were refused and why, and any listener that could not start.

## Technical notes

Each instrument is changed through the existing enable command and gets its own `interface.set_enabled` audit event; listeners restart after each instrument.
