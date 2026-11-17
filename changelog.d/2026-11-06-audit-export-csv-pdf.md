---
date: 2026-11-06
type: added
impact: high
title: Export the audit trail as CSV or PDF
area: Quality and audit
link: /audit
pr: 59
release: 0.1.2
---
**Export** in the Audit trail header writes every event that matches the filters, not only the loaded page, to Downloads: **CSV, for analysis** or **PDF, for printing**. The PDF lists the laboratory, filters, export time, exporter and event count, and marks each page as confidential when it contains patient information.

## Technical notes

- Limits: 50,000 events for CSV and 2,000 for PDF; above them nothing is written and the page asks to narrow the filters.
- Each export is recorded in the Security stream as `Export events`.
- Needs both the audit-view and the export capability (Auditor and Administrator roles today). Adds the report template `audit-export` version 1.
