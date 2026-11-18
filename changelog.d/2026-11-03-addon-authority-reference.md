---
date: 2026-11-03
type: fixed
impact: medium
title: Add-on requests require an authority reference and name each blocking gate
area: Front desk
link: /orders
pr: 44
release: 0.1.2
---
An add-on with new authority now needs an authority reference when it is requested. When an order gate blocks an action, the message names the gate in plain words, and accepting an older add-on without a reference warns you to decline it and record a new request.
