# DAT load board — scouting notes

Status: **search adapter shipped stub-first, no live account confirmed yet.** DAT requires a
paid service account with API entitlement (developer.dat.com) provisioned per-carrier — there
is no public sandbox to test against, so this doc records what's assumed until a real service
account's first response comes back. When it does, only `normalizeDatLoad` in
`src/lib/hub/integrations/dat.ts` needs to change.

## Why this is a `LoadSource`, not a `SyncSource<Row>`

Every other adapter in this repo (Terminal, TruckerCloud, EFS, WEX, Comdata) is a background
feed: a cron job polls it and lands rows idempotently. DAT is different — a dispatcher
searches on demand ("loads from Kent, WA to Boise, ID, dry van") from the loadboard screen,
and results are ephemeral postings, not a ledger to ingest. `registry.ts` defines a separate
`LoadSource<Row>` contract (`search(criteria)` instead of `pull()`) and marks `dat`/`truckstop`
as `sync: "manual"` instead of `"poll"` — there is no cron job to name.

## Auth model (assumed)

DAT's public developer materials describe an OAuth2-style login against `identity.dat.com`
for service accounts. Until a real account exists to confirm the token flow, this adapter
takes the simplest path that satisfies the same shape as the registry's `serviceAccountEmail`
/ `password` fields — HTTP Basic auth on the search request — and isolates that choice inside
`datSource()` so swapping in a real OAuth2 exchange only touches that one function, not
`normalizeDatLoad` or the contract tests.

## Assumed search shape (unconfirmed — adjust on first real response)

`GET {DAT_API_BASE}/loadboard/search?originState=..&destState=..&equipmentType=..` (env
override; placeholder base URL), returns `{ postings: [...] }` where each entry carries:

- `postingId` — stable per-posting id → `external_id`
- `originCity`, `originState`, `destCity`, `destState`
- `equipmentType` (e.g. "Van", "Reefer", "Flatbed")
- `rateTotal` (dollars — converted to cents), `tripMiles`
- `postedAt` — ISO timestamp

## What this slice does NOT include

Search only. Booking a load (accepting a posting, which creates a real load record and
notifies the broker) is a separate, larger action than any adapter in this repo does today —
it's out of scope until the search shape above is confirmed for real and a design pass covers
the booking flow and its UI. No settings-page search form is wired up yet either; this slice
is the backend contract + adapter + tests only, so the next cycle can build the loadboard
search UI against a `LoadSource` that already has a mock reference implementation
(`mockLoadSource` in `src/lib/hub/integrations/mock.ts`) and a real (if unconfirmed) client.

## What ships today without any of this

"Paste rate con" — a dispatcher still books loads the way they always have, off-platform, and
enters the resulting load manually. This adapter is additive and changes nothing about that
path.

## Open questions for the next pass

- Confirm the real auth flow (OAuth2 vs. Basic), endpoint path, and payload shape against an
  actual DAT service-account API response — the #1 blocker to flipping status from stub to
  live.
- Design the search UI + criteria form (origin/dest/equipment/radius) and where it lives
  (new loadboard screen vs. a panel on the existing dispatch loadboard).
- Design the booking action once DAT's booking API shape is known — likely a bigger slice
  than "one adapter cycle."
