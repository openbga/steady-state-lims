---
date: 2026-11-18
type: added
impact: medium
title: See every row of an import attempt and what happened to it
area: Review
link: /review/imports
---
An import attempt in **Result imports** now opens on a **Rows** tab listing each row as received: record, sample label, test code, analyte, value and what happened to it (New result, Duplicate, Reprocessed, QC row, Quarantined or Measured, not ordered (kept)). A patient row links to its results in **Result review** and a QC row to its run's QC review. Filter the rows with **What happened**, or click a count under **Outcome** to show just those rows.

## Technical notes

Results migration 10 adds the append-only table `res_import_rows`, written by each new import attempt. Attempts imported before this version list no rows; their counts are unchanged. `get_import_attempt` returns the rows in a new `rows` field.
