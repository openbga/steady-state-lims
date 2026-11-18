---
date: 2026-11-06
type: added
impact: medium
title: Accession column in Orders
area: Front desk
link: /orders
pr: 70
release: 0.1.2
---
**Orders** shows an Accession column after Sample barcode. Each number opens its accession, several are comma-separated, and Not received yet shows when there is none. The column can be sorted.

## Technical notes

Specimens migration 0005 adds an index on `spc_accessions(order_id)`.
