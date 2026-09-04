# GraphShield case study

## Outcome

GraphShield lets a first-time fraud analyst move from tabular evidence to an explainable network lead without writing Cypher. The reviewer path is immediate; the production path preserves identity, inputs, mapping context, stage events, results, and cleanup evidence.

## User and constraint

Maya understands transaction investigations but not graph projections. The design therefore asks a business question before showing an algorithm name, makes the table canonical, and treats every score as prioritization rather than proof. The hard constraint was credibility without depending on paid infrastructure for the demo.

## Product decisions

- Seeded evidence uses the same workspace and run concepts as uploaded evidence.
- Mapping errors carry evidence, consequence, and a next action.
- A deterministic preview catches mistakes before compute.
- Job stages distinguish projection, compute, writing, and cleanup.
- Graph and table selection stay synchronized, preserving an accessible complete record.
- The support view reveals sanitized operational context without exposing raw transactions.

## Engineering evidence

The hosted surface uses authenticated workspace identity, D1 relational state, R2 object storage, server-side CSV profiling, idempotent runs, and append-only audit events. The container stack adds PostgreSQL, a leased queue with worker heartbeats, Neo4j GDS, cleanup, and a deterministic executor fallback. Go implementations of WCC, PageRank, and shortest path are independently tested.

## Failure design

The browser visibly distinguishes a durable workspace from resilient demo mode. Oversize and malformed uploads fail with stable codes and specific remediation. An expired worker lease can be reclaimed; terminal runs remain immutable. Formula-leading CSV values are neutralized on export.

## Accessibility

The full workflow is keyboard-operable, focus is visible, graph controls are named, statuses include text, reduced motion is honored, and graph evidence has a complete table equivalent. Automated checks reject serious and critical axe findings.

## Honest limits

The private hosted release executes graph results deterministically while persisting real workflow state and uploads. Neo4j GDS execution is available in the containerized production path, not falsely claimed as part of the hosted Cloudflare runtime. Snowflake remains an adapter milestone.
