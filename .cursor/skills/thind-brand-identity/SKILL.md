---
name: thind-brand-identity
description: Defines Thind Transport's brand identity - colors, typography, logo usage, voice, and messaging pillars. Use when designing or editing any UI, page, component, copy, image, or marketing material on the website, or when asked about branding, colors, fonts, tone, or company identity.
---

# Thind Transport Brand Identity

Family-owned trucking carrier in Kent, WA (founded 2014, DOT 2523064, MC 876103, owner Sukhdev Thind). The brand exists to feel **connected** — drivers, dispatch, and office lifting each other up to hit their goals. Not a faceless mega-carrier.

## Identity Pillars (every page must express at least one)

1. **We know your name** — small fleet, direct line to the owner, 24/7 dispatch that answers.
2. **Transparent money** — pay rates, percentages, and bonuses shown as real numbers, never "call for details."
3. **Mutual growth** — drivers grow, the company grows. Copy frames hiring as partnership, not recruitment.
4. **Professional, not corporate** — polished and trustworthy, but warm. Plainspoken English over jargon.

## Color System (already in `tailwind.config.ts` — use tokens, never raw hex)

| Token | Hex | Role |
|---|---|---|
| `navy` | #0E1621 | Primary background, authority. Site is dark-theme-first. |
| `orange` (Signal Red) | #E0392F | CTAs and action only. One red CTA per viewport. |
| `gold` | #F2A900 | Stats, ratings, highlights. Pairs with red; never use as a CTA. |
| `steel` | #A7B0BD | Secondary text, borders, industrial accents. |

Rules:
- Body text on navy: `steel-100`/`steel-200`, never pure white for paragraphs (headings may be white).
- Verify WCAG AA contrast (4.5:1 body, 3:1 large text). Past commits fixed contrast regressions — do not reintroduce.
- Light sections use the existing `data-light` system in `globals.css`; do not invent new light-mode colors.

## Typography (tokens in `tailwind.config.ts`)

- Display/headlines: `font-display` with `display-*` sizes (condensed, heavy — trucking grit).
- Body: `font-sans` with `body*` sizes; minimum 16px body on mobile.
- Headlines are short, declarative, benefit-first: "Get Paid What You're Worth." Avoid exclamation marks.

## Logo & Assets

- Logos: `public/branding/thind-transport-logo.svg` (dark bg → use `-white` variant), icon: `thind-transport-icon.svg`.
- Tagline asset: `tagline-the-truck-rolls.svg` — tagline is "The Truck Rolls."
- Never stretch, recolor, or add effects to logos. Min clear space = height of the icon mark.

## Voice & Copy Rules

- Second person, present tense: "You drive. We handle the rest."
- Numbers beat adjectives: "91% payout" not "industry-leading pay" (use both only when the number leads).
- Company facts come from `src/lib/constants.ts` (`COMPANY_INFO`, `STATS`, `PAY_RATES`) — never hardcode phone numbers, rates, or stats in components.
- Banned phrases: "synergy", "best-in-class", "world-class", "revolutionary", excessive trucker slang.
