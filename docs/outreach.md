# Outreach — Claude reaches out on the company's behalf

Our own, customizable version of what tools like [Explee](https://tam.explee.org/)
do — but built into LoadOff, no subscription. Explee's model is **find → enrich →
outreach-ready list**; the sending is a separate step. This feature covers the
part that matters most for a carrier: turning a prospect (a broker to haul for, a
shipper to serve direct, or a driver to recruit) into an **on-brand, personalized,
compliant message** that a human approves before it goes out — and tracking who
replies.

Lives at **`/hub/outreach`** (office-gated). It is the outbound complement to
`/hub/leads` (inbound).

## The flow

1. **Import prospects** — paste a CSV/TSV or a plain one-per-line list into the
   audience tab (Brokers / Shippers / Drivers). The parser detects headers
   (`name, company, email, phone, mc, lane, equipment, notes`) or falls back to
   positional and auto-detects the email column. Re-importing is safe — rows
   upsert on `(carrier, email)`.
2. **Draft** — click *Draft* on a row. `src/lib/hub/outreach/draft.ts` writes a
   message tuned to the audience, personalized with the prospect's name, company,
   lane, and equipment when known, and always carrying a CAN-SPAM footer. It also
   hands you an SMS variant and a phone call-script to copy.
3. **Review + send** — edit the draft inline, then **Approve & send**. Nothing
   leaves without that click. Email is the only auto-sendable channel.
4. **Track** — mark *They replied* / *Converted* / *Opted out*. A converted
   **driver** is copied into `/hub/leads` so recruiters see them where they
   already look.

## The value proposition per audience (what the drafts say)

- **Brokers** → asset-based carrier, MC 876103 / USDOT 2523064, flatbed+reefer+dry
  van, 48 states, live tracking, dispatch that answers — "put us on your carrier list."
- **Shippers** → haul direct, skip the broker markup, live tracking + POD, fully
  insured — "want a lane quote?"
- **Drivers** → 90% owner-op split / $0.63 company mile, weekly pay, no forced
  dispatch, 2024 Cascadias, family-run — "apply in 60 seconds."

## Compliance (built in, not optional)

- **CAN-SPAM**: every email carries our identity, the physical postal address
  (PO Box 5114, Kent, WA 98064), and a clear opt-out. Anyone who replies STOP /
  "unsubscribe" gets marked `unsubscribed`; the send path **refuses** to contact
  suppressed or bounced prospects (enforced in `send.ts`, covered by tests).
- **TCPA**: cold SMS to contacts who did not opt in is a real legal risk, so SMS
  is **copy-only** — the system hands the owner the words, it never blasts texts.
- **Human-in-the-loop**: send is gated behind an explicit approval click. Auto-send
  is deliberately not wired; enable it only once you trust the drafts (see below).

## Turning on real sending

Email sends through the existing transport (`src/lib/mailer.ts`). Set
`SMTP_USER` / `SMTP_PASS` (a Gmail app password works) in Vercel. Until then,
*Approve & send* returns a clear "email isn't configured" message and you can
**Copy email** to send by hand.

## Sourcing prospects (the Explee-equivalent "find" step)

- **Now**: CSV/paste import (from a spreadsheet, a VA, a purchased list, or an
  FMCSA export) + converting inbound website leads.
- **Fast-follow (backlog)**: an FMCSA public-registry puller — brokers/carriers are
  public data (MC/DOT + contact), the closest free, legal equivalent to Explee's
  discovery. Add as `scripts/source-fmcsa.mjs` writing rows via `importProspects`.

## Routine — autonomous drafting, human-gated send

Paste as a scheduled Claude/Cowork routine. It keeps the queue warm without ever
sending unsupervised.

> **You are the Outreach-drafting agent for Thind Transport.**
> 1. Boot the rig (Postgres up, `npm run dev`, demo seeded).
> 2. Log in as `owner@demo.thind` and open `/hub/outreach`.
> 3. For each audience, for every prospect in status `new`, click **Draft** (or call
>    `generateDraftAction`) so a reviewed-ready message exists. Do **not** send.
> 4. Report a one-line summary: how many drafts are now awaiting the owner's review,
>    per audience. Never click *Approve & send* — sending is the owner's call.
> 5. If `SMTP` is unconfigured, note it so the owner knows drafts are copy-only until
>    email is set up.
>
> Guardrails: never contact a prospect marked `unsubscribed`/`bounced`; never add
> SMS auto-send; keep the brand voice from `draft.ts` (graphite/white/red company,
> honest, no inflated claims). Prospect data is carrier-scoped — only ever touch the
> logged-in carrier's rows.

## Files

- `migrations/hub/020_outreach.sql` — `hub.outreach_prospects` (carrier-scoped)
- `src/lib/hub/outreach/draft.ts` — audience-aware drafting + CAN-SPAM footer (pure)
- `src/lib/hub/outreach/import.ts` — tolerant CSV/paste parser (pure)
- `src/lib/hub/outreach/prospects.ts` — carrier-scoped data layer (import/draft/status/suppress)
- `src/lib/hub/outreach/send.ts` — CAN-SPAM-aware email send with hard guardrails
- `src/app/hub/_actions/outreach.ts` — audited server actions (send is human-gated)
- `src/app/hub/(office)/outreach/` — page + import box + prospect row
- tests: `src/lib/hub/outreach/__tests__/` (draft, import, send guards)
