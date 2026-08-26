# Getting started — run LoadOff locally in 10 minutes

**New here?** Start at **[`docs/START-HERE.md`](START-HERE.md)** — HaulDesk’s default state is a labeled SIMULATION of Thind + ATS, with `npm run sim:seed` and one `go-legit` switch. This page is the longer environment checklist.


The marketing site (thindtransport.com) and the LoadOff TMS (`/hub`) live in one
Next.js app. This gets both running on your machine with demo data.

## 1. Prerequisites

- **Node 20+** (`node -v`)
- **Postgres 16** — either Docker (easiest) or a local install

## 2. Install

```bash
npm install
```

## 3. Database

**With Docker (easiest):**

```bash
docker compose up -d          # Postgres on :5432, Adminer on :8081
```

**Or with a local Postgres install:**

```bash
service postgresql start      # or: brew services start postgresql@16
psql -U postgres -c "CREATE ROLE hauldesk LOGIN PASSWORD 'hauldesk' SUPERUSER;"
psql -U postgres -c "CREATE DATABASE hauldesk OWNER hauldesk;"
```

## 4. Environment

Copy the example and fill in the two values that matter locally:

```bash
cp .env.example .env.local
```

```bash
POSTGRES_URL="postgresql://hauldesk:hauldesk@localhost:5432/hauldesk"
NEXTAUTH_SECRET="any-long-random-string-for-local-dev"
NEXTAUTH_URL="http://localhost:3000"
CREDENTIALS_KEY="any-32-plus-character-string-for-local"   # encrypts integration creds
```

Everything else (SMTP, Mapbox, fuel-card keys) is optional locally — the app
degrades gracefully when a key is missing. `npm run connections:check` prints
exactly what is and isn't configured.

## 5. Migrate + seed

```bash
npm run db:migrate            # applies migrations/hub/*.sql in order
npm run seed:demo             # demo carrier, loads, drivers, invoices
```

## 6. Run

```bash
npm run dev                   # http://localhost:3000
```

- Marketing site → http://localhost:3000
- LoadOff → http://localhost:3000/hub

### Demo logins

All use password **`ThindDemo1!`**:

| Email | Role |
|---|---|
| `owner@demo.thind` | Owner — sees everything |
| `dispatch@demo.thind` | Dispatcher |
| `accounting@demo.thind` | Accounting |
| `driver@demo.thind` | Driver (phone app at `/driver`) |
| `broker@demo.thind` | Broker portal |
| `shipper@demo.thind` | Shipper portal |

> Demo accounts are disabled in production by `HUB_DEMO_LOGIN=false`.

## 7. Verify your setup

```bash
npm run build                 # zero TypeScript errors
npm test                      # full vitest suite
npm run design-qa             # contrast/overflow/tap-target audit (needs the dev server running)
npm run connections:check     # which integrations + env keys are live
```

## Handy scripts

| Command | What it does |
|---|---|
| `npm run db:migrate` | Apply new migrations |
| `npm run seed:demo` | Reset demo data to a known state |
| `npm run design-qa` | Audit rendered pages for contrast/overflow/tap targets |
| `DESIGN_QA_HUB=1 npm run design-qa` | Include the hub screens (needs demo login) |
| `npm run connections:check` | Env + integration readiness table |
| `npm run go-live:check` | Production readiness gates |
| `node scripts/e2e-run-all.mjs` | Full Puppeteer smoke battery |

## Troubleshooting

**"Cannot find package 'pg'"** — `npm install` aborted partway. On a fresh Linux
box run `npm run setup:canvas-deps` first (the `canvas` dev dependency needs
system pangocairo headers), then `npm install` again.

**Login 401s with `MissingSecret`** — `NEXTAUTH_SECRET` isn't set in `.env.local`.

**Integrations screen says "Set CREDENTIALS_KEY first"** — add `CREDENTIALS_KEY`
(any 32+ characters) to `.env.local`.

**Port 3000 already in use** — `fuser -k 3000/tcp` then `npm run dev`.

**Postgres connection refused** — the server isn't running: `docker compose up -d`
or `service postgresql start`.

## Where things live

```
src/app/                 marketing pages (/, /apply, /loadoff, /shippers, /cdl-jobs/*)
src/app/hub/(office)/    LoadOff office app (Today, loads, dispatch, money, outreach…)
src/app/hub/driver/      driver PWA
src/lib/hub/             domain logic (money in integer cents, carrier-scoped queries)
migrations/hub/          SQL migrations, applied in filename order
scripts/                 migrate, seed, e2e smokes, design-qa auditor
docs/                    this guide, routines, outreach, go-live requirements
```
