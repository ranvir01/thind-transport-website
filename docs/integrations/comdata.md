# Comdata fuel card — scouting notes

Status: **adapter shipped, feed shape unconfirmed** — cron (`comdata-sync`,
daily, staggered 10 minutes after `wex-sync`), the settings "Sync now"
action, and (since 2026-07-18) a **signed file-drop webhook**
(`processComdataEvent`, registered in `EVENT_PROCESSORS`) are all wired;
`registry.ts` carries `status: "live"`. No live feed confirmed yet (needs a
real carrier's API-access request to come back from the account team).
Update this doc and `normalizeComdataRow` in
`src/lib/hub/integrations/comdata.ts` in one commit the day a real response
or provisioned file lands.

## Transport reality (researched 2026-07-18)

Comdata is a **Corpay** (formerly FLEETCOR) brand — NOT part of the WEX
family — and, unlike EFS/WEX, it does publish real machine channels beyond
a rep-provisioned SFTP file:

1. **SOAP Fleet Credit Web Services** — `https://api.iconnectdata.com/FleetCreditWS/services/FleetCreditWS0200`
   (WSDL at `…/wsdl/FleetCreditWS0200.wsdl`; cert environment
   `w6cert.iconnectdata.com`). Auth is **WS-Security UsernameToken in the
   SOAP header**; data-access rules live in a per-requestor profile that
   Comdata associates create during setup. The published specs (Web
   Services 1.0 / 2.1 Fleet Credit on resourcecenter.comdata.com) cover
   card management, driver-ID inquiry, and real-time transaction functions
   (e.g. `inquireCardV02`).
2. **REST APIs + developer portal** — Corpay's "APIs and Web Services" page
   (resourcecenter.comdata.com/apis-and-web-services) describes
   resource-oriented REST APIs with JSON responses, an API developer portal
   with registration, a mock-service console, and **authentication APIs
   that generate and manage API keys/tokens**. Corpay also runs a
   North-American-Fuel developer portal (developers.fleetcor.com/naf). So
   the `apiKey`/`apiSecret` credential pair in `registry.ts` remains a
   plausible activation shape — better odds than WEX's REST guess, which
   turned out not to exist for carriers at all.
3. **Partner daily file** — the channel third parties actually use today:
   Geotab ingests Corpay NA (Comdata & Fuelman) transactions as a daily
   feed of **AC00029 files — a 384-character fixed-width layout** (AC00064
   in beta), provisioned by the Corpay **account manager** adding the
   account to the feed. Caveat from Geotab's doc: that path supports
   Comdata **Mastercard** cards; Comdata proprietary cards are not carried
   on it.

Implication: keep the REST pull (`comdataSource().pull()`) as the poll
half, and accept daily files through the same signed file-drop webhook
EFS/WEX use — whichever channel the account team actually provisions,
activation needs no new code, only pasted credentials.

## Auth model

`ALLOWED_FIELDS` derives from the registry: `apiKey` / `apiSecret`
(sent as `Api-Key` / `Api-Secret` HTTP headers — confirm exact names
against the real onboarding packet) plus `webhookSecret` for the file-drop
URL. Note the SOAP channel authenticates with a **username/password token**
instead — if the account team provisions web services rather than REST
keys, the credential fields (and adapter transport) will need a matching
swap; record that the day it happens.

## Assumed feed shape (unconfirmed — adjust on first real response)

`GET {COMDATA_FEED_BASE}/transactions` (env override; placeholder base URL),
returns `{ transactions: [...] }` where each entry carries:

- `transactionId` — stable per-transaction id → `external_id`
- `postedDate` — ISO timestamp
- `truckNumber` — matched against `hub.trucks.unit_number`, unmatched is
  reported not guessed (same rule as `efs.ts` / `telematics.ts`)
- `merchant`, `city`, `state`
- `quantity` (gallons), `unitPrice`, `amount` (dollars — converted to cents)
- `odometer`

`normalizeComdataRow` also reads the canonical PascalCase keys
`parseFuelFeedCsv` emits (`TransactionId`, `Quantity`, `TotalAmount`, …) so
CSV file drops flow through the same single shape-reading point.

## File-drop webhook (shipped 2026-07-18)

Any forwarder POSTs the day's transactions to
`/api/hub/webhooks/comdata?carrier=<uuid>` as
`{"event":"fuel.batch","csv":"…"}` (or pre-parsed
`{"transactions":[…]}`), HMAC-signed with the carrier's `webhookSecret`
(the settings card shows the copy-paste URL). Comdata's native AC00029 file
is **fixed-width, not CSV** — the forwarder converts first (an iConnectData
report export is already CSV), or posts pre-parsed records; a fixed-width
parser is deliberately not guessed at until a real provisioned file lands.
Unprocessable drops park in `hub.integration_events` and drain via the
card's "Retry N events" button, same as EFS/WEX/factor.

## What activates when the owner pastes keys

`comdataSource(carrierId).connected()` flips to `true`, "Sync now" becomes
available on the Comdata card, and `runComdataSync` starts landing rows into
`hub.fuel_transactions` with `source = 'comdata'`, the same `ON CONFLICT
(carrier_id, source, external_id) DO NOTHING` idempotency EFS uses. Pasting
just a `webhookSecret` activates the file-drop path independently. The Fuel
CSV import path is untouched.

## Open questions for the next pass

- Which channel does the account team actually provision for a 15-truck
  carrier: REST keys, SOAP web-services profile, or the daily AC00029 file?
  Adjust `comdataSource()` (or the credential fields) once the onboarding
  response lands.
- Obtain the AC00029 fixed-width layout spec — if carriers can get the raw
  file, a parser for it belongs in `fuel-feed-csv.ts`'s territory (today
  only CSV/pre-parsed drops are accepted).
- Whether the proprietary-card vs Mastercard split (Geotab only gets
  Mastercard transactions on the file feed) applies to carrier-held
  credentials too — matters for a fleet running proprietary Comdata cards.
- Confirm whether Comdata transactions need a separate `card_program` value
  distinct from EFS for reporting — `runComdataSync` writes
  `card_program = 'Comdata'` today, matching the EFS/WEX pattern.

Sources: resourcecenter.comdata.com ("APIs and Web Services", Web Services
1.0/2.1 Fleet Credit specs), api.iconnectdata.com WSDL,
support.geotab.com ("Corpay NA (Comdata & Fuelman) Fuel Transactions"),
developers.fleetcor.com/naf.
