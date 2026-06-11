# Phase 5 — CRM + External Portals (Thind Transport Hub)

**For the human:** paste into a fresh agent session. Preconditions: Phases 1–4 complete (operations, money, compliance, driver hub).

---

PROMPT START

## 0. Operating contract (identical in every phase — non-negotiable)

You are building Thind Transport Hub: dispatch, money, compliance, CRM, driver app, and customer portals for Thind Transport (Kent, WA) in one system — architected from day one as a multi-tenant product sellable to other small carriers. Before coding: read `docs/tms-master-prompt.md` if present, plus `AGENTS.md`, `.cursor/skills/`, the existing NextAuth setup, the DB layer, and `src/lib/constants.ts`.

- Stack is the existing one: Next.js App Router, React, TypeScript, Tailwind, shadcn/Radix, NextAuth v5, @vercel/postgres, nodemailer, pdf-lib, Zod + React Hook Form. New dependencies pre-approved only: `@vercel/blob`, `web-push`, `vitest` (dev), one small IMAP client.
- The Hub lives under `src/app/hub/`; marketing pages and performance budgets untouched.
- Multi-tenant always: `carrier_id` everywhere; all access through `withCarrier()`; settings over constants.
- Postgres snake_case ↔ TypeScript camelCase; versioned, idempotent migrations; money integer cents, tested to the penny.
- **External portal users must never see other customers' data, internal margins, raw GPS history, or driver personal information — enforced at the query layer, proven by automated tests.**
- 390px-first driver/external screens; office screens phone-usable; brand tokens navy/orange/gold/steel, dark-first.
- Secrets in env vars only; PII encrypted, masked, never logged.
- Exit bar every session: build + tests green; 390px + 1440px verified; `npm run seed:demo` clean; no dead ends; maildev for email.

## 1. Where you are

Customers exist as records with loads and AR history, but there is no relationship intelligence, no vetting, no external access beyond the Phase-1 tracking link.

## 2. Build scope (this phase only)

1. **Migrations:** `crm_activities` (timestamped calls/emails/notes against customers/contacts/loads), `lanes` (materialized per customer origin/dest market: load count, avg rate/mile, avg margin, avg days-to-pay; nightly recompute cron).
2. **CRM (M4):** customer directory with MC, terms, credit status; contacts; activity log; per-customer load + lane history with rate analytics (best/worst lanes, avg rate/mile); **payment-speed intelligence** — days-to-pay computed from Phase-2 invoices/payments with trend and automatic slow-payer flagging; credit-limit warnings at booking.
3. **Broker vetting:** on customer creation, FMCSA **QCMobile** lookup (free webkey) — authority status and age, bond/insurance on file — snapshot stored; **nightly re-check** of every active customer plus Thind's own DOT/MC with alerts on revocation or insurance lapse; a composite **risk score** (authority age, FMCSA-record match, own payment-speed history) shown on every booking surface; the double-brokering red-flag checklist surfaced inline.
4. **Carrier packet vault:** current W-9, certificate of insurance, authority letter, and factor NOA stored once per tenant; one-click bundle download/email for fast onboarding with new brokers; one-click COI request email to the insurance agent; **canvas e-signature** for broker-carrier agreements and driver acknowledgments (no DocuSign).
5. **Portals (M9):** invitation-only external accounts created from CRM (role `broker` or `shipper`, scoped to their customer). Broker view: their in-transit loads with status, ETA, and **city-level latest position only**; document downloads (invoice, POD, COI, packet); payment status. Shipper view: quote request → creates a `quoted` load + CRM activity with FSC-calculator-assisted pricing; tracking; POD downloads. Polish the Phase-1 tracking link to match.
6. **Website connections:** approved DOT applicant → one office click creates the driver record + DQ checklist + hub invite; the public load-board page surfaces real posted capacity (simple posting UI); the marketing quote form creates a CRM lead.
7. **External isolation test suite:** automated proof that a broker/shipper account cannot read any other customer's loads, documents, payments, margins, GPS history, or driver PII (cross-customer requests return 403/empty).

## 3. Domain knowledge for this phase

Every new broker asks for the same packet — W-9, COI with them as certificate holder ($1M auto liability / $100k cargo is the market norm; the federal minimum is $750k with a BMC-91/91X filing), signed broker-carrier agreement, authority letter, NOA if factored — and increasingly routes onboarding through platforms like Highway, RMIS, or MyCarrierPackets, so a ready bundle wins loads. Vetting protects against the **double-brokering** fraud wave: red flags are brand-new MC numbers, contact details that don't match the FMCSA record, pressure to skip paperwork, rates well above market, and refusal to honor a factor's NOA; legitimate brokers carry a $75k surety bond (BMC-84/85). The carrier's own invoices-to-payments history is free credit intelligence no subscription can beat.

## 4. Out of scope — do not build

Live DAT/telematics APIs (Phase 6), owner analytics dashboard (Phase 6), tenant onboarding wizard (Phase 7), email marketing.

## 5. Acceptance & exit checklist

- A new broker is vetted via FMCSA in one click, risk score visible at booking; the nightly re-check fires and a simulated revocation alerts the office.
- A broker logs in, tracks an in-transit load, and downloads an invoice **without calling dispatch**; a shipper requests a quote that lands as a `quoted` load + CRM activity.
- The carrier packet downloads as one bundle; an agreement is e-signed in-app; the isolation suite is green.
- Build + tests green; portal screens pass 390px; seed includes broker + shipper accounts and lane history; demo script updated; recording produced.

PROMPT END
