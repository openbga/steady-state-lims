---
date: 2026-11-06
type: added
impact: medium
title: Warn about missing Billing NPI and Tax ID and link blocking billing flags
area: Billing
link: /billing/work
pr: 72
release: 0.1.2
---
The laboratory profile warns when Billing NPI or Tax ID is missing and says billing derivations are held until both are set. In a derivation's Flags, a **Fix in** column links each blocking flag to the page where it is resolved, and the Held message names the common fix.
