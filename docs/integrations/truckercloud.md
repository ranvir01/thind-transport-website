# TruckerCloud — scouting notes

Status: **adapter shipped stub-first**, no live account confirmed yet (needs
a real carrier's TruckerCloud onboarding response to come back). Same
posture as `efs.md` / `comdata.md`: update this doc and the normalizers in
`src/lib/hub/telematics.ts` in one commit the day a real response lands.

## Why this slice, and why it lives in `telematics.ts`

`telematics.ts`'s header comment has said since Phase 6 that "Terminal is
the first adapter; TruckerCloud is a drop-in second" — same
`TelematicsSource` interface (`connected()` / `vehicles()` / `hos()`), same
`hub.position_pings` / `hub.hos_snapshots` tables, different vendor. This
ships that second adapter: `truckerCloudSource(carrierId)` next to
`terminalSource`, and `runTelematicsSync` now tries Terminal first, then
falls back to TruckerCloud — a carrier only ever has one ELD aggregator
connected, so "first one that reports connected" is the right selection,
not a merge of both.

`docs/hub-go-live-requirements.md` already listed TruckerCloud as an
alternate to Terminal with "Client ID + secret" credentials — this adapter
follows that: OAuth2 client-credentials grant (token endpoint exchanges
`clientId`/`clientSecret` for a bearer token), not a static API key. That's
why `ALLOWED_FIELDS.truckercloud` in `src/app/hub/_actions/integrations.ts`
moved from a single placeholder `apiKey` field to `clientId` + `clientSecret`.

## Auth model (unconfirmed — adjust on first real response)

`POST {TRUCKERCLOUD_API_BASE}/oauth/token` with `client_id` / `client_secret`
(placeholder grant shape, `client_credentials` grant type) returns a bearer
token; every subsequent request sends `Authorization: Bearer <token>`. No
token caching yet — each sync fetches a fresh token, which is correct but
not optimal; revisit if a real account confirms tokens are short-lived
enough that this matters.

## Assumed feed shape (unconfirmed — adjust on first real response)

`GET {TRUCKERCLOUD_API_BASE}/vehicles` → `{ vehicles: [...] }`, each entry:
- `assetId` — stable id → `externalId`
- `unitNumber` — matched against `hub.trucks.unit_number`, unmatched is
  reported not guessed (same rule as `efs.ts` / the existing Terminal path)
- `lastLocation.lat` / `.lng` / `.odometer` / `.timestamp`

`GET {TRUCKERCLOUD_API_BASE}/hos` → `{ logs: [...] }`, each entry:
- `driverId`, `driverName`
- `status` (duty status string)
- `driveTimeRemainingSec` / `shiftTimeRemainingSec` / `cycleTimeRemainingSec`
  (seconds, converted to minutes like Terminal's feed)
- `recordedAt`

## What activates when the owner pastes keys

`truckerCloudSource(carrierId).connected()` flips to `true`. If Terminal
isn't also connected, "Sync now" on either card runs
`runTelematicsSync`, which now picks whichever provider is connected and
tags `hub.position_pings` / `hub.hos_snapshots` rows with
`source = 'truckercloud'` instead of `'terminal'`. The manual
truck-location-on-dispatch-board fallback is untouched.

## Open questions for the next pass

- Confirm the real token endpoint path and grant type against an actual
  TruckerCloud developer packet — the #1 blocker to flipping status from
  stub to live.
- Confirm `/vehicles` and `/hos` response field names (best guess above).
- Confirm whether a carrier can have both Terminal AND TruckerCloud
  credentials saved at once (e.g. mid-migration between aggregators); if
  so, `runTelematicsSync`'s "first connected wins" selection needs to
  become an explicit preference instead of source order.
