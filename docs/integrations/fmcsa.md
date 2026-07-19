# FMCSA QCMobile API — broker/carrier authority vetting

Researched: 2026-07-07; re-scouted 2026-07-19 (**no breaking change** — webKey query-param auth
and the login.gov → My WebKeys registration flow are confirmed unchanged in current official-page
excerpts; rate limits remain unpublished). Status: **built, live** — `fmcsaLookup`/`vetCustomer`/`recheckActiveCustomers`
in `src/lib/hub/vetting.ts`, wired to the daily `fmcsa-recheck` cron (`vercel.json`, `0 11 * * *`).
Not a stored-credential integration: no row in `src/lib/hub/integrations/registry.ts`,
no `IntegrationProvider` entry, no `hub.integration_credentials` row — configuration is a single
env var (`FMCSA_WEBKEY`), same pattern as `EIA_API_KEY`. `scout-rotation.md` listed this doc
"missing — never researched" despite the adapter being shipped code, which per the rotation rule
(a built adapter is production-impacting) made it a higher priority pick than any remaining stub
vendor doc.

## What it does today (confirmed from source)

`fmcsaLookup(customer)` (`vetting.ts:33`):
1. Reads `process.env.FMCSA_WEBKEY`; returns `null` immediately if unset — `fmcsaConfigured()` gates
   every call site (`vetCustomer`, `recheckActiveCustomers`, the setup wizard, the integrations
   status panel) so the product degrades to "no live vetting" rather than throwing.
2. Calls the QCMobile REST API at `https://mobile.fmcsa.dot.gov/qc/services/carriers`, trying the
   customer's `mc_number` (docket) first via `/docket-number/{mc}?webKey=...`, falling back to
   `dot_number` via `/{dot}?webKey=...` if the docket lookup returns nothing — **only these two
   lookup paths are implemented**; the API also supports name search, cargo-carried, OOS, and BASICS
   endpoints (see below) that this codebase does not call.
3. Each request has an 8-second timeout (`AbortSignal.timeout(8000)`); a non-OK response or thrown
   error just moves to the next identifier rather than failing the whole vetting run.
4. `vetCustomer(carrierId, customerId)` combines the QCMobile result (`allowedToOperate`,
   `commonAuthorityStatus`/`brokerAuthorityStatus`, legal/DBA name match) with the carrier's own AR
   history (`avgDaysToPay`) into a risk score (`computeRiskScore` in `vetting-shared.ts`), persisted
   to `hub.customer_vetting`.
5. `recheckActiveCustomers(carrierId)` (the cron entry point) re-vets up to 50 active customers with
   an MC or DOT number on file and alerts owner/dispatcher roles when a customer that was previously
   `allowed_to_operate = true` flips to `false` between bookings — the double-brokering guard this
   feature exists for.

## Auth model

Query-parameter API key (`?webKey=...`), not a header or OAuth token — appended directly to the
request URL in `fmcsaLookup`. The key is obtained by creating a free **login.gov** account at
`mobile.fmcsa.dot.gov`, filling in developer-account details, then **My WebKeys → Get a new WebKey**;
the key is issued immediately on-screen, no approval wait or manual review step found in the
registration flow. One webKey is shared across all QCMobile endpoints (docket lookup, DOT lookup,
name search, etc.) — there is no per-endpoint scoping.

## Endpoints available vs. used

The QCMobile `carriers` resource exposes more than this codebase calls today (per the API's own
docs and the unofficial `github.com/brandenc40/qcmobile` Go client, which mirrors the full surface):

| Capability | Used here? |
|---|---|
| Carrier by DOT number | Yes — fallback identifier |
| Carrier by docket/MC number | Yes — primary identifier |
| Carrier search by name | No |
| Cargo classes carried | No |
| Operation classification | No |
| Associated docket numbers | No |
| Authority detail (broker/common/contract) | Implicitly — fields come back inline on the carrier lookup response already (`brokerAuthorityStatus`, `commonAuthorityStatus`, `contractAuthorityStatus`), no separate call needed |
| Out-of-service (OOS) records | No |
| BASICS safety scores | No |

Nothing here is broken; it's unused surface. A future lane item could add OOS/BASICS to
`computeRiskScore` for a richer signal, or name search as a lookup fallback when a customer has
neither MC nor DOT on file.

## Rate limits

**Not documented publicly.** FMCSA's developer site (`apiAccess`/`qcApi`/`getStarted` pages) states
the webKey requirement and registration steps but does not publish a requests-per-day or
requests-per-second ceiling, and no third-party client (including the Go package above) documents
one either. `recheckActiveCustomers` caps itself at 50 customers/carrier/day regardless, so current
volume is nowhere near a plausible government-API throttle; if FMCSA ever adds one, the failure mode
is already safe — `fmcsaLookup` treats a non-OK response as "try next identifier" / "return null",
which `vetCustomer` treats as "no live data this cycle," not a crash.

## Sandbox

None. The API is free, public government data with no separate test/sandbox environment or mock
mode — a request against a real DOT/MC number is the only way to exercise it. Local testing here
relies on `FMCSA_WEBKEY` being unset (exercises the `null`/not-configured path) or a real key against
real carrier numbers; there's no fixture-based integration test in `vetting.ts`'s test coverage today.

## Pricing

Free. No usage tier, no paid plan — same "adjacent, free, key-only" bucket as `EIA_API_KEY`, OSRM,
Nominatim, NWS, and NHTSA VIN lookups per `creds-shopping-list.md`. The only cost is the five
minutes of login.gov signup the product's own error copy already promises
(`src/app/hub/_actions/vetting.ts:20`).

## What this scout could and couldn't verify

- **Confirmed from source**: exact lookup order (docket then DOT), 8-second timeout, 50-customer cron
  cap, alert condition, `hub.customer_vetting` persistence, cron schedule, env-var-only config with
  no registry/credentials-table entry.
- **Confirmed from public documentation and a third-party client library**: webKey query-param auth,
  login.gov-based free registration with no approval wait, the fuller endpoint surface (name search,
  cargo, OOS, BASICS, docket-numbers-by-DOT) beyond what this codebase calls.
- **Not verifiable this cycle**: FMCSA's actual production `mobile.fmcsa.dot.gov` docs pages returned
  403 to this scout's fetch tooling (likely bot-blocking, not a site outage) — endpoint descriptions
  above are cross-checked against the Go client's method list and search-result excerpts rather than
  read directly off the primary docs pages. No documented rate limit could be confirmed to exist or
  not exist; treat "undocumented" as the honest answer rather than assuming unlimited.

## 2026-07-19 re-scout

- **No adverse change found.** Current search-indexed excerpts of the official
  `QCDevsite/docs/apiAccess` and `getStarted` pages still describe exactly what the adapter
  implements: webKey as a query parameter on every call, obtained via a login.gov developer
  account → My WebKeys → "Get a new WebKey". No deprecation, migration, or sunset notice
  surfaced for QCMobile or `mobile.fmcsa.dot.gov`.
- **Rate limits: still unpublished** — a second pass found no numeric ceiling anywhere,
  official or third-party. The 50-customer cron cap remains our own safety margin.
- **Access is now harder from this environment than 2026-07-07**: back then only the docs
  *pages* 403'd (bot-blocking); now `mobile.fmcsa.dot.gov` is blocked entirely at the
  network-policy level (proxy CONNECT 403), so even a live no-key probe of the API endpoint
  is impossible from a sandboxed agent. A human with a browser (or the prod deployment, which
  calls it daily via the `fmcsa-recheck` cron) is the only way to observe the live service.
  Prod cron behavior is therefore the real canary: a sustained drop of `checked > 0` results
  would be the first sign of an API change.
- **Historical precedent for outages**: FMCSA has published notices of the Mobile Developer
  site + QCMobile/SaferBus web services being down together; the adapter's
  null-on-failure design (lookup failure → "no live data this cycle", never a crash) is the
  right posture for this API and must not be "improved" into a hard failure.
- Alternate machine-readable reference found: `data.transportation.gov` hosts a
  "Licensing and Insurance — QCMobile API" dataset page (id `7xzn-4j4j`) that stays reachable
  when the FMCSA dev site is not.
