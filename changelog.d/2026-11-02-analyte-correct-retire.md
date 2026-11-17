---
date: 2026-11-02
type: added
impact: high
title: Correct and retire analytes with a reason and history
area: Test catalog
link: /configuration/analytes
pr: 36
release: 0.1.2
---
Analytes can now be corrected and retired with a required reason, and each correction is kept in a history shown in the side panel. A code can change only while nothing uses the analyte. A retired analyte stays in existing records, is hidden from new pickers and is listed with **Show retired**.

## Technical notes

Migration `lis-catalog` 0008 adds `active` and `revision` to `cat_analytes` and the append-only `cat_analyte_history`. New commands `update_analyte`, `analyte_history` and `analyte_usage`; changes are audited as `catalog.update_analyte`.
