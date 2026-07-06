# WEX fuel card feed — scouting notes

Status: **adapter shipped, feed shape unconfirmed** (same posture as `efs.md`) — cron
(`wex-sync`, daily) and the settings "Sync now" action are wired, `registry.ts` carries
`status: "live"`. No live feed confirmed yet (needs a real carrier's data-feed request to
come back from the WEX account rep). Update this doc and `normalizeWexRecord` in
`src/lib/hub/integrations/wex.ts` in one commit the day a real response lands.

## Auth model (assumed)

WEX Inc. is the parent brand behind both the WEX fleet card and EFS, and the two data-feed
programs are provisioned the same way — a per-carrier request to the account rep, not a
self-serve developer portal. This adapter reuses EFS's `feedUser` / `feedPassword` shape
(HTTP Basic auth) rather than an API-key pair, since the two feeds are requested through the
same "data-feed credentials" conversation (see `docs/integrations/creds-shopping-list.md`
row 3). Confirm against the real onboarding packet before flipping status to live — if WEX's
feed turns out to issue a separate key/secret pair instead (like Comdata's), only
`wexSource()`'s auth header construction changes; the row shape stays the same.

## Assumed feed shape (unconfirmed — adjust on first real response)

`GET {WEX_FEED_BASE}/transactions` (env override; placeholder base URL), returns
`{ transactions: [...] }` where each entry carries the same fields the EFS feed is assumed
to use:

- `TransactionId` — stable per-transaction id → `external_id`
- `TransactionDateTime` — ISO 8601 or similar
- `UnitNumber` — matched against `hub.trucks.unit_number`, unmatched is reported not guessed
  (same rule as `efs.ts` / `comdata.ts` / `telematics.ts`)
- `MerchantName`, `MerchantCity`, `MerchantState` (used as the IFTA jurisdiction hint)
- `Quantity` (gallons), `PricePerGallon`, `TotalAmount` (dollars — converted to cents)
- `Odometer` (miles, optional)

## Rate limits / polling

Unknown until the feed is live. `runWexSync` runs daily (cron `wex-sync`, `vercel.json`,
staggered 10 minutes after `efs-sync`) — conservative for any vendor batch-export cadence,
matching EFS/Comdata. Adjust the cadence once the real feed's rate limits are known.

## Sandbox

None advertised publicly. Ask the account rep for a test/sandbox feed alongside the
production one when requesting data-feed access — note the answer here once known.

## Lead time

~5 business days per the existing EFS/WEX entry in `docs/integrations/creds-shopping-list.md`
(same account-rep request covers both cards).

## What ships today without any of this

The CSV statement import (`Settings → Fuel → Import`) already accepts any card program's
export, including WEX's, and lands rows in the exact same `hub.fuel_transactions` table via
the same `(carrier_id, source, external_id)` idempotency key. This adapter is additive — it
never replaces that path.

## Open questions for the next pass

- Confirm the real endpoint path, auth model, and payload shape against an actual WEX API
  onboarding response — the shape may need to change once a real feed responds.
- Confirm whether WEX's data-feed request is truly bundled with EFS's (same rep, same lead
  time) or requires a separate credentials conversation.
