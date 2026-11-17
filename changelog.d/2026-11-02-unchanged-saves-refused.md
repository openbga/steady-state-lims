---
date: 2026-11-02
type: changed
impact: low
title: Corrections that change nothing are refused
area: Laboratory setup
link: /configuration/laboratory
pr: 40
release: 0.1.2
---
Correct practitioner, Correct client, Correct location and Change profile now refuse a save that changes no value, with "Nothing was changed". No version, history entry or audit event is written.
