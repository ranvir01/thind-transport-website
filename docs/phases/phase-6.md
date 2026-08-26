# Phase 6 — Live Integrations + Analytics (Thind Transport Hub)

**For the human:** paste into a fresh agent session. Preconditions: Phases 1–5 complete. Vendor prerequisites (request in parallel, none block the start): a Terminal or TruckerCloud account with TruckX authorized; DAT service account + Connexion/API entitlement; fuel-card feed credentials as they arrive.

---

PROMPT START

## 0. Operating contract (identical in every phase — non-negotiable)

You are building Thind Transport Hub: dispatch, money, compliance, CRM, driver app, and customer portals for Thind Transport (Kent, WA) in one system — architected from day one as a multi-tenant product sellable to other small carriers. Before coding: read `docs/tms-master-prompt.md` if present, plus `AGENTS.md`, `.cursor/skills/`, the existing NextAuth setup, the DB layer, and `src/lib/constants.ts`.

- Stack is the existing one: Next.js App Router, React, TypeScript, Tailwind, shadcn/Radix, NextAuth v5, @vercel/postgres, nodemailer, pdf-lib, Zod + React Hook Form. New dependencies pre-approved only: `@vercel/blob`, `web-push`, `vitest` (dev), one small IMAP client.
- The Hub lives under `src/app/hub/`; marketing pages and performance budgets untouched.
- Multi-tenant always: `carrier_id` everywhere; all access through `withCarrier()`; settings over constants.
- Postgres snake_case ↔ TypeScript camelCase; versioned, idempotent migrations; money integer cents, tested to the penny; compliance data append-only, four-year retention.
- Every integration sits behind its internal interface (`LoadSource`, `FuelSource`, `TelematicsSource`, `TollSource`, `GeocodeSource`, `DocumentParser`) with the CSV path as the always-working fallback — the rest of the system never knows which path data arrived through.
- All vendor credentials in env vars / encrypted `api_credentials`, documented in `.env.example`, never in code, never logged.
- 390px-first driver screens; office screens phone-usable; brand tokens navy/orange/gold/steel, dark-first.
- Exit bar every session: build + tests green; 390px + 1440px verified; `npm run seed:demo` clean; no dead ends; maildev for email.

## 1. Where you are

Everything works on imports. No live vendor data flows; the owner has module dashboards but no single command view; `hos_snapshots` and `api_credentials` tables do not yet exist.

## 2. Build scope (this phase only)

1. **Migrations:** `api_credentials` (per-carrier, envelope-encrypted), `hos_snapshots` (driver, timestamp, duty status, drive/shift/cycle remaining, source).
2. **TelematicsSource live (Terminal first):** hosted-Link connect flow on the admin integrations page; map provider vehicles/drivers to units/drivers with a review step; scheduled syncs pulling GPS → `position_pings`, odometer → maintenance/MPG, HOS → `hos_snapshots`; sync state, counts, and errors in `integration_syncs` with failure alerts. Structure the adapter so a TruckerCloud implementation is a drop-in second.
3. **Dispatch-legality, upgraded:** assignment check now compares the OSRM ETA to the driver's remaining drive/shift/cycle clocks — clearly labeled "estimate only — the ELD is authoritative." The Phase-4 driver-app HOS slot goes live.
4. **DAT `LoadSource`:** service-account auth per DAT's model; saved lane/equipment searches; one-click "book → create load" pre-filling the Phase-1 intake form; truck/capacity posting. Feature-flag the whole module so it degrades gracefully while DAT certification is pending. Keep the interface generic — Truckstop.com is a future second adapter, not special-cased.
5. **Fuel card API adapters** (EFS/WEX data feed, Comdata developer portal) behind `FuelSource` as credentials arrive — producing identical records to the CSV path, idempotent against it.
6. **Inbound docs mailbox:** IMAP poll (cron) of a dedicated docs@ address; attachments auto-file to the matching load by reference number in the subject; unmatched-review queue. Feed clean text into the parser as a second intake path.
7. **Optional LLM `DocumentParser`:** behind an env var, off by default, any provider; heuristic parser remains the default; strip obvious PII before external calls; per-field confidence drives the review UI; build the fixture suite from real (redacted) rate cons and run both parsers against it.
8. **Owner dashboard + reports (M10):** revenue week/month, loaded vs deadhead miles, revenue and cost per mile, per-truck P&L, AR aging total, settlement liabilities, compliance red flags, fuel spend, lane leaderboard; date-range CSV exports. Numbers from real records only — zero fabricated stats.
9. **Automation polish:** weekly owner digest email; detention auto-draft verified against live stop timestamps; fuel-vs-position fraud flag now using real pings; weather alerts on live routes; tracking-link auto-send confirmed end-to-end.

## 3. Domain knowledge for this phase

**TruckX has no public direct API** — it integrates through aggregators: Terminal (docs.withterminal.com; TruckX is a listed provider; hosted Link auth; normalized vehicle/driver/HOS/GPS/odometer models), TruckerCloud, and Axle. TruckX itself can push tracking to MacroPoint, project44, and Trucker Tools — satisfy brokers who demand those vendors by opting in at the ELD level rather than building direct integrations. **DAT's actual requirements** (per their support docs): a dedicated service-account email not already registered with DAT; a Connexion seat plus a load-board seat per integrated user (RateView Combo Pro/Premium if rate data is wanted); DAT certifies the application before production; request via developersupport@dat.com / developer.dat.com. **HOS clocks for the legality display:** 11h driving / 14h window / 30-min break after 8 cumulative driving hours / 60-in-7 or 70-in-8 / 34h restart / 7-3 or 8-2 sleeper split / +2h adverse conditions / 150 air-mile short-haul exception — display, never compute or edit logs.

## 4. Out of scope — do not build

QuickBooks Online API, project44/FourKites direct connectors, Truckstop adapter, SMS, billing, the onboarding wizard (Phase 7).

## 5. Acceptance & exit checklist

- Positions, odometer, and HOS sync on schedule without manual import; the dispatch board shows live clocks and an HOS-tight assignment warns; sync failures alert.
- A DAT search result becomes a dispatched Hub load in one click (or, if certification is pending, the feature flag shows a clean "pending DAT activation" state and the paste path still hits <60s).
- A forwarded rate con auto-files to its load via the docs mailbox; the parser fixture suite passes; the owner dashboard's every number reconciles to underlying records.
- Build + tests green; 390px pass; integrations status page accurate; demo script updated; recording produced.

PROMPT END
