# hauldesk-compute (Rust)

CPU-heavy HaulDesk compute: IFTA jurisdiction math, fuel fraud checks, route optimization clients, bulk CSV.

V1 is a **single binary** sidecar. Next.js calls it when `HAULDESK_RUST_COMPUTE_URL` is set.

## Run

```bash
cargo run           # listens on :8082
cargo build --release
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness |
| POST | `/ifta/summary` | IFTA inputs (camelCase JSON, same shape as `IftaInputs` in `ifta-core.ts`) |

The `/ifta/summary` handler mirrors `computeIfta()` in TypeScript. Verify against `src/lib/hub/__tests__/ifta.test.ts` before making Rust the default path.

## Test

```bash
cargo clippy --all-targets -- -D warnings && cargo test   # or: make rust-test / npm run test:sidecars
```

See `docs/architecture/trilingual-stack.md`.
