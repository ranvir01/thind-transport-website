# Phase 7 — Productization: Onboarding, Isolation, Security, Sales (Thind Transport Hub)

**For the human:** paste into a fresh agent session. Preconditions: Phases 1–6 complete. This phase turns the Hub from Thind's system into a sellable platform.

---

PROMPT START

## 0. Operating contract (identical in every phase — non-negotiable)

You are building Thind Transport Hub: dispatch, money, compliance, CRM, driver app, and customer portals for Thind Transport (Kent, WA) in one system — architected from day one as a multi-tenant product sellable to other small carriers. Before coding: read `docs/tms-master-prompt.md` if present, plus `AGENTS.md`, `.cursor/skills/`, the existing NextAuth setup, the DB layer, and `src/lib/constants.ts`.

- Stack is the existing one: Next.js App Router, React, TypeScript, Tailwind, shadcn/Radix, NextAuth v5, @vercel/postgres, nodemailer, pdf-lib, Zod + React Hook Form. New dependencies pre-approved only: `@vercel/blob`, `web-push`, `vitest` (dev), one small IMAP client. (Stripe only if explicitly directed this phase.)
- The Hub lives under `src/app/hub/`; marketing pages and performance budgets untouched.
- Multi-tenant always: `carrier_id` everywhere; `withCarrier()` is the only data path; per-tenant config in `carrier_settings`.
- Postgres snake_case ↔ TypeScript camelCase; versioned, idempotent migrations; money integer cents, tested to the penny; compliance data append-only, four-year retention; audit log immutable.
- 390px-first; touch targets ≥ 44px; brand tokens for Thind, **tenant branding for everyone else**.
- Secrets in env vars / encrypted `api_credentials`; PII encrypted, masked, never logged.
- Exit bar every session: build + tests green; 390px + 1440px verified; `npm run seed:demo` clean; no dead ends.

## 1. Where you are

One production tenant (Thind) uses everything. Tenant scaffolding has existed since migration #1 but has never been exercised by a second real tenant, and there is no self-serve front door.

## 2. Build scope (this phase only)

1. **Tenant onboarding wizard (M11):** create carrier → company facts (DOT/MC verified live via QCMobile) + logo/colors → import trucks (VIN decode), drivers (invite emails + DQ checklists), customers, and load history through the universal importer → pay configuration (both pay types) → accessorial price book (sensible defaults pre-filled) → optional integration connects (everything works on imports if skipped) → finishing sanity checklist proving every dashboard renders with their data. **Target: a new carrier fully live in under one business day, self-serve, no human in the loop.**
2. **Second-tenant hardening:** extend `seed:demo` to create a second tenant ("Cascade Demo Lines" or similar) with its own branding, users, and data; **a full cross-tenant isolation suite** — data layer, API walk across the role × resource × tenant matrix, portals, share links, ICS feeds, notifications — proving zero bleed in both directions.
3. **Per-tenant branding live:** logo and colors from `carrier_settings` flow into the Hub UI, the PWA manifest, invoice/settlement/IFTA PDFs, and outbound email templates. `platform_admin` role activated: tenant create/suspend and operational metrics only; support impersonation requires recorded consent and writes to the audit log; no customer business data by default.
4. **GeocodeSource at scale:** decide and implement the swap path (self-hosted Nominatim/OSRM or a low-cost commercial geocoder) behind the existing interface with env-based selection and rate-limit respect — the public Nominatim instance's ~1 req/s policy is fine for one carrier, not a platform.
5. **Security pass:** rate limiting + lockout on auth endpoints; signed, expiring Blob URLs verified everywhere documents are served; PII-at-rest encryption audit (SSNs, license data from the DOT wizard); dependency audit; security headers/CSP review; audit-log coverage check against the money/compliance mutation list; confirm share-link tokens ≥128-bit and revocation works.
6. **In-app help:** contextual help drawn from the master prompt's industry encyclopedia — tooltips with CFR citations on compliance screens, money-mechanics explainers on invoicing/settlement screens — so a brand-new carrier needs no training manual.
7. **Billing-ready hooks + white-label design (M12, design only unless directed):** plan flags in `carrier_settings`, per-truck/month metering points identified, subdomain/custom-domain middleware plan, per-tenant email sender identity plan. Build no Stripe code unless explicitly told to.
8. **Smart Setup (`/hub/setup`, M11):** batch upload PDFs/CSV/photos → classify → extract fields → review → apply. Brokers need MC/DOT only (FMCSA fills legal name); registrations → trucks + VIN decode; CDLs/med cards → drivers; W-9/COI → carrier packet; rate cons → paste intake; spreadsheets → import wizard. Deterministic parsers today; OCR/LLM drop-in behind the same interface later.
9. **`docs/sales-demo.md`:** the 5-minute phone pitch to a prospective carrier — owner dashboard → paste-to-dispatch → driver POD → one-click invoice → broker tracking link → IFTA worksheet → settlement PDF → **ending in Smart Setup uploading their paperwork live.** Re-verify `docs/demo-script.md` end-to-end with a screen recording.

## 3. Domain knowledge for this phase

The market this unlocks: roughly 95% of US carriers run ten or fewer trucks, and the incumbents charge them per user or per truck (reported: Truckbase from ~$290/month volume-based; Alvys ~$100–150/user/month; AscendTMS $49–149/user/month paid tiers; enterprise implementations start six figures) while gating integrations and selling IFTA as an add-on. The Hub's architecture must keep the marginal cost of a truck and a user near zero so flat, honest per-truck pricing is possible later without losing money. Onboarding speed is the moat: incumbents onboard in weeks with sales calls; the wizard does it in a day, self-serve — which is also why the universal importer is a flagship feature, not plumbing.

## 4. Out of scope — do not build

Stripe/billing execution (unless directed), custom-domain execution, SOC 2 paperwork, marketing site for the SaaS, mobile app-store wrappers.

## 5. Acceptance & exit checklist

- A brand-new fictional carrier is onboarded self-serve — company, fleet, drivers, customers, load history, price book — in **under one business day**, with the timed run documented.
- The cross-tenant isolation suite is green; both tenants independently pass the full 5-minute phone demo at 390px with their own branding, zero data bleed, zero excuses.
- Security pass complete with findings fixed; geocoding swap implemented; in-app help present on every compliance and money screen.
- Build + tests green; `docs/demo-script.md` and `docs/sales-demo.md` re-verified with screen recordings. The project is now both Thind's operating system and a demoable product.

PROMPT END
