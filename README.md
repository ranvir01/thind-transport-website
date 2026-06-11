# Thind Transport — Driver Recruitment Website

Marketing and driver-recruitment site for [Thind Transport](https://thindtransport.com), a family-run trucking company in Kent, WA. Built with Next.js (App Router), TypeScript, and Tailwind CSS.

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

## What's here

- **Marketing pages** — home, apply, pay rates, routes, fleet, benefits, about, testimonials, veterans, resources, fuel program, load-board preview, privacy.
- **Lead capture** — multi-step application form, pre-qualification wizard, earnings calculator with email-an-estimate, meeting scheduler. All deliver via SMTP (server actions / API routes).
- **Driver portal** (`/driver/*`) — registration with invitation code, login (NextAuth v5 credentials), multi-step DOT application wizard with PDF generation (`pdf-lib`), upload to HR via email.
- **HaulDesk** (`/hub/*`) — the multi-tenant operations product (dispatch, money, fuel + IFTA, compliance, driver tools) for small and mid-size carriers. Thind Transport is tenant #1. See `docs/tms-master-prompt.md` (build plan) and `docs/demo-script.md` (demo accounts + walkthrough). Setup: `npm run db:migrate`, optional `npm run seed:demo`.
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
