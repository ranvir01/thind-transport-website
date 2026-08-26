# Phase 3 — Fuel + Compliance: IFTA, DQ, Maintenance (Thind Transport Hub)

**For the human:** paste into a fresh agent session. Preconditions: Phases 1–2 complete (loads, documents, money, importer v1, vitest).

---

PROMPT START

## 0. Operating contract (identical in every phase — non-negotiable)

You are building Thind Transport Hub: dispatch, money, compliance, CRM, driver app, and customer portals for Thind Transport (Kent, WA) in one system — architected from day one as a multi-tenant product sellable to other small carriers. Before coding: read `docs/tms-master-prompt.md` if present, plus `AGENTS.md`, `.cursor/skills/`, the existing NextAuth setup, the DB layer, and `src/lib/constants.ts`.

- Stack is the existing one: Next.js App Router, React, TypeScript, Tailwind, shadcn/Radix, NextAuth v5, @vercel/postgres, nodemailer, pdf-lib, Zod + React Hook Form. New dependencies pre-approved only: `@vercel/blob`, `web-push`, `vitest` (dev), one small IMAP client.
- The Hub lives under `src/app/hub/`; marketing pages and performance budgets untouched.
- Multi-tenant always: `carrier_id` on every business table; composite uniques; all access through `withCarrier()`; settings over constants.
- Postgres snake_case ↔ TypeScript camelCase; versioned, idempotent migrations.
- Money integer cents; rates `NUMERIC(8,4)`; money/tax math unit-tested against hand-computed fixtures, exact to the penny.
- Compliance data is append-only with four-year retention; recomputations create new run ids; audit logging on money records.
- 390px-first driver screens; office screens phone-usable; brand tokens navy/orange/gold/steel, dark-first.
- Secrets in env vars only; PII encrypted, masked, never logged.
- Exit bar every session: build + tests green; 390px + 1440px verified; `npm run seed:demo` clean; no dead ends; maildev for email.

## 1. Where you are

Operations and money work. There is no fuel data, no position data, no tax engine, no compliance surface, no cron.

## 2. Build scope (this phase only)

1. **Migrations:** `fuel_transactions` (unique `(carrier_id, source, external_id)` for idempotent imports; raw row JSONB), `toll_transactions`, `position_pings` (append-only; lat/lng 4+ decimals; ECM odometer; indexed `(truck_id, timestamp)`), `jurisdiction_miles` (with computation run id), `ifta_reports`, `ifta_tax_rates` (jurisdiction, quarter, rate, surcharge rate), `irp_reports`, `compliance_items`, `maintenance_schedules`, `maintenance_records`, `incidents`, `claims`, `integration_syncs`.
2. **Universal importer:** generalize the Phase 1 engine to fuel, tolls, and positions/mileage — column mapping saved per program in `import_templates`, idempotent re-import, unmatched rows into review queues.
3. **Fuel module (M6):** card→truck/driver mapping; auto-match incl. unit-number pump prompts; dashboards — cost/mile, MPG per truck (gallons vs odometer; odometer manual until Phase 6), price/gal by program vs the EIA regional weekly diesel average (free EIA key; cache); the Phase-2 FSC function now consumes the live index. Fraud flags: duplicates, gallons > truck tank capacity (add the field), location vs concurrent ping when pings exist.
4. **IFTA engine (the crown jewel — unit-test it):** per truck per quarter, order pings → great-circle segment distances → jurisdiction assignment via point-in-polygon against **bundled Census TIGER/Line state boundaries** (simplified at build time) → `jurisdiction_miles` under a run id, validated against ECM odometer totals within tolerance. Alternate path: TruckX IFTA-mileage CSV through the same importer into the same table — the report must state which source it used. Quarterly report: fleet MPG = total miles ÷ total gallons; per jurisdiction, taxable gallons = miles ÷ MPG; net tax = taxable gallons × rate − tax-paid gallons × rate; **Indiana, Kentucky, Virginia surcharge lines get no tax-paid credit**. Output a worksheet PDF + CSV ordered for transcription into the WA filing portal; statuses `draft → reviewed → filed`; one-click 4-year source-data export. Rates import UI from the quarterly iftach.org matrices. **Golden-fixture test: a hand-computed quarter including one surcharge state must match to the penny.**
5. **IRP report:** July 1 – June 30 rollup of `jurisdiction_miles` per jurisdiction (drives apportioned-plate renewal).
6. **Tolls:** per-transponder CSV import, truck matching, toll cost into load/lane margin math, review queue.
7. **Compliance dashboard (M7):** `compliance_items` derived from document expiries (CDL, med card, registration, annual inspection, insurance) plus company kinds (IFTA license/decals, **2290 per truck** with stamped Schedule 1 stored, **UCR**, BOC-3, permits, consortium enrollment, Clearinghouse annual-limited-query due dates, pre-employment items). Red/amber/green per driver, truck, company. **DQ-file checklist per driver** mapping the existing DOT-application wizard output into 49 CFR 391.51 slots (Section 3 below). The Phase-1 legality stub becomes real: `dispatch_legal` computed (DQ complete, med cert valid, CDL valid, no Clearinghouse-prohibited flag, truck not `shop`); dispatch board warns, and hard legal stops block.
8. **Cron infrastructure:** Vercel Cron → secret-protected API routes; daily compliance scan with 60/30/7-day emails per `carrier_settings` routing; importer/integration health alerts into `integration_syncs`; per-user-token **ICS feeds** (appointments + compliance deadlines).
9. **Maintenance (M8):** PM schedules (miles/days), due-soon into the compliance dashboard, work orders with vendor/cost/receipt, maintenance cost-per-mile into the per-truck P&L (fuel now completes P&L too).
10. **Incidents + claims (office side):** incident records; claims (`cargo|property|injury`) with the **Carmack filing deadline auto-computed (delivery + 9 months)** and the 2-years-and-1-day suit note, status workflow, amounts, document slots, cron reminders. (Driver at-the-scene reporting arrives Phase 4.)

## 3. Domain knowledge for this phase

**IFTA:** quarterly, due the last day of the following month (Apr 30 / Jul 31 / Oct 31 / Jan 31); file even at zero or credit; records — including GPS source data at ≤10-minute engine-on intervals with 4-decimal coordinates, ECM odometer, and unit number — retained four years. **2290 HVUT:** vehicles ≥55,000 lbs; tax period Jul 1–Jun 30; due Aug 31 for July first-use, else the last day of the month after first use; the stamped Schedule 1 is needed at registration. **UCR:** annual, fee bracketed by fleet size. **BOC-3:** one-time process-agent filing — track that it exists. **DQ file (391.51) slots:** employment application (391.21); 3-year prior-DOT-employer / safety-performance inquiries (391.23); MVR at hire and annually (391.23/.25); annual review of driving record (391.25); road-test certificate or CDL equivalent (391.31/.33); medical examiner's certificate (391.43–45) with National Registry verification and ≤24-month expiry; ELDT certification for CDLs earned after Feb 7, 2022. **Drug & alcohol:** pre-employment test + full Clearinghouse query before first dispatch; annual limited query per driver; consortium/TPA pool; 2026 random minimums **50% drugs / 10% alcohol — store as config**, they change by Federal Register notice. **Inspections:** annual periodic per 396.17. Tooltips cite the CFR part so staff can answer auditors.

## 4. Out of scope — do not build

DVIR UI and driver flows (Phase 4), live telematics/HOS (Phase 6), QuickBooks Online API, portals, CSA score scraping.

## 5. Acceptance & exit checklist

- A quarter of sample fuel CSVs + mileage (both data paths) produces an IFTA worksheet whose totals match the hand-computed fixture, surcharge included; IRP report renders from the same data.
- Compliance dashboard shows seeded red/amber/green across driver, truck, and company items; a driver with an expired med card is not dispatch-legal and the board says so.
- Fuel dashboards live; one seeded fraud flag fires; unmatched queues work; cron routes trigger manually and on schedule; ICS subscribes in a calendar app.
- Build + tests green (incl. IFTA fixture); 390px pass; seed now includes a quarter of fuel + pings, compliance items in all colors, an open claim with a deadline; demo script updated; recording produced.

PROMPT END
