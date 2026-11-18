---
date: 2026-11-08
type: added
impact: high
title: Reject held order messages by hand and resolve rejections
area: Interfaces
link: /interfaces/logs
pr: 75
release: 0.1.2
---
In **Logs**, the row menu has **Reject** for an order message that is waiting for its patient or held for review, and **Mark resolved** for a rejected message, each with a note. A rejection stays under the **Rejected** tab until someone resolves it; a resolved one moves to All and its Details record who resolved it and when.

## Technical notes

- Interfaces migration 0016 adds the append-only table `ifc_partner_rejection_resolutions`; the note is 1-500 characters.
- New audited commands `reject_received_message` and `resolve_partner_rejection`, which need the configuration-management capability. A manually rejected message never becomes an order, and the clinic is not told.
