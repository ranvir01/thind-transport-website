# DAT One load board — scouting notes

Status: **search adapter shipped (stub-first), product surface not yet built.** DAT
(dat.com) is the highest-value load board for a 15-truck van/reefer carrier, but unlike
every other provider in `docs/integrations/creds-shopping-list.md` it isn't a background
sync into an existing table — it's an interactive freight search a dispatcher drives, and
booking is a two-way action, not a pull. This slice ships the `SyncSource`-shaped contract
(`connected`/`pull`/`search`) and its normalizer, mock+contract tested, so the eventual
search UI + "create load from posting" action has a finished, tested client to call instead
of guessing the API and the UX in the same pass.

## Why this is scoped differently than EFS/WEX/Comdata/TruckerCloud

Those adapters land rows in a table the CSV import already writes to
(`ON CONFLICT (carrier_id, source, external_id)`), so "ship the adapter" and "ship the
feature" are the same commit. DAT has no equivalent existing table or screen — a dispatcher
needs a search panel (criteria in, matches out) and a book/create-load action, both new UI.
Building that UI against an unconfirmed API shape would mean re-doing it twice. This slice
stops at the tested client; `docs/integrations/creds-shopping-list.md` tracks the remaining
UI + booking slice separately.

## Auth model (assumed, unconfirmed)

- DAT's One API requires a service account provisioned through a DAT sales/API agreement
  (`developer.dat.com`), not a self-serve signup — `dat.ts` assumes HTTP Basic auth with a
  service-account email + password, matching the `serviceAccountEmail`/`password` fields
  already on the `dat` entry in `src/lib/hub/integrations/registry.ts`.
- Base URL is an env override (`DAT_API_BASE`), defaulting to a placeholder host
  (`https://freight.api.dat.com/v3`) — never treated as confirmed. DAT's real integration
  program is OAuth2-based per public docs; the Basic-auth assumption here is a placeholder
  until a real developer packet is in hand, same caveat as every other unconfirmed adapter
  in this repo.

## Search shape (assumed, unconfirmed)

`normalizeDatPosting` in `src/lib/hub/integrations/dat.ts` is the one place the guessed
response shape is read. Assumed shape:

```json
// GET /loads/search?originCity=&originState=&destState=&equipmentType=&radiusMiles= →
// { "matches": [ ... ] }
{
  "matchId": "string — becomes external_id",
  "postedAt": "ISO 8601",
  "equipmentType": "Van | Reefer | Flatbed | ...",
  "originCity": "string",
  "originState": "string",
  "destCity": "string",
  "destState": "string",
  "tripMiles": 0,
  "rateTotal": 0.0,
  "pickupDate": "ISO date",
  "contactPhone": "string"
}
```

If the real endpoint, auth flow, or field names differ (likely), only `normalizeDatPosting`,
the `/loads/search` path, and the auth header construction in `datSource()` change — the
`search`/`pull` contract and its tests don't move.

## Rate limits / sandbox

Not found in accessible public docs — DAT's API terms are behind the sales agreement. Ask
for sandbox/test-key access alongside production credentials when a DAT contact is
available; record the answer here once known.

## What ships today without any of this

Pasting a rate confirmation onto a load manually is the product today and stays the
product — this adapter is additive, and until the search UI exists there is no dispatcher-
facing surface for it at all (it's a tested library function, not a feature yet).

## Open questions for the next pass (the actual remaining slice)

- Design + build the dispatcher-facing search panel (criteria form → results list) and a
  "create load from posting" action that seeds a new `hub.loads` row from a `DatLoadPosting`
  — likely office-lane UI territory once designed, coordinate via `Backlog:`.
- Confirm the real DAT One auth flow (OAuth2 vs Basic) and search endpoint shape against an
  actual developer packet — the #1 blocker to flipping `registry.ts`'s `dat` entry from
  `stub` to `live`.
- Decide whether matches get a `cronJob` (periodic "loads near you" polling into a new
  table) in addition to on-demand search, or stay purely interactive — affects whether a
  migration is needed (`hub.available_loads`-style table) vs. search staying stateless.
