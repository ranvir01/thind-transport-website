# TruckerCloud ELD — scouting notes

Status: **adapter shipped, feed shape unconfirmed.** TruckerCloud (truckercloud.com) is the
drop-in second aggregator `src/lib/hub/telematics.ts`'s header comment has promised since
Terminal shipped — same `TelematicsSource` interface (`connected`/`vehicles`/`hos`), its own
credentials. `activeTelematicsSource()` in that file now picks whichever of the two a carrier
actually connected (Terminal wins if somehow both are).

## Why TruckerCloud specifically

TruckX (the ELD our carriers already run) has no public API of its own — it only exposes data
through TSP aggregators, and TruckerCloud is the second one after Terminal. Public marketing
describes TruckerCloud as an "API-based telematics data aggregator" fronting 50+ underlying ELD
providers under one normalized API (their product is branded the "Apollo API"), the same
value proposition as Terminal.

## Auth model (assumed, unconfirmed)

- **Could not fetch TruckerCloud's own docs pages** (`truckercloud.com/integrations/*` returned
  HTTP 403 to this scout's fetch tooling) — same Cloudflare-style block noted for
  `docs.withterminal.com` (`docs/integrations/terminal.md`) and the EFS integration help pages
  (`docs/integrations/efs.md`). Everything below is a best-effort guess from search-result
  snippets, not a page read in full.
- The registry (`src/lib/hub/integrations/registry.ts`) already scoped `truckercloud` to a
  single `apiKey` credential field (no separate connection-token, unlike Terminal's two-field
  model) — `truckerCloudSource()` in `telematics.ts` assumes a plain `Authorization: Bearer
  {apiKey}` header against that single key.
- Base URL is an env override (`TRUCKERCLOUD_API_BASE`), defaulting to a placeholder host
  (`https://api.truckercloud.com/v1`) — never treated as confirmed.

## Feed shape (assumed, unconfirmed)

`normalizeTruckerCloudVehicle` and `normalizeTruckerCloudHos` in `telematics.ts` are the two
places the guessed shape is read — swapping in the real one only touches those two functions,
same doctrine as `normalizeEfsRecord`. Assumed shape, parallel to Terminal's confirmed one:

```json
// GET /vehicles → { "data": [ ... ] }
{
  "vehicleId": "string — becomes externalId",
  "unitNumber": "string — matched against hub.trucks.unit_number",
  "location": { "lat": 0, "lng": 0, "odometer": 0, "timestamp": "ISO 8601" }
}

// GET /hos → { "data": [ ... ] }
{
  "driverId": "string",
  "driverName": "string — matched against hub.drivers full name",
  "status": "duty status string",
  "driveTimeRemainingSeconds": 0,
  "shiftTimeRemainingSeconds": 0,
  "cycleTimeRemainingSeconds": 0,
  "recordedAt": "ISO 8601"
}
```

If the real endpoints or field names differ (very likely — these are guesses, not observed
responses), only the two normalizer functions and the two `request(...)` path strings in
`truckerCloudSource()` change; the sync loop, ingestion, and cron wiring don't move.

## Rate limits / sandbox

Not found in the accessible search results. No numeric limits, no public sandbox/test-key
program surfaced. Ask when a TruckerCloud contact is available for real credentials.

## Sync loop

Shares Terminal's cron job (`telematics-sync`, `vercel.json`) and "Sync now" action —
`activeTelematicsSource()` means there is exactly one sync path regardless of which aggregator
is connected, so no new cron entry was needed.

## What ships today without any of this

Manual truck location entry on the dispatch board keeps working with neither aggregator
connected — this adapter, like Terminal's, is additive.

## Backlog surfaced by this scout

- Same open item as Terminal and EFS: no 429/5xx retry-with-backoff on the single `fetch` in
  `truckerCloudSource`'s `request()` — a transient error fails that day's sync silently.
- `docs/integrations/creds-shopping-list.md` still only lists Terminal/EFS/DAT/QBO/factor —
  it should grow rows for TruckerCloud, WEX, and Comdata to match the registry's full set
  (flagged by the previous EFS cycle's backlog too; deferred again here to keep this cycle to
  one provider).
