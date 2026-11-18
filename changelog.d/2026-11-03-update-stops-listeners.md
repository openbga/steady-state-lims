---
date: 2026-11-03
type: changed
impact: medium
title: Updates stop and restart analyzer listeners automatically
area: System
link: /operations/versions
pr: 49
release: 0.1.2
---
Installing an update no longer requires disabling analyzers by hand. The update waits for messages in progress, stops the listeners, and starts them again after the restart. The sign-in screen reports how many analyzers are listening again and names any that did not start.

## Technical notes

New commands `stop_listeners_for_update` and `get_listener_restart`; the wait is up to 60 seconds. Instrument enabled settings are not changed.
