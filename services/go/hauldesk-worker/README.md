# hauldesk-worker (Go)

Long-running HaulDesk worker: integration sync, OSRM routing proxy, email queue, cron-scale jobs.

V1 is a **single binary** sidecar. Next.js calls it when `HAULDESK_GO_WORKER_URL` is set.

## Run

```bash
go run .          # listens on :8081
go build -o hauldesk-worker .
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness (always open, even with the secret set) |
| POST | `/route/miles` | `{"origin":{"lat","lng"},"dest":{"lat","lng"}}` → driving miles via OSRM (`OSRM_URL`); replies `source: "haversine-fallback"` with great-circle miles when OSRM is unreachable |

When `HAULDESK_SIDECAR_SECRET` is set, every route except `/health` requires a
matching `X-Hauldesk-Secret` header (constant-time compare).

## Test

```bash
go vet ./... && go test ./...   # or: make go-test / npm run test:sidecars
```

## Planned extraction targets

- Terminal / TruckX position sync
- DAT webhook receiver
- `/api/hub/cron` long jobs

See `docs/architecture/trilingual-stack.md`.
