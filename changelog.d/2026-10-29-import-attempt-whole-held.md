---
date: 2026-10-29
type: fixed
impact: low
title: Import attempts say when a whole message or file was held
area: Review
link: /review/imports
pr: 20
release: 0.1.2
---
When a whole analyzer message or result file is refused, the import attempt page now says "The whole message was held" or "The whole file was held" with the row count, instead of "No rows were quarantined". A file's **Quarantined** tab count matches the Outcome.
