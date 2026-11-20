---
date: 2026-11-18
type: changed
impact: high
title: Choose the patient of a new order from one search box
area: Front desk
link: /orders/new
---
**New order** now starts with **Who is the order for?**: one box finds patients by name, birth date or identifier as you type, and each row shows the birth date with the age, sex, identifiers and the patient's last order. Click a row, or use the arrow keys and Enter, to go on to the order details. The patients you entered orders for recently are one click away, **Register patient** sits right under the results, and the exact searches are folded under **Exact search**. The patient find on **Patients** and the **Find** on **Orders** also match an exact birth date (YYYY-MM-DD).

## Technical notes

New audited query `find_order_patients` (order-entry authority; audit action `order.find_patients`, recording only whether find text was used and the counts). No database migration.
