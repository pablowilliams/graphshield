# Analysis failure runbook

1. Find the stable error code, run ID, request ID, and failing stage.
2. Confirm source checksum and mapping version; never inspect raw transaction rows in logs.
3. For `ORPHAN_ENDPOINT`, compare endpoint counts and advise mapping repair.
4. For `INVALID_WEIGHT`, verify finite, non-negative numeric values.
5. For timeouts, reduce projected relationships before retrying.
6. Confirm projection cleanup. Retry creates a new linked run and never mutates terminal history.
