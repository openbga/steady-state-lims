---
date: 2026-11-08
type: added
impact: high
title: Interface contracts and acceptance tests for partner connections
area: Interfaces
link: /interfaces/connections
pr: 74
release: 0.1.2
---
Each partner connection keeps a versioned **interface contract** drafted from the terms agreed with the partner and approved by a second person. No patient data is sent or received until a contract version is approved and the latest synthetic acceptance tests passed for the connection as it is now. A new contract or mapping version, or a change to the settings that shape the messages, makes the tests out of date and the connection waits until they pass again.

## Technical notes

- Existing connections wait after the upgrade until a contract is approved and the tests pass.
- Waiting deliveries show the reason in Logs; folder and SFTP order intake does not read, and the MLLP listener does not listen, until the gate is open.
- Interfaces migration 0015 adds contracts, drafts, acceptance runs and an `acceptance_key` column (contract version, mapping version and a digest of the message-shaping settings).
- New commands `draft_partner_contract`, `approve_partner_contract` and `run_partner_acceptance_tests`; runs are audited.
