# LoadOff Design System — DESIGN.md

The single source of truth for how the LoadOff app (`/hub`) looks, moves, and
feels. Derived from the Total Remaster master prompt (Uber Base, twenty.com,
Fleetio Go, Motive, AtoB benchmarks); adapted to this repo's real stack.
Components reference **semantic tokens only** — raw hex/px values in office
surfaces are a review defect.

## Architecture (where tokens live)

| Layer | File | Notes |
|---|---|---|
| CSS variables (3 themes × light/dark) | `src/app/hub/hub-theme.css` | Scoped to `[data-app="hauldesk"]`; dark blocks are OLED-remastered |
| Tailwind mapping | `tailwind.config.ts` | `bg-surface`, `text-fg-*`, `shadow-card/raised/overlay`, radii, motion |
| Interaction foundation | `hub-theme.css` | Press states, snap rows, skeletons, route/tab/sheet keyframes |

**Deviations from the master prompt, on purpose:**
- Tailwind v3 (repo-wide), not v4 `@theme` — same layered token model, different plumbing.
- Fonts: **Geist Sans / Geist Mono** via `next/font` (already wired, zero FOUT). Geist is the Inter-class variable font; swapping to Inter buys nothing and costs a download.
- npm, not pnpm. Gates: `npm run typecheck:gate · lint · test · build · design-qa · token-lint · license:audit`.
- Brand accent stays the LoadOff indigo family (`#5b5bd6` light / `#7f80ee` dark) with user-selectable teal/ink themes — not the hue-256 blue; tenants brand the identity chip only.

## Color

Semantic aliases (per theme × mode, see hub-theme.css):
`--bg < --surface < --surface-2` (elevation by surface, not outlines) ·
`--text/-2/-3` · `--border/--border-strong` · `--hover` ·
`--accent/-hover/-fg/-soft/-text` · tones `--green/--amber/--red/--blue` (+`-soft`).

Rules:
- Body text ≥ 4.5:1; large text and every border/icon/UI component ≥ 3:1 (WCAG 2.2 AA). `npm run design-qa` enforces contrast + overflow; disabled controls are exempt (WCAG 1.4.3).
- Tone colors are **data-only** (paid green / pending amber / overdue red) — never decoration.
- Dark mode: page near-black, cards step UP visibly, borders whisper (≤7% white), every card carries a 1px inner top highlight. Depth by surface + shadow, never outlines.
- One interactive accent (user theme). Tenant branding accent = identity chip, portal, PDFs only.

## Type

- Body font everywhere in-app; headings sentence case, hierarchy by **weight + muted color**, never size inflation. Condensed caps (`font-display`) only for 11px eyebrows and the LOADOFF wordmark.
- Money/IDs: `font-mono tabular-nums`. Big money ≈ 28–30px medium, tight tracking.
- Inputs ≥16px at touch widths (`text-base md:text-sm`) — iOS never focus-zooms.
- 11–12px uppercase is the sanctioned eyebrow/table-header/badge register; ≥13px uppercase is banned.

## Space, radius, elevation

- 4pt spacing grid (Tailwind default scale).
- Radius ladder: `rounded-control` **10px** (buttons, inputs) < `rounded-card` **14px** (cards, menus, modals) < `rounded-sheet` **20px** (large surfaces) < `rounded-pill`. Never mix radii across siblings; `rounded-xl` is banned in office surfaces.
- Elevation ladder (all layered, never a single flat drop): `shadow-card` (resting) < `shadow-raised` (menus/popovers) < `shadow-overlay` (sheets/dialogs). Dark variants add the inner top highlight.

## Motion

Durations: `fast` 120ms (press/hover/toggle) · `standard` 220ms (dropdowns/tabs/toasts) · `slow` 320ms (sheets/pages).
Curves: `ease-standard` cubic-bezier(.2,0,0,1) · `ease-decelerate` (.05,.7,.1,1) enter · `ease-accelerate` (.3,0,.8,.15) exit · `ease-entrance` (.16,1,.3,1) spring.
- Compositor props only (transform/opacity). Never animate height/top/width.
- Page: `.hub-route-enter` (260ms rise) via `(office)/template.tsx`. Lists: `.hub-stagger` (30ms/item, first paint only, cap 8). Tab bar: `.hub-tab-pop` spring. Sheets: `.hub-sheet-content`. Success: `.hub-check-draw`. Milestones: firsts only, off-switch in avatar menu.
- Press: global `active:scale(0.97)+opacity` on every tappable (`touch-action: manipulation` + the passive touchstart enabler for iOS); buttons add `.press-sink` (translateY 1px + inset shadow).
- `prefers-reduced-motion`: globals collapse all animation to 0.01ms; demo auto-advance still runs (a slideshow timer is not motion).

## Components (all states required)

Every interactive component implements: default · hover · active/press · focus-visible (2px `--ring`) · disabled · loading · error · empty.

- **Button** (`components/hub/ui.tsx`): sizes sm 32 / md 40 / lg 48 / xl 56 (48+ on primary mobile actions; the global mobile rule enforces 44px minimum everywhere). Variants: primary (accent, shadow) · secondary (surface + strong border) · ghost · danger (white text) · link. `loading` swaps label for a spinner **preserving width**.
- **Inputs**: `fieldCls` (+`fieldErrorCls` for danger border/ring + helper line).
- **Panels/cards**: `Panel` — surface, card radius, `shadow-card`. Empty states: `EmptyState` — dashed border, real icon, hint, CTA. Never a bare "—".
- **Tables**: `.hub-table` = sticky header, zebra (`surface-2` at 45%), hover row. Mobile: card lists, not squeezed tables.
- **Sheets**: `BottomSheet` — grab handle, safe-area, overscroll-contain, focus-trapped (Radix); centered card on md+.
- **Toasts**: sonner + `.app-toast` (surface/border/raised, 14px radius).
- **Nav**: header 56px+safe-area with shadow-on-scroll; sidebar active = filled pill + popping accent rail; mobile tab bar = 5 icons+labels, 56px+safe-area, active springs; sub-nav = quiet text + one active chip, snap row with edge fades.
- **Skeletons**: `.hub-skeleton` shimmer; `loading.tsx` mirrors real layout (zero CLS). Spinners only inside buttons.

## Anti-pattern blacklist (review-blocking)

Flat outline-only cards · sub-3:1 borders/icons · default browser blue ·
`outline: none` without replacement · hover-only affordances · single flat
drop shadows · >300ms animations on frequent interactions · mixed sibling
radii · icon/label misalignment · spinner-instead-of-skeleton · empty states
without a CTA · uppercase display-font headlines · raw hex/px in office
surfaces · lorem ipsum seed data · layout shift from late assets.

## Verification

`npm run build` · `npx vitest run` · `node scripts/typecheck-gate.mjs` ·
`npm run token-lint` · `DESIGN_QA_HUB=1 npm run design-qa` (0 hard failures)
· `npm run license:audit` — plus a 390px light **and dark** screenshot sweep,
viewed and critiqued against this file, before every ship.

Roadmap (tracked in session tasks): `/hub/sandbox` multi-role sandbox at
master-prompt seed volumes; axe integration into design-qa; 6-viewport
light/dark matrix; Lighthouse thresholds. Human-blocked items live in
`loadoff-worksheet.html`.
