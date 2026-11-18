---
date: 2026-10-30
type: added
impact: high
title: Billing handoffs page lists every handoff
area: Billing
link: /billing/handoffs
pr: 27
release: 0.1.2
---
**Billing handoffs** lists every handoff, newest first, so acknowledged ones stay reachable with their items and outcome history. You can search by handoff number, accession number or date of service and load older handoffs.

## Technical notes

New audited read `list_billing_handoffs` requires the Billing role and records the number of rows searched and returned, not the search text.
