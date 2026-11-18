---
date: 2026-11-06
type: added
impact: medium
title: Find in Orders by patient, barcode, accession, order number or client
area: Front desk
link: /orders
pr: 70
release: 0.1.2
---
**Find** in Orders matches the start of the patient name, sample barcode, accession number, order number or client name, ignoring case. Paging and counts follow the search, Enter applies it at once so a scanned barcode shows its order, and the text stays in the page address.

## Technical notes

The search text is never logged or audited; `order.list` records only that a search was used.
