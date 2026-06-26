# HaulDesk backend services

Contract-first stack behind the Next.js `/hub` app.

| Layer | Path | Role |
|-------|------|------|
| **TypeScript** | `src/lib/hub/api/` | Typed client; server actions today, `FetchHaulDeskApi` when `HAULDESK_API_URL` is set |
| **Go** | `services/api/` | Core TMS REST + gRPC, Postgres system of record |
| **Rust** | `services/optimizer/`, `services/ingest/` | Routing/ETA/IFTA and ELD ingestion |

Protobuf contracts: `proto/hauldesk/v1/`. See `proto/README.md` for code generation.

## Prerequisites

```bash
# Go 1.22+
sudo apt install golang-go   # or https://go.dev/dl/

# Rust (stable)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"

# protoc (for Rust optimizer build.rs)
sudo apt install protobuf-compiler
```

## Verify stubs

```bash
# Go API — listens :8080, GET /health
cd services/api && go run ./cmd/server

# Rust ingest
cd services/ingest && cargo run

# Rust optimizer (needs protoc)
cd services/optimizer && cargo run
```

## Wire to Next.js

Set in `.env.local` when the Go API is running locally:

```
HAULDESK_API_URL=http://127.0.0.1:8080
```

UI code can call `createHaulDeskApi()` from `src/lib/hub/api/client.ts`; until then, existing server actions remain the data layer.
