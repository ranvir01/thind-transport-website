# FMCSA QCMobile — broker vetting (free webkey)

Researched: 2026-07-07. Status: **built, live** — `vetCustomer` / `recheckActiveCustomers` in
`src/lib/hub/vetting.ts`, wired to the nightly `vetting-recheck` cron (`vercel.json`,
`15 6 * * *`) and the customer vetting panel (`VettingPanel.tsx`). Not in
`IntegrationProvider` — credentials are a single platform env var (`FMCSA_WEBKEY`), not
per-carrier stored creds. This doc did not exist before this cycle (`scout-rotation.md`
listed it "missing — never researched") despite the adapter being shipped code.

## What it does today (confirmed from source)

`vetCustomer(carrierId, customerId)`:
1. Loads the customer's `mc_number` and/or `dot_number` from `hub.customers` (carrier-scoped).
2. If `FMCSA_WEBKEY` is set, calls the QCMobile REST API:
   - `GET /qc/services/carriers/docket-number/{mc}?webKey=…` when MC is present
   - `GET /qc/services/carriers/{dot}?webKey=…` when DOT is present
   - 8 s timeout per request; tries MC first, then DOT; returns null on any failure.
3. Parses `content[0].carrier` (or bare `content`) for `allowedToOperate`, authority
   statuses, and `legalName`/`dbaName`.
4. Blends FMCSA data with the carrier's own AR history (`avgDaysToPay`) via
   `computeRiskScore` in `vetting-shared.ts` — score 0–100 with human-readable reasons.
5. Inserts a row into `hub.customer_vetting` with the full JSON snapshot for audit.

`recheckActiveCustomers(carrierId)` (cron):
- No-op when `FMCSA_WEBKEY` is unset (`{ checked: 0, alerts: 0 }`).
- Re-vets up to 50 active customers that have MC or DOT on file.
- Alerts owner + dispatcher when a previously-allowed broker flips to `allowedToOperate = N`.

Manual "Check now" on the customer detail page calls `vetCustomerAction` (requires
`customers:write` permission).

## Auth model

| Item | Detail |
|---|---|
| Credential | `FMCSA_WEBKEY` env var (Vercel project env, not per-carrier) |
| How to obtain | Free — create a developer account at [mobile.fmcsa.dot.gov/QCDevsite](https://mobile.fmcsa.dot.gov/QCDevsite/) via Login.gov, then **My WebKeys → Get a new WebKey** |
| Auth mechanism | `webKey` query parameter on every request (no OAuth, no per-request signing) |
| Cost | Free (government open data) |
| Sandbox | None — production API only; responses are read-only carrier safety data |

Without the webkey the vetting panel still works using payment-history scoring only; FMCSA
fields show as "not verified yet" and the nightly cron skips all lookups.

## API endpoints we use

Base URL: `https://mobile.fmcsa.dot.gov/qc/services/`

| Endpoint | Used for |
|---|---|
| `/carriers/docket-number/{mc}?webKey=…` | Broker MC lookup (primary) |
| `/carriers/{dot}?webKey=…` | USDOT fallback when MC missing or MC call fails |

Fields consumed from the carrier object:
- `allowedToOperate` — `"Y"` / `"N"` (mapped to boolean)
- `brokerAuthorityStatus`, `commonAuthorityStatus`, `contractAuthorityStatus` — authority
  revocation/inactive detection
- `legalName`, `dbaName` — name-match check against `hub.customers.name`

We do **not** call the extended endpoints (`/basics`, `/authority`, `/oos`, etc.) today.
Those are available for a future risk-score enrichment pass.

## Rate limits and operational notes

Official docs do not publish hard rate limits. Our usage is low-volume:
- Manual checks: dispatcher-initiated, a few per day per carrier
- Cron: ≤ 50 customers per carrier per night, one request each (MC then DOT fallback)

`fetch` uses `AbortSignal.timeout(8000)` — slow FMCSA responses fail gracefully and the
vetting row is still written with payment-history-only scoring.

**Field-name drift risk:** our code reads `allowedToOperate` (camelCase). The FMCSA API
elements doc also documents `allowToOperate` — if FMCSA changes response shape, the
authority check silently degrades to `null` (unknown). Worth a contract test against a
known-good MC when the webkey is available in CI.

## UI surfacing

- `/hub/customers/[id]` — `VettingPanel` shows score, reasons, FMCSA snapshot, and
  "Check now" button; banner when `FMCSA_WEBKEY` is unset with signup link.
- Onboarding setup (`setup.ts`) auto-vets new customers with MC/DOT when webkey is set.
- Nightly cron alerts when authority goes inactive between bookings.

## Adapter-breaking changes to watch

| Change | Impact |
|---|---|
| `webKey` auth retired or moved to OAuth | All lookups break until env + code updated |
| Response envelope shape change (`content` array vs object) | Lookup returns null — already handled with array fallback |
| `allowedToOperate` field renamed/removed | Risk score loses FMCSA authority signal |
| Rate limiting / IP blocking at scale | Cron may need backoff or request spacing |

None observed as of 2026-07-07. API has been stable since QCMobile launch.

## Shopping list

Not on `creds-shopping-list.md` (platform env, not a vendor integration card). Owner
action: paste `FMCSA_WEBKEY` into Vercel project env — takes ~5 minutes via Login.gov.
