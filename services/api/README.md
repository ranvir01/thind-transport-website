# HaulDesk API (Go)

Core TMS service: loads, dispatch, invoicing, settlements, customers, auth/tenancy.

## Status

Stub — the Next.js app still uses server actions + Postgres directly. This service will become the system of record behind `/v1/*` and gRPC.

## Run (stub)

```bash
cd services/api
go run ./cmd/server
```

Listens on `:8080` and returns `{ "service": "hauldesk-api", "status": "stub" }`.

## Contract

Protobuf definitions: `../../proto/hauldesk/v1/`. Generate Go stubs with:

```bash
protoc --go_out=. --go-grpc_out=. -I ../../proto ../../proto/hauldesk/v1/*.proto
```

## Endpoints (planned)

| Method | Path | Owner |
|--------|------|-------|
| GET/POST | `/v1/loads` | Go |
| POST | `/v1/loads/:ref/assign` | Go |
| POST | `/v1/loads/:ref/advance` | Go |
| POST | `/v1/invoices` | Go |
| POST | `/v1/settlements/run` | Go |

Rust compute (`services/optimizer`, `services/ingest`) is called from Go over gRPC — not from the browser.
