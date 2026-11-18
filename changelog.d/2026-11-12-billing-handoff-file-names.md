---
date: 2026-11-12
type: changed
impact: medium
title: Billing handoff files are named with the handoff ID and accession
area: Billing
link: /billing/handoffs
pr: 103
---
**Export file** in Billing handoffs saves `bh-<handoff ID>_<accession>.json`. A handoff with several accessions uses the lowest one followed by `_plus<n>`, and an existing file is never replaced.

## Technical notes

- Billing JSON connections gain the placeholders `{handoff_id}` and `{accession}`; `{handoff}` or `{handoff_id}` is required. New connections default to `bh-{handoff_id}_{accession}.json`.
- Saved patterns are not migrated and keep writing the same names.
- Interfaces Logs shows the accession as the message's source label; searching by handoff number still works.
