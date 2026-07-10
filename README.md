# LoadOff — a trucking company, run by its own software

**Live site:** [thindtransport.com](https://thindtransport.com) · **The software:** [thindtransport.com/hub](https://thindtransport.com/hub) · **Product page:** [/loadoff](https://thindtransport.com/loadoff)

One monorepo, two products, one real business:

1. **LoadOff** (`/hub`) — a multi-tenant transportation management system built in-house to run [Thind Transport](https://thindtransport.com), a family trucking carrier in Kent, WA. Dispatch, invoicing, driver settlements, fuel + IFTA, compliance, integrations, and an installable driver phone app. Thind Transport is tenant #1. (Legacy docs may say HaulDesk.)
2. **Driver-recruitment website** (`/`) — the marketing site that converts CDL drivers into applications.

| | |
|---|---|
| ![Today command center](docs/screenshots/hub-today.png) | ![Driver phone app](docs/screenshots/driver-mobile.png) |
| The Today command center: loads due, unconfirmed drivers, money not yet invoiced | The driver app — a PWA that installs from the browser, works offline, and takes camera PODs |

![Dispatch board](docs/screenshots/hub-dispatch.png)

## Built by an agent fleet

This repo is developed and maintained by a **self-improving loop of Claude and Cursor agents** working under a written contract ([`AGENTS.md`](AGENTS.md), [`docs/agent-improvement-loop.md`](docs/agent-improvement-loop.md)):

- **Claude Code routines** run on schedules — improvement lanes (features, integrations, QA red-team, deep subsystem audits) each own territory and a branch, and land one verified improvement per cycle.
- **A Cursor automation** merges the integration branch to `main` hourly; Vercel deploys it.
- **Shared memory** lives in `Backlog:` commit trailers — each agent leaves ranked findings for the next one, so work compounds across sessions with no human dispatcher.
- Over half the repo's commits were authored this way, including cross-agent bug fixes (agents fixing defects in each other's patches) and a tenancy security audit.

The loop's ground rules: every change ships with its test, every integration ships stub-first against a contract suite with a CSV fallback that always works, money is integer cents everywhere, every query is carrier-scoped, and nothing merges without the build and the full suite green.

**Current scale:** ~700 automated tests across 97 files, 33 end-to-end smoke scripts, 17 idempotent migrations, 15 scheduled production jobs, 10 integration providers behind one registry.

## What LoadOff does

- **Today** — the morning answer: what's due, who hasn't confirmed, PODs missing, money not yet invoiced.
- **Dispatch** — drag-and-drop week planner, dispatch board, live map (ELD positions + HOS when connected).
- **Money** — rate con → invoice PDF → payment → pay-rules-driven driver settlements with advances; factoring-aware AR with dunning.
- **Fuel + IFTA** — fuel-card feeds or CSV imports become MPG, fraud flags, fuel→load costing, and reefer-exempt-correct IFTA quarters.
- **Compliance** — expiry wall (CDL/med/registration/insurance/IFTA filings), DOT accident register, FMCSA authority vetting.
- **Driver app** — dispatch confirm, status taps, camera PODs, chat, pay stubs, DVIR, time off, incident reports. Installable PWA with an offline shell and web-push.
- **Integrations** — ELD (Terminal/TruckerCloud), fuel cards (EFS/WEX/Comdata), load boards (DAT/Truckstop), docs mailbox (IMAP), QuickBooks, factoring webhooks. One registry drives the settings UI, credential allowlists (AES-256-GCM encrypted at rest), sync crons, and the HMAC-verified webhook receiver. Every provider keeps a CSV/manual fallback.
- **Smart Setup** — upload broker lists, registrations, fuel CSVs, AR exports; Claude (Messages API) extracts them into live data with confidence-scored fields, PII redaction, human review, and a heuristic fallback when `ANTHROPIC_API_KEY` is unset (`src/lib/hub/doc-intake/llm-parser.ts`).

## Quick start

```bash
npm install
cp .env.example .env.local    # POSTGRES_URL + NEXTAUTH_SECRET minimum
npm run db:migrate            # applies migrations/hub/*.sql (idempotent)
npm run seed:demo             # optional: demo carrier with realistic data
npm run dev                   # http://localhost:3000  (hub at /hub)
```

Demo walkthrough + seeded accounts: [`docs/demo-script.md`](docs/demo-script.md).

## Operations

| Command | What it answers |
|---|---|
| `npm test` | Is the logic right? (Vitest, ~700 tests) |
| `npm run build` | Does it ship? |
| `npm run connections:check` | Is everything connected? (env switches, provider credentials/syncs, cron schedule) |
| `npm run go-live:check` | Is production configured? |
| `npm run agent:status` | What has the agent loop been doing? |
| `npm run db:migrate` | Apply pending migrations (production applies its own via the daily `migrate` cron) |

Production runs on Vercel (`vercel.json`: 15 cron jobs, security headers). Schema can never lag code: the deployed app migrates its own database through a `CRON_SECRET`-protected endpoint.

## Architecture

```
src/app/            Marketing site (App Router) + /hub (TMS) + /driver (recruitment portal)
src/lib/hub/        Domain logic: dispatch, money (integer cents), ifta, compliance,
                    integrations/ (registry, adapters, webhooks), credentials (AES-256-GCM)
src/components/     hub/ (TMS UI) · cinematic/, home/, application/ (marketing)
migrations/hub/     Numbered, idempotent, tracked in public.hub_migrations
scripts/            Migration runner, demo seed, readiness checks, 33 e2e smokes
services/           Optional Go worker + Rust compute sidecars (off by default)
docs/               Agent-loop contract, integration docs, go-live runbook, demo script
```

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind · NextAuth v5 · Postgres (`hub.*` schema, node-postgres) · pdf-lib · web-push. Deployed on Vercel.

**Invariants the fleet enforces:** carrier-scoped tenancy on every query, integer-cent money math, permission checks in every server action, audit logs that record field names but never values, idempotent ingestion (`ON CONFLICT (carrier_id, source, external_id)`), and WinAnsi-safe PDF text.

## Environment

See `.env.example` for the annotated list. The short version: `POSTGRES_URL` + `NEXTAUTH_SECRET` boots it; `CREDENTIALS_KEY` unlocks the encrypted integration vault; `CRON_SECRET` arms the scheduled jobs; SMTP enables invoice/settlement email; everything else is optional with a working fallback. Never commit `.env.local`.

## License

© Thind Transport. All rights reserved.
