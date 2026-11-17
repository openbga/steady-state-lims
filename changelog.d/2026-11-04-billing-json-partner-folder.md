---
date: 2026-11-04
type: added
impact: high
title: Billing files to a partner folder with an Interfaces menu
area: Interfaces
link: /interfaces/connections
pr: 50
release: 0.1.2
---
The **Interfaces** menu has Connections, Logs and Unrouted messages. A connection writes billing JSON files to a partner folder, with routing rules by client, practitioner NPI, location and test, a schedule and a file name pattern. Nothing with patient data is written until a destination check covers the current folder.
