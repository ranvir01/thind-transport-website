# Factoring company API — scouting notes

Status: **adapter shipped stub-first** (`src/lib/hub/integrations/factor.ts`),
no real factor's sandbox wired yet. Confirm the real request/webhook shape and
flip `registry.ts`'s `factor` status to `live` once a specific factor's API
docs are in hand (see `docs/integrations/creds-shopping-list.md` row 7).

**2026-07-17 scout pass — "varies by factor" pinned down.** Researched which
factoring companies a 15-truck carrier can actually get API access from, what
their auth/transport looks like, and how funding status really flows back.
Landscape summary: real APIs exist, but they are **partner-provisioned, not
self-serve** — you email your account rep / join a partner program, nobody
hands out keys from a signup page. And **no factor publicly documents
webhooks pushed to carrier systems**: funding status flows back by **polling
a status endpoint or downloading report files** everywhere we looked. Details
per vendor below; adapter implications at the end.

## Vendor-by-vendor (2026-07 state)

| Factor | Integration transport | Auth | Sandbox | How a small carrier gets access |
|---|---|---|---|---|
| **OTR Solutions** | REST API — the only factor with a **public developer docs portal** ([docs.otrsolutions.com](https://docs.otrsolutions.com/docs/carrier-integrations)) | Carrier authenticates with **existing OTR account credentials**; integration gets provisioned credentials + a **subscription key** (Azure API-Management style header) | **Yes** — the subscription key grants access to a testing environment + a developer-portal account with current API specs | Email your OTR account manager describing the integration; their integration team provisions credentials/keys |
| **Apex Capital** | REST API via TMS partner program (FlexTMS/Alvys-style: paste an **API key** in settings); batch invoice submission with rate-con/BOL attachments; funded/non-funded status **pulled** back | API key | Not advertised | Through Apex's partner program (referral + software-integration tiers); carrier asks their Apex rep |
| **RTS Financial** | **FTP file drop** — no carrier-facing REST API found. Invoice batches + docs uploaded via FTP; purchase/payment reports downloaded from the RTS Pro portal | FTP credentials | No | Carrier requests FTP credentials from their RTS account rep |
| **Triumph** (Triumph Business Capital / MyTriumph — the carrier-factoring arm) | **FTP carrier-sync file** (TMS transmits hourly) for standard integrations; direct API submission/clearance/settlement exists **at partner level only**, no public docs. Note: **TriumphPay is a different product** — the broker/factor payments network, not carrier factoring | FTP credentials (standard); partner API otherwise | No | Account rep / partner agreement |
| **HaulPay (ComFreight)** | REST API — fintech factor, advertises API support for factoring + complex payment scenarios and "API integration support for any 3rd-party TMS" | Unpublished (contact them) | Unpublished | Contact HaulPay — no public docs portal found |
| **Denim** | REST API + 20+ two-way TMS integrations; "sends status updates back to your TMS" (via their integrations, not a documented public webhook) | **API key** ("get your Denim Payment API key", paste in TMS settings) | Unpublished | Request an API key from Denim; note Denim is broker-first but also serves trucking companies (owned by Truckstop) |

Best first real target: **OTR Solutions** — public API specs, a testing
environment reachable with a provisioned subscription key, and endpoints that
match our use case one-for-one: submit invoice, check invoice status, **broker
credit/eligibility check** (a free synergy with our FMCSA vetting panel),
plus split pay and fuel advances. Several TMSs a 15-truck carrier would
recognize (Alvys, LoadOps, Vektor, Datatruck) ship exactly this integration.

## Why this is two half-adapters, not one `SyncSource<Row>`

Every other provider in this lane pulls rows on a cron (`SyncSource<Row>`) or
polls an inbox. A factoring relationship is bidirectional and event-driven
instead:

- **LoadOff → factor**: `submitInvoiceToFactor` electronically submits an
  invoice for purchase — reference number, amount, and rate-con/POD document
  refs. `sendFactoringPacket` (`invoices.ts`, emails the same documents to the
  factor) stays the always-working fallback, exactly like a CSV import.
- **Factor → LoadOff**: funding/advance notifications arrive as webhooks at
  the already-shipped generic receiver, `/api/hub/webhooks/factor?carrier=<uuid>`
  (`src/app/api/hub/webhooks/[provider]/route.ts`), HMAC-signed with the
  carrier's `webhookSecret`. That route now calls `processFactorEvent` on every
  verified event right after storing it in `hub.integration_events`.

## Reality check on the webhook half (from this pass)

Our receiver verifies **our own** HMAC-SHA256 scheme (`X-Loadoff-Signature`
over the raw body, hex, per-carrier `webhookSecret` — `webhooks.ts`). No
factor we researched will compute a customer-defined HMAC, and none publicly
documents outbound webhooks to carrier systems at all — status flows back by
polling (OTR: invoice-status endpoint; Apex: status pull; RTS/Triumph: report
files). Two consequences, neither urgent (nothing built breaks — the stub
never claimed a live vendor):

1. The realistic inbound channel for a first vendor is a **funding-status
   poll** — a small `SyncSource`-style cron that walks recently submitted
   invoices, asks the factor's status endpoint, and feeds funded ones through
   the exact same `processFactorEvent` → `recordPayment` path (synthesize a
   `FactorEvent` with `external_id = "<factor>:<invoice>:funded"` so the
   existing idempotency keeps working). The webhook receiver stays — it is
   the right shape for a fintech factor (HaulPay/Denim class) that can be
   configured to call a custom URL — but per-vendor signature verification
   (their scheme, not ours) would need adding the day one is wired.
2. RTS and standard-tier Triumph are **file-drop transports** (FTP), the same
   gap `efs.md`/`wex.md` hit with SFTP feeds — our `fetch()`-based adapter
   can't speak to them without a transport swap. Don't pick them first.

## Why no migration was needed

Same story as QBO (`docs/integrations/qbo.md`): `hub.payments` has no
`source`/`external_id`/unique key for the usual
`ON CONFLICT (carrier_id, source, external_id)` idempotency. This adapter
reuses the same migration-free route:

- **Invoice match**: inbound events carry the reference number LoadOff
  submitted, matched against `hub.invoices.number` (`UNIQUE (carrier_id, number)`).
- **Payment dedup**: `hub.payments.reference` gets `"factor:<event external id>"`;
  `processFactorEvent` checks for an existing row with that reference before
  calling `recordPayment` again, so webhook replays never double-book.
- **Submission dedup**: `hub.invoices.sent_log` (already used by
  `sendFactoringPacket`) gets a `{ kind: "factor-submission" }` entry;
  `submitInvoiceToFactor` checks for one before submitting again.

## Assumed shapes (unconfirmed — adjust on the first real vendor contact)

**Push** — `POST {FACTOR_API_BASE}/invoices` (env override; defaults to a
placeholder host), `Authorization: Bearer <apiKey>`:

```json
{
  "referenceNumber": "INV-1042",
  "amount": 1250.50,
  "debtorName": "Acme Foods",
  "documents": [{ "kind": "rate_confirmation", "url": "..." }, { "kind": "pod", "url": "..." }]
}
```

This Bearer-key shape maps cleanly onto Apex/Denim-style API-key auth. OTR
additionally sends its subscription key as the `Ocp-Apim-Subscription-Key`
header — **shipped 2026-07-27**: `registry.ts`'s `factor` entry now has an
optional `subscriptionKey` credential field, and `submitInvoiceToFactor` sends
the header only when it's configured, so Apex/Denim-style factors (no
subscription key) are unaffected. `submitInvoiceToFactor` also now retries
429/5xx and transport failures through the shared `fetchWithRetry` helper
(`http-retry.ts`) — the other half of the 2026-07-26 finding that APIM answers
a bare 429 past quota. Still open: the account-credential→token handshake
itself (see "Open questions" below) — this only wires the transport-level
pieces the scout pass could confirm without a provisioned key.

**Webhook** — `event` names this adapter understands as funding:
`invoice.funded`, `advance.paid`, `invoice.purchased` (`FUNDING_EVENT_KINDS`
in `factor.ts`); everything else is accepted and marked processed as
"deliberately ignored" rather than guessed at. Payload reads any of
`invoiceNumber` / `referenceNumber` / `clientReference` for the invoice match,
and `amount` / `advanceAmount` / `netAmount` for the funded amount.

## What activates when the owner pastes keys + wires the webhook URL

`hasCredentials(carrierId, "factor")` flips to `true`; the Integrations card
shows the webhook URL to paste into the factor's dashboard. Funding
notifications land as a recorded payment through the SAME `recordPayment` the
office "record a payment" form uses, so status transitions, audit logging,
and the load-status cascade all go through one code path. Email-the-PDF stays
the fallback for both directions until then.

## Manual re-drain for unmatched events

An event `processFactorEvent` can't yet match (webhook arrived before the
invoice existed, a malformed payload) sits in `hub.integration_events` with
`processed_at IS NULL` — nothing re-runs it on its own. The Integrations
settings page now surfaces a per-carrier pending count for `factor` and a
"Retry N events" button (`retryIntegrationEventsAction` →
`retryUnprocessedEvents` in `event-processors.ts` — generic since 2026-07-17,
every provider in `EVENT_PROCESSORS` gets the same surface), which re-applies
the provider's processor to the oldest 50 pending rows and marks each one done
using the same applied/no-op rule (`isEventOutcomeFinal`, `webhooks.ts`) the
live webhook route uses — a manual retry never marks something "done"
differently than a real delivery would have.

The whole path is live-driven on the local rig (2026-07-17, 38 checks):
connect through the real form, unsigned/mis-signed deliveries 401 and store
nothing (probes visible in sync history), a signed `invoice.funded` pays a
real invoice inline and replays as a no-op duplicate, an event arriving
before its invoice exists parks pending → card warns → an early retry
honestly reports "still unmatched" → one-click-invoicing the load makes the
next retry apply it and the warning clears. One rule the drive enforced:
**system actors carry `id: null`** — `actor_id`/`created_by` columns are
UUIDs, and the old `"system:factor"`/`"system:qbo"` sentinel strings made
`recordPayment`'s load-paid cascade throw after money moved (and crashed
QBO's refresh-token rotation).

Vendor landscape pinned (2026-07-17 scout pass): **OTR Solutions** is the
only factor with public dev docs + a test env (recommended first target);
Apex/Denim issue API keys through their partner programs; RTS/Triumph
standard tier is FTP file drop, not API (EFS-style transport gap). **No
factor documents webhooks to carriers** — funding status is poll-based
everywhere except our own receiver above, which the live-drive proved end
to end.

## Sources (2026-07-17 pass)

- [OTR Solutions carrier-integrations docs](https://docs.otrsolutions.com/docs/carrier-integrations)
  and [Building Your API Integration](https://docs.otrsolutions.com/docs/building-your-api-integration)
  (note: the docs host 403s from sandboxed agent egress — content confirmed
  via search excerpts; re-verify endpoint names from a browser)
- [OTR API integrations overview](https://otrsolutions.com/resources/api-integrations/),
  [Alvys factoring setup](https://help.alvys.com/en/articles/11688842-how-to-set-up-and-use-factoring-in-alvys)
- [Apex Capital TMS integrations](https://www.apexcapitalcorp.com/lp/seamless-tms-integrations-for-streamlined-factoring-with-apex/),
  [FlexTMS + Apex API key setup](https://www.flextms.com/post/flextms-and-apex-integration-integrating-a-tms-with-a-factoring-software),
  [Apex partner program](https://www.apexcapitalcorp.com/about/partners/partner-program/)
- [Vektor's RTS FTP integration](https://vektortms.com/integrations/rts-factoring),
  [Alvys RTS article](https://help.alvys.com/en/articles/11560094-rts-factoring-integration)
- [Triumph Business Capital TMS notes (Tai)](https://learn.tai-software.com/knowledge/triumph-business-capital),
  [AscendTMS Triumph portal](https://ascendtms.kayako.com/article/149-triumph-business-capital-seamless-factoring-portal)
- [HaulPay for carriers](https://haulpay.io/digital-freight-factoring-for-carriers/),
  [Denim API documents page](https://www.denim.com/denim-api-documents)

## 2026-07-21 scout pass — OTR's three named APIs surfaced

No adapter-breaking change: the subscription-key/account-credentials auth
model and poll-based (no webhook) funding status from the 2026-07-17 pass
both stand. This pass found OTR names three distinct products instead of
one undifferentiated "API" — worth pinning down since they map onto
different pieces of this adapter:

- **Rate Verification API** — confirms invoice/rate info instantly (broker
  books a load → invoice completed → advance taken → claim/TONU); this is
  the "broker credit/eligibility check" synergy already called out above,
  plus general invoice/rate confirmation.
- **Document Exchange API** — automates invoice + rate-confirmation + POD
  submission; this is the one `submitInvoiceToFactor` targets.
- **Carrier Setup API** — onboards a carrier as an OTR factoring client;
  out of scope for LoadOff (that's the carrier's relationship with OTR, not
  a per-invoice call our adapter would make).

Also newly surfaced: OTR markets "fast retrieval of outstanding A/R
statuses" as a capability — corroborates the existing assumption that
funding status is poll-based (an A/R-status pull), not webhook-pushed;
still no mention anywhere of an outbound webhook/callback option at any
tier. `docs.otrsolutions.com` and every other vendor/integration-partner
page checked this pass (`otrsolutions.com`, `vektortms.com`,
`helpcenter.gomotive.com`, `help.loadops.com`) 403'd this env's egress —
same wall as the 2026-07-17 pass and every other vendor doc in this
rotation — so confirmation is search-excerpt only; exact endpoint paths
for Document Exchange (the one this adapter would call first) still need
a provisioned subscription key to confirm.

Sources: [OTR API Integrations](https://otrsolutions.com/resources/api-integrations/),
[Developer Resources](https://otrsolutions.com/developer-resources),
[Carrier Integrations docs](https://docs.otrsolutions.com/docs/carrier-integrations)
(search-excerpt only, page itself 403s to this env)

## 2026-07-26 scout pass — OTR auth = Azure APIM confirmed, go-live gate found

No adapter-breaking change (7th straight): the push shape (Bearer key), the
generic webhook receiver, and `normalizeFactorEvent`'s payload reads are all
unaffected by anything found. Three substantive additions, none urgent:

1. **OTR's subscription key is literally the Azure API Management
   `Ocp-Apim-Subscription-Key` header — now corroborated, not inferred.** Prior
   passes called it "Azure API-Management style"; this pass confirms OTR fronts
   its carrier API with Azure APIM, so a wired OTR adapter sends
   `Ocp-Apim-Subscription-Key: <key>` (the APIM default subscription-key header)
   alongside the account-credential auth, and APIM's rate-limit-by-key returns a
   plain **`429 Too Many Requests`** (no body forwarded to the backend) when a
   subscription exceeds its rolling-window quota. The numeric quota is still
   unpublished (per-subscription, set by OTR's APIM policy), but the *shape* of
   the throttle is now known: whoever wires OTR should (a) add a subscription-key
   credential field — a schema tweak, not a row-shape change, already noted in
   "Assumed shapes" above — and (b) treat a bare `429` as retry-with-backoff, not
   a hard failure. This is the concrete answer to the standing "auth handshake /
   rate limits" open question, minus the exact numeric quota.

2. **NEW — a required "Show and Tell" go-live gate.** OTR's onboarding is not
   self-serve to production: request a subscription key → get a developer-portal
   account with current specs → build against the test environment with the
   provided credentials → **a "Show and Tell" walkthrough with OTR's Partner
   Integrations Team is a required step before going live.** Matters for LoadOff
   planning (there is a human-in-the-loop review before `registry.ts`'s `factor`
   status can flip to `live` on OTR), not for the code.

3. **NEW — OTR's developer docs grew two sections since the last pass.**
   `docs.otrsolutions.com` now publishes **Load Shares** and **Broker
   Integrations** pages beside **Carrier Integrations**. The **Load Shares API**
   pre-populates a carrier's OTR invoice creation from broker-supplied load/rate
   data (an extension of the Rate Verification surface — the broker→carrier
   hand-off, adjacent to but not the Document Exchange path
   `submitInvoiceToFactor` targets). **Broker Integrations** is the broker-side
   surface — out of scope for a carrier hub. Neither changes what this adapter
   calls; both are noted so a future "prefill invoice from a booked load" idea
   knows the OTR-side surface exists.

Vendor-landscape refresh (all still poll-based, no carrier-facing webhook
confirmed anywhere):

- **Apex** — reconfirmed the paste-an-API-key model (Settings → Factoring tab →
  Connect → enter Apex API key); current TMS partners marketed as Alvys, Ditat,
  ezLoads, Axele, FlexTMS, Vektor. Unchanged.
- **HaulPay (ComFreight)** — corporate note: acquired by **Dakota Financial in
  2024** (asset-backed lender, deeper lending infra behind it); 2026 pricing
  pitched as flat 3% max, no reserve, no contracts. Still markets a strong
  public API + "API integration support for any 3rd-party TMS", but the outbound
  webhook signature scheme remains unpublished — still a first candidate to
  exercise our receiver once contacted.
- **Denim** — markets real-time status/payment updates flowing back "into your
  TMS" through its 20+ two-way integrations (not a documented public
  carrier-facing webhook); API-key auth unchanged. Owned by Truckstop.

Every OTR/vendor page still 403s this env's direct fetch (`docs.otrsolutions.com`
re-confirmed 403 this pass — same network-policy CONNECT wall as every other
provider in this rotation), so all of the above is search-excerpt-confirmed, not
primary-source-read. Getting the exact Document Exchange endpoint paths + the
account-credential→token handshake + the status-poll response shape still needs a
provisioned subscription key (account-manager email), unchanged from prior passes.

Sources (2026-07-26 pass): [OTR Developer Resources](https://otrsolutions.com/developer-resources),
[OTR Building Your API Integration](https://docs.otrsolutions.com/docs/building-your-api-integration),
[OTR Carrier Integrations](https://docs.otrsolutions.com/docs/carrier-integrations),
[OTR Load Shares](https://docs.otrsolutions.com/docs/load-shares),
[OTR API Integrations overview](https://otrsolutions.com/resources/api-integrations/),
[Apex TMS integrations](https://www.apexcapitalcorp.com/lp/seamless-tms-integrations-for-streamlined-factoring-with-apex/),
[HaulPay for carriers](https://haulpay.io/digital-freight-factoring-for-carriers/),
[Denim integrations](https://www.denim.com/integrations)
(all search-excerpt only; every vendor/docs host 403s this env's direct fetch)

## Open questions for the next pass

- Get the actual OTR developer-portal API specs (needs an account-manager
  email → provisioned subscription key): exact endpoint paths, the auth
  handshake (account credentials → token?), status-poll response shape, and
  whether any webhook/callback option exists at partner tier. (Partly answered
  2026-07-26: the transport is Azure APIM — `Ocp-Apim-Subscription-Key` header +
  `429` throttle — but endpoint paths and the credential→token handshake still
  need a provisioned key.) ~~Add the subscription-key credential field +
  429-with-backoff handling~~ — done 2026-07-27: `registry.ts`'s `factor.fields`
  gained `subscriptionKey`, and `submitInvoiceToFactor` sends it as
  `Ocp-Apim-Subscription-Key` and retries through `fetchWithRetry`.
- Confirm whether HaulPay/Denim expose outbound webhooks and what signature
  scheme they use — first candidates to exercise our receiver for real.
- Wire an actual "Submit to factor" button — DONE since the first draft of
  this doc (`MoneyActions.tsx` on the invoice detail page, gated on
  `factorConnected`, per `creds-shopping-list.md` row 7).
- Build the funding-status poll slice (integrations-lane item, see Backlog)
  once a first vendor is chosen — OTR recommended.
