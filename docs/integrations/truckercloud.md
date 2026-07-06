# TruckerCloud ELD — scouting notes

Status: **adapter shipped, feed shape unconfirmed.** TruckerCloud (truckercloud.com) is the
drop-in second aggregator `src/lib/hub/telematics.ts`'s header comment has promised since
Terminal shipped — same `TelematicsSource` interface (`connected`/`vehicles`/`hos`), its own
credentials. `activeTelematicsSource()` in that file picks whichever of the two a carrier
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
- `docs/hub-go-live-requirements.md` lists TruckerCloud as needing "Client ID + secret"
  credentials, not a static API key — so the registry (`src/lib/hub/integrations/registry.ts`)
  scopes `truckercloud` to `clientId` + `clientSecret`, and `truckerCloudSource()` in
  `telematics.ts` exchanges them for a bearer token via an OAuth2 client-credentials grant
  (`POST {base}/oauth/token`) before every request. No token caching yet — each sync fetches a
  fresh token, which is correct but not optimal; revisit if a real account confirms tokens are
  short-lived enough for that to matter.
- Base URL is an env override (`TRUCKERCLOUD_API_BASE`), defaulting to a placeholder host
  (`https://api.truckercloud.com/v1`) — never treated as confirmed.

## Feed shape (assumed, unconfirmed)

`normalizeTruckerCloudVehicle` and `normalizeTruckerCloudHos` in `telematics.ts` are the two
places the guessed shape is read — swapping in the real one only touches those two functions,
same doctrine as `normalizeEfsRecord`. Assumed shape:

```json
// GET /vehicles → { "vehicles": [ ... ] }
{
  "assetId": "string — becomes externalId",
  "unitNumber": "string — matched against hub.trucks.unit_number",
  "lastLocation": { "lat": 0, "lng": 0, "odometer": 0, "timestamp": "ISO 8601" }
}

// GET /hos → { "logs": [ ... ] }
{
  "driverId": "string",
  "driverName": "string — matched against hub.drivers full name",
  "status": "duty status string",
  "driveTimeRemainingSec": 0,
  "shiftTimeRemainingSec": 0,
  "cycleTimeRemainingSec": 0,
  "recordedAt": "ISO 8601"
}
```

If the real endpoints, auth flow, or field names differ (very likely — these are guesses, not
observed responses), only the two normalizer functions, the `/oauth/token` exchange, and the
two `request(...)` path strings in `truckerCloudSource()` change; the sync loop, ingestion, and
cron wiring don't move.

## Rate limits / sandbox

Not found in the accessible search results. No numeric limits, no public sandbox/test-key
program surfaced. Ask when a TruckerCloud contact is available for real credentials.

## Sync loop

Shares Terminal's cron job (`telematics-sync`, `vercel.json`) and "Sync now" action —
`activeTelematicsSource()` means there is exactly one sync path regardless of which aggregator
is connected, so no new cron entry was needed. `runTelematicsSync` tags every
`position_pings`/`hos_snapshots` row it writes with `source = 'truckercloud'` (vs `'terminal'`)
via the connected `TelematicsSource`'s own `provider` field.

## What ships today without any of this

Manual truck location entry on the dispatch board keeps working with neither aggregator
connected — this adapter, like Terminal's, is additive.

## Open questions for the next pass

- Confirm the real token endpoint path and grant type against an actual TruckerCloud developer
  packet — the #1 blocker to flipping status from stub to live.
- Confirm `/vehicles` and `/hos` response field names (best guess above).
- Same open item as Terminal and EFS: no 429/5xx retry-with-backoff on the single `fetch` calls
  in `truckerCloudSource`'s `request()`/token exchange — a transient error fails that day's sync
  silently.
- Confirm whether a carrier can have both Terminal AND TruckerCloud credentials saved at once
  (e.g. mid-migration between aggregators); if so, `activeTelematicsSource`'s "first connected
  wins" selection needs to become an explicit preference instead of source order.
