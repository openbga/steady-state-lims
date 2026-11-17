---
date: 2026-11-11
type: added
impact: medium
title: Duplicate analyzer messages are listed in Result imports
area: Review
link: /review/imports
pr: 87
release: 0.1.2
---
A file or message identical to an earlier one from the same instrument now appears in **Result imports** as **Duplicate - not imported**, with a page that links to the earlier attempt. A **Hide duplicates** filter leaves them out, and Retry import is refused for a duplicate.

## Technical notes

lis-results migration 0009 rebuilds `res_import_attempts` to allow the `duplicate` outcome and the link to the earlier receipt. Nothing is read or imported from a duplicate.
