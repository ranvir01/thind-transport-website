# Phase 2 — Money: Invoicing, AR, Settlements (Thind Transport Hub)

**For the human:** paste into a fresh agent session. Preconditions: Phase 1 complete (tenant scaffolding, load lifecycle, dispatch board, documents, audit_log, vitest).

---

PROMPT START

## 0. Operating contract (identical in every phase — non-negotiable)

You are building Thind Transport Hub: dispatch, money, compliance, CRM, driver app, and customer portals for Thind Transport (Kent, WA) in one system — architected from day one as a multi-tenant product sellable to other small carriers. Before coding: read `docs/tms-master-prompt.md` if present, plus `AGENTS.md`, `.cursor/skills/`, the existing NextAuth setup, the DB layer, and `src/lib/constants.ts`.

- Stack is the existing one: Next.js App Router, React, TypeScript, Tailwind, shadcn/Radix, NextAuth v5, @vercel/postgres, nodemailer, pdf-lib, Zod + React Hook Form. New dependencies pre-approved only: `@vercel/blob`, `web-push`, `vitest` (dev), one small IMAP client.
- The Hub lives under `src/app/hub/`; marketing pages and their performance budgets are untouched.
- Multi-tenant always: every business table carries `carrier_id`; composite uniques `(carrier_id, key)`; all access through `withCarrier()`. Hub features read `carrier_settings`, never constants directly.
- Postgres snake_case ↔ TypeScript camelCase; versioned, idempotent migrations.
- Money is integer cents; rates `NUMERIC(8,4)`; no float currency math; money logic ships with vitest tests against hand-computed fixtures, exact to the penny.
- Append-only audit logging on invoices, payments, settlements, advances, escrow, and load rate changes; corrections are new records, never edits.
- Driver screens 390px-first; office screens usable on a phone; touch targets ≥ 44px; brand tokens navy/orange/gold/steel, dark-first, one red CTA per viewport.
- Secrets only in env vars in `.env.example`; PII encrypted at rest, masked, never logged.
- Exit bar every session: `npm run build` and `npm test` pass; 390px + 1440px verified; `npm run seed:demo` clean; no dead ends; email tested with maildev.

## 1. Where you are

Loads flow booking → delivered with documents and timestamps. No money objects exist yet; dispatch shows money-state placeholders.

## 2. Build scope (this phase only)

1. **Migrations:** `invoices` (per-tenant numbering pattern from settings, customer FK, load FK(s), amount, issued/due, status `draft|sent|partial|paid|overdue|disputed`, remit-to override, sent-to email log), `payments`, `settlements` + line items, `advances`, `escrow_ledger` (append-only with running balance), `expenses` (category `fuel|tolls|maintenance|insurance|permits|parking|lumper|other`, attribution truck/driver/load, reimbursable flag, receipt FK), `accessorial_types` (per-carrier price book + per-customer overrides). Seed Thind's price book defaults into settings.
2. **Accessorial price book UI;** load accessorials now reference `accessorial_types`.
3. **Invoicing:** at `pod_received`, one click generates a branded PDF (pdf-lib; tenant numbering; load refs; linehaul/FSC/accessorial breakdown; **remit-to = the factoring company's address when the load is factored, otherwise the carrier's**) and emails it with POD + BOL attached to the customer's billing email; status → `invoiced`/`sent`; every send logged.
4. **AR:** aging dashboard (current / 1–30 / 31–60 / 61–90 / 90+ from per-customer terms), payment recording incl. partials, automatic overdue reminder schedule (e.g., due+3/+10/+20 with office escalation) that **skips factored loads**, `disputed` handling.
5. **Factoring packet:** one click emails invoice + rate con + POD to the factor and marks the load submitted.
6. **Settlement engine (weekly, per driver):** company drivers = miles × rate per pay config (loaded-vs-all-miles flag); owner-operators = percentage × linehaul + **100% of FSC**; plus reimbursements (reimbursable receipts); minus deductions — outstanding `advances`, escrow contribution per config, insurance, and a company-paid-fuel line **typed now, wired to fuel data in Phase 3**. Approval queue → PDF statement per driver emailed on approval. Every line links to its source record.
7. **Advances UI** (cash/EFS Money Code reference; auto-applied to the next settlement) and **escrow ledger** views.
8. **Expenses CRUD;** reimbursables flow to settlements and, when billable, onto the invoice as pass-through accessorials.
9. **Audit log wired** to every create/update on the tables above, old/new JSONB.
10. **Exports:** QuickBooks-importable CSVs (invoices, payments, expenses, settlements); year-end 1099-NEC totals per owner-operator; per-truck P&L v1 (revenue − attributed expenses; fuel completes it in Phase 3).
11. **Unit tests (to the penny):** one company-driver week and one owner-operator week against hand-computed fixtures matching `PAY_RATES` semantics; invoice totals; aging bucket boundaries; a pure FSC function (DOE-index in, per-mile out — index wiring arrives Phase 3).

## 3. Domain knowledge for this phase

Net 30 is the norm; real terms run 15–45 days per customer. **Factoring:** advance rates ~90–98%, fees ~1–3%; under a Notice of Assignment the broker must pay the factor, so the factored invoice **must** print the factor's remit-to — getting this wrong delays payment for every factored load. **Quick pay** (1–5% broker fee) is the per-load alternative — show effective annualized cost next to it. **FSC** pegs to the DOE/EIA weekly diesel average: (index − base, commonly ~$1.20–1.25) ÷ assumed MPG (commonly 6.0) = per-mile, or the broker's $0.05-increment table; FSC stays a separate field because owner-operator pay passes it through at 100%. **Accessorial defaults (all configurable):** detention $50–75/hr after 2 free hours; layover $150–350/day; TONU $150–250; stop-off $50–150; tarp $50–150; lumper = pass-through against receipt. **Escrow** is a held reserve (commonly $1k–3k built weekly) returned at clean contract end.

## 4. Out of scope — do not build

Fuel import or fuel-based deductions data (Phase 3), QuickBooks Online API, payroll tax filings, portals, dunning by SMS.

## 5. Acceptance & exit checklist

- A delivered load is invoiced in one click with correct attachments and correct remit-to (test one factored, one not).
- A weekly settlement run pays one company driver and one owner-operator correctly per `PAY_RATES`; an outstanding advance and an escrow contribution deduct properly; statements PDF + email.
- AR shows a seeded overdue invoice with its reminder schedule; penny tests green; audit rows on every money mutation; QuickBooks CSVs import-clean.
- Build + tests green; money screens pass 390px; seed updated (invoices, payments, settlements queue, an advance); demo script updated; recording produced.

PROMPT END
