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

QBO rotates the refresh token on (most) redemptions in production. Every
`refreshAccessToken` call compares the response's `refresh_token` against the
one just used; when Intuit returned a different value, `pull()` writes it
back to `hub.api_credentials` via `saveCredentials` before returning, so the
next sync redeems the current token instead of a stale, already-invalidated
one.

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

## Push side: `pushInvoiceToQbo`

Creates a QBO Invoice with `DocNumber` set to our invoice number, so a later
payment sync can resolve it (see the pull-side note above). Two QBO-specific
lookups happen first, since QuickBooks references everything by its own
internal Ids, not ours:

- **CustomerRef**: resolved by matching our customer's name against QBO's
  `Customer.DisplayName` (creating one if none matches). No new column on
  `hub.customers` — same migration-free, match-by-name approach the pull
  side uses for invoices (`DocNumber` ↔ `hub.invoices.number`).
- **Line item**: a single flat line against a generic "Freight Service" QBO
  `Item` (same resolve-or-create-by-name approach), not a per-accessorial
  breakdown — that's a design question for whoever wires the office "Push to
  QBO" button (this lane's territory doesn't include the invoice detail
  page, `src/app/hub/(office)/money/invoices/[id]/page.tsx`).

A second push for the same invoice (an entry already present in
`hub.invoices.sent_log` with kind `"qbo-push"` or `"qbo-push-update"`) isn't
a blind short-circuit: `findQboInvoiceRef` looks the QBO invoice back up by
`DocNumber` and compares its `TotalAmt` to our current `amount_cents`.
Unchanged means a true no-op — `{ connected: true, alreadyPushed: true }`
with no further fetch. Changed (a rate/accessorial edit since the original
push) sends a sparse update instead: `POST .../invoice?operation=update`
with the looked-up `Id`/`SyncToken` and `sparse: true`, so only the `Line`
amount moves and everything else on the QBO side is left alone. A successful
update appends its own `sent_log` entry (kind `"qbo-push-update"`) rather
than reusing `"qbo-push"`, so the audit trail shows create vs. update
separately.

**Assumed/unconfirmed until a sandbox exists:** the `Customer`/`Item` create
bodies (`DisplayName`, `Type: "Service"`, `IncomeAccountRef: { value: "1" }`
as a placeholder income account), the `Invoice` create body shape
(`CustomerRef`, `Line[].SalesItemLineDetail.ItemRef`), and QBO's actual
sparse-update semantics for `Line` (assumed to replace the array wholesale
since no per-line `Id` is tracked — confirm this doesn't duplicate lines on
a real account before flipping `registry.ts`'s `qbo` entry to live).

## What activates when the owner pastes keys

`qboSource(carrierId).connected()` flips to `true` and "Sync now" becomes
available on the QuickBooks card. `runQboSync` resolves each payment to a
matching invoice by number and calls the SAME `recordPayment` the office
"record a payment" form uses — so invoice status transitions, audit logging,
and the load-status cascade (invoiced → paid → settled) all go through the
one code path. `pushInvoiceToQbo(carrierId, invoiceId, actor)` is ready for
the office lane to call from a "Push to QBO" button. QuickBooks CSV export
stays the fallback for both directions until then.

## Open questions for the next pass

- Wire an actual "Push to QBO" button — this lane's territory doesn't
  include the invoice detail page or its actions
  (`src/app/hub/_actions/money.ts`), both office-lane territory.
  `pushInvoiceToQbo(carrierId, invoiceId, actor)` is ready to call.
- Decide whether accessorials need their own QBO line items instead of one
  flat "Freight Service" line (see `pushInvoiceToQbo` above).
- Confirm QBO's sparse-update semantics for `Line` on a real sandbox account
  before flipping to live — `pushInvoiceToQbo`'s update path assumes
  resending the full `Line` array is safe without a per-line `Id`.
- Confirm the real sandbox response shape (`Customer`/`Item`/`Invoice`
  create bodies) and flip `registry.ts` status to `live`.
