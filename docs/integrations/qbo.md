# QuickBooks Online — scouting notes

Status: **adapter shipped stub-first** (`src/lib/hub/integrations/qbo.ts`), no
sandbox account wired yet. Confirm the real response shape and flip
`registry.ts`'s `qbo` status to `live` once a developer.intuit.com app + sandbox
company are set up (see `docs/integrations/creds-shopping-list.md` row 6).

## Why no migration was needed

The shopping list used to say QBO was "planned — needs a migration first"
because `hub.api_credentials.provider` had a hard-coded enum. Migration
`014_integrations_v2.sql` already replaced that with a shape check
(`provider ~ '^[a-z][a-z0-9_-]{1,39}$'`), so credential storage needs nothing
new. What QBO still can't do without a migration is land payments through the
usual `ON CONFLICT (carrier_id, source, external_id)` pattern — `hub.payments`
(from `003_money.sql`) has no `source`/`external_id` columns or unique
constraint, unlike `hub.fuel_transactions`. Adding those is a shared-file
change (`migrations/**`) outside this lane's territory, so this adapter takes
a different, migration-free idempotency route instead:

- **Invoice match**: `hub.invoices` already has `UNIQUE (carrier_id, number)`
  from day one, so a QBO payment is matched to our invoice by `DocNumber` →
  `number`, no new column.
- **Payment dedup**: `hub.payments.reference` is a free-text column already
  used for check/wire references. This adapter writes `reference =
  "qbo:<Payment.Id>"` and checks for an existing row with that reference
  before calling `recordPayment` again, so replays don't double-book a
  payment.

If a real integration later needs the CSV-import-style
`ON CONFLICT (carrier_id, source, external_id)` shape on payments (e.g. to
also support providers with no natural invoice-number key), that's the
Backlog item for the integrator: add `source`/`external_id` +
`UNIQUE (carrier_id, source, external_id)` to `hub.payments`.

## Auth model

OAuth2 refresh-token grant (`docs.developer.intuit.com`). The connect form
asks for `clientId`, `clientSecret`, `refreshToken`, and `realmId` (the QBO
company id) because Intuit's auth code exchange is a one-time manual step in
their developer console — LoadOff never touches the browser-based OAuth
consent screen and only redeems a long-lived refresh token. Every sync
exchanges it for a short-lived (1hr) bearer token via
`POST {QBO_OAUTH_BASE}/` (`https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer`),
mirroring `telematics.ts`'s TruckerCloud client-credentials pattern (no
caching yet).

**Known gap:** QBO rotates the refresh token on every redemption in
production. This adapter does not yet persist the rotated token back to
`hub.api_credentials` — after ~100 days (or on first rotation, depending on
Intuit's app settings) the stored refresh token could go stale. Wiring
`saveCredentials` after a successful refresh is the next QBO pass.

## Assumed feed shape (unconfirmed — adjust on first real sandbox response)

`GET {QBO_API_BASE}/v3/company/{realmId}/query?query=...` (env override;
`QBO_API_BASE` defaults to `https://quickbooks.api.intuit.com` — swap to
Intuit's sandbox host while testing), returns
`{ QueryResponse: { Payment: [...] } }` / `{ QueryResponse: { Invoice: [...] } }`.

1. `SELECT * FROM Payment MAXRESULTS 100` — each `Payment` has `Id`
   (→ `external_id`), `TotalAmt`, `TxnDate`, `PaymentRefNum`, and
   `Line[].LinkedTxn[]` entries where `TxnType: "Invoice"` carry QBO's
   *internal* invoice id in `TxnId` (not our invoice number).
2. `SELECT Id, DocNumber FROM Invoice WHERE Id IN (...)` resolves those
   internal ids to `DocNumber` — the field this adapter assumes equals our
   `hub.invoices.number`, which only holds if a not-yet-built push adapter
   sets it that way when creating the QBO invoice in the first place.

## What activates when the owner pastes keys

`qboSource(carrierId).connected()` flips to `true` and "Sync now" becomes
available on the QuickBooks card. `runQboSync` resolves each payment to a
matching invoice by number and calls the SAME `recordPayment` the office
"record a payment" form uses — so invoice status transitions, audit logging,
and the load-status cascade (invoiced → paid → settled) all go through the
one code path. QuickBooks CSV export stays the fallback.

## Open questions for the next pass

- Build the push side (LoadOff → QBO): create/update a QBO Invoice with
  `DocNumber` set to our invoice number when we invoice a load. Until this
  exists, payments against invoices QBO doesn't know under a matching
  `DocNumber` come back `invoiceNumber: null` and are reported unmatched.
- Persist the rotated refresh token after each `refreshAccessToken` call.
- Confirm the real sandbox response shape and flip `registry.ts` status to
  `live`.
