---
date: 2026-10-30
type: fixed
impact: low
title: Forms show a refusal's reason even when no field holds it
pr: 31
release: 0.1.2
---
A form refused for a value that is not on the form used to say "Check the highlighted fields" with nothing highlighted. It now shows the real reason. Errors on a whole list, such as no test codes in Register source, appear under the list and move focus to it.
