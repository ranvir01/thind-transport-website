# HaulDesk UI polish — Cursor integration note

**Patch:** `hauldesk-ui-polish.diff` · applies on `main` @ `55ec41d` · 3 files, +13/−13.
**Apply:** `git apply hauldesk-ui-polish.diff` (or `git apply --3way` if main has moved). Build verified green.

## What this patch fixes (the spec-mandated "no marketing gold in the hub" cleanup)
Replaces leftover marketing **gold/orange** colors with the calm semantic tokens from HANDOFF §1, on the
screens you reviewed:

- **Today** (`(office)/page.tsx`): section icons (Due today, Trucks needing freight, Money you haven't
  invoiced, Tasks) `text-gold` → `text-accent-text`; "Driver hasn't confirmed" + empty-truck "now" →
  `text-warn`/`bad` tokens; the gold "empty today/tomorrow" pill → `warn-soft`; the unbilled card's gold
  border → `border-accent/30`; the "backhaul ideas" and "open incidents" links → `text-accent-text`/`text-warn`.
- **Dispatch** (`(office)/dispatch/page.tsx`): the HOS-warning and weather-alert chips on load cards
  `bg-gold/10 … text-gold` → `bg-warn-soft … text-warn`.
- **Money** (`(office)/money/page.tsx`): AR-aging bucket labels now use `text-warn`/`text-bad` tokens
  **and mute to `text-fg-3` when the bucket is $0** (no more amber/red labels on empty buckets).

Net effect: the hub reads as the calm indigo system the design spec calls for, with semantic amber/red
reserved for real warnings.

## What I deliberately did NOT patch (and why) — for your call
- **Dispatch board "column clipping"** (my earlier P1): on reading the code, the board already uses
  `lg:flex-row lg:overflow-x-auto` with fixed `lg:w-[300px]` columns — the cut-off 4th column in the
  screenshot is just the normal scroll-to-see-more state, **not a bug**. No change made. (If a parent ever
  adds `overflow-hidden`, that would break it — worth a glance, but the board itself is correct.)
- **Mobile Today nav/KPI interleave** (my earlier P1): I couldn't safely reproduce this from code without
  a live device, and it looks like the sticky top-nav captured mid-scroll rather than a layout break.
  **Please verify on a real 390px viewport**; if the sticky bar overlaps content, the fix is an opaque
  background + `scroll-mt` on the content, not a structural change. I didn't want to blind-patch layout I
  can't test.
- **Uppercase display headings** (my earlier P2): the `font-display` uppercase style is used consistently
  across the hub — it's an intentional brand choice, not a leak. Left as-is; change only if you want a
  calmer heading treatment.
- **Compliance status filter** / **driver-app + broker-portal review**: the first is a feature (not a quick
  fix); the second is blocked because `22/23/26` screenshots were mis-captured (they show the office Today).
  Re-capture logged in as `driver@demo.thind` / `broker@demo.thind` and I'll review those two surfaces.

## Verify after applying
- `npm run build` (green), `npm run test`.
- Eyeball `/hub`, `/hub/dispatch`, `/hub/money`: section icons + warning chips should be indigo/amber
  tokens (no marketing gold), and $0 AR buckets should have grey labels.
