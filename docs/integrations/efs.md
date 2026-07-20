# EFS fuel card feed — scouting notes

Status: **adapter shipped; transport gap closed with a signed file-drop webhook
(2026-07-17).** EFS (efsllc.com, a WEX brand) has no self-serve developer portal for
transaction feeds. The feed is provisioned per-carrier, and the 2026-07-11 pass confirmed
the real delivery is a daily SFTP CSV file, not the Basic-auth REST JSON endpoint
`efsSource()` assumes — see "Adapter impact" below for the shipped remedy: forward the
daily file to `/api/hub/webhooks/efs?carrier=<uuid>` and `processEfsEvent` lands it
through the same idempotent ingest as everything else. **2026-07-20 re-scout: no
adapter-breaking change** — provisioning path, timeline, and transport all still match;
one new corroborating field detail found (see "Feed shape").

## Provisioning — two real paths (confirmed)

1. **Data Sharing Partner path** — how every shipping integrator (Fleetio, Geotab, Motive,
   Datatruck) does it:
   - Carrier logs into **eManager** (efsllc.com → Login → eManager) → hover **Select
     Program** → **Data Sharing Preferences** → pick the partner from a drop-down → **Add**.
   - EFS processes the request in **up to 5 business days**, then issues a **Data Feed
     Username and Password** — explicitly a *different* credential pair from the eManager
     portal login. The carrier pastes those two values into the partner's app.
   - If the Data Sharing Preferences menu is missing, the carrier calls EFS Customer
     Service at **888-824-7378** (or their account manager) to have it enabled.
   - Catch for us: the drop-down lists **registered partners only**. LoadOff is not in it —
     appearing there requires a partner/data-sharing agreement with WEX/EFS (partner
     onboarding reportedly takes 3–8 business days once documentation is submitted).
2. **Direct daily data feed via account rep** — the carrier asks their EFS/WEX rep to add
   the account to a daily data feed. Delivery is **SFTP, file-based (CSV)**. WEX-side
   contacts for SFTP feed setup: 800-492-0669 / CSWEXLINK@wexinc.com.

Either way, the `feedUser` / `feedPassword` fields already on the `efs` registry entry
match what EFS actually issues ("Data Feed User and Password" — Fleetio collects exactly
these two fields), so **no registry/credential-schema change is needed**.

## Auth model (confirmed at the provisioning level)

- Credentials: the EFS-issued Data Feed Username/Password pair (per above). No OAuth, no
  API keys, no self-serve signup.
- The general WEX developer portals are not a shortcut: `developer.wexinc.com` is the B2B
  *payments* platform (OAuth-based Payments API), and `fleetapi.wexinc.com` ("WEX Mobility
  Developer Portal") serves WEX-branded fleet cards, not the EFS OTR program — EFS data
  sharing stays on the eManager path above (integrators like Geotab document WEX and EFS
  as two separate setup processes).

## Feed shape (transport confirmed; column layout still unconfirmed)

- **Transport: daily batch file over SFTP, CSV format.** Geotab documents EFS imports as
  "once per 24-hour period"; Motive exposes the same feed as downloadable CSV files. No
  public REST endpoint for carrier transaction pulls was found.
- Partner-tier integrations advertise ~5-minute freshness (Fleetio), i.e. registered
  partners get a near-real-time feed; a small carrier's direct feed is the overnight batch.
- The exact CSV column layout is still only obtainable with the provisioned feed — the
  assumed field set in `normalizeEfsRecord` (transaction id, datetime, card last-4, unit
  number, merchant name/city/state, gallons, price, total, odometer) matches the Level-III
  data integrators list (driver id, fuel grade, cost/gallon, location), but header names
  are unverified until a real file lands.
- **2026-07-20 finding: Motive's synthesized per-transaction view lists date, time, truck
  stop location, driver ID, fuel type, gallons, price/gallon, total cost, discounts
  applied, and odometer.** This is Motive's downstream display, not the raw SFTP CSV's
  actual header names, so it doesn't resolve the open header-name question — but it's a
  second independent source (after the Level-III field list) landing on the same field
  set, plus one field neither this doc nor `normalizeEfsRecord` currently accounts for:
  **a discount-applied amount**. Worth adding to `CSV_HEADER_ALIASES` as an optional
  column once a real file confirms the header name, so a discount doesn't silently fold
  into `total` unexplained.

## Adapter impact (found 2026-07-11; file-drop remedy shipped 2026-07-17)

`efsSource().pull()` in `src/lib/hub/integrations/efs.ts` does an HTTPS GET to
`${EFS_FEED_BASE}/transactions` with Basic auth and expects `{ transactions: [...] }`
JSON. **The real feed is an SFTP-delivered CSV file — that fetch cannot work as written.**
Nothing breaks (adapter reports `connected(): false` without creds; CSV import is the
product). Of the three possible remedies, the **inbound file-drop route is now shipped**:

- **File drop (shipped)** — save a `webhookSecret` on the EFS card
  (Settings → Integrations; the card shows the carrier's copy-paste URL), then any
  forwarder POSTs the daily file to `/api/hub/webhooks/efs?carrier=<uuid>` as
  `{"event": "fuel.batch", "csv": "<raw file text>"}` (or pre-parsed
  `{"event": "fuel.batch", "transactions": [...]}`), HMAC-SHA256-signed over the raw
  body in `X-Loadoff-Signature`. A one-line cron anywhere the SFTP drop is reachable
  works: fetch file → wrap in JSON → sign → curl. `processEfsEvent` parses the CSV with
  header-alias tolerance (`parseFuelFeedCsv` in `integrations/fuel-feed-csv.ts`, shared
  with WEX since 2026-07-18 — real column names still unverified, unknown
  columns ride along into `raw`), refuses rows without a transaction id instead of
  colliding them on an empty idempotency key, and lands rows through the SAME
  `ingestEfsRows` ON-CONFLICT path the cron sync uses. Replaying a file is a no-op.
  A drop that fails mid-ingest (transient DB error) stays in `hub.integration_events`
  with `processed_at IS NULL`; the EFS card shows the pending count with a
  "Retry N events" button (`retryUnprocessedEvents`, `event-processors.ts` —
  the same re-drain surface the factor card has, generalized 2026-07-17).
- an SFTP poller in the **Go worker** (`services/go/hauldesk-worker`) exposing the parsed
  rows over its HTTP proxy — still the long-term home for a zero-infrastructure carrier
  (Vercel functions can't hold SFTP sessions; an SSH lib is a banned heavy TS dependency);
- registering LoadOff as an EFS Data Sharing Partner and consuming whatever delivery
  EFS specifies in the partner agreement (possibly still SFTP on their side).

`normalizeEfsRecord` stays the single shape-reading point for every transport — when a
real provisioned file lands, confirming the layout means updating `CSV_HEADER_ALIASES`/
`normalizeEfsRecord` once, and cron + file-drop + tests all follow.

## Matching gotchas (from Geotab's production experience)

- EFS matches transactions to vehicles by the **VIN registered on each card**; missing
  VIN↔card association is the #1 cause of unmatched transactions. Our unit-number-hint
  matching should treat `UnitNumber` as best-effort and keep landing unmatched rows with
  `truck_id NULL` (it already does).
- Account numbers in feed requests need leading zeros, no spaces/hyphens, minimum 13
  digits.

## Rate limits / polling

Not applicable in the REST sense — it's a daily batch file. The existing daily cron
(`efs-sync` in `vercel.json`) matches the real cadence exactly; no change needed there.

## Sandbox

None advertised publicly, and none surfaced this pass. Ask for a test feed alongside the
production request; partner onboarding (path 1) is the only route likely to include one.

## Pricing (checked 2026-07-11)

The data feed remains included with the fuel-card account — no separately priced API
product exists for the EFS OTR program. No pricing changes found.

## Lead time

Up to 5 business days for feed provisioning after the eManager/rep request (confirmed —
matches the existing `creds-shopping-list.md` entry). Partner registration adds 3–8
business days on top if we pursue path 1.

## What ships today without any of this

The CSV statement import (`Settings → Fuel → Import`) already accepts any card program's
export, including EFS's, and lands rows in the exact same `hub.fuel_transactions` table via
the same `(carrier_id, source, external_id)` idempotency key. This adapter is additive —
it never replaces that path. Given the real feed is itself a CSV, the import path and the
future SFTP path can even share row-level normalization.

## False lead: "WEX Telematics" is a different product

`help.wextelematics.com` surfaces prominently in EFS/WEX searches (e.g. its own "Fuel
Card Transactions Report" doc) but it's the WEX-owned GPS/ELD telematics product
(formerly Silent Passenger), not the EFS OTR fuel-card program this doc and the `efs`
adapter cover. Its pages 403 to this tooling like everything else vendor-side, so this
couldn't be fully confirmed, but the product naming and separate domain make it
unrelated — don't chase it as a third developer portal alongside `developer.wexinc.com`
and `fleetapi.wexinc.com` (both already ruled out, see Auth model).

## Sources (researched 2026-07-11; re-scouted 2026-07-20)

- Fleetio EFS integration help (Data Sharing Preferences flow, Data Feed User/Password,
  5-business-day provisioning, ~5-min partner sync): help.fleetio.com / fleetio.helpjuice.com
- Geotab "WEX and EFS Fuel Transaction Setup Process" (daily 24h import cadence, VIN
  matching, account-number format, US-only): support.geotab.com
- Motive WEX/EFS fuel purchase integration (CSV file delivery): helpcenter.gomotive.com
- WEX SFTP feed contacts (800-492-0669, CSWEXLINK@wexinc.com): Geotab/WEX setup docs
- WEX developer portals: developer.wexinc.com (B2B payments, OAuth), fleetapi.wexinc.com
  (WEX Mobility) — neither covers EFS OTR transaction feeds
- 2026-07-20 pass (search-snippet only, every direct fetch 403-walled — efsllc.com,
  emgr.efsllc.com, geotab.com, fleetio.com, firstfleetinc.com, gomotive.com,
  wextelematics.com all blocked this pass, same wall as terminal/truckercloud/fmcsa):
  FleetRabbit's EFS integration page corroborates "1–5 business days" provisioning
  (fleetrabbit.com); Motive's transaction-field list (gomotive.com, via search snippet)
  corroborates the assumed field set and adds a "discounts applied" field not yet in
  `normalizeEfsRecord`.
