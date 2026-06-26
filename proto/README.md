# HaulDesk protobuf contracts

Single source of truth for the Go core API, Rust compute services, and TypeScript web client.

## Layout

- `hauldesk/v1/loads.proto` — loads, dispatch, billing stubs
- Go service: `services/api/` (Postgres, REST + gRPC)
- Rust optimizer: `services/optimizer/` (routing, ETA, IFTA)
- Rust ingest: `services/ingest/` (ELD/telematics stream)

## Generate clients (when wired in CI)

```bash
# TypeScript (example — add buf or protoc plugins as needed)
protoc --plugin=./node_modules/.bin/protoc-gen-ts_proto \
  --ts_proto_out=src/lib/hub/api/generated \
  -I proto proto/hauldesk/v1/*.proto

# Go
protoc --go_out=services/api --go-grpc_out=services/api -I proto proto/hauldesk/v1/*.proto

# Rust (tonic-build in each crate's build.rs)
cargo build -p hauldesk-optimizer
```

Until generation is in CI, hand-maintained types live in `src/lib/hub/api/types.ts` and must stay aligned with these protos.
