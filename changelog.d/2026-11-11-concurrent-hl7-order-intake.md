---
date: 2026-11-11
type: fixed
impact: low
title: Concurrent reads of the same HL7 order file no longer record a duplicate receipt
area: Interfaces
pr: 89
release: 0.1.2
---
Two intake passes that read the same HL7 order file at once could record an extra duplicate receipt and compete to move the file. Intake passes now run one at a time.
