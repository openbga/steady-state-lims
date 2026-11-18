---
date: 2026-10-23
type: fixed
impact: medium
title: People are shown by display name instead of internal user ID
pr: 4
release: 0.1.1
---
Screens that name who did something, such as the laboratory profile and the "Recorded by" column of correction histories, now show the account's current display name instead of its internal ID. A renamed account shows its new name everywhere.

## Technical notes

Stored records keep only the immutable user ID; the engine resolves names on each read, so no migration is needed. Affected views gain `*_display` fields.
