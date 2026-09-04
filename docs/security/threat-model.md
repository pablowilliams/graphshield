# Threat model

| Asset / threat | Control | Verification |
|---|---|---|
| Cross-project reads | Owner-scoped queries and operator-only support APIs | Authorization tests and negative smoke checks |
| Malicious CSV | Size/type limits, bounded parser, generated object keys, formula-safe export | Unit and integration cases |
| Injection | Prepared SQL and fixed GDS procedure templates; identifiers are validated | Static review and negative tests |
| Worker duplication | PostgreSQL row locks, leases, heartbeats, attempts, and idempotency keys | Race tests and queue integration tests |
| Sensitive logs | Allowlisted structured fields and bounded sanitized errors | Manual audit and snapshots |
| Resource exhaustion | Request/body limits, graph caps, per-client rate limits, worker timeouts | Load-test target and middleware tests |
| Orphan graph resources | Run-scoped projection names and cleanup before terminal success | Worker lifecycle tests |
| Stale uploads | R2 metadata plus 24-hour expiry timestamp and cleanup policy | Scheduled retention audit |

The seed dataset contains no real personal information. Production secrets belong in deployment-managed environment variables and never in browser bundles or source control.
