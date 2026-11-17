---
date: 2026-10-26
type: added
impact: medium
title: Sample barcode column in Orders
area: Front desk
link: /orders
pr: 5
release: 0.1.2
---
The Orders list has a **Sample barcode** column showing the label codes of each order's primary containers, so several orders for one patient are easy to tell apart. An order with no accessioned sample shows "None received". The column sorts in both directions.

## Technical notes

`OrderSummary` gains `sampleBarcodes`. No schema migration.
