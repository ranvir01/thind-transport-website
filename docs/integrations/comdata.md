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

## 2026-07-27 scout pass — no adapter-breaking change (6th straight wall)

Sixth straight anonymous pass; every Comdata/Corpay/FleetCor page still 403s
this env (`resourcecenter.comdata.com/apis-and-web-services/` re-confirmed 403
this pass, plus the Web Services 2.1 spec PDF and `developers.fleetcor.com/naf`).
Nothing this pass touches the adapter's proven path (placeholder REST pull +
`processComdataEvent`/`normalizeComdataRow` file-drop), so **no urgent Backlog
flag**. Three substantive findings, all refining prior notes rather than
contradicting them:

1. **NEW headline that is a red herring for the fuel feed — NCR Voyix ×
   Corpay fleet-card *acceptance*.** Announced 2025-10-09 (BusinessWire): NCR
   Voyix's **Voyix Connect** payment gateway will integrate with Corpay's
   Comdata system so its 18,000+ US fuel stations can *accept* Corpay/Comdata
   fleet cards at the pump/POS, deployment beginning 2026 with Voyix's
   next-gen commercial POS. This is the **merchant-acceptance / acquiring**
   side (where a card is swiped), **not** the carrier-side fuel-transaction
   *feed* LoadOff ingests — same category as the 2026-07-22 PDI Merchant POS
   divestiture note. Recorded here so a future scout doesn't mistake a
   card-acceptance headline for a feed-affecting event. Our channel
   (Fleet Credit web services + fuel-transaction file feed) is untouched.
2. **The 2026-07-22 "several operations deprecated" finding now has a named
   operation and a version.** The Web Services 2.1 (Fleet Credit) spec is
   **Document Version 4.8** (dated 2025-04-11), and search excerpts name the
   **Customer Profile Limit Inquiry** operation as deprecated / slated for
   future removal. Our adapter calls **none** of the SOAP operations (the
   pull is a placeholder REST call), so this stays a warning for a future
   SOAP channel, not a break. The spec's live operation catalog was also
   re-corroborated this pass: Available Credit Inquiry, Add Driver ID, Add
   Vehicle ID, Driver ID Inquiry, Add Card — all card-management / inquiry
   functions, none of them the bulk transaction-retrieval our ingest needs.
3. **Third-party real-time API sync re-corroborated.** FleetRabbit again
   describes connecting to Comdata "via secure API to automatically sync fuel
   card transactions in real time," and Motive documents a "Comdata Enhanced
   Authorization Controls" integration — both consistent with (not new
   evidence beyond) the machine channels already documented below. Neither
   exposes the carrier-facing auth/endpoint shape our REST-pull placeholder
   still guesses at.

Meta: this is the **6th straight fully-walled Comdata pass** (07-18 built the
transport map; 07-22, 07-27 added only red-herring pre-empts + a
deprecation-name refinement). Per the rotation doc's own meta-note, the
marginal value of another blind pass here is low — Comdata's carrier-facing
auth/endpoint/rate-limit numbers are human-browser or onboarding-packet work
now, not anonymous-search work. Recommend a slower re-scout cadence for
Comdata until a real API-access response or provisioned file lands.

## 2026-07-22 scout pass — no adapter-breaking change

Fifth straight anonymous pass; every Comdata/Corpay/FleetCor-controlled page
still 403s this env's egress (resourcecenter.comdata.com, the Web Services
2.1 spec PDF, developers.fleetcor.com/naf), so confirmation stays
search-excerpt only. Nothing this pass touches the adapter's proven path
(daily file-drop webhook + placeholder REST pull), so **no urgent Backlog
flag**. Four substantive findings:

1. **The SOAP spec was refreshed to 2025 and now deprecates operations.**
   The "Corpay/Comdata Web Services 2.1 (Fleet Credit) Technical
   Specifications" PDF (same `…/2022/05/…` upload path, so the URL is
   unchanged) is now dated **April 11, 2025**, and search excerpts state
   several operations are marked deprecated with planned future removal.
   This does **not** break us today — `comdataSource().pull()` is a
   placeholder REST call, not a SOAP client, so we call none of those
   operations. But it's a live warning for anyone who later builds the
   real SOAP channel: pull the current PDF and check the deprecation list
   (especially real-time transaction / `inquireCardV02`-class inquiry
   functions) before implementing. Recorded, not acted on.
2. **Corpay divested Comdata *Merchant POS Solutions* to PDI Technologies.**
   This is the merchant-acquiring / point-of-sale side of Comdata — **not**
   the fleet-card issuing / fuel-transaction side we integrate. Our channel
   (Fleet Credit web services + fuel-transaction file feed) is unaffected;
   noted here to pre-empt a future scout mistaking the headline for a
   feed-killing event.
3. **The new `developer.crossborder.corpay.com` portal is a red herring
   for us.** Corpay stood up a polished Cross-Border developer portal
   (REST, HATEOAS, access-token auth, "generate API keys" guides) — but it
   is **FX / cross-border payments only**, not fuel or fleet cards. The
   fuel channel is still the North-American-Fuel portal at
   `developers.fleetcor.com/naf` and the `resourcecenter.comdata.com`
   Fleet Credit specs. Do not chase the cross-border portal for fuel-feed
   activation.
4. **2026 card pricing (context for the shopping-list "est. cost").** Third-
   party 2026 reviews report: ~$50 setup, ~$8/card/month (SmartFleet tier;
   Simple Saver $0 but fewest features; Total Advantage ~$129/mo full
   account), **$3 out-of-network transaction fee / $0 in-network**, and
   retail-minus fuel discounts of ~8–25¢/gal. Card-program cost only —
   API/web-services access itself is arranged (and priced) through the
   account team, still unquoted for a 15-truck carrier.

## Transport reality (researched 2026-07-18, spec re-dated 2025-04-11)

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
   (e.g. `inquireCardV02`). **The 2.1 spec PDF is Document Version 4.8, dated
   2025-04-11, and marks several operations deprecated for future removal —
   the named one so far is Customer Profile Limit Inquiry** (2026-07-27
   pass) — consult its deprecation list before building the real SOAP channel.
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
- Watch the deprecation list in the 2025-04-11 Web Services 2.1 spec: if a
  real-time transaction-inquiry operation we'd depend on is scheduled for
  removal, the future SOAP channel must target its replacement, not the
  deprecated op. Not actionable until we build that channel (REST-pull
  placeholder calls none of them today).

Sources: resourcecenter.comdata.com ("APIs and Web Services", Web Services
1.0/2.1 Fleet Credit specs — 2.1 PDF is Document Version 4.8 dated 2025-04-11,
Customer Profile Limit Inquiry named as deprecated), api.iconnectdata.com
WSDL, support.geotab.com ("Corpay NA (Comdata & Fuelman) Fuel Transactions"),
developers.fleetcor.com/naf, developer.crossborder.corpay.com (cross-border/FX
portal — NOT fuel), freightwaves.com / truckingway.com / fleetlogging.com
(2026 card pricing), businesswire/Corpay IR (Merchant POS Solutions
divestiture to PDI, 2026-07-22; NCR Voyix × Corpay fleet-card *acceptance*
partnership 2025-10-09, 2026-07-27 — both merchant-side, not the feed),
fleetrabbit.com / helpcenter.gomotive.com (third-party real-time API sync).
All vendor-controlled pages 403 this env; search-excerpt confirmation only.
