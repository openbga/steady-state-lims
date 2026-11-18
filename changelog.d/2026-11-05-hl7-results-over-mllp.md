---
date: 2026-11-05
type: added
impact: high
title: Send HL7 results to a partner over MLLP on the lab network
area: Interfaces
link: /interfaces/connections
pr: 61
release: 0.1.2
---
HL7 Results connections can use **MLLP - LIS connects**: the LIS connects to the partner's interface on the lab network, sends each ORU^R01 and reads the partner's application acknowledgement on the same connection. Logs show Sent, Accepted (AA), Rejected (AE or AR, with the partner's reason) and Awaiting application ACK; a message with no acknowledgement in time is sent again with the same control ID.

## Technical notes

- Settings: partner address, port, acknowledgement and ACK timeout (1-300 s, default 30). **Test connection** and **Send test message** work over MLLP.
- The partner must be an IP address on the lab network (private, link-local or loopback, or IPv6 unique-local or link-local); server names and internet addresses are refused. There is no TLS; reach a remote partner through the lab's VPN or use SFTP.
- Over MLLP, MSH-15 and MSH-16 are left empty; file delivery keeps NE/NE.
- Interfaces migration 0012 rebuilds `ifc_partner_connections` (protocols `mllp_connect` and `mllp_listen`, MLLP settings as JSON) and adds `ack_code` and `ack_text` to deliveries.
