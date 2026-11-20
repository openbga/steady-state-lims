---
date: 2026-11-18
type: added
impact: medium
title: A report's Delivery tab lists its messages sent through Interfaces
area: Reports
---
The **Delivery** tab of a report now also lists the report's messages through Interfaces: HL7 results sent over MLLP, files written to a folder, and unrouted messages with the decision recorded in **Unrouted messages**. Each row shows the connection, the revision, the status as Interfaces records it, such as **Accepted (AA)**, **Written** or **Delivery recorded another way**, and the time, and opens the message in **Interfaces › Logs**. The section is shown to people who can open Interfaces, and its rows are not counted as handed off.

## Technical notes

`list_partner_messages` takes an optional `reportId`: only the outgoing messages of that report, its revisions and withdrawal notice, unrouted ones included. It needs configuration authority, as before.
