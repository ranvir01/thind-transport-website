# Thind Transport Hub — Demo Script (Phases 1–3)

A phone-first walkthrough showing dispatch, money, fuel, and IFTA running like the real
deal — 390px and desktop. Run against a database seeded with `npm run seed:sandbox`.

## Setup

```bash
npm run db:migrate   # apply hub schema (multi-tenant; Thind is tenant #1)
npm run seed:sandbox # two companies + believable fleet/money/fuel (sandbox only)
npm test             # 51 unit tests: settlement/invoice/IFTA penny math, parser, role matrix
npm run dev:mobile   # prints an HTTPS iPhone URL for camera/PWA
```

On a phone: open the printed HTTPS URL → `/hub/driver` → "Add to Home Screen"
installs the driver app as a standalone PWA.

## Sandbox accounts

| Role | Email | Sees |
|---|---|---|
| Owner | `owner@sandbox.hauldesk.local` / `SandboxOwner1!` | All-companies sandbox overview |
| Dispatcher | `dispatch@sandbox.hauldesk.local` / `SandboxDispatch1!` | Dispatch, loads, fleet, CRM |
| Driver | `driver@sandbox.hauldesk.local` / `SandboxDriver1!` | Driver PWA camera/POD test |

## The golden path (~7 minutes)

1. **Login** as `dispatch@sandbox.hauldesk.local` → dashboard: KPIs, booked revenue, **AR open**,
   **driver pay queued**, compliance "expiring soon".
2. **Dispatch board** — columns Booked → POD Received. Cards show lane, rate,
   **estimated margin** (vs cost/mile from carrier settings), invoice state, doc
   checklist (RC/BOL/POD), a **dispatch-legality warning** on the load assigned to the
   driver with the expired med card, and NWS weather flags on in-transit lanes.
3. **Paste intake** — Dispatch → "Paste rate con". Paste any rate-con text (try the
   sample in `src/lib/hub/__tests__/parser.test.ts`): the parser pre-fills broker, ref,
   rates, stops with confidence-coded chips → confirm → booked in under 60 seconds.
4. **Work a load** — open THD-1005 (in transit): unified event timeline (status,
   documents, geo, check calls), one-tap arrive/depart, camera POD upload, **check-call
   logging**, and **tracking links** — create one, open `/track/<token>` in a private
   window: the public broker view (status, stops, city-level position; revocable).
5. **Invoice in one click** — open a POD received load as owner
   (or owner): "Invoice this load" → numbered branded PDF, POD+BOL attached, emailed,
   status → invoiced. Open the factored load's invoice: **remit-to shows the factoring
   company** (Notice of Assignment), with a one-click factoring packet.
6. **Money** — AR aging buckets (a seeded overdue invoice sits in 1–30), record a
   payment (partial or full — status flows partial → paid), QuickBooks CSV + 1099-NEC
   exports.
7. **Settlements** — "Draft this week's settlements": Harpreet (company, $0.63/mi loaded)
   gets earnings + lumper reimbursement − $200 advance − insurance; Jasdeep (owner-op)
   gets 90% + 100% FSC − escrow. Approve → statement PDF + email; escrow ledger updates.
8. **Fuel** — dashboards (cost/mi, MPG, $/gal by program) from a seeded quarter of EFS
   transactions; the 312-gallon Comdata transaction fires the **over-tank-capacity fraud
   flag**. Import any card CSV under Import → Fuel (idempotent; mappings saved).
9. **Compliance** — red/amber/green wall: expired med card (red), 2290/UCR/IFTA decals
   (company items), maintenance PM due. Then **IFTA**: compute the quarter — truck 102's
   GPS loop becomes per-jurisdiction miles via the bundled state boundaries, fuel
   gallons credit per state, rates applied (surcharge states supported) → worksheet
   PDF/CSV + 4-year source export. Statuses draft → reviewed → filed.
10. **Reports** — per-truck P&L (revenue − fuel − maintenance − other), net per mile.
11. **Roles** — owner sees Users + Price book; dispatcher gets "Forbidden" on money
    mutations (role × resource matrix, unit-tested); driver/broker/shipper land on
    welcome screens and cannot reach office routes.

## Cron (production)

`vercel.json` schedules `/api/hub/cron/compliance-scan` (60/30/7-day alerts) and
`/api/hub/cron/ar-reminders` (due+3/+10/+20 dunning, factored loads skipped) daily —
protected by `CRON_SECRET`. Trigger manually:
`curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/hub/cron/ar-reminders`

## What is deliberately not built yet

Driver PWA actions/DVIRs/offline/push (Phase 4), portals + FMCSA vetting (Phase 5),
live ELD/DAT/fuel-card APIs + owner analytics polish (Phase 6), tenant onboarding +
second-tenant isolation (Phase 7). See `docs/phases/`.
