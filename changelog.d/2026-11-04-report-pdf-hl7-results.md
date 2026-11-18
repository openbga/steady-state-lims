---
date: 2026-11-04
type: added
impact: high
title: Report PDF and HL7 Results connections with code mappings
area: Interfaces
link: /interfaces/connections
pr: 51
release: 0.1.2
---
Connections can now write released report PDFs byte for byte, and send HL7 Results (ORU^R01) with test code mappings, to a partner folder. A later report revision goes to every connection that received an earlier one, and a withdrawal notice follows.

## Technical notes

The HL7 encoder is project code with no new dependency.
