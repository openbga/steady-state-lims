---
date: 2026-11-10
type: added
impact: medium
title: See the sent HL7 message and the partner's reply in Logs
area: Interfaces
link: /interfaces/logs
pr: 81
release: 0.1.2
---
Selecting a sent message in **Logs** opens a panel with its control ID, the partner's answer (AA, AE or AR with the reason, or No answer), the message exactly as sent one segment per line, and the attempts. A whole control ID in the search finds its message.

## Technical notes

The panel shows the bytes kept at the first attempt and checks them against the stored digest; if they are missing or differ, the panel says so. Opening a message needs the configuration-management capability and is recorded as an `interfaces.get_message` access event.
