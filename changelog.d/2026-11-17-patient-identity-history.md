---
date: 2026-11-17
type: added
impact: medium
title: Patient page shows Identity history for a resolved incomplete intake
area: Front desk
link: /patients
pr: 107
---
A patient who was chosen to resolve an incomplete intake has an **Identity history** section with the intake reference, what was supplied, birth information, who resolved it and when, and a link to the audit trail.

## Technical notes

`get_subject` returns `resolvedIntakes` on the patient's existing audited read.
