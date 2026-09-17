# oo-national-90-lease-on proof pack

Ticket: Emma FILL-INCLUDED OWNER YES 2026-09-16  
Branch: `grok/rex-oo-national-90-lease-on`

## Before / after (SSR)

### Before (`before-ssr.txt`)

| Field | Value |
| --- | --- |
| Title | Owner Operators \| 90% of the Linehaul, 100% of the Fuel Surcharge \| Thind Transport |
| Meta | Lease on in Kent, WA. 90% of linehaul, 100% fuel surcharge pass-through. Every deduction on your settlement before you sign. No forced dispatch. |
| H1 | The split, and every deduction, before you sign. |

JobPosting (before): see `before-jobposting.txt` — led with Kent, WA.

### After (`after-ssr.txt`)

| Field | Value |
| --- | --- |
| Title | 90% Lease-On Owner Operator \| Nationwide \| Thind |
| Meta | Lease on nationwide: keep 90% of linehaul + 100% FSC, no forced dispatch. Lease-to-buy available — ask for terms. Apply or call (206) 765-6300. |
| H1 | 90% lease-on owner operators — nationwide, not a call center |

JobPosting (after): nationwide title + description; Kent only as “HQ in Kent, WA” at end of description.

## Target phrases (≥1 in title/H1; echoed in meta + body/FAQ)

1. `90% lease-on owner operator` — title, H1, FAQ Q1, arrangement intro, JobPosting title
2. `keep 90% of gross` — meta (“keep 90% of linehaul”), hero body, FAQ A1, JobPosting description
3. `nationwide` / `48 states` next to lease-on — meta, H1, eyebrow, FAQ, JobPosting, footer (Kent as HQ only)

## Screenshots

- `e2e-shots/owner-operators-1440.png` — desktop hero + H1
- `e2e-shots/owner-operators-390.png` — mobile 390px

## CI / gates (local, 2026-09-17)

```
npm run build          ✅
npx vitest run         ✅ (3611 passed)
node scripts/typecheck-gate.mjs ✅
npm run lint           ✅
node scripts/e2e-public-smoke.mjs ✅ (Public site smoke clean)
```

## Not done / assumed

- `npm run token-lint` not run (no redesigned marketing token-list change beyond existing owner-operators scope)
- `npm run design-qa` / `npm run js-budget` not run ([needs-browser] — e2e public smoke covers overflow + content at 390px)
- Shared `buildOwnerOperatorJobPosting()` in `src/lib/job-posting.ts` unchanged; `/owner-operators` overrides title/description inline so `/apply` and `/jobs/owner-operator` keep Kent-first schema until a follow-up ticket
- OpenGraph/Twitter card metadata not overridden at page level (inherits root layout)
