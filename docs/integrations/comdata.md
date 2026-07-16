# Comdata fuel card — scouting notes

Status: **adapter shipped; real access paths researched (2026-07-16).** Unlike the two WEX
brands (EFS, WEX — both confirmed SFTP-file-only), Comdata (Corpay, formerly FLEETCOR)
**does publish real programmatic APIs**, so `comdataSource()`'s REST-JSON assumption is
*not* disproven — but the specific endpoint it guesses is unverified, and the
most-documented transaction paths are a SOAP web service and a partner batch file. Cron
(`comdata-sync`, daily, staggered 10 minutes after `wex-sync`) and the settings "Sync now"
action stay wired; `registry.ts` carries `status: "live"`. Update this doc and
`normalizeComdataRow` in `src/lib/hub/integrations/comdata.ts` in one commit the day a
real onboarding packet lands.

## Access paths for transaction data (confirmed 2026-07-16)

1. **Partner batch file feed** — how every shipping telematics integrator (Geotab,
   Samsara, Fleetio, Motive) gets Comdata transactions:
   - Carrier digitally signs the **Corpay Data Release Form** authorizing Corpay to
     release fuel-transaction data to the named partner (Fleetio embeds the e-sign flow
     in its app; Geotab requires the same form).
   - Setup lead time **5–10 business days** (Fleetio quotes 7–10; Motive and Samsara
     quote 5–10).
   - Delivery is a batch file: Geotab officially supports the **AC00029 file format**
     and is beta-testing **AC00064**. Cadence is set by Corpay per account — usually
     **daily, but some accounts upload weekly on Thursdays** (Samsara).
   - Same catch as EFS partner data sharing: the release form names a **registered
     partner**. LoadOff would need a Corpay data-sharing/partner agreement to be
     nameable.
2. **Comdata Web Services (SOAP)** — the long-standing direct-integration surface:
   - WSDL/SOAP services under `api.iconnectdata.com`, e.g. Fleet Credit WS
     (`.../FleetCreditWS/services/FleetCreditWS0200/wsdl/FleetCreditWS0200.wsdl`), with a
     documented **Real Time Transaction History** operation; a parallel **Mastercard
     Fleet Web Services** exists for the Mastercard-network cards.
   - Auth is header-based with timestamps and credential expiry (per the Web Services
     2.1 Fleet Credit spec, May 2022, on resourcecenter.comdata.com).
3. **Comdata REST APIs + API Developer Portal** — the newer surface Comdata markets on
   its "APIs and Web Services" resource page:
   - Described as REST: resource-oriented URLs, form-encoded requests, **JSON**
     responses, standard HTTP verbs/status codes.
   - Developers **register on the API Developer Portal**, which offers docs, quick-start
     guides, an interactive **API console with a mock service**, and self-serve
     **API key/token generation and management**.
   - Whether a carrier-scoped *transaction history* REST endpoint exists could not be
     confirmed from outside — the portal contents sit behind registration (fetches to
     resourcecenter.comdata.com 403 from here). Confirm at onboarding; access is still
     arranged with the account team even though key management is self-serve.

## Auth model

The registry's `apiKey` / `apiSecret` field pair (sent as `Api-Key` / `Api-Secret`
headers by `comdataSource()`) is consistent with the REST portal's self-serve key/token
model — better grounded than it looked before this pass, but exact header names are
still unverified. The SOAP path uses different (header + timestamp) auth; if onboarding
lands us on SOAP instead of REST, the adapter's fetch half changes more substantially
(XML envelope), while `normalizeComdataRow` stays the single shape-reading point.

## Adapter impact

No urgent break: nothing runs without pasted credentials, and CSV import remains the
product. But plan for three possible transports at activation, in descending likelihood
of being what the account team offers a 15-truck carrier:

- **Batch file (AC00029)** via the Data Release Form path — would need the same Go-worker
  file-poller fix EFS and WEX now need (`services/go/hauldesk-worker`), plus a partner
  agreement so LoadOff is nameable on the form. If that lands, all three fuel adapters
  share one file-ingest transport.
- **REST JSON** via the developer portal — closest to the current `comdataSource()`;
  likely only the base URL, endpoint path, and header names change.
- **SOAP Real Time Transaction History** — fetch half becomes an XML envelope; row
  normalization unchanged.

## Matching gotchas (from integrator production docs)

- Geotab's Comdata integration supports **Comdata Mastercard fuel cards only — proprietary
  cards are NOT supported**. An OTR carrier on the proprietary/OnRoad card (accepted at
  the 8,000+ truck-stop network: TA/Petro, Pilot/Flying J, Love's) may not be coverable
  by the partner file path at all — ask which card program the account is on before
  picking a transport.
- Fleetio requires the **Primary Account Number, not Fleet Codes**, when connecting.
- Cards only start appearing in partner feeds **after first use at the pump** (2–3 days,
  per Fleetio).
- Account numbers in feed requests: leading zeros, no spaces/hyphens, minimum 13 digits
  (same Geotab rule as WEX/EFS).

## Rate limits / polling

Not published. The partner feed cadence is daily (sometimes weekly), so the existing
daily cron (`comdata-sync` in `vercel.json`) matches or beats every confirmed delivery
cadence; no change needed. If the REST path materializes, ask for rate limits at
onboarding — nothing public.

## Sandbox

The API Developer Portal advertises an **interactive mock service** in its API console —
the first of our three fuel-card vendors with any self-serve test surface. Register on
the portal at onboarding time to exercise it; no separate hosted sandbox environment was
found.

## Pricing (checked 2026-07-16)

No separately priced transaction-data product surfaced — data access rides on the card
account (plus the partner path's Data Release Form). Card-side fees for context
(third-party 2026 reviews; Comdata publishes no full public fee grid): ~$8/card/month
(SmartFleet), $129/month full-account plan (Total Advantage), ~$50 one-time setup,
$3 per out-of-network transaction, $0 in-network. No 2026 fee-structure change relevant
to the integration was found.

## What ships today without any of this

The CSV statement import (`Settings → Fuel → Import`) already accepts Comdata's exports
and lands rows in the same `hub.fuel_transactions` table via the same
`(carrier_id, source, external_id)` idempotency key. This adapter is additive — it never
replaces that path.

## Open questions for the next pass

- Register on (or fetch, from an unblocked network) the API Developer Portal and confirm
  whether a carrier-scoped REST transaction-history endpoint exists, its path, and its
  real auth header names.
- Confirm which card program (proprietary/OnRoad vs Mastercard) a target carrier holds —
  it decides which access paths are even available.
- Get the AC00029 file layout if the batch path is offered — column mapping for
  `normalizeComdataRow`.
- Confirm whether `card_program` should distinguish `'Comdata'` sub-programs for
  reporting (currently a single value in `runComdataSync`).

## Sources (researched 2026-07-16)

- Comdata Resource Center "APIs and Web Services" (REST/JSON description, Developer
  Portal registration, API console + mock service, key/token management):
  resourcecenter.comdata.com/apis-and-web-services/
- Corpay/Comdata Web Services 2.1 Fleet Credit technical spec (SOAP/WSDL, Real Time
  Transaction History, header+timestamp auth, api.iconnectdata.com endpoints):
  resourcecenter.comdata.com (May 2022 PDF)
- Geotab "Corpay NA (Comdata & Fuelman) Fuel Transactions" (Data Release Form, AC00029
  official / AC00064 beta, Mastercard-only support, account-number format):
  support.geotab.com/mygeotab/mygeotab-add-ins/doc/fleet-fuel-transaction
- Samsara "Integrate with FLEETCOR" (5–10 business day setup, daily/weekly-Thursday
  cadence set by FLEETCOR): kb.samsara.com
- Fleetio "Comdata Fuel Card Integration" (Primary Account Number not Fleet Codes,
  e-sign Data Release Form flow, 7–10 business days, daily import, card discovery after
  first pump use): help.fleetio.com
- Motive Comdata marketplace listing (5–10 day setup): marketplace.gomotive.com
- 2026 fee context: cnrgfleet.com, truckingway.com, freightwaves.com/checkpoint
  Comdata reviews; resourcecenter.comdata.com cardholder fee schedule
