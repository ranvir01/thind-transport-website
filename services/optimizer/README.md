# HaulDesk Optimizer (Rust)

Compute-heavy services: route optimization, ETA estimation, IFTA jurisdiction mileage.

## Status

Stub library + binary. Protobuf code generation is configured in `build.rs` but requires `protoc` installed.

```bash
cd services/optimizer
cargo build
cargo run
```

Called by the Go API (`services/api`) over gRPC — not directly from the Next.js app.
