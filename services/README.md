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
make rust-audit                # or: npm run rust-audit (RustSec advisory scan, installs cargo-audit if missing)
```

`rust-audit` is not part of the every-commit verify chain (it hits the network) — run it for the
weekly dependency pass (`docs/agent-improvement-loop.md` 3c). Despite `https://crates.io/` itself
403ing behind some agent-proxy egress policies, `cargo install`/`cargo audit` still work: cargo
talks to `index.crates.io` (sparse index) and `static.crates.io` (crate downloads) directly, neither
of which is the blocked host.

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

## Measured behaviour (25 Jul 2026)

Verified all three languages build, test, run, and agree numerically:

| | Result |
|---|---|
| Go worker | `go vet` + tests green (also under `-shuffle=on`), 9.0 MB binary, 9.4 MB RSS, `/health` 0.6 ms |
| Rust compute | 29 tests green, 1.1 MB binary, 2.8 MB RSS, `/health` 1.4 ms |
| TypeScript | 1,487 tests green |
| **Cross-language parity** | TS `computeIfta` and the Rust sidecar return **cent-identical** IFTA numbers on the same inputs (checked live against a running sidecar, not just golden files) |

**OSRM circuit breaker.** `/route/miles` used to pay the full OSRM connect budget on
*every* call in any environment that can't reach the router (locked-down egress, OSRM
down, no `OSRM_URL` on a private network) — ~343 ms per request — before returning the
same great-circle answer. It now trips after 3 consecutive failures and skips OSRM for
60 s, re-probing after the cooldown: **343 ms → 1.5 ms (229×), identical miles.** One
success closes it, so a transient blip degrades for at most one cooldown window.

**Known: Rust POST latency on larger payloads.** `/ifta/summary` costs ~1 ms for a
small body but ~22 ms once the request/response spans more than one TCP segment
(48 jurisdictions ≈ 2 KB in, ≈ 5 KB out). `/health` is 1.4 ms, so it is not the IFTA
math — it is Nagle/delayed-ACK on the multi-segment write. The fix is `TCP_NODELAY` on
the accepted socket, which `tiny_http` 0.12 does not expose per connection; it needs
either a `Server::from_listener` wrapper that sets the option or a move to a different
HTTP layer. Not urgent: the sidecars are optional and unset in production, where the
pure-TypeScript path (identical numbers, no HTTP hop) runs instead.

## Removed (June contract stubs)

The earlier contract-first placeholders — `services/api` (Go), `services/optimizer` +
`services/ingest` (Rust), `proto/`, and the `src/lib/hub/api/` client — were removed as
dead code; they had zero importers and contradicted the trilingual rule that sidecars
never touch Postgres. Recover any of them from git history if a wire contract is wanted
back (`git log -- services/api`).
