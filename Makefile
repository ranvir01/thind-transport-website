.PHONY: go-build rust-build build-sidecars go-test rust-test test-sidecars

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
