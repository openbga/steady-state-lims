---
date: 2026-11-06
type: changed
impact: low
title: Recovery kit files are named with the date and kit number
area: System
link: /operations/recovery-kit
pr: 68
release: 0.1.2
---
The save dialog proposes a recovery kit file name that includes the laboratory's local day and the kit number, so two exports on one day differ. The name keeps only the date if the kit number cannot be read.

## Technical notes

Name form: `toxicology-lims-recovery-kit-<YYYY-MM-DD>-kit<N>.txt`. Readers do not depend on the file name, so older files stay valid.
