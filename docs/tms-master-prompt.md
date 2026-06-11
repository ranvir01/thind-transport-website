# Thind Transport Hub — Master Build Prompt

This document is the single master prompt for building Thind Transport's custom fleet
management system ("the Hub"). It was produced from a first-principles analysis of the
business, the existing website codebase, and the real integration options for the tools
Thind already uses (TruckX ELD, DAT load board, fuel cards).

**How to use it:** paste everything below the horizontal rule into a new Fable/Cursor
agent session in this repository. The prompt is self-contained — it tells the agent to
build in phases, and each phase ends with working, testable software. You can also paste
one phase at a time (Section 11) as separate sessions; each phase prompt stands alone as
long as Sections 1–10 have been pasted at least once or this file exists in `docs/`.

---

# PROMPT START

You are building **Thind Transport Hub** — the custom operations software for Thind
Transport, a trucking carrier in Kent, WA. This is not a generic TMS clone. It is the
single digital workplace where the owner, dispatchers, accountants, drivers, brokers,
and shippers do business with Thind. Read `docs/tms-master-prompt.md` in full before
writing any code, and follow the repository's `AGENTS.md` and `.cursor/skills/` on every
change.

## 1. Mission

Replace Excel sheets, manual data entry, and email threads with one system that runs the
entire office of a trucking company:

- **Dispatch** — every load from booking to delivery lives on a live dispatch board.
- **Money** — invoicing brokers, tracking receivables, and paying drivers (settlements)
  are generated from load data, never retyped.
- **CRM** — every broker and shipper relationship, lane history, and rate history is
  recorded and searchable.
- **Compliance** — IFTA quarterly reports, toll reconciliation, and document expirations
  (CDL, medical card, registration, inspection, insurance, 2290, UCR) are computed and
  surfaced automatically.
- **Integrations** — TruckX ELD data, DAT load board, and fuel card transactions flow in
  with no manual retyping (API where available, structured import where not).
- **Portals** — drivers, brokers, and shippers each get a focused view connected to the
  public website at thindtransport.com.

The measure of success: a load that today touches one Excel sheet, four emails, and three
apps is handled start-to-finish in the Hub, quarter-end IFTA goes from days of
spreadsheet work to a generated report, and the finished product can be demoed live from
a phone like a real shipping app — installable, seeded with believable data, polished on
a 390px screen (Section 12 defines this bar; it is acceptance criteria, not a nice-to-have).

## 2. Business context

- Company facts (name, DOT 2523064, MC 876103, phone, address, pay rates, fleet stats)
  come **only** from `src/lib/constants.ts`. Never hardcode them.
- Mixed fleet: company drivers (per-mile pay) and owner-operators (percentage pay with
  100% fuel surcharge pass-through). Both pay structures are in `PAY_RATES`.
- Equipment: flatbed, reefer, dry van (see `SERVICES`).
- Freight comes mostly from brokers (DAT load board plus direct broker relationships —
  see `PREMIER_BROKERS`), with some direct shipper business.
- Current state: load data lives in Excel; dispatch, invoicing, settlements, and IFTA are
  manual; communication is phone and email. TruckX is the ELD. Multiple fuel card
  programs are in use. The company is actively scaling its truck count, so everything
  must work at 10 trucks and not fall over at 50.
- The public website (this repo) already has: NextAuth v5 credentials auth, a driver
  portal with registration/login and a DOT application wizard, Postgres persistence with
  JSON-file fallback, SMTP email, and PDF generation. The Hub extends this — it does not
  start from scratch.

## 3. First-principles decisions (already made — do not relitigate)

1. **The load is the atomic unit of the business.** Every dollar in and out attaches to a
   load, a truck, or a driver. The schema and the UI are organized around the load
   lifecycle: `quoted → booked → dispatched → at_pickup → in_transit → delivered →
   pod_received → invoiced → paid → settled`. Get this spine right and accounting, CRM,
   and compliance become views over the same data instead of separate systems.
2. **One monolith in this repo, one database, one login.** A 10–50 truck carrier does not
   need microservices. The Hub lives in this Next.js app under a protected `/hub` route
   group, shares the existing NextAuth setup (extended with roles), uses the existing
   Postgres database, and inherits the brand system. Same deploy, same domain.
3. **Import-first, API-second.** Every external data source (DAT loads, fuel
   transactions, tolls, ELD mileage) must have a structured CSV/spreadsheet import path
   that works on day one, because vendor API access takes sales calls and contracts.
   APIs are wired up behind the same internal interfaces later, so the rest of the
   system never knows or cares which path the data arrived through.
4. **Do not rebuild general-ledger accounting.** The Hub owns what generic accounting
   software is bad at: per-load invoicing, AR aging, driver settlements, cost-per-mile,
   and per-truck P&L. It exports clean CSV (QuickBooks-importable) for the accountant.
   A QuickBooks Online API sync is a later enhancement, not a foundation.
5. **Compliance data is append-only and kept for four years.** IFTA audits require GPS
   position records (≤10-minute intervals when the engine is on, lat/long to 4 decimal
   places, ECM odometer, unit number) retained for four years and exportable to CSV/XLSX.
   Position pings, fuel transactions, and jurisdiction-mile calculations are never
   destructively edited — corrections create new records.
6. **Drivers live on phones.** Every driver-facing screen is designed at 390px first and
   works as an installable PWA. Office screens are desktop-first but must remain usable
   on a phone.
7. **Money records are auditable.** Invoices, settlements, and payments get an immutable
   audit log (who, what, when, old value, new value). Statuses move forward through
   explicit actions; nothing silently mutates.

## 4. Architecture & stack

- **Framework:** the existing stack — Next.js 16 App Router, React 19, TypeScript,
  Tailwind 3.4, shadcn/Radix, NextAuth v5, `@vercel/postgres`, nodemailer, `pdf-lib`,
  Zod + React Hook Form. No new heavy dependencies without strong justification.
- **Location:** all Hub pages under `src/app/hub/` with layout-level role protection;
  extend `src/proxy.ts` for route guarding (NextAuth v5 cookie is `authjs.session-token`
  / `__Secure-authjs.session-token` — see the dev-workflow-testing skill).
- **Database:** Vercel Postgres. All Hub schema in versioned, idempotent migration files
  (extend the `setup-db` pattern or add a `scripts/migrate` runner). snake_case in SQL,
  camelCase in TypeScript — handle both, as the existing driver DB layer does.
- **Files/documents:** rate confirmations, BOLs, PODs, receipts stored in Vercel Blob
  (`@vercel/blob` is the one acceptable new dependency for storage), keyed to entities
  in a `documents` table.
- **Background work:** Vercel Cron hitting protected API routes (daily compliance scan,
  nightly integration sync, weekly settlement draft, quarterly IFTA close).
- **Email:** existing nodemailer/SMTP setup; test locally with maildev.
- **PDF:** existing `pdf-lib` pipeline for invoices, settlement statements, and IFTA
  worksheets.
- **Brand:** navy/orange/gold/steel tokens from `tailwind.config.ts` per the
  thind-brand-identity skill. The Hub is dark-theme-first like the site. One red CTA per
  viewport. Data tables and dashboards use steel for secondary text, gold for stats.

## 5. Users & roles

Extend the existing user model with a `role` column and permission checks at the API and
page level:

| Role | Sees | Can do |
|---|---|---|
| `owner` (admin) | Everything | Everything, including user management and money approvals |
| `dispatcher` | Dispatch board, loads, drivers, trucks, CRM | Create/assign/update loads, contact entries |
| `accountant` | Money module, reports, compliance | Issue invoices, record payments, run settlements, file IFTA |
| `driver` | Their own loads, documents, settlements, hours | Update load status, upload PODs/receipts, view pay |
| `broker` (external) | Their company's loads with Thind | Track shipments, download invoices/PODs, view capacity |
| `shipper` (external) | Their shipments | Request quotes, track shipments, download PODs |

Existing driver-portal accounts become `driver` role users. External accounts are
invitation-only (created by office staff from the CRM).

## 6. Core data model

Implement these tables (with `created_at`/`updated_at`, soft-delete where noted, and
foreign keys throughout). This is the contract for the whole system:

- `users` — extends existing; add `role`, link to `drivers` where applicable.
- `trucks` — unit number, VIN, plate/state, year/make/model, ownership
  (`company` | `owner_operator`), status, registration expiry, annual inspection due,
  insurance expiry, assigned driver.
- `trailers` — same shape; type (`flatbed` | `reefer` | `dry_van`).
- `drivers` — extends existing portal records; CDL number/state/expiry, medical card
  expiry, hire date, pay type (`per_mile` | `percentage`), pay rate, status, emergency
  contact.
- `customers` — the CRM root: brokers and shippers; type, MC number, billing
  address/email, payment terms (days), credit limit, factoring flag, status, notes.
- `contacts` — people at customers: name, role, phone, email, customer FK.
- `crm_activities` — timestamped calls/emails/notes against customers/contacts/loads.
- `loads` — reference number (Thind's), customer reference (broker's), customer FK,
  status (lifecycle above), equipment type, commodity, weight, linehaul rate, fuel
  surcharge, accessorials (JSONB list), total rate, loaded miles, deadhead miles, truck
  FK, driver FK, dispatcher FK, source (`dat` | `direct` | `import`), notes.
- `stops` — load FK, sequence, type (`pickup` | `delivery`), facility name, address,
  city/state/zip, appointment window, arrived_at, departed_at (drives detention
  calculation).
- `documents` — polymorphic (entity type + id), kind (`rate_confirmation` | `bol` |
  `pod` | `receipt` | `cdl` | `medical_card` | `registration` | `inspection` |
  `insurance` | `other`), blob URL, expiry date (nullable), uploaded by.
- `invoices` — invoice number, customer FK, load FK(s), amount, issued/due dates,
  status (`draft` | `sent` | `partial` | `paid` | `overdue` | `disputed`), sent-to
  email log.
- `payments` — invoice FK, amount, date, method, reference.
- `settlements` — driver FK, period start/end, line items (loads with gross pay,
  reimbursements), deductions (advances, insurance, escrow, fuel), gross, net, status
  (`draft` | `approved` | `paid`), statement PDF URL.
- `expenses` — category (`fuel` | `tolls` | `maintenance` | `insurance` | `permits` |
  `parking` | `other`), amount, date, truck/driver/load attribution, receipt document FK.
- `fuel_transactions` — source (`csv` | `api`), card program, card/driver/truck
  mapping, timestamp, merchant, city, state/jurisdiction, gallons, fuel type, unit
  price, total, odometer prompt, raw row (JSONB). Unique constraint on
  (source, external id) to make imports idempotent.
- `toll_transactions` — transponder, truck, timestamp, plaza/road, jurisdiction,
  amount, source, raw row.
- `position_pings` — truck FK, timestamp, lat, lng (4+ decimals), ECM odometer,
  source. Append-only; four-year retention; indexed by (truck, timestamp).
- `jurisdiction_miles` — computed: truck, quarter, jurisdiction, miles, computation
  run id (recomputable, never edited in place).
- `ifta_reports` — quarter, per-jurisdiction miles + tax-paid gallons + net tax,
  fleet MPG, status (`draft` | `reviewed` | `filed`), worksheet PDF/CSV URLs.
- `ifta_tax_rates` — jurisdiction, quarter, rate, surcharge rate (IN/KY/VA have
  surcharges); office-editable and importable each quarter.
- `maintenance_schedules` / `maintenance_records` — PM intervals (miles/days), work
  orders, vendor, cost, odometer, receipt FK.
- `compliance_items` — derived + manual: entity (driver/truck/company), kind, due or
  expiry date, status. Company-level kinds include IFTA license/decals, 2290, UCR,
  permits, drug & alcohol consortium enrollment.
- `audit_log` — actor, entity, action, old/new values (JSONB), timestamp. Mandatory
  for invoices, payments, settlements, and load rate changes.

## 7. Modules

### M1 — Dispatch board & load management (the Excel killer)
The home screen for dispatchers. A live board of all active loads grouped by status, with
truck/driver assignment, stop timeline, document checklist (rate con → BOL → POD), margin
display (rate vs. estimated cost), and one-click status advance. Full load CRUD with Zod
validation. List view with filters (status, customer, driver, truck, date range) and full
text search. Every load shows its money state (invoiced? paid? settled?) inline.

### M2 — Fleet & equipment
Truck and trailer registry, status (active/shop/idle), document vault per unit,
registration/inspection/insurance expirations feeding the compliance dashboard, and
assignment history.

### M3 — Driver management & driver hub
Office side: roster, qualification-file checklist per driver (CDL, medical card, MVR,
drug test, employment verification — the DOT application wizard in this repo already
collects most of it), pay configuration, document expirations.
Driver side (`/hub/driver`, PWA, 390px-first): my current load with stops and statuses,
one-tap status updates (arrived/loaded/departed/delivered), camera upload of POD/receipts,
my settlements with PDF statements, my documents with expiry warnings, dispatch contact
button. This replaces texting photos of paperwork.

### M4 — CRM (brokers & shippers)
Customer directory with MC numbers, terms, credit status; contact people; activity log
(calls/notes/emails); per-customer load history with lane and rate analytics (best/worst
lanes, average rate per mile, payment speed); flag slow payers automatically from AR
data. New broker setup checklist (W-9, insurance certificate, broker-carrier agreement —
stored as documents).

### M5 — Money: invoicing, AR, and settlements
- **Invoicing:** when a load reaches `pod_received`, one click generates a branded PDF
  invoice (invoice number, load refs, rate breakdown) and emails it with the POD and BOL
  attached to the customer's billing email. Status flows to `invoiced`.
- **AR:** aging dashboard (current/30/60/90+), payment recording, automatic overdue
  reminders by email, factoring-aware (if a load is factored, mark it and skip dunning).
- **Settlements:** weekly run per driver. Company drivers: miles × rate from their pay
  config. Owner-operators: percentage of linehaul + 100% of fuel surcharge, minus
  configured deductions (fuel advances from `fuel_transactions` if card is company-paid,
  insurance, escrow). Produces an approval queue and a PDF statement per driver, emailed
  on approval. All math traceable to load and fuel records.
- **Exports:** invoices, payments, expenses, and settlements export to
  QuickBooks-importable CSV. Per-truck P&L and fleet cost-per-mile reports.

### M6 — Fuel
Universal fuel import: a column-mapping CSV importer that handles any card program's
export (save mappings per program for one-click re-import), plus API sync slots
(Section 8). Transactions auto-match to trucks/drivers via card mapping and unit-number
pump prompts; unmatched rows land in a review queue. Dashboards: cost per mile, MPG per
truck (gallons vs. ELD odometer), price per gallon by program. Fraud flags: transaction
location vs. truck position at that timestamp (when ELD data is connected), duplicate
transactions, gallons exceeding tank capacity.

### M7 — Compliance: IFTA, tolls, and expirations
- **IFTA:** compute quarterly jurisdiction miles per truck from `position_pings`
  (great-circle distance between consecutive pings with state assignment via a
  point-in-polygon lookup against bundled state boundary data; ECM odometer used to
  validate totals). Combine with tax-paid gallons from `fuel_transactions` by
  jurisdiction, apply `ifta_tax_rates` (including IN/KY/VA surcharges), and produce the
  quarterly worksheet: miles, taxable gallons, MPG, net tax/credit per jurisdiction, as
  PDF + CSV ready to transcribe into the WA filing portal. Where ELD ping data is
  missing, accept TruckX's IFTA mileage export (CSV per truck per jurisdiction) through
  the import system instead — the report builder must work from either source and state
  which it used. Keep all source data exportable for four years (audit requirement).
- **Tolls:** transponder statement import (BestPass/PrePass/state systems export CSV),
  matched to trucks; toll cost per load/lane in margin math; unmatched review queue.
- **Expirations:** one compliance dashboard that scans `compliance_items` + document
  expiry dates daily (cron) and shows red/amber/green per driver, truck, and the
  company. Email alerts at 60/30/7 days to the office; drivers see their own in the
  driver hub.

### M8 — Maintenance
PM schedules per truck (miles- or time-based, odometer fed by ELD sync or manual entry),
due-soon alerts, work-order log with vendor/cost/receipt, maintenance cost per mile per
truck feeding the P&L.

### M9 — Broker & shipper portal
Invitation-only external accounts. Brokers: live status + location (city-level, from
latest ping — never raw GPS history) of their in-transit loads, document downloads
(invoice, POD, insurance certificate, W-9 packet), payment status. Shippers: quote
request form (creates a `quoted` load + CRM activity), shipment tracking, POD downloads.
This replaces "checking calls" and document-request emails.

### M10 — Reports & owner dashboard
Owner home screen: revenue this week/month, loaded vs. deadhead miles, revenue and cost
per mile, per-truck P&L, AR aging total, settlement liabilities, compliance red flags,
fuel spend. Date-range reports exportable to CSV. Numbers from real records only — no
fabricated placeholder stats anywhere.

## 8. Integrations (reality-checked — build in this order)

Each integration is a module behind an internal interface (`LoadSource`, `FuelSource`,
`TelematicsSource`, `TollSource`) with two implementations: CSV import (day one) and API
sync (when credentials exist). Sync state, errors, and last-run times are visible on an
admin integrations page. All API credentials live in environment variables, never in code.

1. **TruckX ELD — via aggregator.** TruckX has no public direct API; it integrates
   through telematics aggregators (Terminal — `docs.withterminal.com` — or TruckerCloud
   or Axle). Build the `TelematicsSource` interface against Terminal's normalized model
   (vehicles, drivers, HOS, GPS locations, odometer), with a hosted-link connect flow on
   the admin page. Until that account exists: CSV import of TruckX portal exports
   (positions/mileage) satisfies the same interface.
2. **DAT load board.** API access requires a DAT subscription with API entitlement and a
   service account (developer portal: `developer.dat.com`; request via
   `developersupport@dat.com`). Phase one: a load-import flow — paste or upload rate
   confirmation details into a structured form with sensible parsing of pasted text, and
   CSV import of the existing Excel load history. Phase two (`LoadSource` API
   implementation): load search against saved lanes/equipment and one-click "book →
   create load," plus truck/capacity posting.
3. **Fuel cards.** EFS/WEX issue separate data-feed credentials on request from the
   account rep; Comdata has a developer portal. Until then, every program's statement
   CSV runs through the universal importer (M6). Build per-program API adapters only
   after the universal path works.
4. **Tolls.** CSV statement import per transponder program. No reliable small-carrier
   APIs — do not block on one.
5. **QuickBooks.** CSV export first (M5). QBO OAuth API sync is an explicitly later
   enhancement.
6. **The public website.** Same repo: approved driver applicants (existing apply flow)
   convert to Hub driver accounts with one office click; the public load-board page can
   surface real posted capacity; shipper quote requests from the marketing site create
   CRM leads.

## 9. Automations (the manual work being eliminated)

- Daily compliance scan → expiry alerts (cron).
- POD upload → invoice draft ready → one-click send (no retyping).
- Overdue invoice → reminder email schedule with escalation to the office.
- Friday settlement drafts for all active drivers → approval queue.
- Quarter close → IFTA draft report generated automatically from pings + fuel.
- Stop `departed_at − arrived_at` beyond free time → detention flag on the load.
- Fuel transaction far from truck's concurrent GPS position → fraud flag.
- Nightly integration syncs with failure alerts to the admin.
- New driver application approved on the website → driver record + hub invite.

## 10. Data migration

Build a one-time guided importer for the current Excel workbook(s): upload → map columns
to load/customer/driver fields → preview with validation errors → import. Historical
loads land as `settled` records so per-customer and per-lane history is alive from day
one. The same column-mapping engine is reused by the fuel/toll/mileage importers, so
build it once, well.

## 11. Build order (each phase ships working software)

Execute phases strictly in order. After each phase: `npm run build` passes, changed
screens verified at 390px and 1440px, flows tested end-to-end (use maildev for email),
and a short demo recording or screenshots produced. Every phase must leave the Hub
demo-able on a phone per Section 12 — seeded data intact, no dead links, no
placeholder screens reachable from navigation.

- **Phase 1 — Foundation + Dispatch.** Roles/permissions on the existing auth, Hub shell
  and navigation, migrations for the core schema, trucks/trailers/drivers/customers
  CRUD, the load lifecycle, dispatch board (M1), stops, document upload, Excel load
  import (Section 10). *Acceptance: a dispatcher books, assigns, and delivers a load
  entirely in the Hub, with documents attached.*
- **Phase 2 — Money.** Invoicing with PDF + email, AR aging and payments, settlement
  engine for both pay types with PDF statements, expense tracking, QuickBooks CSV
  export, audit log (M5). *Acceptance: a delivered load is invoiced in one click; a
  weekly settlement run pays a company driver and an owner-operator correctly per
  `PAY_RATES` semantics.*
- **Phase 3 — Fuel + Compliance.** Universal CSV importer, fuel module (M6), position
  ping store, IFTA computation + quarterly worksheet from both data paths, toll import,
  compliance dashboard with cron alerts (M7), maintenance (M8). *Acceptance: a quarter
  of sample fuel CSVs + mileage data produces a per-jurisdiction IFTA worksheet whose
  totals are hand-verifiable.*
- **Phase 4 — Driver hub.** PWA driver experience (M3 driver side): current load, status
  taps, camera uploads, settlements, document expiries. *Acceptance: full driver flow on
  a 390px viewport — accept dispatch through POD upload — and the office sees every
  update live.*
- **Phase 5 — CRM + external portals.** CRM module (M4), broker and shipper portals with
  invitation flow (M9), website connections (Section 8.6). *Acceptance: a broker logs
  in, tracks an in-transit load, and downloads an invoice without calling dispatch.*
- **Phase 6 — Live integrations + analytics.** Terminal/TruckerCloud connect flow for
  TruckX, DAT API adapter behind `LoadSource`, fuel card API adapters as credentials
  arrive, owner dashboard and reports (M10), automation polish (Section 9).
  *Acceptance: positions sync without manual import; a DAT load becomes a Hub load in
  one click; the owner dashboard matches the underlying records; the full Section 12
  phone demo passes end-to-end.*

## 12. Demo readiness — the final result must demo on a phone like the real deal

The finished Hub is not "done" when the code works — it is done when the owner can pull
out a phone, open the Hub, and run a convincing live demo to a driver, a broker, or an
investor with zero setup and zero excuses. Build toward this from Phase 1 and verify it
at the end of every phase:

- **Installable PWA, real-app feel.** Web app manifest with Thind branding (name, icons
  from `public/branding/`, navy theme/background color), iOS/Android home-screen install
  support, standalone display mode, no browser chrome in installed mode, fast loads on a
  4G connection, and graceful offline behavior on the driver screens (cached shell +
  clear "reconnecting" states — not blank pages).
- **Seeded demo data that tells the story.** A `npm run seed:demo` script (idempotent,
  clearly marked demo data, never runnable against production) populates a realistic
  fleet matching the scale in `STATS`: trucks, trailers, company drivers and
  owner-operators, broker/shipper customers drawn from the kinds of partners in
  `PREMIER_BROKERS`, loads spread across the full lifecycle (some in transit right now,
  some awaiting POD, some invoiced, some paid), a quarter of fuel transactions and
  position pings sufficient to generate a real IFTA worksheet, settlements in the
  approval queue, AR aging with an overdue invoice, and compliance items in red, amber,
  and green. Every dashboard, list, and report renders with believable numbers — never
  an empty screen during a demo.
- **One-tap demo logins.** Seeded accounts for every role — owner, dispatcher,
  accountant, driver, broker, shipper — with credentials documented in
  `docs/demo-script.md`. Switching roles takes seconds on a phone.
- **A scripted golden path.** Write `docs/demo-script.md`: a 5-minute phone walkthrough
  — owner dashboard → dispatch board → open an in-transit load → switch to the driver
  account, tap "arrived," camera-upload a POD → back to the office, one-click invoice →
  show the broker portal tracking the same load → show the IFTA worksheet and a
  settlement statement PDF. Every step in this script must work flawlessly on a 390px
  phone screen, and the script must be re-verified (with a screen recording) before the
  project is called complete.
- **Phone polish is acceptance criteria, not garnish.** Touch targets ≥ 44px, no
  horizontal scroll, no desktop-only tables (cards or column-priority layouts on
  mobile), readable type at arm's length, PDFs open in-viewer on mobile, camera capture
  works for document upload, and forms are usable with a thumb. Any screen that fails
  these on 390px fails its phase.

## 13. Non-negotiables & guardrails

- `npm run build` must pass before every commit. Mobile-verify at 390px. No new heavy
  dependencies (`@vercel/blob` is pre-approved). Company facts from
  `src/lib/constants.ts` only. Follow the brand skill for all UI; banned phrases stay
  banned.
- Never commit secrets. All integration credentials are environment variables documented
  in `.env.example`.
- Postgres is snake_case, TypeScript is camelCase — handle both at the DB boundary.
- Money and compliance records: append-only audit logging, no silent mutation,
  four-year retention for IFTA source data.
- External portal users must never see other customers' data, internal margins, raw GPS
  history, or driver personal information. Enforce at the query layer, not the UI.
- Public site performance budgets are unaffected: the Hub is a separate route group and
  must not add weight to marketing pages.
- The Hub must stay phone-demo-ready (Section 12) at all times: demo seed data current
  with the schema, demo script accurate, no reachable dead ends.

## 14. What Thind must provide (request these in parallel — nothing blocks Phase 1–5)

1. The current Excel load sheet(s) and customer/broker list for migration.
2. Fuel card statement CSV exports (one per program) + a card→truck/driver mapping; ask
   each program's account rep for **data feed / API credentials** (EFS/WEX issue
   separate feed credentials; Comdata has a developer portal).
3. TruckX portal exports (IFTA mileage and/or position history CSV); open an account
   with a telematics aggregator (Terminal or TruckerCloud) and authorize TruckX for the
   live feed.
4. Confirm the DAT subscription includes API access and request a service account via
   `developersupport@dat.com` / `developer.dat.com`.
5. Toll transponder statement exports (CSV).
6. Current IFTA tax-rate table for the active quarter (downloadable from iftach.org).
7. List of office staff, roles, and which email each notification type should go to.

# PROMPT END
