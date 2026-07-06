# AGENTS.md — Thind Transport Website

Driver-recruitment website for Thind Transport (trucking carrier, Kent WA). Primary business goal: convert visiting CDL drivers into submitted applications. Stack: Next.js 16 App Router, React 19, TypeScript, Tailwind, NextAuth v5, Vercel Postgres.

## Skills (in `.cursor/skills/` — read the relevant one before working)

| Skill | Use when |
|---|---|
| `thind-brand-identity` | Any UI, copy, design, color, typography, or logo work. |
| `driver-recruitment-conversion` | Homepage, apply/pre-qualify flow, pay pages, CTAs, testimonials — anything affecting conversion. |
| `motion-and-animation` | Adding/editing animations, scroll effects, hover states, heroes. |
| `media-photos-video` | Adding, generating, replacing, or rendering images and video. |
| `responsive-performance` | Layout/breakpoint work or anything affecting page speed and Core Web Vitals. |
| `dev-workflow-testing` | Environment setup, running/building the site, debugging auth/DB, and the pre-commit checklist. |

For any visual or page change, `thind-brand-identity` + `responsive-performance` always apply; finish with the `dev-workflow-testing` checklist.

## Non-negotiables

- `npm run build` must pass before committing.
- Company facts (phone, pay rates, stats) come from `src/lib/constants.ts` only.
- Mobile-first: verify changed pages at 390px width.
- No new heavy dependencies, popups, or gimmick animations.

Setup guides live in `docs/` (database, deployment, email, driver onboarding).

## Language stack — TypeScript (app), Go (workers), Rust (compute)

LoadOff uses three languages with fixed boundaries (see `docs/architecture/trilingual-stack.md`):

| Language | Role |
|----------|------|
| **TypeScript** | Next.js `/hub/*` — UI, auth, Postgres, server actions; remains the V1 API gateway on Vercel |
| **Go** | `services/go/hauldesk-worker` — long-running workers, sync, HTTP proxies (`HAULDESK_GO_WORKER_URL`) |
| **Rust** | `services/rust/hauldesk-compute` — IFTA math, routing compute, bulk import (`HAULDESK_RUST_COMPUTE_URL`) |

Sidecars are optional: when env vars are unset, `src/lib/hub/sidecars.ts` falls back to pure TS. Do not add microservices beyond one Go + one Rust binary at V1 scale.

## LoadOff hub — standing rules (learned in production, do not regress)

- **Money is integer cents** everywhere; user input goes through `dollarsToCents`; rounding via
  `roundHalfAwayFromZero`.
- **Permissions are enforced in server actions** (`requirePermission` in `src/app/hub/_actions/*`),
  never UI-only. Money-adjacent mutations are audited via `logAudit`.
- **Every query is carrier-scoped** (`carrier_id = $1`) — cross-table writes must guard tenancy on
  BOTH sides (see `assignFuelToLoad`).
- **No mode-dependent tokens on forced-dark surfaces**: `/hub/driver/*` and `/hub/portal/*` never use
  `text-fg*`, `bg-surface*`, `border-border*` — they use `text-white` / `text-steel-*` / `bg-navy-*` /
  `border-white/*`. (The fg tokens resolve to light-mode values there and made text invisible.)
- **Office screens use only semantic tokens**: `accent-text` for money/links, `warn`/`warn-soft` for
  needs-attention, `bad` for red, surface/border/fg scales for the rest. No `gold`/`navy`/`steel` in
  `(office)` routes.
- **Never `bg-surface/95`-style opacity modifiers on CSS-var colors** — Tailwind drops the class silently.
- **Rust/TS golden parity**: any change to `ifta.test.ts` fixtures must update
  `services/rust/hauldesk-compute` tests in the same commit (`npm run test:sidecars`).
- **Migrations**: append-only `migrations/hub/NNN_*.sql`, idempotent (`IF NOT EXISTS`), applied via
  `npm run db:migrate`; production readiness is checked with `npm run go-live:check`.

## The improvement loop (how this codebase self-improves)

Every change, agent or human, walks the same loop — see `docs/agent-improvement-loop.md` for the
full playbook and ready-made prompts:

1. **Sync** — `git pull`; read the newest commits before assuming anything. Run `npm run agent:branches`
   if you pushed to a session branch (`claude/<random>`) — integrator picks it up hourly.
2. **Pick** — take the top item from the backlog section of the latest brief/commit, or run a debug
   sweep to find one.
3. **Build** — smallest change that ships value; follow the standing rules above.
4. **Verify** — `npm run build` + `npx vitest run` (+ `npm run test:sidecars` if Go/Rust touched)
   + visual check of changed screens (local Postgres: `npm run db:migrate && npm run seed:demo`,
   then drive the real UI — demo logins in `scripts/seed-demo.mjs`).
5. **Ship** — commit with a one-line why, push, merge to `main` (Vercel deploys `main`). Background
   fleet automations (`.cursor/automation/README.md`) handle integrator → main drain and prod smoke.
6. **Record** — end the commit body or PR with a `Backlog:` list of follow-ups you saw but didn't
   take; the next agent starts there. Never leave discovered defects unrecorded.

## Integrations doctrine (everything-app track)

- `src/lib/hub/integrations/registry.ts` is the ONLY provider list — cards, credential
  allowlists, cron jobs, and webhook routing all derive from it.
- **Stub-first**: every adapter ships complete against `integrations/mock.ts` + the contract
  suite (`integration-contract.test.ts`) BEFORE vendor credentials exist. Pasting keys is
  activation, not development.
- Adapters implement `SyncSource`, land data in the same tables as CSV imports via
  `ON CONFLICT (carrier_id, source, external_id)`, and write a `hub.integration_syncs`
  row on EVERY run. The CSV/manual fallback is never removed.
- Inbound pushes go through `/api/hub/webhooks/[provider]` only — HMAC-verified against the
  carrier's encrypted `webhookSecret`; unsigned requests store nothing.
- Never log credential values (field names only). New provider = registry entry + adapter +
  docs page + shopping-list row, one commit each.
