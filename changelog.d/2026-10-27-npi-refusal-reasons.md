---
date: 2026-10-27
type: changed
impact: low
title: A refused NPI says which rule failed
pr: 12
release: 0.1.2
---
An NPI with the wrong length or a non-digit is refused with "The NPI must be exactly 10 digits.", and one that fails the check digit with a message asking you to check for a typo. Every NPI field shows the hint "10 digits. The last digit is checked automatically."
