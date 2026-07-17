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
would need two extra credential fields (account credentials for auth + the
`Ocp-Apim`-style subscription key header) — a credential-schema tweak, not a
row-shape change.

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
`retryUnprocessedFactorEvents` in `factor.ts`), which re-applies
`processFactorEvent` to the oldest 50 pending rows and marks each one done
using the same applied/no-op rule (`isEventOutcomeFinal`, `webhooks.ts`) the
live webhook route uses — a manual retry never marks something "done"
differently than a real delivery would have.

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

## Open questions for the next pass

- Get the actual OTR developer-portal API specs (needs an account-manager
  email → provisioned subscription key): exact endpoint paths, the auth
  handshake (account credentials → token?), status-poll response shape, and
  whether any webhook/callback option exists at partner tier.
- Confirm whether HaulPay/Denim expose outbound webhooks and what signature
  scheme they use — first candidates to exercise our receiver for real.
- Wire an actual "Submit to factor" button — DONE since the first draft of
  this doc (`MoneyActions.tsx` on the invoice detail page, gated on
  `factorConnected`, per `creds-shopping-list.md` row 7).
- Build the funding-status poll slice (integrations-lane item, see Backlog)
  once a first vendor is chosen — OTR recommended.
