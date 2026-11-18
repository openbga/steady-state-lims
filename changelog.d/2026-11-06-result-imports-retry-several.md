---
date: 2026-11-06
type: added
impact: medium
title: Retry several quarantined result imports at once
area: Review
link: /review/imports
pr: 69
release: 0.1.2
---
Quarantined attempts have checkboxes, **Select all quarantined** and **Retry selected**, which takes one reason. Each message is retried and audited separately; a refusal is shown and **Retry the rest** continues.
