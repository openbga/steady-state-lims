---
date: 2026-11-11
type: changed
impact: medium
title: Report file names use {report} for the report number and {accession} for the accession
area: Interfaces
link: /interfaces/connections
pr: 85
release: 0.1.2
---
In file name patterns for Report PDF and HL7 Results connections, `{report}` is now the report number and is required together with `{revision}`. `{accession}` is the accession number alone and is optional.

## Technical notes

- Interfaces migration 0017 rewrites stored patterns from `{accession}` to `{report}`, so existing connections keep writing the same file names and keep their acceptance.
- A new pattern that uses only `{accession}` and `{revision}` is refused.
