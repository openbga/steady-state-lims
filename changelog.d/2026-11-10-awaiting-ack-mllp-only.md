---
date: 2026-11-10
type: fixed
impact: low
title: Awaiting application ACK appears only for MLLP connections the LIS sends to
area: Interfaces
link: /interfaces/connections
pr: 83
release: 0.1.2
---
The Awaiting application ACK line, column and Waiting for acknowledgement card now apply only to **MLLP - LIS connects** connections, because folder and SFTP partners never send an application acknowledgement. The card is hidden when there are no such connections.
