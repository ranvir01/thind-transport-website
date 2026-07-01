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
| GET | `/health` | Liveness |
| POST | `/route/miles` | `{"origin":{"lat","lng"},"dest":{"lat","lng"}}` → driving miles (stub: haversine) |

## Planned extraction targets

- Terminal / TruckX position sync
- DAT webhook receiver
- OSRM `route/v1/driving` proxy (replace haversine stub)
- `/api/hub/cron` long jobs

See `docs/architecture/trilingual-stack.md`.
