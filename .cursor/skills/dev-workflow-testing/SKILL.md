---
name: dev-workflow-testing
description: How to run, build, test, and safely change the Thind Transport Next.js codebase - commands, environment gotchas, auth/database pitfalls, and the pre-commit verification checklist. Use when setting up the dev environment, running the site locally, debugging build or login failures, or before committing any code change.
---

# Dev Workflow & Testing

Stack: Next.js 16 App Router, React 19, TypeScript, Tailwind 3.4, shadcn/Radix UI, NextAuth v5, Vercel Postgres, deployed on Vercel (`thindtransport.com`).

## Commands

```bash
npm install                    # node >= 20 required (repo was built against 20/22)
npm run dev                    # localhost:3000
npm run build                  # also the TypeScript check — must pass before any commit
npm run lint                   # ESLint 9 flat config (eslint.config.mjs)
npm run generate:brand-assets  # regenerate favicons + og-image from the brand system
```

## Linux native deps (canvas)

The devDependency `canvas` (used by `scripts/extract-pdf-pages.mjs`) compiles native bindings.
On Debian/Ubuntu — including Cursor Cloud Agent containers — install system libraries **before**
`npm ci` / `npm install` or the build fails with missing `pango` / `gif` headers:

```bash
sudo apt-get update
sudo apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
```

macOS: `brew install pkg-config cairo pango libpng jpeg giflib librsvg`. The Next.js app itself
aliases `canvas` to `false` in `next.config.mjs`; only local scripts need the native module.

## Local email testing

Run `npx maildev --smtp 1025 --web 1080`, then set `SMTP_HOST=localhost` and `SMTP_PORT=1025` in `.env.local`. Every email the site sends (applications, portal confirmations, password resets) appears at `http://localhost:1080` — no real Gmail needed.

## Environment

- Copy `.env.example` → `.env.local` (it documents every variable: SMTP, NEXTAUTH, POSTGRES_URL, DRIVER_INVITATION_CODE, SETUP_DB_TOKEN). Without Postgres credentials, public pages still render; only driver-portal/auth/database features fail — don't mistake that for broken code.
- **Hub login requires a session secret.** Set `NEXTAUTH_SECRET` (or Auth.js v5's `AUTH_SECRET`) in `.env.local` — generate with `openssl rand -base64 32`. If it is blank, `/hub/login` redirects to `/api/auth/error` with Auth.js `MissingSecret`; public marketing pages still work.
- Never commit secrets. Production env lives in Vercel. `vercel-env*.txt` is gitignored for a reason — a real password was once committed in one.
- **The legacy `/driver/register` + `/driver/login` portal** (pre-Hub, `src/lib/driver-db-postgres.ts`) reads/writes `drivers`/`applications`/`public_applications` tables that `npm run db:migrate` does **not** create — those come from `setupDatabase()` (`src/lib/db-setup.ts`), exposed at `GET /api/setup-db` and gated by `SETUP_DB_TOKEN`. Set `SETUP_DB_TOKEN` in `.env.local` and hit that endpoint once before exercising this flow locally, or registration 500s with `relation "drivers" does not exist`.

## Key Map

| Concern | Files |
|---|---|
| Company info, pay rates, stats (single source of truth) | `src/lib/constants.ts` |
| Public pages | `src/app/page.tsx`, `about`, `pay-rates`, `apply`, `pre-qualify`, `fleet`, etc. |
| Homepage sections | `src/components/home/`, `src/components/cinematic/` |
| Public apply form / pre-qualify | `src/components/application/` |
| Driver portal DOT application steps | `src/components/driver-form/` |
| Auth | `src/app/api/auth/[...nextauth]/route.ts`, `src/proxy.ts` (route protection — Next 16 proxy convention, replaces middleware.ts) |
| DB layer | `src/lib/driver-db.ts`, `src/lib/driver-db-postgres.ts` |

## Known Pitfalls (cost real debugging sessions)

1. **NextAuth v5 cookie** is `authjs.session-token` (prod: `__Secure-authjs.session-token`), not `next-auth.*`. `src/proxy.ts` must match.
2. **`trustHost: true`** required in NextAuth config for Vercel, and `NEXTAUTH_URL=https://thindtransport.com` in prod.
3. **Postgres returns snake_case**, TypeScript uses camelCase. Handle both: `driver.firstName || driver.first_name`.
4. Zod schemas must stay in sync with React Hook Form fields or steps silently refuse to advance.
5. **Blank `NEXTAUTH_SECRET` / `AUTH_SECRET`** breaks hub login only (`MissingSecret` on `/api/auth/error`); marketing pages and `/apply` still render. `src/proxy.ts` reads `NEXTAUTH_SECRET ?? AUTH_SECRET` — set at least one in `.env.local` before E2E or Playwright hub drives.
6. **Don't copy `.env.example`'s placeholder `SMTP_USER`/`SMTP_PASS` verbatim into `.env.local`.** `isEmailConfigured()` (`src/lib/mailer.ts`) only checks that both are non-empty, so the literal placeholders (`your-gmail@gmail.com` / `your-16-character-app-password`) read as "configured" and every send (customer statements, settlement/invoice emails) tries a real SMTP auth against `smtp.gmail.com` and hangs for the full connection timeout before failing, instead of hitting the graceful "email not configured" toast path. Leave both blank (or point at local maildev) for local rig / E2E runs.
7. **`/driver/*` (legacy driver portal) uses `@vercel/postgres`** (`src/lib/driver-db-postgres.ts`), Neon's HTTP-fetch driver — pointing `POSTGRES_URL` at a plain local/self-hosted Postgres makes it 500 with `fetch failed / ECONNREFUSED 127.0.0.1:443` on register and login. `/hub/*` is unaffected — it uses `pg` directly. For local `/driver/*` testing either leave `POSTGRES_URL` unset (falls back to local JSON files, per `.env.example`) or point it at a real Neon/Vercel Postgres endpoint. Prefer `GET /api/setup-db` when you do want Postgres-backed legacy tables locally.

## Pre-Commit Checklist

- [ ] `npm run build` passes (zero TS errors).
- [ ] Changed pages manually loaded at mobile (390px) and desktop (1440px) widths; no console errors.
- [ ] If forms touched: complete the flow end-to-end (pre-qualify and/or apply through all steps).
- [ ] If auth/DB touched: test login in an incognito window.
- [ ] New images/videos meet budgets in the media-photos-video skill.
- [ ] Company facts pulled from `constants.ts`, not hardcoded.
- [ ] No fabricated claims (ratings, review counts, percentages) — every public number must be verifiable.

Deploy: push to `main` → Vercel auto-deploys. Verify on production after deploy (especially login and the apply flow).
