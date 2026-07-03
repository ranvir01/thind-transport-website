# HaulDesk trilingual stack

HaulDesk is built in **three languages** with clear ownership boundaries. TypeScript remains the system of record UI and API gateway on Vercel for V1. Go and Rust run as **optional sidecars** (one binary each max at this scale) until specific workloads justify extraction.

## Language boundaries

| Language | Owns | Examples in HaulDesk |
|----------|------|----------------------|
| **TypeScript** | Web app, UI, auth, Postgres ORM/queries, server actions, PWA | Next.js `/hub/*`, components, `_actions`, `src/lib/hub/*` |
| **Go** | Long-running workers, integration sync, HTTP proxies, cron-scale jobs | Terminal/TruckX sync, DAT webhook, OSRM routing proxy, email queue, `/api/hub/cron` extraction candidate |
| **Rust** | CPU-heavy, correctness-critical compute | IFTA jurisdiction math, fuel fraud detection, route optimization (GraphHopper/OSRM client), PDF/report generation, CSV import at scale |

## V1 rules

1. **TypeScript is the gateway.** All browser and Vercel traffic hits Next.js first. Go/Rust are called over HTTP from `src/lib/hub/sidecars.ts` when env vars are set.
2. **No microservice sprawl.** At ~15 trucks: one Go worker (`services/go/hauldesk-worker`) and one Rust compute binary (`services/rust/hauldesk-compute`). No per-feature services.
3. **Import-first integrations stay in TS** until a Go worker exists (CSV fallbacks always work).
4. **Production unchanged when sidecars are off.** Missing `HAULDESK_GO_WORKER_URL` / `HAULDESK_RUST_COMPUTE_URL` → pure TypeScript paths (`mapbox.ts`, `ifta-core.ts`, etc.).
5. **Older proto stubs** under `services/api`, `services/optimizer`, `services/ingest` remain contract placeholders; V1 sidecars above are the active extraction targets.

## Call flow

```
Browser / Vercel cron
        │
        ▼
┌───────────────────┐
│  Next.js (TS)     │  Postgres, auth, UI, server actions
│  /hub/*           │
└─────────┬─────────┘
          │ optional HTTP
    ┌─────┴─────┐
    ▼           ▼
┌────────┐  ┌─────────────┐
│ Go     │  │ Rust        │
│ :8081  │  │ :8082       │
│ worker │  │ compute     │
└────────┘  └─────────────┘
```

## Sidecar endpoints (stubs)

| Service | Port | Route | TS wrapper |
|---------|------|-------|------------|
| Go worker | 8081 | `GET /health`, `POST /route/miles` | `routeMiles()` in `sidecars.ts` |
| Rust compute | 8082 | `GET /health`, `POST /ifta/summary` | `iftaSummary()` in `sidecars.ts` |

## When to move code

| Workload | Move from TS to | Trigger |
|----------|-----------------|---------|
| OSRM/GraphHopper proxy, cron sync loops | Go worker | Cron jobs exceed Vercel limits or need persistent connections |
| IFTA penny math at scale, bulk CSV parse | Rust compute | CPU time or memory on serverless becomes costly |
| Load board, fuel UI, invoices | **Stay in TS** | — |

## Local development

```bash
# Terminal 1 — Next.js (required)
npm run dev

# Terminal 2 — Go worker (optional)
cd services/go/hauldesk-worker && go run .

# Terminal 3 — Rust compute (optional)
cd services/rust/hauldesk-compute && cargo run
```

Set in `.env.local` when sidecars are running:

```
HAULDESK_GO_WORKER_URL=http://localhost:8081
HAULDESK_RUST_COMPUTE_URL=http://localhost:8082
```

Build all: `make go-build rust-build` or `npm run go-build` / `npm run rust-build`.

## Security

Sidecars have no user auth of their own — they trust the TS gateway. Two rules:

1. **Set `HAULDESK_SIDECAR_SECRET`** (same value for Next.js and both sidecars). With it set, every
   work endpoint requires `X-Hauldesk-Secret`; `/health` stays open for load-balancer checks.
   Without it (local dev), everything is open — never deploy that way.
2. **Sidecars never touch Postgres.** All tenancy/permission checks stay in the TS layer;
   sidecars compute on what the gateway hands them and hand it back.

## Golden parity

The Rust IFTA engine carries the TS golden fixtures as `cargo test` (`make rust-test` /
`npm run test:sidecars`): the hand-computed surcharge quarter, the reefer-exemption
fixture, missing-rate flagging, and a JSON contract test that parses the exact camelCase
payload `sidecars.ts` sends. Keep the two test suites in lockstep — a change to
`ifta.test.ts` numbers must land here in the same commit.

## Enforcement

- New **UI or CRUD** → TypeScript under `src/`.
- New **scheduled sync or external API proxy** → Go worker; expose HTTP, call from `sidecars.ts` or a thin `_actions` wrapper.
- New **numeric-heavy batch job** → Rust compute; mirror TS golden tests before switching the default path.

See also: `AGENTS.md` (agent rules), `docs/small-carrier-v1-master-prompt.md` (phase plan).
