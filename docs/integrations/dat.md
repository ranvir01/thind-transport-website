# DAT load board — scouting notes

Status: **search adapter shipped stub-first** (`src/lib/hub/integrations/dat.ts`), no
sandbox account confirmed yet. Unlike the fuel-card feeds (`efs.md`, `wex.md`,
`comdata.md`), DAT isn't a background inbox — real product value is "search a lane,
one-click book" (`docs/integrations/creds-shopping-list.md` row 5), which is bigger
than a `SyncSource<Row>` poll. This pass ships the search half only; booking is a
follow-up slice (see Backlog).

## Auth model (assumed)

DAT One's Load Board API is a certified-partner program: developer.dat.com issues a
service account (email + password), exchanged for a bearer token via DAT's identity
service (`identity.dat.com`) before any search call — not a bare Basic-auth header
against the search endpoint itself. This adapter currently sends Basic auth straight
to the search call as a placeholder (mirrors the EFS/WEX/Comdata posture of "isolate
the guess in one function"); the real token-exchange step is the first thing to
confirm once a sandbox account exists, alongside the search/response shape below.

## Assumed search shape (unconfirmed — adjust on first real response)

`GET {DAT_API_BASE}/loads/search?originCity=&originState=&destCity=&destState=`
(env override; placeholder base URL), returns `{ matches: [...] }` where each entry
carries:

- `postingId` — stable per-posting id → `external_id`
- `postedDateTime` — ISO timestamp
- `origin` / `destination` — `{ city, state }`
- `equipmentType`, `tripMiles`
- `rateTotal` (dollars — converted to cents), from which `ratePerMileCents` is derived
- `contactName`, `contactPhone`

## What pull() searches without a search UI yet

There's no lane-picker UI yet, so `datSource(carrierId).pull()` auto-searches the
carrier's best lane by margin — the same `hub.lanes` ranking `lanesOutOf()` uses for
backhaul hints (`src/lib/hub/lanes.ts`) — so "Sync now" surfaces something useful the
moment credentials land. A carrier with no lane history yet (`hub.lanes` empty) gets
zero rows, no error.

## What ships today without any of this

Paste-the-rate-con stays the product: dispatchers add a load manually
(`source = 'direct'`) same as always. `hub.loads.source` already has a `'dat'` value
in its CHECK constraint from the original schema, so booking a DAT match into a real
load needs no migration — only the booking action itself.

## Open questions for the next pass

- Confirm the real identity/token-exchange endpoint and the search endpoint's actual
  path, query params, and response shape against a DAT sandbox account — the #1
  blocker to flipping status from stub to live.
- Design the "book" action: insert into `hub.loads` with `source = 'dat'`,
  `reference` derived from `postingId`, `ON CONFLICT (carrier_id, reference) DO
  NOTHING` for idempotent double-clicks — plus the stops (pickup/delivery) DAT's
  posting implies. This is a UI + server-action slice, not just an adapter change.
- Design an explicit "search this lane" query (origin/destination/equipment
  picker) instead of (or alongside) the automatic top-lane search `pull()` does
  today.
