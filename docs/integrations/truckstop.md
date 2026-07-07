# Truckstop.com load board — scouting notes

Status: **search adapter shipped (stub-first), booking mapper + product surface not yet
built.** Truckstop.com is the second load board on `docs/integrations/creds-shopping-list.md`,
same shape as DAT: an interactive freight search a dispatcher drives, not a background sync
into an existing table. This slice ships the `SyncSource`-shaped contract
(`connected`/`pull`/`search`) and its normalizer in `src/lib/hub/integrations/truckstop.ts`,
mock+contract tested, mirroring `dat.ts`.

## Why there's no `truckstopPostingToLoadDraft` yet

DAT's `datPostingToLoadDraft` sets `source: "dat"` on the draft it hands to `createLoad()`.
That value is accepted because `hub.loads.source` carries a DB CHECK constraint
(`migrations/hub/002_tenancy_money_events.sql`): `CHECK (source IN ('dat','direct','import','quote'))`.
Truckstop has no slot in that list yet, and migrations are a shared file outside the
integrations lane's territory (`AGENTS.md` §5) — adding `'truckstop'` needs a new
append-only migration, coordinated through the integrator rather than added unilaterally
here. Once that constraint grows the value, the mapper itself is a straight copy of
`datPostingToLoadDraft` with the source string swapped — same stops/rate/equipment mapping,
same `customer_id` omission (a dispatcher still has to pick a customer).

## Auth model (assumed, unconfirmed)

- `registry.ts`'s `truckstop` entry has a single `apiKey` field — Truckstop.com's developer
  portal issues API keys per account, not an OAuth2 client-credentials flow like TruckerCloud.
  `truckstop.ts` assumes a Bearer token (`Authorization: Bearer <apiKey>`) until a real
  developer packet says otherwise.
- Base URL is an env override (`TRUCKSTOP_API_BASE`), defaulting to a placeholder host
  (`https://api.truckstop.com/v1`) — never treated as confirmed, same caveat as `DAT_API_BASE`.

## Search shape (assumed, unconfirmed)

`normalizeTruckstopPosting` in `src/lib/hub/integrations/truckstop.ts` is the one place the
guessed response shape is read. Assumed shape:

```json
// GET /loads/search?originCity=&originState=&destState=&equipment=&radiusMiles= →
// { "postings": [ ... ] }
{
  "postingId": "string — becomes external_id",
  "postedDate": "ISO 8601",
  "equipment": "Van | Reefer | Flatbed | ...",
  "originCity": "string",
  "originState": "string",
  "destCity": "string",
  "destState": "string",
  "miles": 0,
  "totalRate": 0.0,
  "pickupDate": "ISO date",
  "contactPhone": "string"
}
```

If the real endpoint, auth flow, or field names differ (likely), only
`normalizeTruckstopPosting`, the `/loads/search` path, and the auth header construction in
`truckstopSource()` change — the `search`/`pull` contract and its tests don't move.

## Rate limits / sandbox

Not found in accessible public docs. Ask for sandbox/test-key access alongside production
credentials when a Truckstop.com contact is available; record the answer here once known.

## What ships today without any of this

Pasting a rate confirmation onto a load manually is the product today and stays the
product — this adapter is additive, and until a search UI + booking mapper exist there is
no dispatcher-facing surface for it at all (it's a tested library function, not a feature yet).

## Open questions for the next pass

- Migration: add `'truckstop'` to the `hub.loads.source` CHECK constraint, then ship
  `truckstopPostingToLoadDraft` (copy of `datPostingToLoadDraft`) — coordinate via `Backlog:`
  since migrations are shared-file territory.
- Design + build the dispatcher-facing search panel and "book this posting" button — likely
  shared with (or adjacent to) DAT's equivalent office-lane UI once that's designed, so the
  two load boards get one search/book surface instead of two.
- Confirm the real Truckstop.com auth flow and search endpoint shape against an actual
  developer packet — the #1 blocker to flipping `registry.ts`'s `truckstop` entry from
  `stub` to `live`.
