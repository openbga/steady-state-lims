---
date: 2026-11-08
type: changed
impact: medium
title: Connections that cannot read their folder or server show Error with the reason
area: Interfaces
link: /interfaces/connections
pr: 75
release: 0.1.2
---
A started folder or SFTP connection whose latest reading failed shows status **Error**, and Last connection says why, for example the folder was not found or the server refused the sign-in. It returns to Active after the first reading that works. A refused order message no longer puts its connection in Error; it shows under Rejected.
