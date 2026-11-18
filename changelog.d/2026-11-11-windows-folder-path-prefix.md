---
date: 2026-11-11
type: fixed
impact: low
title: Windows folders are shown without the \\?\ prefix
area: Interfaces
pr: 84
release: 0.1.2
---
Folders chosen for partner connections and instrument results are stored and shown in their usual form (`C:\...` or `\\server\share\...`), including in Overview, the Connections list and written paths in Logs.

## Technical notes

Folders stored earlier with the prefix keep working; the instrument folder-in-use check compares both forms.
