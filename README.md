# GraphShield

GraphShield turns tabular fraud data into explainable graph investigations for analysts who do not know graph modeling. Its guided workflow profiles evidence, maps entities and relationships, previews a deterministic graph, runs three question-first analyses, and presents reviewable results without calling a score a verdict.

The seeded reviewer path requires no account, services, or external data. Open the app, choose **Explore the seeded case**, and follow the dominant action on each screen.

## Product workflow

1. **Source** - select the synthetic September card-network case or validate CSV files.
2. **Map** - define Account and Device nodes plus their `USES` relationship; see cross-table diagnostics.
3. **Preview** - inspect a stable graph sample and its complete table alternative.
4. **Analyze** - ask to find groups (WCC), rank key accounts (PageRank), or trace a connection (shortest path).
5. **Explain** - synchronize network selection with evidence rows, inspect limitations, and export formula-safe CSV.
6. **Operate** - inspect append-only stage events and copy a sanitized incident bundle.

## Architecture

```text
React/Vinext web -> authenticated Sites API -> D1 + R2
       |                                         |
       +-> Go REST API -> PostgreSQL queue -> worker -> Neo4j GDS
```

The hosted release stores identity-aware projects, uploads, profiles, runs, stage events, results, and audit events in D1/R2 while retaining a clearly labeled resilient fallback. The container stack implements the production service boundary: a Go API writes a PostgreSQL queue, leased workers heartbeat and recover expired work, and the Neo4j adapter runs genuine GDS procedures with run-scoped projection cleanup. A deterministic executor keeps tests and offline demos repeatable.

The canonical contract is [`packages/contracts/openapi.yaml`](packages/contracts/openapi.yaml). See the [architecture](docs/architecture.md), [case study](docs/product/case-study.md), [threat model](docs/security/threat-model.md), and [`docs/adr`](docs/adr).

## Quick start

Requirements: Node 22+, Go 1.25+, and optionally Docker.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. To run the API separately:

```bash
go run ./services/api
curl http://localhost:8080/healthz
```

Or build the complete local stack:

```bash
docker compose up --build
```

## Developer commands

| Command | Purpose |
|---|---|
| `make bootstrap` | Install pinned web dependencies |
| `make dev` | Start the web experience |
| `make api` | Start the Go API on port 8080 |
| `make seed` | Document the compiled deterministic seed |
| `go run ./datasets/generate` | Generate inspectable seeded CSV fixtures |
| `make test` | Run Go, production-render, and HTML tests |
| `make lint` | Format/check Go and lint TypeScript |
| `make up` / `make down` | Start/stop containers without deleting volumes |

Copy `.env.example` only when changing the default ports/origins. It contains no secrets.

## Algorithms and honest limits

- **Weakly Connected Components** finds entities connected by permitted relationships while ignoring direction. Connectivity is not guilt or causality.
- **PageRank** ranks structural importance in directed transfers. Its score is not a fraud probability and depends on the projected network.
- **Shortest path** returns the fewest permitted links between two entities. A short path does not prove coordination.

All three algorithms have deterministic Go tests. The web demo shows planted patterns: a transfer ring, mule hub, shared-device clusters, a bridge account, and a legitimate merchant control.

## Reliability and observability

Runs advance through `QUEUED -> PROJECTING -> COMPUTING -> WRITING -> SUCCEEDED`, with cooperative `CANCELLING -> CANCELLED`. Workers claim PostgreSQL rows with `FOR UPDATE SKIP LOCKED`, renew leases by heartbeat, and make expired work recoverable. Every stage records an ordered event; retry creates a new run. JSON logs and Prometheus metrics expose correlation and health without raw rows. The support view exposes checksums, configuration hash, worker attempt, cleanup state, sanitized logs, and an incident bundle. See the [failure runbook](docs/runbooks/analysis-failures.md).

## Security and retention

- Request bodies are bounded and strictly decoded; identifiers and object keys are server-generated.
- Job creation requires an idempotency key.
- Support search requires the operator role.
- Exports neutralize spreadsheet-formula prefixes (`=`, `+`, `-`, `@`).
- Hosted CSVs are parsed server-side, stored in R2, profiled into D1, and assigned a 24-hour expiry.
- HTTP security headers, per-client rate limits, prepared queries, and fixed GDS procedure templates reduce common abuse paths.
- Logs contain identifiers/counts, never raw transaction rows.

## Testing

```bash
go test -race ./services/... ./datasets/...
npm run build
npm test
npm run lint
```

CI runs the same checks. The result graph always has a full table alternative, focus indicators are visible, reduced motion is honored, every interactive control is keyboard-reachable, and semantic statuses never rely on color alone.

## Deployment

The web build targets Cloudflare-compatible ESM and deploys with D1 and R2 bindings. The Go API and worker images are non-root distroless containers. `compose.yaml` starts the web, API, PostgreSQL, worker, and Neo4j GDS services as a complete local production-shaped stack.

## Known limitations and roadmap

- The hosted cloud worker persists workflow state and profiles uploads, but uses deterministic graph results for reviewer reliability.
- Live Neo4j GDS execution is available in the container stack; it is not claimed for the hosted Cloudflare runtime.
- The visualization is capped; the table is canonical for large result sets.
- Next: deploy the Go worker stack behind the hosted API, add a production identity provider outside Sites, and complete the documented Snowflake adapter boundary.
