# HaulDesk backend services

Optional sidecars behind the Next.js `/hub` app. TypeScript owns the data layer
(Postgres, auth, server actions) and is the V1 API gateway on Vercel; these two
binaries are called over HTTP from `src/lib/hub/sidecars.ts` only when their env
vars are set. When the vars are unset, the app runs on pure-TypeScript fallbacks.

| Language | Path | Role |
|----------|------|------|
| **Go** | `services/go/hauldesk-worker/` | Long-running workers, integration sync, HTTP proxies (e.g. OSRM routing) |
| **Rust** | `services/rust/hauldesk-compute/` | CPU-heavy correctness-critical compute (IFTA math, routing, bulk import) |

Architecture and boundaries: `docs/architecture/trilingual-stack.md`.

## Prerequisites

```bash
# Go 1.22+
sudo apt install golang-go   # or https://go.dev/dl/

# Rust (stable)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"
```

## Build & test

```bash
make go-build rust-build       # or: npm run go-build / npm run rust-build
make rust-test                 # or: npm run test:sidecars (Rust IFTA golden parity)
```

## Run locally (optional)

```bash
# Go worker — listens :8081, GET /health, POST /route/miles
cd services/go/hauldesk-worker && go run .

# Rust compute — listens :8082, GET /health, POST /ifta/summary
cd services/rust/hauldesk-compute && cargo run
```

Set in `.env.local` when the sidecars are running:

```
HAULDESK_GO_WORKER_URL=http://localhost:8081
HAULDESK_RUST_COMPUTE_URL=http://localhost:8082
HAULDESK_SIDECAR_SECRET=<same value for Next.js and both sidecars>
```

## Removed (June contract stubs)

The earlier contract-first placeholders — `services/api` (Go), `services/optimizer` +
`services/ingest` (Rust), `proto/`, and the `src/lib/hub/api/` client — were removed as
dead code; they had zero importers and contradicted the trilingual rule that sidecars
never touch Postgres. Recover any of them from git history if a wire contract is wanted
back (`git log -- services/api`).
