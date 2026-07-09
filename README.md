# Thind Transport + LoadOff

Two products in one monorepo for a Kent, WA trucking carrier:

1. **Driver recruitment website** — [thindtransport.com](https://thindtransport.com) convert CDL drivers into applications
2. **LoadOff** (legacy docs may say HaulDesk) — multi-tenant TMS for small/mid carriers: dispatch, money, fuel/IFTA, compliance, driver PWA, and customer portals

**Stack:** Next.js App Router, TypeScript, Tailwind, NextAuth v5, Vercel Postgres. Optional Go worker + Rust compute sidecars.

### Portfolio highlights

- **Anthropic Claude integration** — Smart Setup document extraction via Messages API (`src/lib/hub/doc-intake/llm-parser.ts`) with PII redaction, confidence-scored fields, human review, and heuristic fallback when `ANTHROPIC_API_KEY` is unset
- **Production invariants** — carrier-scoped queries, integer-cent money math, server-action permissions, audit logs, automated Vitest coverage
- **AI-assisted delivery** — Cursor skills, master prompts, and an agent improvement loop (`docs/agent-improvement-loop.md`)
- **Demo path** — `docs/demo-script.md` (seed demo accounts + walkthrough)

Some vendor integrations ship **stub-first** (mock + contract tests) until credentials are activated. CSV/manual fallbacks remain.

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in SMTP + auth values
npm run dev                  # http://localhost:3000
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (flat config, `eslint.config.mjs`) |
| `npm run generate:brand-assets` | Regenerate favicons + Open Graph image from the brand system |
| `npm run go-build` | Build Go sidecar (`services/go/hauldesk-worker`) |
| `npm run rust-build` | Build Rust sidecar (`services/rust/hauldesk-compute`) |

## Development (trilingual stack)

HaulDesk V1 runs on **TypeScript** (Next.js on Vercel). Optional sidecars:

```bash
npm run dev                                              # :3000 — required

# Optional local sidecars (see docs/architecture/trilingual-stack.md)
cd services/go/hauldesk-worker && go run .             # :8081
cd services/rust/hauldesk-compute && cargo run           # :8082
```

Set `HAULDESK_GO_WORKER_URL` and `HAULDESK_RUST_COMPUTE_URL` in `.env.local` to enable sidecar calls from `src/lib/hub/sidecars.ts`. When unset, the app uses pure TypeScript (no production behavior change).

## What's here

- **Marketing pages** — home, apply, pay rates, routes, fleet, benefits, about, testimonials, veterans, resources, fuel program, load-board preview, privacy.
- **Lead capture** — multi-step application form, pre-qualification wizard, earnings calculator with email-an-estimate, meeting scheduler. All deliver via SMTP (server actions / API routes).
- **Driver portal** (`/driver/*`) — registration with invitation code, login (NextAuth v5 credentials), multi-step DOT application wizard with PDF generation (`pdf-lib`), upload to HR via email.
- **HaulDesk** (`/hub/*`) — the multi-tenant operations product for small and mid-size carriers: Today command center, drag-and-drop week planner, dispatch board, money (invoices → AR → pay-rules-driven settlements), fuel + IFTA (reefer-exempt correct), compliance + DOT accident register, driver phone app (status taps, camera PODs, chat, time off, incident reports), messaging + signed announcements, tasks with automations, facility intelligence, and a recruiting pipeline that ends in a dispatch-legal driver. Thind Transport is tenant #1. See `docs/tms-master-prompt.md` (build plan) and `docs/demo-script.md` (demo accounts + walkthrough). Setup: `npm run db:migrate`, optional `npm run seed:demo`.
- **SEO/AEO** — per-page metadata + canonicals, Organization/LocalBusiness + WebSite JSON-LD site-wide, JobPosting on `/apply`, FAQPage schema where FAQs render, `sitemap.xml`, `robots.txt`, `llms.txt`, Open Graph image.

## Environment variables

See `.env.example` for the full annotated list. Summary:

| Variable | Required for | Notes |
|---|---|---|
| `SMTP_HOST/PORT/USER/PASS/FROM` | All lead/application emails | Gmail app password works |
| `HR_EMAIL` | Driver PDF delivery | Defaults provided |
| `NEXTAUTH_URL`, `NEXTAUTH_SECRET` | Driver portal auth | `openssl rand -base64 32` |
| `DRIVER_INVITATION_CODE` | Portal registration | Falls back to legacy code |
| `POSTGRES_URL` | Driver portal persistence | Unset = local JSON files in `/data` (dev only) |
| `SETUP_DB_TOKEN` | `GET /api/setup-db` | Endpoint is disabled when unset |

Never commit `.env.local` or any file containing real secrets.

## Project structure

```
├── src/
│   ├── app/            # App Router pages, API routes, server actions
│   ├── components/     # application/, cinematic/, driver-form/, features/, home/, shared/, ui/
│   ├── lib/            # constants, db, email, pdf-builder, market data
│   └── proxy.ts        # Route protection (driver portal + admin tools)
├── public/             # Static assets, favicons, og-image, llms.txt
├── scripts/            # Brand asset + PDF tooling (dev only)
└── docs/               # Setup guides (database, deployment, email, onboarding)
```

## Deployment

Deployed on Vercel (`vercel.json` holds headers/redirects). Push to `main` to deploy. See `docs/deployment.md` for environment setup, and `docs/database-setup.md` for Postgres.

## License

© Thind Transport. All rights reserved.
