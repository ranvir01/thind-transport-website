---
name: driver-recruitment-conversion
description: Conversion-optimization rules for Thind Transport's primary business goal - hiring CDL drivers and owner-operators. Use when editing the homepage, apply flow, pay pages, CTAs, forms, testimonials, or any change that affects how site visitors become driver applicants.
---

# Driver Recruitment Conversion

The website's #1 job: turn a visiting CDL driver into a submitted application. Every design decision is judged by "does this move a driver toward applying?"

## The Funnel (keep it intact)

```
Land (home / pay-rates / ad page)
  → See pay numbers + trust signals
  → Pre-qualify (/pre-qualify, ~60 seconds)
  → Full application (/apply, multi-step, resumable)
  → Submitted → dispatch follow-up
```

- Never add a step to this funnel without removing one elsewhere.
- Every page must have exactly one primary CTA visible per viewport: red (`orange` token) button → "Apply Now" or "Check If You Qualify". Secondary CTA: call link `tel:` from `COMPANY_INFO.phoneFormatted` — drivers in trucks call, they don't type.

## What Converts Drivers (priority order)

1. **Pay, first viewport.** Real numbers from `PAY_RATES` in `src/lib/constants.ts` (90% commission O/O, $0.63/mi company, sign-on bonuses). If a page hides pay below the fold, fix it.
2. **Home time.** Local/Regional/OTR options with explicit home-time, near the pay numbers.
3. **Proof of legitimacy.** DOT/MC numbers, FMCSA SAFER link (`FMCSA_LINKS.safer`), years in business, real fleet photos. Drivers verify carriers before applying.
4. **A human.** Owner story, dispatch team, driver testimonials with names. Reinforce the "we lift each other up" identity.
5. **Low-friction apply.** Mobile-first forms (drivers apply from phones in truck stops), big tap targets, progress indicator, phone number field early so dispatch can call even on abandoned applications.

## Form Rules (`/apply`, `/pre-qualify`, `src/components/application/`)

- Ask the minimum legally/operationally required; the DOT PDF generator fills the rest later.
- One question group per screen on mobile; show step X of Y.
- Validation errors must say how to fix, inline, next to the field (React Hook Form + Zod is already wired).
- Never lose entered data on navigation or validation failure.

## Urgency Without Sleaze

- Allowed: real scarcity ("hiring 3 OTR drivers for the Pacific Northwest lanes"), real deadlines, sign-on bonus terms.
- Banned: fake countdown timers, fake "2 people viewing", popups that interrupt reading (popups were deliberately removed — see `POPUP_REMOVAL_SUMMARY.md`).

## Measuring

After any conversion-relevant change, verify on a mobile viewport (390px) that: pay is visible without scrolling on landing pages, the red CTA is reachable with a thumb, and the apply flow completes end-to-end without console errors.
