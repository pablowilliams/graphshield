# Architecture

```mermaid
flowchart LR
  U["Fraud analyst"] --> W["React investigation workbench"]
  W --> C["Hosted versioned API"]
  C --> D[("D1 workflow state")]
  C --> R[("R2 expiring uploads")]
  W -. "container deployment" .-> A["Go API"]
  A --> P[("PostgreSQL metadata and queue")]
  P --> Q["Leased worker"]
  Q --> N[("Neo4j Graph Data Science")]
  Q --> P
  S["Operator console"] --> C
  S -.-> A
```

The hosted path maximizes reviewer reliability while storing real identity-aware workflow state and files. The container path demonstrates the production service boundary: the API enqueues, workers claim with `FOR UPDATE SKIP LOCKED`, heartbeats extend leases, and graph projections are cleaned before a run becomes successful.
