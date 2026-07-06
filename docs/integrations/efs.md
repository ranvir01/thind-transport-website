# EFS / WEX fuel card — scouting notes

Status: **adapter shipped stub-first**, no live feed confirmed yet (needs a
real carrier's data-feed request to come back from the rep). This doc is
what's publicly known plus what the existing CSV import already assumes;
update it the day a real feed response lands so the next agent can fix any
field-name mismatch in one place (`normalizeEfsRow` in
`src/lib/hub/integrations/efs.ts`).

## Auth model

EFS/WEX does not expose a self-serve public REST API for transaction pulls.
Feed access ("CarrierControl" portal export, or a partner data feed) is
provisioned per-carrier by an EFS/WEX account rep — request it separately
from the normal portal login. Typical lead time: up to 5 business days.
Credentials are a feed username/password (Basic auth), not an OAuth token —
matches the `feedUser` / `feedPassword` fields already in
`ALLOWED_FIELDS.efs` (`src/app/hub/_actions/integrations.ts`).

## Assumed feed shape (unconfirmed — adjust on first real response)

`GET {EFS_FEED_BASE}/transactions` (env override; placeholder base URL —
replace once the rep's confirmation email states the real endpoint), Basic
auth, returns `{ transactions: [...] }` where each entry carries (naming per
common fuel-card feed exports, e.g. Fleetio/Samsara's public EFS docs):

- `transactionId` (or `id`) — stable per-transaction id → `external_id`
- `transactionDate` — ISO or `MM/DD/YYYY HH:mm`
- `unitNumber` (or `vehicleId`) — matched against `hub.trucks.unit_number`,
  same unmatched-is-reported-not-guessed rule as `telematics.ts`
- `merchantName`, `city`, `state`
- `gallons`, `pricePerGallon`, `totalAmount` (dollars — converted to cents)
- `odometer`

Sync cadence when live: third-party fleet platforms typically see EFS
transactions within minutes of posting; a 5–15 minute poll cron is
reasonable once `status` flips to `live` in the registry-equivalent card.

## What activates when the owner pastes keys

Nothing changes silently — `efsSource(carrierId).connected()` flips to
`true` (credentials exist), "Sync now" becomes available on the
Integrations card, and `runEfsSync` starts landing rows into
`hub.fuel_transactions` with `source = 'efs'`, `ON CONFLICT (carrier_id,
source, external_id) DO NOTHING`. The Fuel CSV import path is untouched and
keeps working for anything the feed doesn't cover.

## Open questions for the next pass

- Confirm the real endpoint path and payload shape against an actual
  CarrierControl data-feed response (this is the #1 blocker to flipping
  status from stub to live).
- Confirm whether unmatched vehicle/unit ids should also raise a
  `hub.integration_syncs` warning row (today they're just returned in the
  `unmatched` array like `telematics.ts`'s `runTelematicsSync`).
