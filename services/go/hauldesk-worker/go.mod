module github.com/thind-transport/hauldesk/services/go/hauldesk-worker

go 1.22

// Long-running worker — integration sync, routing proxies, cron-scale jobs.
// V1: one binary; HTTP sidecar called from Next.js when HAULDESK_GO_WORKER_URL is set.
