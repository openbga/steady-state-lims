---
date: 2026-11-12
type: changed
impact: medium
title: Logs say which interface contract check holds a message
area: Interfaces
link: /interfaces/logs
pr: 99
---
A message held by its connection's acceptance gate now says which check holds it: contract not approved, tests not run, tests failed or tests out of date. **Open interface contract** in the Details opens the connection's contract dialog.

## Technical notes

The reason is computed when read and never stored, so there is no migration.
