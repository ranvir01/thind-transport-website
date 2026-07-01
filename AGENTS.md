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

HaulDesk uses three languages with fixed boundaries (see `docs/architecture/trilingual-stack.md`):

| Language | Role |
|----------|------|
| **TypeScript** | Next.js `/hub/*` — UI, auth, Postgres, server actions; remains the V1 API gateway on Vercel |
| **Go** | `services/go/hauldesk-worker` — long-running workers, sync, HTTP proxies (`HAULDESK_GO_WORKER_URL`) |
| **Rust** | `services/rust/hauldesk-compute` — IFTA math, routing compute, bulk import (`HAULDESK_RUST_COMPUTE_URL`) |

Sidecars are optional: when env vars are unset, `src/lib/hub/sidecars.ts` falls back to pure TS. Do not add microservices beyond one Go + one Rust binary at V1 scale.
