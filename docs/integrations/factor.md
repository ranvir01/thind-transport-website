# Factoring company API — scouting notes

Status: **adapter shipped stub-first** (`src/lib/hub/integrations/factor.ts`),
no real factor's sandbox wired yet. Confirm the real request/webhook shape and
flip `registry.ts`'s `factor` status to `live` once a specific factor's API
docs are in hand (see `docs/integrations/creds-shopping-list.md` row 7).

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

## Open questions for the next pass

- Wire an actual "Submit to factor" button — this lane's territory doesn't
  include the invoice detail page (`src/app/hub/(office)/money/invoices/[id]/page.tsx`)
  or its actions (`src/app/hub/_actions/money.ts`), both office-lane territory.
  `submitInvoiceToFactor(carrierId, invoiceId, actor)` is ready to call.
- Confirm a real factor's request/webhook shape and flip `registry.ts` status
  to `live`.
