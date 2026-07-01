.PHONY: go-build rust-build build-sidecars

go-build:
	cd services/go/hauldesk-worker && go build -o ../../../bin/hauldesk-worker .

rust-build:
	cd services/rust/hauldesk-compute && cargo build --release

build-sidecars: go-build rust-build
