---
name: responsive-performance
description: Mobile-first responsive design and performance budgets for the Thind Transport website. Use when building or editing layouts, breakpoints, navigation, or any change that affects page speed, Core Web Vitals, or how pages render on phones vs desktop.
---

# Responsive & Performance Standards

Most driver applicants browse on phones (often on truck-stop Wi-Fi or weak LTE). Mobile is the primary experience; desktop is the enhancement.

## Responsive Rules

- **Mobile-first Tailwind:** write base styles for 390px, layer `md:` (768) and `lg:` (1024) up. Never write desktop-first with `max-w` overrides.
- Test at minimum: 390×844 (phone), 768×1024 (tablet), 1440×900 (desktop). The container caps at 1400px (`2xl` in `tailwind.config.ts`).
- Tap targets ≥ 44×44px. Primary CTA reachable in thumb zone (bottom 60% of phone viewport).
- Body text ≥ 16px on mobile (prevents iOS zoom on form inputs — critical for the apply flow).
- No horizontal scroll, ever. Multi-column grids collapse: 4→2→1 or 3→1.
- Sticky mobile header stays ≤ 64px tall; consider a sticky "Apply" bar on recruitment pages instead of burying the CTA.
- Tables (pay breakdowns) become stacked cards on mobile, not squeezed columns.

## Performance Budgets (per page)

| Metric | Budget |
|---|---|
| LCP (mobile, throttled) | ≤ 2.5s |
| CLS | ≤ 0.02 |
| INP | ≤ 200ms |
| JS shipped per route | no new heavy deps without justification |
| Largest image | ≤ 600KB (see media-photos-video skill) |

## How to Stay in Budget (Next.js App Router specifics)

- Default to Server Components. Add `"use client"` only where interactivity/framer-motion requires it, and push it to the smallest leaf component — not whole pages.
- `next/dynamic` for below-the-fold heavy components (carousels, PDF preview). Never dynamic-import the hero — it is a Server Component with CSS-only entrance animations on purpose (LCP must not wait for hydration).
- Fonts load via `next/font` CSS variables (`--font-sans`, `--font-display`) — no `<link>` font tags, no FOUT-causing additions.
- Reserve space for all media and embeds (explicit dimensions) — CLS regressions usually come from images, ads-style banners, or late-mounting marquees.
- Animations follow the motion-and-animation skill (transform/opacity only).

## Verification (do this before calling responsive/perf work done)

1. `npm run build` — must pass with zero TypeScript errors; check route-size table output for unexpected jumps.
2. Browser-test the changed pages at 390px and 1440px; screenshot both.
3. For perf-sensitive changes, run Lighthouse (mobile preset) on the changed route and report LCP/CLS numbers, or at minimum DevTools Performance with 4x CPU + Slow 4G throttle.
