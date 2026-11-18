---
date: 2026-11-06
type: added
impact: medium
title: Filters and search in Result imports
area: Review
link: /review/imports
pr: 69
release: 0.1.2
---
**Result imports** can be filtered by Outcome and by received-from and received-to days, and searched by sample label, accession, container label or file name. The list has a Received column, and the filters stay in the page address.

## Technical notes

- New database views `ifc_v_receipt_arrivals` (interfaces migration 0013) and `ana_v_qc_receipt_positions` (analytical migration 0009).
- Searching is audited without the typed text.
