# WEX fuel card feed — scouting notes

Status: **adapter shipped; transport gap closed with a signed file-drop webhook
(2026-07-18), mirroring EFS.** The 2026-07-18 pass confirmed what the EFS pass
predicted: the WEX-branded card feed is the same **daily batch CSV file over SFTP**
delivery model as EFS — there is no carrier-self-serve REST endpoint for
`wexSource().pull()` to hit. Forward the daily file to
`/api/hub/webhooks/wex?carrier=<uuid>` and `processWexEvent` lands it through the
same idempotent ingest as everything else. Update `normalizeWexRecord` in
`src/lib/hub/integrations/wex.ts` in one commit the day a real file lands.

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
- Have the **WEX Account Number** ready — most are 13-digit numbers starting with
  04, 69, 369, 2960, 1960, or 7560.
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
