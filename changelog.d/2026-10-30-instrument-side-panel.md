---
date: 2026-10-30
type: changed
impact: medium
title: Instrument side panel shows every setting, live status and activity
area: Laboratory setup
link: /configuration/instruments
pr: 35
release: 0.1.2
---
The instrument side panel now shows the connection settings, live status with the last error, result source, recent activity and who registered or changed the instrument, in groups you can collapse. **Result imports** can be filtered by instrument.

## Technical notes

Migration `lis-interfaces` 0005 adds created and changed user and time columns to `ifc_instruments`; analyzers registered earlier show "Not recorded". The last listener error is held in memory and clears on restart.
