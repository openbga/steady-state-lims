---
date: 2026-11-02
type: changed
impact: medium
title: Navigation areas start closed with a total of waiting work
pr: 38
release: 0.1.2
---
Every navigation area is closed after sign-in. A closed area shows the total of its queue counts, such as Review 4, and each entry shows its own count when opened. Choices are kept during the session, but an idle-lock unlock starts closed again.
