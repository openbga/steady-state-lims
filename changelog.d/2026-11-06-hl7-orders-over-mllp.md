---
date: 2026-11-06
type: added
impact: high
title: Receive HL7 orders over MLLP on the lab network
area: Interfaces
link: /interfaces/connections
pr: 73
release: 0.1.2
---
HL7 Orders connections can use **MLLP - LIS listens**: the clinic's interface connects to the LIS on the lab network and sends order messages, and the LIS answers each one with an acknowledgement after the message is saved. AA means the message was kept (order made, waiting for its patient, held for review, or a replay), AE a content error, and AR another sender or an unreadable or unsupported message.

## Technical notes

- Settings: listen address and port, partner addresses allowed (1-20, each with an optional note), acknowledgement, character set (UTF-8) and idle timeout (10-3600 s, default 300). **Test listener** checks the port.
- The listen address and every partner must be lab-network IP addresses; `0.0.0.0` and internet addresses are refused. There is no TLS in this version.
- Connections from other addresses are closed and counted; summaries are audited at most once a minute per address. Limits: 4 partner connections per listener, 1 MiB per message.
- A port in use or an address the computer does not have shows the connection as Not listening and is retried every 5 seconds.
- Table cells are now centered vertically in tall rows, and status columns share one width.
