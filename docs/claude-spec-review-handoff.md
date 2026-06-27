# HaulDesk — Claude spec review handoff

Paste this entire document (plus screenshots from Cursor) into Claude. Claude cannot log into authed pages — screenshots are the source of truth for UI; URLs are for path/reference only.

---

## Product

**HaulDesk** — multi-tenant TMS at `https://thindtransport.com/hub/*`. Thind Transport is demo tenant #1. Goal: run trucking start-to-finish in plain language for non-TMS users.

**Mission (in-app):** *Run your trucking company from first load to last invoice — in one calm place, no training manual required.*

---

## Spec documents (compare UI against these)

| Doc | Path | What to check |
|-----|------|----------------|
| UI redesign | `docs/design/HANDOFF.md` | Calm OpenRouter-style tokens, top bar + 212px sub-nav, ⌘K, monospace numbers, hairline borders, slim pills, no navy legacy |
| Product / phases | `docs/tms-master-prompt.md` | Full TMS scope, conversion, mobile-first |
| Demo golden path | `docs/demo-script.md` | Today → planner → dispatch → money flows |
| Setup playbook | `docs/hub-setup-guide.md` + `/hub/guide` | 7-phase onboarding |
| Help / tours | `/hub/help` | FAQ + interactive spotlight tour |
| Repo | https://github.com/ranvir01/thind-transport-website | `src/app/hub/`, `src/components/hub/` |

**HANDOFF §2 IA:** 6 primary areas (Overview, Dispatch, Loads, Money, Fleet, People) + utility links in sidebar “More”.

**HANDOFF §1 tokens:** `bg-surface`, `text-fg-2`, `border-border`, `bg-accent-soft`, Geist + mono numbers — not marketing red/gold in hub.

---

## Demo login (production)

Password for all: **`ThindDemo1!`**

| Role | Email | Lands on |
|------|-------|----------|
| Dispatcher | `dispatch@demo.thind` | `/hub` (Today) |
| Owner | `owner@demo.thind` | `/hub` + settings |
| Accountant | `accounting@demo.thind` | `/hub/money` |
| Driver | `driver@demo.thind` | `/hub/driver` (phone PWA) |
| Broker portal | `broker@demo.thind` | `/hub/portal` |
| Shipper portal | `shipper@demo.thind` | `/hub/portal` |

---

## Screen inventory — paste URL + screenshot for each

### Public (no login)

| # | Screen | URL |
|---|--------|-----|
| 1 | Login | https://thindtransport.com/hub/login |
| 2 | Signup | https://thindtransport.com/hub/signup |

### Office — Overview

| # | Screen | URL | HANDOFF / demo-script |
|---|--------|-----|------------------------|
| 3 | Today (desktop) | https://thindtransport.com/hub | Today morning huddle, KPI strip, queues |
| 4 | Today (mobile 390px) | same | Mobile-first, bottom nav |
| 5 | Live map | https://thindtransport.com/hub/map | Fleet positions |
| 6 | Help | https://thindtransport.com/hub/help | FAQ + Start tour |
| 7 | Setup guide | https://thindtransport.com/hub/guide | 7-phase playbook |
| 8 | Interactive tour | https://thindtransport.com/hub?tour=today-desk | Spotlight walkthrough |
| 9 | Smart Setup | https://thindtransport.com/hub/setup | Document upload onboarding |

### Office — Dispatch & loads

| # | Screen | URL |
|---|--------|-----|
| 10 | Dispatch board | https://thindtransport.com/hub/dispatch |
| 11 | Planner | https://thindtransport.com/hub/planner |
| 12 | Capacity | https://thindtransport.com/hub/capacity |
| 13 | All loads | https://thindtransport.com/hub/loads |
| 14 | Paste rate con | https://thindtransport.com/hub/loads/paste |
| 15 | Load detail | open THD-1003 from Today or loads list |

### Office — Money

| # | Screen | URL |
|---|--------|-----|
| 16 | Money overview | https://thindtransport.com/hub/money |
| 17 | Settlements | https://thindtransport.com/hub/money/settlements |
| 18 | Advances | https://thindtransport.com/hub/money/advances |
| 19 | Fuel & cards | https://thindtransport.com/hub/fuel |
| 20 | IFTA | https://thindtransport.com/hub/compliance/ifta |

### Office — Fleet & people

| # | Screen | URL |
|---|--------|-----|
| 21 | Trucks & trailers | https://thindtransport.com/hub/fleet |
| 22 | Drivers roster | https://thindtransport.com/hub/drivers |
| 23 | Customers | https://thindtransport.com/hub/customers |
| 24 | Recruiting | https://thindtransport.com/hub/recruiting |

### Office — Compliance & ops

| # | Screen | URL |
|---|--------|-----|
| 25 | Compliance | https://thindtransport.com/hub/compliance |
| 26 | Safety | https://thindtransport.com/hub/safety |
| 27 | Tasks | https://thindtransport.com/hub/tasks |
| 28 | Messages | https://thindtransport.com/hub/messages |
| 29 | Reports | https://thindtransport.com/hub/reports |
| 30 | Import | https://thindtransport.com/hub/import |
| 31 | Carrier packet | https://thindtransport.com/hub/settings/packet |

### Driver app (login as `driver@demo.thind`)

| # | Screen | URL |
|---|--------|-----|
| 32 | Driver home | https://thindtransport.com/hub/driver |
| 33 | Driver (mobile 390px) | same |

### Customer portal (login as `broker@demo.thind`)

| # | Screen | URL |
|---|--------|-----|
| 34 | Broker portal | https://thindtransport.com/hub/portal |

---

## Screenshot files (attach this folder to Claude)

All captured from **production** on `thindtransport.com`. Folder: `docs/review-screenshots/` (~5 MB, 27 PNGs).

| File | Screen |
|------|--------|
| `01-login.png` | Login (public) |
| `02-signup.png` | Signup (public) |
| `03-today-desktop.png` | Today · 1440px |
| `04-help.png` | Help + tour CTA |
| `05-setup-guide.png` | Setup guide playbook |
| `06-smart-setup.png` | Smart Setup upload |
| `07-dispatch.png` | Dispatch kanban board |
| `08-planner.png` | Week planner |
| `09-loads.png` | All loads table |
| `10-paste-rate-con.png` | Paste rate con |
| `11-money.png` | Money overview |
| `12-settlements.png` | Driver settlements |
| `13-fleet.png` | Trucks & trailers |
| `14-drivers.png` | Drivers roster |
| `15-compliance.png` | Compliance wall |
| `15b-load-detail.png` | Single load detail |
| `16-fuel.png` | Fuel & cards |
| `17-messages.png` | Messages |
| `18-map.png` | Live map |
| `19-tasks.png` | Tasks |
| `20-recruiting.png` | Recruiting pipeline |
| `21-tour.png` | Interactive tour step 1 |
| `22-driver-desktop.png` | Driver app · desktop |
| `23-broker-portal.png` | Broker portal |
| `24-today-mobile.png` | Today · 390px |
| `25-dispatch-mobile.png` | Dispatch · 390px |
| `26-driver-mobile.png` | Driver app · 390px |

Re-capture anytime: `node scripts/capture-review-screenshots.mjs`

---

## Known issues spotted on production (Jun 2026)

1. **Time-off on Today** shows `Invalid Date to Invalid Date` for Gurjit Sandhu request.
2. **Setup checklist** still visible when only “Carrier packet” remains unchecked — may be OK or should collapse sooner.
3. **Login page** does not show demo credentials — reviewers need this doc.
4. **Inner pages** may still mix old navy/steel classes on some screens not yet migrated (flag any you see vs HANDOFF tokens).
5. **Demo data** on production is intentional for sales review; do not use for real carrier data.

---

## What to ask Claude

```
You are reviewing HaulDesk TMS live UI against docs/design/HANDOFF.md and docs/tms-master-prompt.md.

For each screenshot I provide:
1. Does it match the calm token system (surface/border/accent, not marketing red)?
2. Is IA correct (6 primaries + sub-nav + More sidebar)?
3. Is copy beginner-friendly for trucking ops?
4. Mobile: touch targets, no horizontal scroll at 390px?
5. List specific fixes (file/area guesses ok) ranked P0/P1/P2.

Start with Today, Dispatch, Money, Driver app, Help/Guide.
```

---

## Architecture notes for reviewers

- **Stack:** Next.js 16 App Router, React 19, Tailwind semantic tokens, NextAuth v5, Postgres (Neon on Vercel).
- **Hub code:** `src/app/hub/`, shell in `src/components/hub/HubNav.tsx`, tokens in `src/styles/hub-theme.css`.
- **Go/Rust services:** stubs only; app uses Next server actions + Postgres today.
- **Marketing site** at `/` uses Thind brand red/gold — separate from hub software identity.

---

*Generated for Claude review — production deploy at thindtransport.com/hub.*
