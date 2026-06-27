# Claude review prompt — copy everything below the line

---

You are reviewing **HaulDesk**, a multi-tenant trucking TMS live at https://thindtransport.com/hub (demo login: `dispatch@demo.thind` / `ThindDemo1!` — you won't need to log in; use screenshots + repo).

## Your job

Compare the **live UI** (screenshots in repo) against the **written spec** (markdown in repo). Produce a prioritized fix list the dev team can execute in Cursor.

## Repo & branch

- **GitHub:** https://github.com/ranvir01/thind-transport-website
- **Branch:** `docs/claude-spec-review` (check this branch out)
- **Handoff doc:** `docs/claude-spec-review-handoff.md` — screen inventory, demo accounts, known bugs
- **Screenshots:** `docs/review-screenshots/*.png` — 27 production captures (desktop 1440px + mobile 390px)

## Spec files to read first (in repo)

1. `docs/design/HANDOFF.md` — UI tokens, IA (6 primaries + sub-nav), calm OpenRouter-style system
2. `docs/tms-master-prompt.md` — product scope and phase requirements
3. `docs/demo-script.md` — golden-path demo flows
4. `src/lib/hub/product.ts` — product mission/tagline
5. `src/lib/hub/setup-guide.ts` + `src/lib/hub/help.ts` — onboarding copy source of truth
6. `src/styles/hub-theme.css` + `src/components/hub/HubNav.tsx` — shell implementation

## Hub code map (when suggesting fixes)

| Area | Path |
|------|------|
| Office pages | `src/app/hub/(office)/` |
| Driver PWA | `src/app/hub/(office)/driver/` or `src/app/hub/driver/` |
| Shared UI | `src/components/hub/ui.tsx`, `SetupGuide.tsx`, `HelpCenter.tsx`, `HubTour.tsx` |
| Navigation IA | `src/lib/hub/navigation.ts` |
| Today dashboard | `src/app/hub/(office)/page.tsx`, `src/lib/hub/today.ts` |
| Auth | `src/app/api/auth/[...nextauth]/route.ts`, `src/lib/hub/users.ts` |

## Review each screenshot (`docs/review-screenshots/`)

For **every PNG**, answer:

1. **Spec match** — Does it follow HANDOFF tokens (`bg-surface`, `text-fg-2`, `border-border`, accent indigo) vs legacy navy/steel or marketing red?
2. **IA** — Correct primary tab + sub-nav + “More” sidebar placement?
3. **Copy** — Plain language for someone who's never used a TMS?
4. **Mobile (24–26)** — Touch targets ≥44px, no horizontal scroll, bottom nav usable?
5. **Functionality gaps** — Dead ends, missing CTAs, confusing empty states?

Rank issues **P0 / P1 / P2** with guessed file paths.

## Start order

1. `03-today-desktop.png` + `24-today-mobile.png`
2. `07-dispatch.png` + `25-dispatch-mobile.png`
3. `11-money.png` + `12-settlements.png`
4. `22-driver-desktop.png` + `26-driver-mobile.png`
5. `04-help.png` + `05-setup-guide.png` + `21-tour.png`
6. Remaining screens

## Known bugs already flagged (verify + root-cause in code)

- Today time-off shows **“Invalid Date to Invalid Date”** (`15b-load-detail.png` context: check time-off panel on Today)
- Setup checklist visible when only carrier packet unchecked
- Login page doesn't show demo credentials
- Possible legacy styling on inner pages not fully migrated to hub tokens

## Output format

```markdown
## Executive summary (3–5 bullets)

## P0 — ship blockers
- [ ] Issue — file(s) — screenshot — fix

## P1 — polish / spec drift
...

## P2 — nice to have
...

## Spec gaps (HANDOFF vs built)
...

## Suggested next sprint (ordered, ≤10 tasks)
```

Do not invent features not in HANDOFF or tms-master-prompt. Company facts on the **marketing site** (`src/lib/constants.ts`) are separate from HaulDesk product identity.
