---
date: 2026-11-06
type: added
impact: medium
title: Audit events show which fields they changed
area: Quality and audit
link: /audit
pr: 59
release: 0.1.2
---
Opening an audit event shows a **Changes** table with Field, Old and New values for patients, the laboratory profile, clients, locations, practitioners, analytes and instruments. Patient values are shown only to people allowed to see them; others see the field names with Hidden. Opening the table is itself recorded in the Access stream.

## Technical notes

Values are read from each record's own revision history; audit events still store no values.
