# Phase 4 — Driver Hub: PWA, DVIRs, Offline (Thind Transport Hub)

**For the human:** paste into a fresh agent session. Preconditions: Phases 1–3 complete (lifecycle, money, compliance engine, maintenance, cron).

---

PROMPT START

## 0. Operating contract (identical in every phase — non-negotiable)

You are building Thind Transport Hub: dispatch, money, compliance, CRM, driver app, and customer portals for Thind Transport (Kent, WA) in one system — architected from day one as a multi-tenant product sellable to other small carriers. Before coding: read `docs/tms-master-prompt.md` if present, plus `AGENTS.md`, `.cursor/skills/`, the existing NextAuth setup, the DB layer, and `src/lib/constants.ts`.

- Stack is the existing one: Next.js App Router, React, TypeScript, Tailwind, shadcn/Radix, NextAuth v5, @vercel/postgres, nodemailer, pdf-lib, Zod + React Hook Form. New dependencies pre-approved only: `@vercel/blob`, `web-push`, `vitest` (dev), one small IMAP client.
- The Hub lives under `src/app/hub/`; marketing pages and performance budgets untouched.
- Multi-tenant always: `carrier_id` everywhere; all access through `withCarrier()`; settings over constants.
- Postgres snake_case ↔ TypeScript camelCase; versioned, idempotent migrations.
- Money integer cents; rates `NUMERIC(8,4)`; money math unit-tested to the penny.
- Append-only audit logging on money records; compliance data append-only, four-year retention.
- **Driver screens are designed at 390px first**; touch targets ≥ 44px; any core driver action ≤ 3 taps from home; brand tokens navy/orange/gold/steel, dark-first.
- Secrets in env vars only; PII encrypted, masked, never logged. Drivers never see margins, other customers, or other drivers' data.
- Exit bar every session: build + tests green; 390px + 1440px verified; `npm run seed:demo` clean; no dead ends; maildev for email.

## 1. Where you are

The office runs everything; drivers can only log in and look. DVIRs, push, and offline behavior do not exist. `dvirs`, `notifications`, `push_subscriptions` tables are not yet created.

## 2. Build scope (this phase only)

1. **Migrations:** `dvirs` (truck, driver, type `pre|post`, checklist results, defects JSONB with photo FKs, safe-to-operate flag, driver signature, repair-certification link), `notifications`, `push_subscriptions`.
2. **Full PWA:** finalized manifest (tenant branding from settings), service worker, cached app shell, clear "reconnecting" states — never blank pages; fast on 4G; standalone install on iOS/Android.
3. **Offline action queue:** status taps, photo uploads, and DVIR submissions queue locally (IndexedDB) and sync when signal returns; server timestamps + append-only `load_events` make sync conflict-safe; queued items visibly pending.
4. **Driver home (`/hub/driver`):** my current load — stops, appointment windows, pickup/PO numbers, dispatch notes; big one-tap status buttons (arrived / loaded / departed / delivered) writing stop timestamps + `load_events`; map deep-link to the driver's own navigation app; weather alerts on my route; an HOS-clocks slot in the UI labeled "available when ELD sync is connected" (data arrives Phase 6).
5. **Camera capture:** POD upload with an **"exceptions noted (OS&D)" toggle** — on, it flags the load and creates a draft claim (Phase 3 tables); receipt capture (fuel/lumper/scale) creating reimbursable expense entries for office review.
6. **DVIR flow:** pre-trip = review + sign-off of the prior post-trip and its repair certification (49 CFR 396.13); post-trip = guided checklist, defect photos, safe-to-operate, signature (396.11). **Any unsafe defect flips the truck to `shop`, opens a maintenance work order, and blocks dispatch until the office records a repair certification.**
7. **My money & docs:** settlements list with in-viewer PDF statements; **advance request** (creates a pending advance for office approval, then auto-deducts per Phase 2); my documents with expiry warnings mirrored from compliance.
8. **Incident first report:** at-the-scene form — photos, geolocation (with permission), description, police report number — creating the Phase-3 incident for the office to carry to claim closure.
9. **Web Push (VAPID, `web-push` dep):** subscribe flow; notify on new dispatch, document request, compliance expiry, weather alert on route, settlement approved; mirrored in an in-app notifications feed. Office gets a notification when a driver goes `arrived`/`delivered`.

## 3. Domain knowledge for this phase

DVIRs are regulation, not feature garnish: post-trip defect reports (396.11) and next-driver review with repair certification before operation (396.13) — the defect → shop → certify loop must be airtight. HOS is **display-only forever**: the ELD is the legal system of record; the Hub never computes or edits logs. Drivers lose signal constantly at rural shippers — offline-first is why this app gets adopted where competitors' driver apps get deleted. A noted exception on a POD starts the cargo-claim clock, which is why the OS&D toggle exists at the moment of capture.

## 4. Out of scope — do not build

HOS data ingestion (Phase 6), broker/shipper portals (Phase 5), in-app navigation/turn-by-turn, SMS, driver chat.

## 5. Acceptance & exit checklist

- Full driver flow at 390px on an installed PWA: receive dispatch push → arrive → load → POD camera upload → delivered — with **one action performed in airplane mode syncing correctly afterward**; the office sees every update live.
- Post-trip DVIR with an unsafe defect puts the truck in `shop`, opens a work order, blocks dispatch; office repair certification + pre-trip sign-off releases it.
- Advance request → office approval → next settlement deducts it; OS&D toggle creates the draft claim.
- Every core action ≤ 3 taps; touch targets ≥ 44px; no horizontal scroll; build + tests green; seed includes an open DVIR defect; demo script updated; recording produced.

PROMPT END
