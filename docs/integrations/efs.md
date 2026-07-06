# EFS fuel card feed — scouting notes

Status: **adapter shipped, feed shape unconfirmed.** EFS (efsllc.com, a WEX brand) has no
self-serve developer portal — the daily transaction feed is provisioned per-carrier by an
account rep, and the exact response shape is only confirmed once that request is in. This
doc records what's assumed so the day the feed shows up, only `normalizeEfsRecord` in
`src/lib/hub/integrations/efs.ts` needs to change.

## Auth model (assumed)

- HTTP Basic auth over the feed connection, credentials called "feed username" / "feed
  password" by EFS reps — deliberately distinct from the EFS Direct Data portal login.
  Matches the `feedUser` / `feedPassword` fields already on the `efs` entry in
  `src/lib/hub/integrations/registry.ts`.
- Base URL is an env override (`EFS_FEED_BASE`), defaulting to a placeholder host — never
  hardcode a real EFS endpoint until the rep confirms one.

## Feed shape (assumed, unconfirmed)

EFS/WEX fuel-card feeds are historically flat-file (CSV/fixed-width) or a polled REST
export, keyed on a per-transaction id. The adapter assumes a JSON array of records shaped
roughly like:

```json
{
  "TransactionId": "string, stable per transaction — becomes external_id",
  "TransactionDateTime": "ISO 8601 or similar",
  "CardNumber": "string, last-4 hint",
  "UnitNumber": "string — matched against hub.trucks.unit_number",
  "MerchantName": "string",
  "MerchantCity": "string",
  "MerchantState": "string, used as the IFTA jurisdiction hint",
  "Quantity": "number, gallons",
  "PricePerGallon": "number, dollars",
  "TotalAmount": "number, dollars",
  "Odometer": "number, miles, optional"
}
```

If the real feed is a CSV/flat-file instead of JSON, only the fetch + row-splitting step in
`efsSource()` changes — `normalizeEfsRecord` stays a pure `Record<string, unknown> → EfsFuelRow`
function either way, so the contract tests keep passing untouched.

## Rate limits / polling

Unknown until the feed is live. `runEfsSync` is written as a daily pull (cron `efs-sync`,
`vercel.json`), which is conservative for any vendor batch-export cadence seen on other fuel
cards (EFS/WEX and Comdata typically batch overnight).

## Sandbox

None advertised publicly. Ask the account rep for a test/sandbox feed alongside the
production one when requesting data-feed access — note the answer here once known.

## Lead time

~5 business days per the existing entry in `docs/integrations/creds-shopping-list.md`.

## What ships today without any of this

The CSV statement import (`Settings → Fuel → Import`) already accepts any card program's
export, including EFS's, and lands rows in the exact same `hub.fuel_transactions` table via
the same `(carrier_id, source, external_id)` idempotency key. This adapter is additive —
it never replaces that path.
