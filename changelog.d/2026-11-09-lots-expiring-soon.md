---
date: 2026-11-09
type: added
impact: high
title: Warning before a lot expires, with a Lots expiring soon work queue
area: Work queues
link: /work-queues
pr: 78
release: 0.1.2
---
**Operations settings** has a new Lots setting, **Warning before a lot expires** (1-365 days, default 14). Lots inside that period appear in the **Lots expiring soon** work queue, show an Expires in N days badge in the Lots list, and trigger a warning, without blocking, when chosen for a new run. Expired lots stay blocked as before.

## Technical notes

Runtime settings migration 6 adds the column; earlier settings versions take the default of 14 days.
