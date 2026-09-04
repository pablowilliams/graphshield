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
React/Vinext web  ->  Go REST API  ->  cancellable worker boundary
       |                   |                    |
accessible graph/table   run metadata      deterministic graph package
```

The hosted demo performs the complete deterministic experience client-side so it stays instant and reliable. The Go service independently implements the versioned API, idempotent submission, run state machine, cancellation, retry, SSE event representation, result endpoints, CSV export, role-gated support endpoint, and real WCC/PageRank/shortest-path logic. The boundary is ready for Postgres and Neo4j GDS adapters; they are not falsely represented as live dependencies.

The canonical contract is [`packages/contracts/openapi.yaml`](packages/contracts/openapi.yaml). Key decisions live in [`docs/adr`](docs/adr).

## Quick start

Requirements: Node 22+, Go 1.23+, and optionally Docker.

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

Runs advance through `QUEUED -> PROJECTING -> COMPUTING -> WRITING -> SUCCEEDED`, with cooperative `CANCELLING -> CANCELLED`. Every stage records an ordered event; retry creates a new run. JSON logs include run and stage correlation fields. The support view exposes checksums, configuration hash, worker attempt, cleanup state, sanitized logs, and an incident bundle. See the [failure runbook](docs/runbooks/analysis-failures.md).

## Security and retention

- Request bodies are strictly decoded and identifiers are server-generated.
- Job creation requires an idempotency key.
- Support search requires the operator role.
- Exports neutralize spreadsheet-formula prefixes (`=`, `+`, `-`, `@`).
- The browser demo accepts CSV metadata but does not transmit or persist raw rows.
- Production uploads and exports should expire after 24 hours; seed data is wholly fictional.
- Logs contain identifiers/counts, never raw transaction rows.

## Testing

```bash
go test -race ./...
npm run build
npm test
npm run lint
```

CI runs the same checks. The result graph always has a full table alternative, focus indicators are visible, reduced motion is honored, every interactive control is keyboard-reachable, and semantic statuses never rely on color alone.

## Deployment

The web build targets Cloudflare-compatible ESM and can be published through Sites. The API image is a small non-root distroless container. `compose.yaml` is the local fallback; production should add managed persistence, a queue, object storage, rate limiting, and a Neo4j GDS adapter.

## Known limitations and roadmap

- Uploaded CSVs are validated in the portfolio UI but the hosted demo intentionally uses deterministic in-memory evidence.
- Data persistence, multi-user authentication, Neo4j GDS, and live Snowflake access are adapter milestones, not claims in this release.
- The visualization is capped; the table is canonical for large result sets.
- Next: durable Postgres repositories, queue-backed workers, live Neo4j GDS, and the documented Snowflake adapter boundary.
