---
date: 2026-11-11
type: added
impact: medium
title: Warn before closing or signing out with an unsaved page form
pr: 86
release: 0.1.2
---
Closing the application or signing out with a half-filled full-page form (such as New order, Receive specimens or Register patient) asks **Leave without saving?** first, and Cancel is the default so Enter keeps the page open. If work is also in progress, one quit warning lists both.
