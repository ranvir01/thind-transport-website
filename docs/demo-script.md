# HaulDesk — Demo Script (Phases 1–7 + expansion E1–E5, complete)

> **Zero-setup alternative:** `/hub/demo` is a public, self-running 90-second
> interactive simulation (fabricated data, no database, works signed-out on a
> phone) — the fastest way to show the product's ceiling. This document remains
> the full seeded walkthrough against real screens.

HaulDesk is the multi-tenant operations product ("the Hub" in older docs); Thind
Transport is tenant #1 and supplies the demo data. A phone-first walkthrough showing
dispatch, money, fuel/IFTA, compliance, the driver app, comms, the planner, and
recruiting running like the real deal — 390px and desktop. Run against a database
seeded with `npm run seed:demo`.

## Setup

```bash
npm run db:migrate   # apply hub schema (multi-tenant; Thind is tenant #1)
npm run seed:demo    # believable fleet + money + fuel quarter + comms/recruiting (never on production)
npm test             # 90 unit tests: settlement/invoice/IFTA penny math, pay rules, reefer exemption, recurrence
npm run dev          # http://localhost:3000/hub
```

On a phone: open `/hub` → "Add to Home Screen" installs HaulDesk as a standalone app.
Optional Web Push: set `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` (`npx web-push generate-vapid-keys`).

## Demo accounts (password for all: `ThindDemo1!`)

| Role | Email | Sees |
|---|---|---|
| Owner | `owner@demo.thind` | Everything incl. Users admin + Price book |
| Dispatcher | `dispatch@demo.thind` | Today, planner, dispatch, comms, recruiting (money read-only) |
| Accountant | `accounting@demo.thind` | Money module: invoices, payments, settlements |
| Driver | `driver@demo.thind` | **The driver app** (`/hub/driver`) — loads, chat, pay, time off |
| Broker | `broker@demo.thind` | **Customer portal** — live tracking, PODs, invoice status |
| Shipper | `shipper@demo.thind` | **Customer portal** — quote requests, tracking, PODs |
| Tenant 2 owner | `owner@cascademo.example` | Cascade Demo Lines — proves zero data bleed |
| Platform admin | `admin@hauldesk.app` | Tenant list + suspend/reactivate, nothing else |

## The golden path (~10 minutes)

### The office morning (desktop or phone)

1. **Login** as `dispatch@demo.thind` → **Today**: the zero-click morning huddle —
   pickups/deliveries due today with countdowns, trucks empty now/tomorrow, dispatches
   the driver hasn't confirmed (THD-1003 pulses), **money you haven't invoiced yet**
   (THD-1008), red compliance flags, tasks due, and time-off requests waiting.
2. **Planner** — one row per truck, seven days. Hatched cells = empty days begging for
   freight; gold cells = approved home time (drag onto them and the move is refused with
   a plain-language reason). Drag THD-1001 to another truck/day — legality checks run
   server-side (shop trucks, expired med cards, home time are hard walls). Forecast
   chips ("Empty in Boise ~ Thu 14:00") + **backhaul ideas** ranked by margin below.
3. **Tasks** — the recurring "Morning ops huddle" checklist; complete it and tomorrow's
   copy schedules itself. Automation tasks (expired med card, unbilled loads) arrive
   via the daily cron, deep-linked to the record needing action.
4. **Messages** — the THD-1005 thread (full office visibility, part of the load record),
   saved templates ("send me the lumper receipt"), read receipts. **Announcements**:
   "Winter chain policy" shows 1/N signed — open it for the acknowledgement report.
5. **Facilities** — Kent Distribution: ~2h average dwell (badge), driver tips
   ("Overnight parking OK along the back fence"), hours, lumper cost, visit history.
   Now open **Loads → New** and type "Kent Distribution" as the pickup facility — the
   booking form warns *"averages 2h at the dock — past your free time. Price detention in."*

### The driver's phone (390px — switch to `driver@demo.thind`)

6. **Driver home** — pinned: the chain-policy announcement (sign with a finger) and the
   accountant's lumper-receipt request. The load card: stops with appointment windows,
   facility tips from other drivers, **"I'm here" / "Leaving now"** taps (detention
   clock), "Delivered" advance, **Snap & send** camera POD upload (clears the office's
   request automatically), navigation hand-off, and chat with dispatch.
7. **Time off** — request days; the office approves from Today; approved time paints
   the planner and dispatch physically can't book over it.
8. **Report incident** — three plain-language questions (the 49 CFR 390.5 test) decide
   whether it lands on the DOT accident register; office gets an instant alert.

### Money, fuel, safety, hiring (back office)

9. **Invoice in one click** — THD-1008 as `accounting@demo.thind`: numbered branded PDF
   with POD+BOL attached, emailed; factored loads remit to the factoring company.
   Money → AR aging, payments, QuickBooks CSV + 1099-NEC exports.
10. **Settlements** — "Draft this week": every driver settles through the **pay-rules
    engine** (per-mile and percentage are just two rule sets; referral and performance
    bonuses are lines, not spreadsheets). Approve → statement PDF + email.
11. **Fuel** — note the REEFER and DEF rows wearing badges: **reefer fuel is
    IFTA-exempt** and excluded from MPG and tax-paid gallons (one tap reclassifies a
    messy pump product; the change is audited). Compliance → IFTA: compute the quarter
    and the worksheet credits tractor gallons only.
12. **Safety** — the tow-away on I-84 sits on the **DOT accident register** (downloads
    as an auditor-ready CSV); the fuel-island scuff stays an incident, off the register.
13. **Recruiting** — drag applicants across the pipeline; open Tina Okafor (referred by
    Harpreet, $500 at hire): extend the offer, hand the phone over for a **finger-signed
    offer letter**, tick the orientation checklist, and **Hire** — driver file created
    with the DQ checklist (391.51) pre-loaded, pay rules set, referral bonus released to
    Harpreet's next settlement.
14. **Roles** — owner sees Users + Price book; dispatcher gets "Forbidden" on money
    mutations (role × resource matrix, unit-tested); drivers can only reach their own
    app; broker/shipper land on welcome screens.

## Cron (production)

`vercel.json` schedules daily `/api/hub/cron/compliance-scan`, `ar-reminders`,
`task-automations`, `recompute-lanes`, and monthly `driver-scorecards` — protected by
`CRON_SECRET`. Trigger manually:
`curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/hub/cron/task-automations`

### Phases 4–7 additions (all live)

15. **DVIR loop** — driver files a post-trip with a defect and answers "No — park it":
    the truck flips to `shop`, a work order opens, the office certifies the repair on
    the truck page, and the next pre-trip review sign-off releases it (396.11/.13).
16. **Offline** — airplane-mode a driver tap: it queues with an honest banner and sends
    itself when the signal returns. OS&D on a POD opens a draft cargo claim with the
    Carmack deadline; receipts with an amount become reimbursable expenses; advances
    are requested from the phone and approved in Money → Advances.
17. **Vetting & credit** — customer page shows the FMCSA risk score (set `FMCSA_WEBKEY`),
    days-to-pay trend, slow-payer flag; the load form warns on credit/vetting issues.
18. **Carrier packet** — Settings → Carrier packet: upload W-9/COI/authority/NOA, email
    the bundle in one click, request a COI, finger-sign broker agreements.
19. **Portals** — invite from a customer page; broker tracks loads (city-level only),
    downloads PODs/invoices; shipper requests quotes that land as `quoted` loads.
20. **Integrations** (owner) — Settings → Integrations: encrypted credentials
    (`CREDENTIALS_KEY`), Terminal/DAT/fuel/mailbox cards with honest pending states,
    sync history. The docs mailbox auto-files forwarded rate cons by reference.
21. **Onboarding** — `/hub/signup` creates a new carrier workspace self-serve; the
    Today screen walks them live with a getting-started checklist. Cascade Demo Lines
    is the seeded second tenant; `admin@hauldesk.app` manages tenants at `/hub/admin`.
22. **Security** — 5 failed logins lock the email for 15 minutes (DB-backed);
    files require a session; credentials and signatures are never logged.

See `docs/sales-demo.md` for the 5-minute prospect pitch.
