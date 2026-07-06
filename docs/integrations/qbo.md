# QuickBooks Online — scouting notes

Status: **adapter shipped stub-first** (this cycle), not live — needs a real
Intuit developer app + a carrier's sandbox/production company connected
before the assumed shapes below can be confirmed. Same posture as
`efs.md`/`comdata.md`: update this doc and the normalizer in
`src/lib/hub/integrations/qbo.ts` in one commit the day a real response
lands.

## Auth model

QBO uses OAuth2 **authorization-code** grant, not client-credentials — an
owner (or their bookkeeper) runs Intuit's one-time consent flow in the QBO
developer sandbox and hands us the resulting `refreshToken` + `realmId`
(company id), alongside the app's `clientId`/`clientSecret`. There is no
in-app "Connect to QuickBooks" redirect button yet (that's the interactive
OAuth flow Intuit's docs call the "Connect to QuickBooks" button); the four
fields are pasted directly into Settings → Integrations, same paste-a-key
model as EFS/Comdata, not a redirect dance.

Token refresh: `POST https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer`
with `Authorization: Basic base64(clientId:clientSecret)` and body
`grant_type=refresh_token&refresh_token=<refreshToken>`. Returns a new
`access_token` (≈1hr) **and a rotated `refresh_token`** (Intuit rotates it
on every use, valid ≈100 days). This adapter fetches a fresh access token
on every `pull()` — it does **not** yet persist the rotated refresh token
back into stored credentials (see Open questions), so today's version would
need the owner to re-paste a fresh refresh token periodically once this
goes live.

## Assumed API shape (unconfirmed — adjust on first real response)

`GET {QBO_API_BASE}/v3/company/{realmId}/query?query=<SQL>&minorversion=65`
(env override `QBO_API_BASE`, default `https://quickbooks.api.intuit.com`;
sandbox is `https://sandbox-quickbooks.api.intuit.com`), header
`Authorization: Bearer <access_token>`, `Accept: application/json`.

Query used: `select Id, DocNumber, TotalAmt, Balance, TxnDate from Invoice
maxresults 200` — no `STARTPOSITION` paging yet (see Open questions).
Response: `{ QueryResponse: { Invoice: [...] } }` where each row carries:

- `Id` — QBO's invoice id → `external_id`
- `DocNumber` — matched against `hub.invoices.number` (case-insensitive);
  unmatched numbers are reported, never guessed (same rule as
  `efs.ts`/`comdata.ts`'s unit-hint matching)
- `TotalAmt`, `Balance` — dollars; `TotalAmt − Balance` is "paid so far in
  QBO", compared against what LoadOff has already recorded via
  `hub.payments` for that invoice
- `TxnDate`

## What activates when the owner pastes keys

`qboSource(carrierId).connected()` flips to `true`, "Sync now" becomes
available on the QBO card, and `runQboSync` reconciles: for every QBO
invoice whose `DocNumber` matches an unpaid/partial LoadOff invoice, it
records the **delta** between what QBO shows paid and what LoadOff already
has via the existing `recordPayment()` (same function the office invoices
UI uses for manual payments) — so paid invoices cascade through the normal
load-status pipeline (`invoiced → paid → settled`) exactly like a manual
payment would. The delta-based math (`paid so far in QBO − paid so far in
LoadOff`) makes replays idempotent without any new DB column: recording the
delta brings LoadOff's total in line with QBO's, so the next sync computes
delta `0` and does nothing. The CSV/manual payment-recording path is
untouched.

## Open questions for the next pass

- Confirm the real Query API response shape, `minorversion`, and rate
  limits against a live Intuit developer sandbox — the #1 blocker to
  flipping status from stub to live.
- **Refresh-token persistence**: today's adapter discards the rotated
  refresh token Intuit returns on every access-token exchange. Before this
  goes live, `runQboSync` should call `saveCredentials` with the new
  `refreshToken` after every successful token exchange, or the connection
  will eventually die when the owner's originally-pasted token expires.
- **Paging**: `maxresults 200` with no `STARTPOSITION` loop misses carriers
  with 200+ open invoices in QBO. Add paging once a real account is
  connected and this becomes an actual ceiling.
- This slice only covers the **read/reconcile** direction (QBO payment →
  LoadOff). The shopping list's "no CSV re-keying" promise implies a
  **push** direction too (LoadOff invoice → QBO Invoice creation on
  `pod_received`/invoice-sent) — that's a bigger slice (needs a QBO
  `Customer` lookup/creation step first) and is next in this lane after QBO
  read-side is confirmed live.
