# HaulDesk integrations — the adapter pattern

Single source of truth for the contract every provider adapter must satisfy:
`src/lib/hub/integrations/registry.ts` (the `SyncSource<Row>` interface) and
`src/lib/hub/integrations/mock.ts` (the reference implementation the contract
test exercises). The proven real-world example is Terminal/TruckX in
`src/lib/hub/telematics.ts`. Every new provider ships stub-first — mock +
contract tests complete before any vendor credentials exist — following the
same steps:

1. **Register the card** — add the provider to the credential field allowlist
   in `src/app/hub/_actions/integrations.ts` (`ALLOWED_FIELDS`) and a
   `ProviderCard` entry in `src/app/hub/(office)/settings/integrations/page.tsx`
   with an honest blurb, its always-working fallback, and `connected` wired to
   `hasCredentials(carrierId, provider)`.
2. **Scout the API first** — write `docs/integrations/<provider>.md`: auth
   model, feed/endpoint shape, rate limits, signup lead time, sandbox
   availability. Do this BEFORE writing the adapter — vendor feeds for fuel
   cards and load boards are usually provisioned per-carrier by a rep, not
   self-serve, so the exact response shape is often only confirmed once a
   real feed is requested. Note that clearly in the doc.
3. **Adapter** — implement `SyncSource<Row>` (registry.ts) in
   `src/lib/hub/integrations/<provider>.ts`. Credentials come from
   `getCredentials(carrierId, provider)` — `null` means unconfigured, so
   `connected()` returns `false` and the CSV/manual path stays the product.
   Base URL behind an env override (`TERMINAL_API_BASE` pattern, e.g.
   `EFS_FEED_BASE`). Split the HTTP call from row normalization — the
   normalizer must be a pure, exported function so it can be unit-tested
   without a live feed or a mocked `fetch`.
4. **Contract tests** — the pure normalizer gets its own unit tests
   (`__tests__/<provider>.test.ts`, see `efs.test.ts`). The adapter's SHAPE
   must additionally satisfy the same invariants as
   `__tests__/integration-contract.test.ts`: deterministic external ids,
   idempotent replays (prove with `memorySink()` from `mock.ts`), and it
   refuses to pull when disconnected instead of returning junk.
5. **Ingest idempotently** — land rows in the SAME table the CSV/manual
   import path uses, with `ON CONFLICT (carrier_id, source, external_id) DO
   NOTHING`, `source` = the provider id. The rest of the app must never know
   which path the data arrived through.
6. **Sync loop** — a `run<Provider>Sync(carrierId)` function that calls the
   adapter, ingests idempotently, and reports `{ connected, imported, skipped,
   unmatched }`. Wire a "Sync now" server action (see `syncEfsNowAction`) and,
   once the provider is real, a cron job in
   `src/app/api/hub/cron/[job]/route.ts`. EVERY run — cron or manual — writes
   a `hub.integration_syncs` row (see `page.tsx`'s sync history panel).
7. **Card** — set `canSync: true` only once step 6 exists; keep the
   not-connected state and the fallback text honest. No fake "syncing" UI ever.
8. **Shopping list** — update `docs/integrations/creds-shopping-list.md`
   with plan, price, signup URL, and exactly what activates when the owner
   pastes keys. Keep it in sync with `ProviderCard.connected` reality —
   a provider does not move to "ready to activate" until its adapter ships.

## Guardrails (non-negotiable, on top of AGENTS.md)

- Never weaken tenancy — `carrier_id` on every row, every query.
- Never log or store credential VALUES outside the encrypted envelope
  (`logAudit` calls record field NAMES only — see `saveIntegrationCredentialsAction`).
- Money stays integer cents (`dollarsToCents` / cents already on the wire).
- The CSV/manual fallback is never removed, weakened, or hidden once an
  adapter ships — it is the permanent floor, not a placeholder.
- New provider ids must match `hub.api_credentials`'s existing `provider`
  CHECK constraint (`migrations/hub/010_integrations.sql`). Adding a
  provider outside that list needs a migration — out of this lane's
  territory; request it via `Backlog:` for the integrator instead of adding
  one here.
