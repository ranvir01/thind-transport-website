# Design-QA routines — the loop that catches what eyes miss

The recurring problem: an agent editing markup **cannot see rendered pixels**, so
contrast bugs (dark text on a dark card), horizontal overflow, invisible form
labels, and sub-44px tap targets keep shipping. These are all *machine-checkable*
from the live DOM + computed styles. `scripts/design-qa.mjs` is that machine, and
this doc is the standing prompt-set for the scheduled agents that run it on a loop
across the **website and the software (hub)**, at **phone, tablet, and desktop**
widths, and fix what it finds.

Owner intent (2026-07): *"check all pages/sections, keep looping to fix and improve
… issues you're not good at fixing, so routines should help — and issues exist all
over the software and website. Remember mobile + desktop + all device types."*

---

## The tool

```bash
npm run design-qa                    # all public marketing routes × 3 viewports
npm run design-qa /loadoff /apply    # specific routes
DESIGN_QA_HUB=1 npm run design-qa    # ALSO audit the hub (software) — needs demo login
```

Prereqs: the app running (`npm run dev`, or `npm run build && npm run start`) and,
for `DESIGN_QA_HUB=1`, Postgres seeded (`npm run db:migrate && npm run seed:demo`).
It reuses `scripts/e2e-lib.mjs`, so it runs on the same rigs as the e2e smokes
(Chromium at `/opt/pw-browsers/chromium`).

What it checks, per route × viewport (390 / 768 / 1440):

- **Contrast (hard fail)** — every visible text run's color vs its *effective,
  alpha-composited* background, scored against WCAG 2.1 AA (4.5:1 normal, 3:1 for
  large text ≥24px or ≥18.66px-bold). Text over a gradient/image background is
  *skipped* (unassessable), never falsely failed — the reliable path only fails on
  solid backgrounds.
- **Horizontal overflow (hard fail)** — elements crossing the viewport's right edge.
- **Tap targets (warn, mobile)** — links/buttons/inputs under 44×44 CSS px.
- **Images missing alt (warn)**.

Exit code is non-zero on any hard fail. Full JSON lands in `.design-qa/report.json`
(gitignored). **Green baseline as of this writing: 0 hard failures across all
public routes.** Keep it there.

---

## Systemic root-causes catalog

Fix *roots*, not symptoms. Every failure this project has hit traced to one of
these. When the auditor flags something, match it here first.

1. **twMerge dropped the color** *(fixed at root in `src/lib/utils.ts`)* — the
   custom font-size utilities (`text-label`, `text-h1`, `text-body`, …) collided
   with `text-<color>` in tailwind-merge, silently stripping the color off every
   `Label`, `CardTitle`, `CardDescription`. `cn()` now registers them via
   `extendTailwindMerge`. **If you add a new `text-<name>` font-size in
   `tailwind.config.ts`, add it to `FONT_SIZE_TOKENS` in `utils.ts` too**, or its
   color will vanish again.

2. **Dark-theme defaults inherited onto light surfaces.** `body { color: #e8edf2 }`
   and `p, ul, ol { color: var(--brand-copy) /* #9ca8b6 */ }` make the site light
   text by default (it's a dark theme). Any element with **no explicit color** on a
   light card/section inherits near-white and vanishes. Fix: give text on light
   surfaces an explicit dark color. The global `strong` color was removed for the
   same reason — `strong` now inherits.

3. **The dark-default `Card`.** `<Card>` defaults to a dark glass variant
   (`text-white` on a dark gradient). A page that fills it with `text-gray-900` /
   `text-gray-600` (as a normal white card) gets **dark-on-dark**. Fix:
   `<Card variant="light">` for any card meant to be white. (This was the original
   `/loadoff` and `/schedule-meeting` bug.)

4. **`.brand-page-shell` force-dark shim** *(fragile — watch it)* — a 173-line
   block in `globals.css` that coerces 9 pages (home, about, pay-rates, apply,
   benefits, testimonials, resources, fleet, routes) to dark by overriding light
   utilities: `.bg-*-50`/`.bg-white` → dark navy, and an **enumerated** list of
   dark text utilities → light. Colored text NOT in that list (`text-red-800`,
   `text-green-600`, …) stays dark → dark-on-dark. Two ways to fix a flagged
   element on these pages: (a) use a light color token the shim leaves alone
   (`text-red-200` etc.), or (b) add the missing utility to the shim's flip list.
   Prefer (a) locally. A future cleanup is to retire this shim in favor of pages
   that are honestly light or honestly dark — but that's a big, careful change.

5. **The brand-red duality.** `#E0392F` (`orange` / `orange-500`) is mid-luminance:
   it fails AA *both* ways for small text — ~4.2:1 as red text on dark, ~4.4:1 as
   white text on a red fill. There is no single value that passes both. Use:
   - **red TEXT on dark** → `text-orange-400` (#EC5A50) — e.g. eyebrows, breadcrumb
     category, nav active state.
   - **red TEXT on light** → `text-orange-700`.
   - **white text on a red FILL** (buttons, badges, table headers) → `bg-orange-600`
     (#C42820, ~5.5:1). This is already the canonical CTA red (homepage hero uses
     it). `bg-orange` / `bg-orange-500` fills were swapped to `bg-orange-600`.
   - Large text (≥24px, or ≥18.66px bold) only needs 3:1, so hero headlines using
     `text-orange` are fine — don't "fix" those.

6. **Off-brand green/blue at wrong shades.** `bg-green-600` / `text-green-600` fail
   white-on / on-white at 3.3:1 → use `-700`. Off-brand blues/purples (`bg-blue-600`,
   `!bg-purple-600`) violate the graphite/white/red brand *and* often fail contrast
   → recolor to `navy` (graphite), `orange-600` (red), or `green-700`.

7. **Component-level invisible text** — `SelectTrigger` had no base text color
   (`placeholder:text-gray-500` only styles native `::placeholder`, not Radix's
   span), so selects showed near-white text/placeholder on light forms. Fixed with
   `text-gray-900` + `data-[placeholder]:text-gray-500`. When a *component* is the
   culprit, fix the component, not each usage.

---

## Routine A — the standing design-QA sweep (scheduled agent)

Paste this as a recurring Claude/Cowork routine. Cadence: a few times a day is
plenty; it's cheap and idempotent.

> **You are the Design-QA agent for the Thind Transport site + LoadOff software.**
> Your job: keep the rendered UI legible and on-brand on every device, forever.
>
> 1. Boot the rig: start Postgres if down (`service postgresql start`), then
>    `npm run dev` and wait for `http://localhost:3000` to answer 200. For hub
>    coverage also run `npm run db:migrate && npm run seed:demo`.
> 2. Run `npm run design-qa` (public site) and `DESIGN_QA_HUB=1 npm run design-qa`
>    (software). Read `.design-qa/report.json`.
> 3. For each **hard failure**, open the flagged file, match it to a root-cause in
>    `docs/design-qa-routines.md` §"Systemic root-causes catalog", and fix at the
>    **root** (component or token) when the same pattern repeats — never
>    element-by-element if one component fix covers many. Preserve the brand:
>    graphite (`navy`), white, red (`orange` scale). Never reintroduce blue-tinted
>    darks or off-brand blue/purple.
> 4. Re-run `npm run design-qa` until **0 hard failures**. Then `npm run build` and
>    `npx vitest run` must both be green.
> 5. Triage **warnings**: fix real ones (a genuine sub-44px primary button, a
>    content image with no alt). Leave gradient/photo "approx-bg" warnings unless
>    you can confirm a real problem — they're advisory by design.
> 6. Commit with a clear message + a `Backlog:` trailer noting anything deferred,
>    author `Claude <noreply@anthropic.com>`. **Deploy discipline: push `main`
>    first and alone** (see `docs/claude-routines.md` §"Deploy discipline"), then
>    fast-forward the integrator branch.
> 7. If you touched a shared component (`Card`, `Label`, `Button`, `select.tsx`,
>    `PageHero`, `Navbar`, `Footer`, `PageBreadcrumb`) or `globals.css`/
>    `tailwind.config.ts`, re-run the FULL sweep — shared changes ripple.
>
> Guardrails: do not change the brand red's identity (`#E0392F` stays the brand
> color); adjust *usage shade* per §5 instead. Do not rip out `.brand-page-shell`
> in a routine run — flag it in `Backlog:` if it's causing repeated pain. Money/
> auth/tenant code is out of scope for this routine.

## Routine B — device-matrix pass (widen coverage)

Same as A, but explicitly extend `VIEWPORTS`/route lists over time so coverage
grows. Real device classes to keep represented: small phone (360–390), large phone
(414–430), tablet portrait (768) and landscape (1024), laptop (1280–1440), wide
(1920). Add any route that ships (new marketing pages, new hub screens) to the
`PUBLIC_ROUTES` / `HUB_ROUTES` arrays in `scripts/design-qa.mjs`. A page not in the
list is a page not being checked.

## Routine C — hub (software) deep pass

`DESIGN_QA_HUB=1` logs in as `owner@demo.thind` and audits the office screens. The
hub keeps its own indigo product brand (intentionally different from the marketing
graphite/red) — respect it; only fix contrast/overflow/tap, not brand. Extend
`HUB_ROUTES` to cover dispatch, loads, invoices, settlements, fleet, compliance,
leads, settings, and the driver PWA (`/driver/*`). Log in as other demo roles
(`dispatcher@`, `driver@`) to reach role-specific screens.

---

## Routine D — showcase enhancement with self-critique (for `/loadoff`, `/schedule-meeting`, and other reviewer-facing pages)

The owner asked for a *"prompt to do this and feedback to yourself for final
execution."* Use this two-pass structure whenever polishing a page a fellowship
reviewer will judge:

**Pass 1 — draft the intent.** Write down, for the target page: who's looking
(technical reviewers), what one impression it must leave, what's *noise* vs.
*signal*. Draft the changes.

**Pass 2 — critique your own draft before executing**, against this checklist:
- **Legible?** Run `npm run design-qa <route>` — 0 hard fails, at all 3 widths.
- **On-brand?** Graphite/white/red only on marketing. No stray blue/purple. Red
  used at the correct shade per root-cause §5.
- **Every element earns its place?** Remove decorative distraction (pulsing dots,
  redundant bars, marquees). Signal over motion.
- **Content true + consistent?** Numbers match across the page (e.g. the test count
  is the same everywhere). No marketing inflation a reviewer can catch.
- **Product-first?** For `/loadoff`, the real product screenshot/video is the pitch,
  not an illustration. For `/schedule-meeting`, the form is calm, labels legible,
  inputs consistent, one clear primary action.
- **Mobile-first?** Check the 390px screenshot, not just desktop.

Only after the self-critique passes do you execute + commit. This is exactly the
loop that fixed the two pages the owner screenshotted: dark-on-dark cards → white
cards; invisible form labels → dark labels (root twMerge fix); off-brand blue chart
→ graphite; 700+/1,400+ test-count mismatch → consistent.

---

## Guardrails (all routines)

- **Brand is fixed:** marketing = graphite (`navy` scale) + white + red (`orange`
  scale). Hub = its own indigo. Never swap the brand red's identity; change usage
  shade per the catalog.
- **Deploy discipline:** `main` first and alone, then integrator. See
  `docs/claude-routines.md`.
- **Verify before commit:** `npm run design-qa` green + `npm run build` green +
  `npx vitest run` green. No exceptions.
- **Scope:** UI legibility/brand/overflow/tap only. Not money, auth, or tenancy.
