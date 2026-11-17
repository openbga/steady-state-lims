---
date: 2026-10-28
type: fixed
impact: low
title: Invalid fields turn red and clear as soon as they are edited
pr: 18
release: 0.1.2
---
When a form is saved with a required field empty, the field's name, border and message turn red, including dropdowns and their placeholder. The error clears as soon as you edit the field rather than after you leave it.
