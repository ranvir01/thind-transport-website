# LoadOff integrations — the adapter pattern (step by step)

Single source of truth: `src/lib/hub/integrations/registry.ts`. The proven reference
implementation is Terminal/TruckX in `src/lib/hub/telematics.ts`. Every new provider follows
the same eight steps — stub-first, so it ships complete before any vendor credentials exist.

1. **Register** — add a `ProviderSpec` to `PROVIDERS` (fields, fallback, sync kind, status
   `stub`). The credentials form allowlist and settings card derive from this.
2. **Docs first** — `docs/integrations/<provider>.md`: auth model, endpoints, rate limits,
   sandbox availability (the Partner-API scout routine maintains these).
3. **Adapter** — implement `SyncSource<Row>` (registry.ts) in `src/lib/hub/<domain>-source.ts`
   style, e.g. `FuelSource`. Base URL env override (`TERMINAL_API_BASE` pattern). Credentials
   via `getCredentials(carrierId, id)` — returns null when unconfigured → adapter reports
   `connected(): false` and the CSV path stays the product.
4. **Contract tests** — the adapter must pass the same shape as
   `__tests__/integration-contract.test.ts`: deterministic external ids, idempotent replays
   (prove with `memorySink()`), refuses to pull when disconnected.
5. **Ingest idempotently** — land rows in the SAME table the CSV import uses with
   `ON CONFLICT (carrier_id, source, external_id) DO NOTHING`, source = provider id.
   The rest of the app must never know which path data arrived through.
6. **Sync loop** — add the cron job in `src/app/api/hub/cron/[job]/route.ts` (per-carrier
   loop) and/or a "Sync now" action; EVERY run writes a `hub.integration_syncs` row.
   Push-style providers instead document their `/api/hub/webhooks/<provider>?carrier=<uuid>`
   URL + HMAC signing (see `integrations/webhooks.ts`; secret field `webhookSecret`).
7. **Card** — settings card with honest connected/not-connected states and the CSV fallback
   named. No fake "syncing" UI.
8. **Shopping list** — update `docs/integrations/creds-shopping-list.md` with plan, price,
   signup URL, and exactly what activates when the owner pastes keys.

Guardrails: never weaken tenancy (`carrier_id` on every row), never log secret VALUES (names
only), money stays integer cents, and the CSV fallback is never removed.
