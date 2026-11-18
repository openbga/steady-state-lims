---
date: 2026-11-11
type: security
impact: high
title: Bundled SQLite updated to 3.54.1
area: System
pr: 89
release: 0.1.2
---
The bundled SQLite is updated to version 3.54.1, which fixes an advisory where a database opened with a crafted write-ahead log file of a different page size could return uninitialized memory.

## Technical notes

- `rusqlite` 0.40.2 to 0.41.1 and `libsqlite3-sys` 0.38.2 to 0.39.1 (advisory RUSTSEC-2026-0459). The minimum SQLite version in the coding standards is now 3.54.0.
- The storage layer's transaction-control guard was adapted to the new API with unchanged behavior.
