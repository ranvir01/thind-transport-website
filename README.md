# Thind Transport — Driver Recruitment Website

Marketing and driver-recruitment site for [Thind Transport](https://thindtransport.com), a family-run trucking company in Kent, WA. Built with Next.js (App Router), TypeScript, and Tailwind CSS.

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in SMTP + auth values
npm run dev                  # http://localhost:3000
```

## iPhone HaulDesk sandbox

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

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (flat config, `eslint.config.mjs`) |
| `npm run generate:brand-assets` | Regenerate favicons + Open Graph image from the brand system |
| `npm run db:migrate` | Apply HaulDesk Hub migrations |
| `npm run seed:sandbox` | Idempotently populate clearly-watermarked two-company sandbox data |
| `npm run sandbox:reset` | Wipe only sandbox data |
| `npm run seed:production` | Confirmation-gated production facts seed; never fabricates go-live records |
| `npm run dev:mobile` | HTTPS tunnel to local dev for iPhone camera/PWA testing |
| `npm run dev:lan` | Same-Wi-Fi HTTP dev server for UI-only phone checks |
| `npm run deploy:preview` | Vercel preview deploy for stable repeated testing |

## What's here

- **Marketing pages** — home, apply, pay rates, routes, fleet, benefits, about, testimonials, veterans, resources, fuel program, load-board preview, privacy.
- **Lead capture** — multi-step application form, pre-qualification wizard, earnings calculator with email-an-estimate, meeting scheduler. All deliver via SMTP (server actions / API routes).
- **Driver portal** (`/driver/*`) — registration with invitation code, login (NextAuth v5 credentials), multi-step DOT application wizard with PDF generation (`pdf-lib`), upload to HR via email.
- **HaulDesk Hub** (`/hub/*`) — the operations system: role-based login, dispatch board, load lifecycle with stops + documents, fleet/driver/customer management, CSV import, fleet map, invoices, settlements, fuel/IFTA, compliance, two-company sandbox, driver PWA camera test, and phone-first onboarding. Setup: `npm run db:migrate`, optional `npm run seed:sandbox`.
- **SEO/AEO** — per-page metadata + canonicals, Organization/LocalBusiness + WebSite JSON-LD site-wide, JobPosting on `/apply`, FAQPage schema where FAQs render, `sitemap.xml`, `robots.txt`, `llms.txt`, Open Graph image.

## Environment variables

See `.env.example` for the full annotated list. Summary:

| Variable | Required for | Notes |
|---|---|---|
| `SMTP_HOST/PORT/USER/PASS/FROM` | All lead/application emails | Gmail app password works |
| `HR_EMAIL`, `FROM_EMAIL` | Driver PDF delivery | Defaults provided |
| `NEXTAUTH_URL`, `NEXTAUTH_SECRET` | Driver portal auth | `openssl rand -base64 32` |
| `DRIVER_INVITATION_CODE` | Portal registration | Falls back to legacy code |
| `POSTGRES_URL` | Driver portal persistence | Unset = local JSON files in `/data` (dev only) |
| `SETUP_DB_TOKEN` | `GET /api/setup-db` | Endpoint is disabled when unset |
| `CRON_SECRET`, `CREDENTIALS_KEY`, `BLOB_READ_WRITE_TOKEN` | HaulDesk production jobs/credentials/files | Required before live integrations |
| `NEXT_SERVER_ACTION_ALLOWED_ORIGINS` | Mobile HTTPS tunnels | `dev:mobile` sets this automatically |

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
