# QuickBooks Online — scouting notes

Status: **adapter shipped stub-first** (`src/lib/hub/integrations/qbo.ts`), no
sandbox account wired yet; **platform notices re-checked 2026-07-21** (see the
dated sections below — no adapter-breaking change; the previously-unconfirmed
refresh-token-expiry field name is now confirmed as `x_refresh_token_expires_in`,
i.e. the field the adapter already reads, and it now carries the 5-year value).
Confirm the real response shape and flip `registry.ts`'s `qbo` status to `live`
once a developer.intuit.com app + sandbox company are set up (see
`docs/integrations/creds-shopping-list.md` row 6).

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

QBO rotates the refresh token on (most) redemptions in production —
confirmed 2026-07-17: Intuit's own guidance is that the refresh-token value
can change on any exchange after a ~24–26 hour window, and the client must
always persist the latest value returned. Every `refreshAccessToken` call
compares the response's `refresh_token` against the one just used; when
Intuit returned a different value, `pull()` writes it back to
`hub.api_credentials` via `saveCredentials` before returning, so the next
sync redeems the current token instead of a stale, already-invalidated one.
The adapter's rotation handling matches the documented policy — no change
needed there.

**Policy change (announced 2025-11-12, sandbox 2025-12-10, production
2026-01-27): refresh tokens now have a hard maximum validity of five
years.** Previously a token stayed valid forever as long as it was redeemed
at least every 100 days. Now, for apps on the `com.quickbooks.accounting`
scope (us), tokens generated since October 2023 carry a 5-year cap — the
first of those start dying **October 2028**; apps on restricted/granular
scopes hit it earlier (February 2027). Two consequences for this adapter:

- The token-refresh response now includes a field stating when the refresh
  token itself expires. **Confirmed 2026-07-21:** it is the pre-existing
  `x_refresh_token_expires_in` seconds field — the exact field this adapter
  already reads — and no differently-named authoritative field was added, so
  the `refreshAccessToken` "prefer a new field" contingency is moot. Under the
  5-year cap that field now returns `157680000` (= 1825 days = 5 years) instead
  of the legacy 100-day inactivity value, so `refreshAccessToken`'s
  `now + x_refresh_token_expires_in` computation yields the real hard-expiry
  date directly. **Shipped 2026-07-19:**
  `refreshAccessToken` converts it to an absolute `refreshTokenExpiresAt`
  ISO timestamp, `persistTokenRotation` stores it in the same encrypted
  credential payload (with a >1-day drift guard so syncs don't rewrite
  credentials every run), and `qboTokenExpiryNotice` renders it on the
  QuickBooks settings card — calm validity line normally, warn styling
  inside 90 days or past expiry.
- When the 5-year cap hits, the stored credential dies **unrecoverably** —
  the owner must repeat the one-time manual auth-code exchange in the
  Intuit developer console and paste a fresh refresh token. Intuit added a
  "Reconnect URL" field to app settings (available since 2026-02-24) for
  exactly this; not relevant to our console-only connect flow, but the
  re-auth runbook above is. Intuit *also* fires customer-facing expiry
  notices — in-app top-menu + Integrations-page banners 30 days out, an email
  reminder 7 days out (confirmed 2026-07-21). LoadOff's own
  `qboTokenExpiryNotice` warns on the settings card at **90 days**, i.e. the
  owner sees our warning well before Intuit's customer channels fire — the
  right ordering, since our fix (paste a fresh refresh token) is what resolves
  it, not Intuit's generic reconnect prompt.

## Re-verified 2026-07-21 (scout pass — no adapter-breaking change)

Full re-check of auth model, endpoints, rate limits, sandbox, and pricing
against `src/lib/hub/integrations/qbo.ts`. Nothing broke; two items closed:

- **Refresh-token expiry field name confirmed** (was the top open question):
  the authoritative field is `x_refresh_token_expires_in` — exactly what
  `refreshAccessToken` already reads. Intuit did **not** add a differently-named
  field; under the 5-year cap it simply returns the larger value
  (`157680000` s = 5 y) in the same slot. Confirmed against multiple sources
  quoting the live token response shape. The adapter needs no change.
- **Customer-facing expiry notice cadence documented** (in-app 30 d, email
  7 d) — see the refresh-token section above; validates the 90-day
  `qboTokenExpiryNotice` window as firing *ahead* of Intuit's own notices.

Re-confirmed unchanged: minorversion-75 default (sub-75 ignored), `Id` no
longer sortable, CloudEvents webhook format, OAuth2 refresh-token grant on
`oauth.platform.intuit.com/oauth2/v1/tokens/bearer`, and the 500 req/min/realm
+ 10-concurrent core limits (a sync makes ≤4 calls). One minor discrepancy
noted: some third-party 2026 guides cite the **batch** endpoint at 40 req/min
where Intuit's own Oct-2025 notice says 120 — LoadOff uses neither the batch
endpoint nor the "resource-intensive" 200 req/min class, so it's academic for
us; the doc keeps Intuit's official 120 figure. No pricing change to API
access surfaced. Intuit's own pages (developer.intuit.com, help center,
medium.com/intuitdev) still 403 automated fetches from this rig — findings
are from search excerpts and third-party integrator guides that quote the
notices verbatim.

## Platform changes checked 2026-07-17 (Intuit notices, Aug 2025 → Feb 2026)

Scout pass per the rotation registry — Intuit shipped several Accounting API
platform changes since this doc was written; each checked against
`src/lib/hub/integrations/qbo.ts`:

- **Minor versions 1–74 are deprecated since 2025-08-01.** All requests are
  served with minor-version-75 behavior; a `minorversion` value below 75 is
  simply *ignored*. The adapter hardcodes `minorversion=65` on all four call
  sites (query, entity create, invoice create, invoice sparse update) — so it
  has been silently receiving **v75-shaped responses** for almost a year.
  Nothing observed is broken (the fields we read — `Id`, `TotalAmt`,
  `TxnDate`, `PaymentRefNum`, `DocNumber`, `SyncToken`, `Line`,
  `LinkedTxn` — are stable core fields), but the pin was dead weight and
  misleading. **Bumped to `minorversion=75` on all four call sites
  2026-07-19** (truth-in-code — behavior is unchanged since responses were
  already v75-shaped); still re-check the assumed shapes against the v75
  schema when the sandbox account exists.
- **`Id` is no longer a sortable field** (sandbox 2025-12-10, production
  2026-01-27; Intuit recommends `TxnDate` for ordering). Checked: none of
  the adapter's five QBO queries uses `ORDERBY`, so no impact today — but
  don't add `ORDERBY Id` to the Payment pagination when `MAXRESULTS 100`
  eventually needs real paging; use `TxnDate` (+ `STARTPOSITION`).
- **Webhooks moved to a CloudEvents payload format** (migration deadline
  2026-05-15 for existing consumers). LoadOff consumes no QBO webhooks —
  payments arrive by polling `runQboSync` — so nothing to migrate. If a
  future pass adds QBO webhooks via `/api/hub/webhooks/[provider]`, build
  against CloudEvents from day one; the pre-2026 sample payloads floating
  around are dead.
- **Rate limits (unchanged for our usage):** 500 requests/min per realm,
  10 concurrent per realm per app, HTTP 429 on breach; the batch endpoint
  (which we don't use) was re-throttled to 120 req/min in late 2025, and
  sandbox limits were aligned with production (~2025-09-15). A sync run
  makes ≤4 calls — no throttling concern at any realistic cadence.
- Entity-level changes in the same notice (Employee address/phone
  validation, `NeoEnabled` NameValue deprecation on CompanyInfo) touch
  entities this adapter never reads or writes.

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

- ~~Bump the hardcoded `minorversion=65` to `75`~~ — done 2026-07-19 (four
  call sites); pair with a schema re-check once a sandbox account exists.
- ~~Read the refresh-token-expiry field and surface it on the settings
  card~~ — done 2026-07-19 (`x_refresh_token_expires_in` →
  `refreshTokenExpiresAt` in the credential payload → `qboTokenExpiryNotice`
  on the card). ~~Confirm the field name against a real token exchange~~ —
  confirmed 2026-07-21: it is `x_refresh_token_expires_in`, the field the
  adapter already reads (no differently-named field was added). The notice
  simply stays absent until an expiry is observed.
- ~~Wire an actual "Push to QBO" button~~ — already shipped: the invoice
  detail page's `MoneyActions.tsx` calls `pushInvoiceToQboAction`
  (`src/app/hub/_actions/money.ts`), which calls
  `pushInvoiceToQbo(carrierId, invoiceId, actor)`.
- Decide whether accessorials need their own QBO line items instead of one
  flat "Freight Service" line (see `pushInvoiceToQbo` above).
- Confirm QBO's sparse-update semantics for `Line` on a real sandbox account
  before flipping to live — `pushInvoiceToQbo`'s update path assumes
  resending the full `Line` array is safe without a per-line `Id`.
- Confirm the real sandbox response shape (`Customer`/`Item`/`Invoice`
  create bodies) and flip `registry.ts` status to `live`.

## Sources (researched 2026-07-17, re-verified 2026-07-21)

Intuit's own developer pages 403 automated fetches from this rig, so
findings above come from Intuit's announcement summaries as surfaced in
search plus third-party integrator changelogs that quote them:

- Intuit Developer blog, "Changes to our Accounting API that may impact
  your application" (medium.com/intuitdev) — minor versions 1–74
  deprecated 2025-08-01, sub-75 `minorversion` values ignored, all
  responses v75.
- Intuit Developer blog, "Important changes to refresh token policy"
  (blogs.intuit.com, 2025-11-12) — 5-year maximum refresh-token validity;
  accounting/payments-scope tokens from Oct 2023 expire starting Oct 2028;
  granular-scope tokens from Feb 2022 starting Feb 2027; new expiry field
  in the token-refresh response; Reconnect URL portal field live
  2026-02-24.
- Intuit Developer blog, "Upcoming changes to APIs and tools that may
  impact your application" (blogs.intuit.com, 2025-12-01) — sandbox
  2025-12-10 / production 2026-01-27 rollout; `Id` no longer sortable;
  CloudEvents webhook migration deadline 2026-05-15.
- Intuit help center, "Refresh Token Expiration and Validity Policy" /
  "Handling OAuth token expiration" — 100-day inactivity expiry and
  ~24–26h rotation of the refresh-token value; always persist the latest.
- Intuit help center, "API call limits and throttling" + Codat/Apideck
  integrator changelogs — 500 req/min/realm, 10 concurrent, batch endpoint
  120 req/min (production 2025-10-31), sandbox aligned to production
  limits ~2025-09-15.
- 2026-07-21 re-verification: Intuit help center "Refresh Token Expiration
  and Validity Policy" + "Handling OAuth token expiration" and multiple 2026
  integrator guides (Truto, Apideck, Satva, Coefficient, Zuplo) quoting the
  live token response — the expiry field is `x_refresh_token_expires_in`
  (value `157680000` s = 5 y under the cap); customer expiry notices fire
  in-app 30 days out and by email 7 days out; core rate limits (500/min/realm,
  10 concurrent) and minorversion-75 default unchanged. Some third-party
  guides cite the batch endpoint at 40 req/min vs Intuit's official 120 —
  irrelevant to this adapter (uses neither batch nor resource-intensive
  endpoints). No API-access pricing change surfaced.
