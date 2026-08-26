# Phase 1 — Foundation + Dispatch (Thind Transport Hub)

**For the human:** paste everything below into a fresh agent session in the repository. Preconditions: none — this is the first phase. The master spec, if present, is `docs/tms-master-prompt.md`.

---

PROMPT START

## 0. Operating contract (identical in every phase — non-negotiable)

You are building Thind Transport Hub: dispatch, money, compliance, CRM, driver app, and customer portals for Thind Transport (Kent, WA) in one system — architected from day one as a multi-tenant product sellable to other small carriers. Before coding: read `docs/tms-master-prompt.md` if present, plus `AGENTS.md`, `.cursor/skills/`, the existing NextAuth setup, the DB layer, and `src/lib/constants.ts`.

- Stack is the existing one: Next.js App Router, React, TypeScript, Tailwind, shadcn/Radix, NextAuth v5, @vercel/postgres, nodemailer, pdf-lib, Zod + React Hook Form. New dependencies pre-approved only: `@vercel/blob`, `web-push`, `vitest` (dev), one small IMAP client. Anything else needs written justification.
- The Hub lives under `src/app/hub/` (role-protected route group; extend `src/proxy.ts`; the NextAuth v5 cookie is `authjs.session-token` / `__Secure-authjs.session-token` per the dev-workflow-testing skill). Marketing pages and their performance budgets are untouched.
- Multi-tenant always: every business table carries `carrier_id`; composite uniques `(carrier_id, key)`; all reads/writes go through the data layer's `withCarrier()` scope. Thind is tenant #1 seeded from `constants.ts`; Hub features read `carrier_settings`, never constants directly.
- Postgres snake_case ↔ TypeScript camelCase at the DB boundary; versioned, idempotent migrations.
- Money is integer cents; rates `NUMERIC(8,4)`; no float currency math; money logic ships with vitest tests against hand-computed fixtures, exact to the penny.
- Append-only audit logging on money records and load rate changes; compliance source data retained 4 years; corrections are new records, never edits.
- Driver screens 390px-first; office screens usable on a phone; touch targets ≥ 44px; brand tokens navy/orange/gold/steel, dark-theme-first, one red CTA per viewport; banned phrases stay banned.
- Secrets only in env vars documented in `.env.example`; PII (SSNs, license data) encrypted at rest, masked in UI, never logged.
- Exit bar for every working session: `npm run build` and `npm test` pass; changed screens verified at 390px and 1440px; `npm run seed:demo` runs clean; no dead links or placeholder screens reachable; email tested with maildev.

## 1. Where you are

Nothing of the Hub exists yet. The repo has the public site, NextAuth v5 credentials auth, a driver portal with a DOT application wizard, Postgres with JSON-file fallback, SMTP email, and pdf-lib.

## 2. Build scope (this phase only)

1. **Tenant + identity migrations (migration #1 onward):** `carriers`, `carrier_settings` (typed JSONB: branding, pay defaults, detention rules, invoice numbering pattern, default terms, notification routing, feature flags), alter `users` (add `role`, `carrier_id`). Seed the Thind carrier + settings from `src/lib/constants.ts`. Set up vitest.
2. **AuthZ:** role enum (`owner, dispatcher, accountant, driver, broker, shipper`; reserve `platform_admin`), layout-level route protection for `/hub`, permission checks at the API/data layer (never UI-only), `withCarrier()` scope. Existing driver-portal accounts become `driver` role under Thind. **Write the role × resource matrix test** proving every forbidden combination returns 403.
3. **Core schema:** `trucks`, `trailers`, `drivers` (extend portal records: CDL number/state/expiry, medical card expiry, hire date, pay type `per_mile|percentage`, pay rate, status, emergency contact), `customers` (type `broker|shipper`, MC, billing address/email, terms days, credit limit, factoring flag, status, notes), `contacts`, `loads`, `stops`, `load_events` (append-only unified timeline: `status_change|check_call|geo|document|note|weather_alert|detention|exception`, actor, payload JSONB), `documents` (polymorphic; kinds incl. `rate_confirmation|bol|pod|receipt|cdl|medical_card|registration|inspection|insurance|other`; Blob URL; nullable expiry), `share_links`, `import_templates`, `audit_log` (no UPDATE/DELETE grants; wire load rate changes to it now).
4. **CRUD with Zod:** trucks (enter VIN → auto-fill year/make/model/engine via the free NHTSA vPIC API, no key), trailers (`flatbed|reefer|dry_van`), drivers, customers, contacts.
5. **Load lifecycle:** statuses `quoted → booked → dispatched → at_pickup → in_transit → delivered → pod_received → invoiced → paid → settled`; forward-only via explicit actions; every change appends a `load_event`. Money fields in cents: linehaul, fuel surcharge, accessorials (JSONB list), total; loaded + deadhead miles; source (`dat|direct|import|quote`); factored flag.
6. **Stops + geocoding:** sequence, `pickup|delivery`, facility/address, appointment window vs FCFS, pickup/PO numbers, `arrived_at`/`departed_at`. Geocode through a `GeocodeSource` interface — Nominatim implementation respecting ~1 req/sec, results cached in the DB.
7. **Dispatch board (M1):** live board grouped by status; truck+driver assignment with a warn-only legality stub (truck in `shop`, expired CDL/med-card dates — full engine arrives Phase 3); stop timeline from `load_events`; document checklist (rate con → BOL → POD) gating status advances; margin display = total − (OSRM practical miles + deadhead) × cost-per-mile placeholder from `carrier_settings`; NWS weather alerts (api.weather.gov, free, no key) intersecting the route shown on in-transit loads; one-click status advance; list view with filters (status, customer, driver, truck, date range) + full-text search; command palette (Cmd+K, long-press on mobile) jumping to any load/driver/truck/customer; each load shows money state (invoiced? paid? settled?) inline as placeholders for Phase 2.
8. **Paste intake (<60s):** textarea (or PDF text) → deterministic heuristic `DocumentParser` (regex/structure) pre-fills a load draft — broker name/MC, references, rate, FSC, stops with appointment windows, equipment, weight, commodity — with per-field confidence highlighting; dispatcher confirms.
9. **Documents:** `@vercel/blob` upload keyed to `documents`; image/PDF preview; per-load checklist UI.
10. **Tracking share links:** ≥128-bit random token, revocable, public `/track/[token]` page showing status, stops, ETA (OSRM), and city-level latest position when available (status-only until Phase 3 pings); optional auto-email to the broker contact on dispatch.
11. **Fleet map:** Leaflet + OSM tiles; trucks at last known (seeded) positions.
12. **Excel load import v1 (the future universal engine — design it source-agnostic now):** upload → column mapping → preview with Zod validation errors → import; historical loads land as `settled`; mapping saved to `import_templates` for one-click re-import.
13. **Demo readiness v1:** PWA manifest with Thind branding (installable early), `npm run seed:demo` (idempotent, refuses production) seeding fleet/drivers/customers/loads across the lifecycle, `docs/demo-script.md` v1.

## 3. Domain knowledge for this phase

A **rate confirmation** is the broker–carrier contract: rate, FSC, accessorials, references, stops, terms — your load form and parser mirror its anatomy. The **BOL** is signed at pickup; in/out times on it are detention evidence, so capture `arrived_at`/`departed_at` faithfully now (the money logic lands in Phase 2). The **POD** is the signed delivery copy that will later gate invoicing. Tracking links exist to kill "check calls" — still log the holdouts as `check_call` events in one tap.

## 4. Out of scope — do not build

Invoicing/settlements (Phase 2), fuel/IFTA/cron (Phase 3), driver PWA actions beyond viewing (Phase 4), CRM analytics/portals (Phase 5), live ELD/DAT APIs (Phase 6), onboarding wizard/billing (Phase 7).

## 5. Acceptance & exit checklist

- Paste a realistic rate con → confirmed, dispatched load in **under 60 seconds**; advance it through `delivered` with documents attached at each gate; the tracking link reflects every change live.
- Import a 50-row sample Excel sheet → loads searchable, per-customer history visible.
- Role-matrix test green; `withCarrier()` is the only data path; audit rows written on a load rate change.
- Build + tests green; dispatch board, load detail, and track page pass 390px; seed + demo script work; short screen recording produced.

PROMPT END
