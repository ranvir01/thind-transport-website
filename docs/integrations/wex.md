# WEX fuel card feed — scouting notes

Status: **adapter shipped; transport gap closed with a signed file-drop webhook
(2026-07-18), mirroring EFS.** The 2026-07-18 pass confirmed what the EFS pass
predicted: the WEX-branded card feed is the same **daily batch CSV file over SFTP**
delivery model as EFS — there is no carrier-self-serve REST endpoint for
`wexSource().pull()` to hit. Forward the daily file to
`/api/hub/webhooks/wex?carrier=<uuid>` and `processWexEvent` lands it through the
same idempotent ingest as everything else. Update `normalizeWexRecord` in
`src/lib/hub/integrations/wex.ts` in one commit the day a real file lands.

## 2026-07-28 scout pass (3rd re-pass) — no adapter-breaking change

Second re-pass since the 2026-07-18 file-drop ship. Same wall as ever — every
WEX/Corpay-controlled page (`developer.wexinc.com`, `fleetapi.wexinc.com`,
`freightwaves.com`, `fleetrabbit.com`) 403s this env on direct fetch, so all
findings below are search-excerpt-confirmed only. Nothing touches the adapter's
proven path (file-drop webhook + `normalizeWexRecord`), so **no urgent flag**.
Four finds:

1. **Account-number format conflict now tilts to 19-digit (690046-prefix).**
   The 2026-07-22 pass flagged Samsara's "always begins with 690046, 19 digits"
   claim against Fleetio's "13-digit, starts 04/69/369/2960/1960/7560" claim and
   asked for a third source. This pass corroborated the **19-digit / 690046**
   side from a second angle — the structural form `XXXX-00-XXXXXX-X` surfaced
   alongside Samsara's number, and Samsara additionally documents a unique
   per-account **Filename** WEX supplies to map the SFTP feed and a **3-failed-
   attempt SFTP lockout**. Best current read: WEX's *account* number is the
   19-digit/690046 value; Fleetio's shorter "prefixes" likely conflate the
   card-number family or an older format. Still not primary-source-read, and
   **the adapter never parses this field** (`grep` still shows zero references
   in `wex.ts`), so it stays a docs-only refinement — see the Provisioning note
   below, updated to lead with 19-digit. `creds-shopping-list.md` still says
   "13-digit"; correcting that row is an integrations-lane call (that file is
   theirs) — logged in Backlog, not urgent.
2. **NCR Voyix × WEX partnership is a merchant-acceptance red herring** — the
   exact same class as the NCR Voyix note in `comdata.md`. Announced 2025-10-20,
   launching **2026**: NCR Voyix's Voyix Connect payment gateway will accept WEX
   **fleet cards at the pump** across its 18,000+ fuel-station POS base. This is
   the merchant-acquiring / card-*acceptance* side, NOT the carrier
   fuel-transaction *feed* we ingest — the daily SFTP file model is unaffected.
   Noted here to pre-empt a false alarm the next time it resurfaces.
3. **A registered-partner WEX API delivers real-time Level III data.**
   FleetRabbit documents a **real-time** WEX API sync ("no CSV uploads, no
   scheduled batch pulls", "connects in under 10 minutes") pulling Level III
   fields (driver ID, fuel grade, price/gal, gallons, station location). This is
   the partner-tier `developer.wexinc.com` / `fleetapi.wexinc.com` surface the
   doc already flags — WEX's Payments API "also offers OAuth authentication",
   confirming the partner path is **OAuth**, distinct from the file feed's
   release-form model. It is NOT a carrier-self-serve endpoint, so LoadOff's
   file-drop path stays the realistic activation; but it sharpens the "register
   as a WEX partner" open question — the payoff is **real-time push**, not just
   feed consolidation.
4. **2026 pricing refined (shopping-list context).** Firmer figures this pass:
   **~$50 one-time setup** (TruckingWay), **~$4/card/mo** core (Fleet Card /
   FlexCard) sliding to **~$2** for Large-Fleet / Cross Roads tiers; the FlexCard
   is advertised with **no setup / annual / card fee**; out-of-network
   **$0.50–$2/transaction**; late-payment **$35–$150+**. Consistent with the
   2026-07-22 "~$40 setup, ~$2–4/card/mo" range, now with a firmer $50 upper
   setup figure. Quote-driven, no change to the shopping-list framing.

## 2026-07-22 scout pass — no adapter-breaking change

First re-pass since the 2026-07-18 file-drop ship. Two new integrator sources
(Samsara, Azuga) turned up alongside the existing Geotab/Fleetio/Motive set;
every WEX/Corpay-controlled page (`fleetapi.wexinc.com`, `developer.wexinc.com`)
still 403s this env, so confirmation stays search-excerpt only — same wall as
every other provider in this rotation. Nothing here touches the adapter's
proven path (file-drop webhook + `normalizeWexRecord`), so no urgent flag.
Four finds:

1. **Provisioning timeline is faster than our doc implies, for some
   integrators.** Samsara and Azuga both document WEX returning SFTP
   credentials in **2–4 business days** (Azuga: +1–2 more days for
   platform-side config; Samsara: 3–8 business days end-to-end) — well under
   Fleetio's 7–10 (+7 more for certain prefixes) already in this doc. Since
   LoadOff's path is the release-form/file-drop model (not a carrier holding
   SFTP creds directly), treat Fleetio's number as the conservative upper
   bound for the shopping list, not the typical case.
2. **Conflicting, unconfirmed account-number claim.** Samsara's doc states
   WEX account numbers "always begin with 690046" and are **19 digits** —
   directly at odds with Fleetio's existing 13-digit/04-69-369-2960-1960-7560-prefix
   claim already recorded here. Our adapter never parses or validates account
   number format (`grep` confirmed zero references in `wex.ts`), so this is a
   docs-only discrepancy, not adapter-breaking. Needs a third source before
   either claim is trusted — flagged, not resolved.
3. **File frequency is selectable, not always daily.** Azuga's WEX setup form
   lets the carrier choose daily, weekly, or monthly file delivery. The
   `wex-sync` cron's daily assumption is still the right default to recommend
   a carrier request, but it's worth saying explicitly since a carrier could
   pick weekly/monthly at signup and land fewer rows than expected.
4. **2026 card pricing (shopping-list context, same treatment as comdata.md).**
   Third-party sources report a **~$40 one-time setup fee** and a
   **~$2–4/card/month** fee that varies by card tier (SmartFleet-class ~$4,
   Large-Fleet-class ~$2). No public comprehensive fee grid — quote-driven,
   consistent with the "varies by account" framing this doc already carries
   for provisioning.

Fleet Fabric (`developer.wexinc.com/fleet-fabric-service`) and the WEX
Mobility Developer Portal (`fleetapi.wexinc.com`) remain partner-tier and
403-walled — no change to the existing "not a same-week activation" call.

## Provisioning (confirmed 2026-07-18 — differs from EFS in paperwork, not transport)

How every shipping integrator (Geotab, Motive, Fleetio) gets WEX-branded card data:

- The carrier (or the partner, via electronic **WEX Data Release Forms** — Fleetio
  uses HelloSign) authorizes WEX to add the account to the partner's **daily SFTP
  file**. Contact: WEX at **800-492-0669** or the carrier's account rep (same
  WEX-side SFTP contacts as EFS: CSWEXLINK@wexinc.com).
- Have the **WEX Account Number** ready. Two conflicting formats are documented;
  the 2026-07-28 pass tilts to the **19-digit number beginning `690046`**
  (structural form `XXXX-00-XXXXXX-X`, per Samsara + a second source) as the
  current *account* number — distinct from the card number, and distinct from
  Fleetio's older "13-digit, starts 04/69/369/2960/1960/7560" claim (likely a
  card-number-family or legacy format). The adapter never parses this field, so
  the discrepancy is docs-only. WEX also issues a unique **Filename** used to
  map the SFTP feed; entering SFTP credentials wrong **3 times locks the account
  out** of the SFTP server (Samsara).
- Lead time: **7–10 business days** (Fleetio); accounts starting 0460/0467/0473/0478
  take up to seven MORE business days (third-party processing). Longer than EFS's
  ~5 days — the shopping list notes both.
- Key difference from EFS: EFS issues the carrier a *Data Feed Username/Password*
  pair; the WEX path is a release-form authorization that points the feed at a
  registered partner's SFTP destination. A small carrier may never hold feed
  credentials at all — which makes the file-drop path (any forwarder that can reach
  the SFTP drop signs and POSTs the file) the realistic activation for LoadOff
  until we register as a WEX data partner.

## Auth model

- Registry keeps `feedUser` / `feedPassword` for the (unconfirmed) case where WEX
  issues per-carrier feed credentials like EFS does — only `wexSource()`'s Basic-auth
  header would change if it turns out to be key/secret instead.
- **`webhookSecret` (added 2026-07-18)** signs the daily file drop: POST
  `{"event": "fuel.batch", "csv": "<raw file text>"}` (or pre-parsed
  `{"event": "fuel.batch", "transactions": [...]}`) to
  `/api/hub/webhooks/wex?carrier=<uuid>`, HMAC-SHA256 over the raw body in
  `X-Loadoff-Signature`. Replays are no-ops (content-hash dedup + ON CONFLICT
  ingest). A drop that fails mid-ingest stays in `hub.integration_events`
  unprocessed; the WEX card shows the pending count with a "Retry N events"
  button (`retryUnprocessedEvents` — registered in `EVENT_PROCESSORS`, so the
  surface came free).
- The developer portals are not a shortcut for carriers:
  `fleetapi.wexinc.com` ("WEX Mobility Developer Portal") and
  `developer.wexinc.com` (Fleet Fabric / B2B payments) serve **registered
  partners** building payment/fleet integrations — Level-III transaction data is
  available there, but behind partner onboarding, the analog of EFS's Data Sharing
  Partner tier. Worth pursuing when LoadOff registers as a WEX partner; not a
  same-week activation for a 15-truck carrier.

## Feed shape (transport confirmed; column layout still unconfirmed)

- **Transport: daily batch CSV over SFTP** — Geotab documents the WEX import as
  once per 24 hours (Mon–Fri midnight UTC schedule), Motive exposes the same feed
  as downloadable CSV files, Fleetio ingests it hourly with 1–2 business days of
  latency and no weekend data.
- Column layout is only obtainable with a provisioned file. `parseFuelFeedCsv`
  (`src/lib/hub/integrations/fuel-feed-csv.ts`, shared with EFS) maps header
  variants tolerantly onto the assumed record keys `normalizeWexRecord` reads;
  unknown columns ride along into `raw`.

## Matching gotchas (from Geotab's production experience — same as EFS)

- WEX matches transactions to vehicles by the **VIN registered on each card**;
  a missing VIN↔card association is the top cause of unmatched transactions. Our
  unit-number-hint matching stays best-effort: unmatched rows land with
  `truck_id NULL` and are reported, never guessed.

## Rate limits / polling

Not applicable — daily batch file. The `wex-sync` cron (staggered 10 minutes after
`efs-sync`) matches the real cadence; no change needed.

## Sandbox

None advertised. Ask for a test feed when signing the release forms; note the
answer here once known.

## Lead time

7–10 business days (plus up to 7 more for 0460/0467/0473/0478 accounts) — see
Provisioning above.

## What ships today without any of this

The CSV statement import (`Settings → Fuel → Import`) already accepts any card
program's export, including WEX's, and lands rows in the exact same
`hub.fuel_transactions` table via the same `(carrier_id, source, external_id)`
idempotency key. This adapter is additive — it never replaces that path.

## Open questions for the next pass

- Confirm whether the direct (non-partner) WEX feed issues the carrier feed
  credentials at all, or only the release-form/partner-destination flow exists.
- Confirm the real CSV column layout against a provisioned file → update
  `CSV_HEADER_ALIASES` / `normalizeWexRecord` once; cron + file-drop + tests all
  follow.
- Scope WEX partner registration (fleetapi.wexinc.com) — one registration would
  cover WEX-branded cards the way EFS Data Sharing Partner status covers EFS.

## Sources

Researched 2026-07-18 unless noted:

- Geotab "Fuel Transaction Provider (WEX) Setup Process V2.1" (SFTP file, daily
  24h cadence, 800-492-0669, VIN↔card matching): support.geotab.com
- Fleetio WEX Fuel Card Integration (account-number prefixes, HelloSign Data
  Release Forms, 7–10 business days + third-party delay prefixes, hourly import /
  1–2 day latency, explicitly a different process from EFS's data-feed
  credentials): help.fleetio.com
- Motive WEX/EFS fuel purchase integration (CSV file delivery): helpcenter.gomotive.com
- WEX developer portals: fleetapi.wexinc.com (WEX Mobility, partner-tier),
  developer.wexinc.com (Fleet Fabric / B2B payments) — partner APIs with Level-III
  transaction data, no carrier self-serve feed
- **(2026-07-22)** Samsara "Integrate with WEX" (2–4 day SFTP turnaround,
  690046-prefix/19-digit account number claim, 3-lockout SFTP credential
  warning): kb.samsara.com
- **(2026-07-22)** Azuga "WEX Fuel Card Integration" (2–4 day SFTP + 1–2 day
  config, daily/weekly/monthly file-frequency choice, VIN-required matching,
  1-business-day support SLA): fleet-azuga.helpscoutdocs.com
- **(2026-07-22)** 2026 WEX fuel-card fee reporting (~$40 setup, ~$2–4/card/mo
  by tier): freightwaves.com, truckingway.com, pfleet.com — all vendor-
  controlled WEX/Corpay pages still 403 this env; search-excerpt confirmation
  only, same wall as every other provider in this rotation.
- **(2026-07-28)** Samsara "Integrate with WEX" re-check (690046-prefix/19-digit
  account number corroborated, unique-Filename feed mapping, 3-attempt SFTP
  lockout): kb.samsara.com
- **(2026-07-28)** NCR Voyix × WEX "Fleet Card Transactions at the Pump"
  (announced 2025-10-20, launch 2026, Voyix Connect gateway accepting WEX cards
  at 18k+ station POS — merchant-acceptance, not the carrier feed):
  investor.ncr.com, fuelsmarketnews.com, financialcontent.com
- **(2026-07-28)** FleetRabbit "WEX Fuel Card Integration" (real-time WEX API
  Level III pull, no CSV/batch — the partner-tier surface, not carrier
  self-serve) + WEX Payments API OAuth note: fleetrabbit.com, apitracker.io,
  developer.wexinc.com (403-walled, search-excerpt only)
- **(2026-07-28)** 2026 WEX fee reporting refined (~$50 setup, ~$4/card/mo core →
  ~$2 large-fleet, FlexCard no-fee, $0.50–$2 out-of-network/txn):
  truckingway.com, freightwaves.com, smallfleethq.com — every WEX-controlled
  page still 403s this env; search-excerpt confirmation only.
