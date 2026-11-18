---
date: 2026-11-10
type: changed
impact: medium
title: HL7 results wait when the patient has no identifier
area: Interfaces
link: /interfaces/logs
pr: 79
release: 0.1.2
---
An HL7 result for a patient with no identifier is no longer sent with an empty PID-3. It waits, and Logs Details say to add an identifier on the patient's page; report release, PDF and billing deliveries are not affected. When the released report names no identifier, PID-3 carries the patient's active identifiers at send time.

## Technical notes

Adding an identifier after release opens the report's impact review, so the delivery goes after the review is recorded as no impact.
