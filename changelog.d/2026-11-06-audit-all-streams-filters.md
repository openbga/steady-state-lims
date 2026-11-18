---
date: 2026-11-06
type: changed
impact: medium
title: Audit trail opens on all streams with filters for days, who acted and outcome
area: Quality and audit
link: /audit
pr: 59
release: 0.1.2
---
The **Audit trail** now opens on **All streams** and has a Stream column, so a change such as a laboratory profile update shows up when the page opens. Filters for the days recorded, who acted (anyone, people only, system only, or one user) and the outcome (Succeeded, Failed or Denied) combine with each other, and **Clear filters** resets them.

## Technical notes

- Audit migration 0004 adds the index `audit_events_by_time`; it changes no event or chain input.
- **Verify chain** is unavailable on All streams because each stream keeps its own chain.
- Filters are applied in the query before the 100-event page. Reading the trail is still recorded as an `access` event.
