---
date: 2026-11-04
type: added
impact: high
title: Send partner files over SFTP
area: Interfaces
link: /interfaces/connections
pr: 52
release: 0.1.2
---
Connections can deliver over SFTP as well as to a folder. The server is identified by its SHA256 fingerprint, sign-in uses an SSH key made for this installation or a password, and files are uploaded without replacing existing ones.

## Technical notes

Migration 0009 adds SFTP columns to `ifc_partner_connections` and the `ifc_sftp_identity` table. Adds russh 0.65.1 and russh-sftp 3.0.1; RSA-only servers are not supported. The LIS only connects out.
