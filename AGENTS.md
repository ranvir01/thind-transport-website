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

Additional history and debugging notes: `AI_AGENT_INSTRUCTIONS.md`, `DOCUMENTATION.md`.
