---
date: 2026-11-10
type: changed
impact: medium
title: Interfaces Logs CSV export follows the screen
area: Interfaces
link: /interfaces/logs
pr: 80
release: 0.1.2
---
The CSV export now states the transport as sent (MLLP), uploaded (SFTP) or written, and the application column as the acknowledgement code, awaiting_ack, outcome_unknown or what a received order became. The partner's reason is in a new last column.

## Technical notes

The `attempts` column is renamed `failed_attempts` and the column `ack_text` is added at the end. Update any script that reads these columns by name or position.
