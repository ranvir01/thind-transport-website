.PHONY: go-build rust-build build-sidecars go-test rust-test test-sidecars rust-audit

go-build:
	cd services/go/hauldesk-worker && go build -o ../../../bin/hauldesk-worker .

rust-build:
	cd services/rust/hauldesk-compute && cargo build --release

build-sidecars: go-build rust-build

go-test:
	cd services/go/hauldesk-worker && go vet ./... && go test ./...

rust-test:
	cd services/rust/hauldesk-compute && cargo clippy --all-targets -- -D warnings && cargo test

test-sidecars: go-test rust-test

# Vulnerability scan of the Rust sidecar's dependency tree (RustSec advisory
# DB). Not part of test-sidecars/every-commit verify — this hits the network
# (advisory-db + crates.io sparse index) and is meant for the weekly
# dependency pass (docs/agent-improvement-loop.md 3c), not every push.
# Latest cargo-audit needs rustc 1.88+; this VM (and many agent images) ship
# 1.83. Try latest, then fall back to the last release that builds on 1.81+.
rust-audit:
	@command -v cargo-audit >/dev/null 2>&1 || cargo install cargo-audit --locked || cargo install cargo-audit --locked --version 0.21.2
	cd services/rust/hauldesk-compute && cargo audit
