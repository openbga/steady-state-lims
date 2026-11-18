---
date: 2026-10-28
type: added
impact: high
title: Choose and preview report layouts under Report templates
area: Reports
link: /reports/templates
pr: 13
release: 0.1.2
---
**Report templates** offers the Classic layout and the Standard, Compact and Results first layouts for the report PDF, with a preview built from synthetic content. An administrator saves a layout as a draft and a quality manager approves or rejects it. Issued reports keep the layout they were prepared with, and the released revision's provenance shows it.

## Technical notes

New commands record `report.draft_layout`, `report.approve_layout` and `report.reject_layout`. The new layouts are Typst templates with pinned digests; Classic (`tox-report` v3) stays the default until a layout is approved.
