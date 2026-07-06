# Comdata fuel card — scouting notes

Status: **adapter shipped stub-first**, no live feed confirmed yet (needs a
real carrier's API credentials request to come back from the account team).
Same posture as `efs.md`: update this doc and `normalizeComdataRow` in
`src/lib/hub/integrations/comdata.ts` in one commit the day a real response
lands.

## Auth model

Comdata (Fleetcor) does not publish a self-serve API catalog for transaction
pulls; API access is arranged per-carrier through the account team
(comdata.com), which is why `ALLOWED_FIELDS.comdata` in
`src/app/hub/_actions/integrations.ts` is already `apiKey` / `apiSecret` — a
client-credentials-style pair rather than a feed username/password. This
adapter sends both as HTTP headers (`Api-Key`, `Api-Secret`) rather than
Basic auth, since Comdata's developer materials describe key/secret pairs,
not a portal login — confirm the exact header names against the real
onboarding packet before flipping status to live.

## Assumed feed shape (unconfirmed — adjust on first real response)

`GET {COMDATA_FEED_BASE}/transactions` (env override; placeholder base URL),
returns `{ transactions: [...] }` where each entry carries:

- `transactionId` — stable per-transaction id → `external_id`
- `postedDate` — ISO timestamp
- `truckNumber` — matched against `hub.trucks.unit_number`, unmatched is
  reported not guessed (same rule as `efs.ts` / `telematics.ts`)
- `merchant`, `city`, `state`
- `quantity` (gallons), `unitPrice`, `amount` (dollars — converted to cents)
- `odometer`

## What activates when the owner pastes keys

`comdataSource(carrierId).connected()` flips to `true`, "Sync now" becomes
available on the Comdata card, and `runComdataSync` starts landing rows into
`hub.fuel_transactions` with `source = 'comdata'`, the same `ON CONFLICT
(carrier_id, source, external_id) DO NOTHING` idempotency EFS uses. The Fuel
CSV import path is untouched.

## Open questions for the next pass

- Confirm the real endpoint path, auth header names, and payload shape
  against an actual Comdata API onboarding response — the #1 blocker to
  flipping status from stub to live.
- Confirm whether Comdata transactions need a separate `card_program` value
  (`"Comdata"`) distinct from EFS for reporting, or if `source` alone is
  sufficient (currently assumed sufficient — no `card_program` column write
  in `runComdataSync`, matching `runEfsSync`).
