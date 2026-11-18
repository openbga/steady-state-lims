---
date: 2026-11-06
type: changed
impact: medium
title: Audit trail Find searches readable names, not only record IDs
area: Quality and audit
link: /audit
pr: 59
release: 0.1.2
---
**Find** in the Audit trail now looks up a record by instrument code or name, username, accession, report number, container label, order number, practitioner name or NPI, client name or code, billing handoff number and similar values. Type at least two characters, pick the record, and Record type follows your choice; the full Record ID still works. Patients are searched by name only for people who may see patient names.

## Technical notes

New engine query `find_audit_records`. Each search is recorded as an access event without the typed text.
