---
date: 2026-11-05
type: added
impact: high
title: Receive HL7 orders from a folder or SFTP
area: Interfaces
link: /interfaces/connections
pr: 53
release: 0.1.2
---
An HL7 Orders connection reads OML^O21 and ORM^O01 files from a folder or SFTP and creates orders as Received for a person to accept in Orders. An unknown patient waits for registration, and replays are ignored or held for review. Logs show the outcome of each received file.

## Technical notes

No ACK files are sent back. Order source kind `hl7_interface` is shown as "HL7 interface (EMR)".
