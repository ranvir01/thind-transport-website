# LoadOff + Thind Transport

**Live:** [thindtransport.com](https://thindtransport.com) · **TMS:** [/hub](https://thindtransport.com/hub) · **Product:** [/loadoff](https://thindtransport.com/loadoff)

One monorepo for a Kent, WA family carrier:

1. **LoadOff** (`/hub`) — multi-tenant TMS: dispatch, invoicing, settlements, fuel + IFTA, compliance, customer portals, and an installable driver PWA. Thind Transport is tenant #1. (Older docs may still say HaulDesk.)
2. **Driver recruitment site** (`/`) — marketing + apply flows that convert CDL drivers into applications.

| | |
|---|---|
| ![Today command center](docs/screenshots/hub-today.png) | ![Driver phone app](docs/screenshots/driver-mobile.png) |
| Today: loads due, unconfirmed drivers, money not yet invoiced | Driver PWA: offline shell, status taps, camera PODs |

![Dispatch board](docs/screenshots/hub-dispatch.png)

## Why this repo matters for Claude / AI work

- **Anthropic Claude in production** — Smart Setup document extraction via the Messages API (`src/lib/hub/doc-intake/llm-parser.ts`): PII redaction, confidence-scored fields, human review, and a heuristic fallback when `ANTHROPIC_API_KEY` is unset.
- **Hard invariants** — carrier-scoped queries, integer-cent money math, server-action permissions, audit logs, automated tests.
- **Honest delivery** — Cursor / Claude accelerate the build; humans review, test, and own what ships. Some vendor integrations are stub-first (mock + contract tests) until credentials are live; CSV/manual fallbacks stay available.
- **Demo path** — [`docs/demo-script.md`](docs/demo-script.md)

## What LoadOff covers

- **Today** — what's due, who hasn't confirmed, missing PODs, money not yet invoiced
- **Dispatch** — week planner, board, live map when ELD is connected
- **Money** — rate confirmation → invoice → payment → pay-rules settlements
- **Fuel + IFTA** — card feeds or CSV → MPG, costing, IFTA quarters
- **Compliance** — expiries, DOT accident register, authority checks
- **Driver app** — confirm, status, camera PODs, chat, pay stubs, DVIR, offline shell
- **Integrations** — ELD, fuel cards, load boards, mailbox, QuickBooks (registry + encrypted credentials)

## Quick start

```bash
npm run setup:canvas-deps     # system libs for the `canvas` dep (or: npm install --ignore-scripts)
npm install
cp .env.example .env.local    # POSTGRES_URL + NEXTAUTH_SECRET minimum
npm run db:migrate
npm run seed:demo             # optional
npm run dev                   # http://localhost:3000  (hub at /hub)
```

## iPhone sandbox

```bash
npm run db:migrate
npm run seed:sandbox
npm run dev:mobile
```

`dev:mobile` opens an HTTPS tunnel for iOS Safari (camera POD, service worker, and
Add to Home Screen require HTTPS). The printed quick-tunnel URL changes on every
run. Use `npm run deploy:preview` for a stable Vercel preview URL when testing
repeatedly.

Same-Wi-Fi UI-only fallback:

```bash
npm run dev:lan
```

## Useful commands

| Command | Purpose |
|---|---|
| `npm test` | Vitest suite |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (flat config, `eslint.config.mjs`) |
| `npm run generate:brand-assets` | Regenerate favicons + Open Graph image from the brand system |
| `npm run connections:check` | Integration / env readiness |
| `npm run db:migrate` | Apply `migrations/hub/*.sql` |
| `npm run seed:sandbox` | Idempotently populate clearly-watermarked two-company sandbox data |
| `npm run sandbox:reset` | Wipe only sandbox data |
| `npm run seed:production` | Confirmation-gated production facts seed; never fabricates go-live records |
| `npm run dev:mobile` | HTTPS tunnel to local dev for iPhone camera/PWA testing |
| `npm run dev:lan` | Same-Wi-Fi HTTP dev server for UI-only phone checks |
| `npm run deploy:preview` | Vercel preview deploy for stable repeated testing |

## Stack

Next.js (App Router), TypeScript, Tailwind, NextAuth v5, Postgres, pdf-lib, web-push. Deployed on Vercel. Optional Go / Rust sidecars; TypeScript path works alone when they are unset.

- **Marketing pages** — home, apply, pay rates, routes, fleet, benefits, about, testimonials, veterans, resources, fuel program, privacy.
- **Lead capture** — multi-step application form, pre-qualification wizard, earnings calculator with email-an-estimate, meeting scheduler. All deliver via SMTP (server actions / API routes).
- **Driver portal** (`/driver/*`) — registration with invitation code, login (NextAuth v5 credentials), multi-step DOT application wizard with PDF generation (`pdf-lib`), upload to HR via email.
- **LoadOff Hub** (`/hub/*`) — the operations system: role-based login, dispatch board, load lifecycle with stops + documents, fleet/driver/customer management, CSV import, fleet map, invoices, settlements, fuel/IFTA, compliance, two-company sandbox, driver PWA, and phone-first onboarding. Setup: `npm run db:migrate`, optional `npm run seed:sandbox`.
- **SEO/AEO** — per-page metadata + canonicals, Organization/LocalBusiness + WebSite JSON-LD site-wide, JobPosting on `/apply`, FAQPage schema where FAQs render, `sitemap.xml`, `robots.txt`, `llms.txt`, Open Graph image.

## Mobile app strategy (phased — Phase 1 shipped, 2–3 documented only)

**Phase 1 (live):** the driver app is the installable PWA at `/hub` — offline shell, camera
PODs, chat, pay stubs, DVIR, web push. `/app` is the public install page: Android/Chromium
gets a real install sheet via `beforeinstallprompt`; iOS gets guided Add-to-Home-Screen
(Safari has no programmatic prompt, and web push on iOS requires the app be installed
first). Install events (`pwa_prompt_available` / `pwa_install_accepted` / `pwa_launch`)
land in Vercel Analytics.

**Phase 2 (when install volume justifies it): Google Play via TWA.** Bubblewrap generates
`twa-manifest.json` from the existing manifest; requirements are HTTPS (have it), a
Digital Asset Links `assetlinks.json` served from the origin, a one-time $25 Play fee,
and Play's verification + 12-tester rule (~2–4 weeks wall time). Precedent: Schneider
"Compass", Werner "Drive Werner Pro", J.B. Hunt "Carrier 360" all ship via Play.

**Phase 3 (only if retention data demands it): iOS App Store.** Thin wrappers get
rejected under Apple Guideline 4.2 ("minimum functionality"); the PWA's genuinely
native-like features (offline queue, camera PODs, push) are the defense if pursued —
via Capacitor, not a bare web view. Not worth the review cycles until Phase 2 numbers
prove demand.

**Critical-alert fallback (planned, not built):** native/web push is best-effort — dead
tokens, TTL expiry, no-data zones. For genuinely critical driver alerts the plan is SMS
fallback (no data connection required) plus the offline queue's store-and-forward for
true dead zones. Needs an SMS provider decision (Twilio vs. carrier email-to-SMS) — an
owner call, listed in the go-live checklist.

## Environment

| Variable | Required for | Notes |
|---|---|---|
| `SMTP_HOST/PORT/USER/PASS/FROM` | All lead/application emails | Set in Vercel — never commit |
| `NEXTAUTH_URL`, `NEXTAUTH_SECRET` | Auth | `openssl rand -base64 32` |
| `POSTGRES_URL` | Hub + driver portal persistence | Unset = sandbox fallback / local JSON in `/data` |
| `CRON_SECRET`, `CREDENTIALS_KEY`, `BLOB_READ_WRITE_TOKEN` | Production jobs/credentials/files | Required before live integrations |
| `NEXT_SERVER_ACTION_ALLOWED_ORIGINS` | Mobile HTTPS tunnels | `dev:mobile` sets this automatically |

## License

© Thind Transport. All rights reserved.
