---
date: 2026-10-27
type: fixed
impact: medium
title: Results that are already approved cannot be approved again
area: Review
pr: 6
release: 0.1.2
---
On a specimen's Result review page, **Approve results** now sends only revisions without a current approval. When every current result is approved, the page says so and **Reject results** becomes **Withdraw approval**, which needs a reason. A repeat approval is refused instead of recording a second review.
