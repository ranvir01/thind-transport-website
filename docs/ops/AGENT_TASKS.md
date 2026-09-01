# Agent task briefs — copy-paste, one at a time

**Generated 2026-07-25 against `main` + branch `ops/section-3-audit` (3 commits).**

Each task below is a self-contained prompt for a coding agent (Cursor, Claude Code, whatever).
**Paste the PREAMBLE first, then one task block.** One task per agent session — do not hand an agent two.

Write scopes are disjoint *within a wave*, so a whole wave can run in parallel without merge conflicts.
Tasks marked **BLOCKED** need a decision or production access before an agent can start; those are in §4.

---

## PREAMBLE — paste this above every task

```
Repo: github.com/ranvir01/thind-transport-website — LoadOff, a multi-tenant TMS for Thind
Transport LLC (FMCSA carrier, Kent WA). Next.js 16 App Router, TypeScript, Tailwind,
NextAuth v5, Postgres, Vercel. Thind is tenant 1.

BEFORE YOUR FIRST EDIT: read AGENTS.md and .cursor/. If your change contradicts them,
update the doc in the same commit.

Non-negotiables (learned in production — do not regress):
- Money is integer cents in bigint. dollarsToCents for input, roundHalfAwayFromZero for
  rounding. A float anywhere in a money path is a bug.
- Every query is carrier-scoped (carrier_id = $1). Cross-table writes guard tenancy on
  BOTH sides. Any new table gets a tenant-isolation test.
- Permissions are enforced in server actions via requirePermission, never UI-only.
  Money-adjacent mutations call logAudit.
- Migrations are append-only migrations/hub/NNN_*.sql, idempotent (IF NOT EXISTS),
  applied with npm run db:migrate.
- /hub/driver/* and /hub/portal/* are forced-dark: never text-fg*, bg-surface*,
  border-border*. Use text-white / text-steel-* / bg-navy-* / border-white/*.
- (office) routes use ONLY semantic tokens: accent-text for money/links, warn/warn-soft
  for needs-attention, bad for red, surface/border/fg scales otherwise.
- Never Tailwind opacity modifiers on CSS-var colors (bg-surface/95) — silently dropped.
- Never commit secrets. .env.example only.

Local setup:
  npm install && cp .env.example .env.local   # POSTGRES_URL + NEXTAUTH_SECRET minimum
  npm run db:migrate && npm run seed:demo     # demo logins are in scripts/seed-demo.mjs
Gate before you call it done: npm test AND npm run build AND npm run connections:check.
Branch per task, conventional commits, one PR. Never push to main.

Context: docs/ops/ holds a full audit — TOP_10.md is the ranked action list, HANDOFF.md is
what is still open and why. Read the one your task references. Numbers in those docs come
from seeded demo data unless marked otherwise; do not treat them as Thind's real book.

If the defect described below turns out not to exist when you read the code, say so and
stop. Do not invent a fix.
```

---

## Wave 1 — highest value, no dependencies

Run all four in parallel. Scopes are disjoint.

### Task 1 — Build the deadhead instrument *(TOP_10 #3, the largest lever)*

**Scope:** `src/lib/hub/kpi.ts` (read-only), new `src/lib/hub/deadhead.ts`, `src/app/hub/(office)/reports/page.tsx`, tests.

```
Deadhead % is Thind's single biggest margin lever and it is currently not measured. The
deadhead_miles column is free text a dispatcher types (src/components/hub/LoadForm.tsx:369)
— nothing derives or validates it. In the demo seed it is literally Math.round(miles * 0.08)
(scripts/seed-demo.mjs:341, 27 of 27 loads match exactly), so any dashboard reading ~7%
is reporting a constant.

Build a measured deadhead figure to show NEXT TO the typed one, so the gap is visible.

Three instruments already exist in the database. Use the first; wire the others if cheap:
1. Fuel: SUM(hub.fuel_transactions.gallons) x carrier_settings.fsc.mpg = total miles driven.
   Minus SUM(hub.loads.loaded_miles) for the same window = empty miles. This needs NO ELD,
   NO credential, NO integration — just fuel-card rows the carrier already imports. Exclude
   reefer and DEF gallons, which are not propulsion fuel (src/lib/hub/ifta.ts already does
   this correctly — reuse that filter, do not re-derive it).
2. GPS: ifta.ts persists fleet_miles per quarter from hub.position_pings.
3. Stop chain: 100% of hub.stops rows carry lat/lng. Per truck, ordered by time, the
   great-circle distance from one load's last delivery stop to the next load's first pickup
   stop is that leg's empty run. I verified 15 of 27 truck-legs chain cleanly on the seed.

Deliver: a carrier-scoped, date-ranged function returning { typedDeadheadMiles,
measuredTotalMiles, measuredEmptyMiles, typedDeadheadPct, measuredDeadheadPct, basis,
confidence } where basis names which instrument was used and confidence degrades when
inputs are thin (e.g. fewer than N fuel rows in the window). Render both numbers on
/hub/reports with the measured one labelled by its basis. Do NOT silently replace the
typed number — the whole point is that the owner sees the two disagree.

Integer cents / integer miles discipline applies. Per-truck and per-week breakdowns matter
more than a fleet total: the fleet number hides which truck is running empty.

Tests: unit-test the math with fixtures including zero-fuel and zero-loaded-mile windows,
and a case where the typed number is materially lower than measured. Do not change
scripts/seed-demo.mjs.
```

### Task 2 — Surface the real cash cycle *(TOP_10 #9)*

**Scope:** `src/lib/hub/types.ts`, `src/lib/hub/money.ts`, `src/app/hub/(office)/money/page.tsx`, tests.

```
hub.loads now has delivered_at and pod_received_at (migration 022, backfilled from the
hub.load_events audit trail). Nothing displays the cycle they make measurable.

Today avgDaysToPay (src/lib/hub/vetting.ts:156) measures invoice issued_on -> payment
paid_on only. That excludes the POD -> invoice leg, which is the part the office actually
controls — 4 days on the seeded book. So the reported number hides the controllable half.

1. Add delivered_at and pod_received_at to the Load interface in src/lib/hub/types.ts
   (deliberately left out of migration 022's PR to avoid a write-scope conflict).
2. Add a carrier-scoped cash-cycle function: for a date range, return median and mean days
   for delivered -> pod_received, pod_received -> invoice issued, issued -> paid, and the
   total delivered -> paid. Use medians as the headline (a single 90-day deadbeat should not
   move the number). Handle unpaid and uninvoiced loads by excluding them from the leg they
   have not reached, not by treating them as zero.
3. Render it on /hub/money as a four-segment cycle with the controllable legs distinguished
   from the customer-controlled one. Use semantic tokens only — warn/warn-soft for a leg
   over target, never gold/navy/steel in (office) routes.
4. Show the count of loads currently sitting past delivery with no invoice, and their total
   value. On the seed that is 15 loads / $40,485, and 10 of them were already settled to the
   driver — that combination is the failure this screen exists to catch.

Do NOT implement auto-invoicing. That is a separate policy decision (HANDOFF.md §2 #2).
Tests: fixtures covering a load at each stage, plus a load that skipped delivered_at
(legacy rows only have the backfill, which can be partial).
```

### Task 3 — Rate-limit the public forms

**Scope:** `src/app/actions/capture-lead.ts`, `submit-pre-qualification.ts`, `submit-application.ts`, `src/app/api/schedule-meeting/route.ts`, tests.

```
Four public, unauthenticated entry points have no throttle, captcha or honeypot. Each sends
email; submit-application also builds a PDF. Anyone can burn the SMTP quota and fill
hub.applicants and hub.website_leads.

src/lib/hub/auth-throttle.ts was recently generalised and now exports
ThrottleScope = "login" | "signup", isLockedOut(...) and recordAttempt(...), backed by
hub.auth_attempts. Extend ThrottleScope with a public-form scope and apply it to all four
entry points, keyed on client IP and — where the form has one — the submitted email.

Requirements:
- Keep failure messages generic. Never reveal whether an email already exists or that a
  limit was hit in a way that helps an attacker tune.
- A legitimate applicant who mistypes and resubmits must not be locked out. Pick limits
  accordingly and put the reasoning in a comment.
- Behind a shared corporate NAT several real applicants share one IP. Do not make the IP
  key so tight that a trucking company's office cannot submit three referrals.
- Add a honeypot field to the forms as a cheap first filter, but do not rely on it alone.
- Do not add a third-party captcha dependency — AGENTS.md forbids new heavy deps.

Tests: assert the limit triggers, that it resets, and that a legitimate retry inside the
window still succeeds.
```

### Task 4 — Put the e2e smokes in CI

**Scope:** `.github/workflows/**`, `scripts/e2e-run-all.mjs`, `docker-compose.yml`.

```
There are 52 e2e smoke scripts (scripts/e2e-*.mjs) covering dispatch, invoices, settlements,
IFTA, driver PWA, portal, tenant isolation and more. None of them run in CI — .github/workflows/
contains only branch-drain and prune jobs. They execute only when an agent remembers to, which
means the most expensive money paths in the app are guarded by a habit.

Add a GitHub Actions workflow that runs them on pull request and on push to main:
- Postgres service container (docker-compose.yml already describes the local shape).
- npm ci, npm run db:migrate, npm run seed:demo, start the Next server, then
  node scripts/e2e-run-all.mjs.
- Also run npm test and npm run build in the same or a parallel job.
- Cache node_modules and the Next build cache — this must not take 20 minutes.
- Upload failure artifacts (screenshots, server log) so a red run is diagnosable without
  re-running locally.

Two known constraints:
- next/font fetches Google Fonts at build time, so the runner needs egress to
  fonts.googleapis.com. If CI cannot reach it, the build fails for a reason unrelated to the
  change under test — note this in the workflow file and consider self-hosting the fonts.
- scripts/hobby-cron-guard.mjs and scripts/go-live-check.mjs are cheap and worth adding as
  gates.

Do not touch application code. Do not modify the existing drain/prune workflows except as
required by Task 9, which another agent owns.
```

---

## Wave 2 — after Wave 1 merges

### Task 5 — Error monitoring and uptime

**Scope:** `instrumentation.ts` (new), `src/app/api/version/route.ts`, `next.config.mjs`, `docs/ops/monitoring.md`.

```
LoadOff has no error monitoring and no uptime checks. The only production visibility today is
Vercel's own runtime log, which nobody watches. Section 5 of the owner's brief requires both
on /hub and /.

Add error monitoring (Sentry or OpenTelemetry — pick one, justify the choice in the PR on
cost and Vercel integration quality, and keep the bundle impact small; AGENTS.md forbids new
heavy dependencies, so measure it). Requirements:

- Server and client errors, with the carrier_id as a tag so a tenant-specific failure is
  visible as one. NEVER send PII: no driver names, no CDL numbers, no addresses, no
  credential values. Scrub the request body by default and allowlist what gets through.
- The 17 Vercel cron jobs in vercel.json fail silently today — a cron that 401s or throws
  should raise. Instrument the cron route specifically.
- /api/version already exists and is the natural uptime target. Extend it to report DB
  reachability and the applied migration count, without leaking version detail publicly.
- Document the alert routing in docs/ops/monitoring.md: what fires, to whom, and what the
  first response is. An alert nobody owns is noise.

Free tier is fine to start. Put the monthly cost in the PR description.
```

### Task 6 — Instrument the recruiting funnel

**Scope:** `src/app/layout.tsx`, `src/components/application/**`, `src/app/apply/**`, `src/app/pre-qualify/**`.

```
Growth at Thind is capped by seated trucks, not available loads — so cost per hire and cost
per seated truck are the numbers that matter for the marketing site. Neither is measurable
today: Vercel Web Analytics is not enabled on the project (the API returns 404) and
@vercel/analytics is not a dependency.

1. Add @vercel/analytics and @vercel/speed-insights. Both are small; confirm the bundle delta.
2. Instrument the apply funnel end to end as custom events: landing -> pre-qualify start ->
   pre-qualify complete -> application start -> application submit. Every drop-off point needs
   its own event or the funnel cannot be read.
3. NEVER put PII in event properties. No name, email, phone, DOB, CDL. Source, page, step and
   coarse device class only.
4. Section 5 requires LCP under 2.5s on 4G for / and /loadoff. Measure both, report the current
   numbers in the PR, and fix what is cheap — the .cursor/skills/responsive-performance skill is
   the reference for how this codebase does perf work. Do not start a redesign.

Ranvir must enable Web Analytics in the Vercel dashboard for the data to land; note that in
the PR as a required post-merge step.
```

### Task 7 — Test the five uncovered money paths *(from TEST_GAPS.md §2)*

**Scope:** `src/lib/hub/__tests__/**` only. No application code.

```
Five money-critical paths have 0% test coverage. Write tests only — if you find a bug, report
it in the PR description and do not fix it here.

Ranked by exposure (full reasoning in docs/ops/TEST_GAPS.md §2):

1. draftSettlements — src/lib/hub/settlements.ts:89-235, the entire weekly payroll path. The
   settlement_id stamp at :218 is the only thing stopping a load being paid again next period,
   and the same-period guard at :122 is the only existing idempotency. Start here; it is the
   cheapest test with the largest blast radius.
2. The advance-apply loop in approveSettlement — settlements.ts:269. A single
   `AND status = 'outstanding'` clause is all that stops an advance being deducted twice.
3. createLoad / updateLoad — src/lib/hub/loads.ts:212 and :266. Nothing pins that
   assertCarrierRefs (tenancy.ts:26) is still called before the cents columns are written.
4. The 12 of 14 money server actions with no coverage — src/app/hub/_actions/money.ts. Assert
   which permission string each one passes; an approve gate downgraded to write would pass
   every test today.
5. runOverdueReminders — src/lib/hub/invoices.ts:310. The ladder was recently changed to use
   sent_log; pin that it neither skips a rung nor double-sends.

Write behaviour tests, not implementation mirrors. For each one, confirm it FAILS if you
revert the guard it covers — a test that passes against a broken implementation is worse
than no test.
```

### Task 8 — Make the mileage import's destructiveness visible

**Scope:** `src/components/hub/ImportWizard.tsx` only.

```
importMileageAction now REPLACES a quarter's imported mileage rather than adding to it — the
previous behaviour double-counted miles on a re-upload and overpaid fuel tax. The action already
returns rowsReplaced in its audit row.

The wizard does not say so. An office user re-uploading a corrected file for one truck will
silently wipe the other trucks' rows for that quarter.

Make it visible: state before upload that an IFTA-mileage import replaces that quarter's mileage
on file, and show rowsReplaced in the result panel after. Semantic tokens only — this is an
(office) route, so warn/warn-soft for the caution, never gold/navy/steel.

Do not change importMileageAction. Its scope belongs to whoever resolves HANDOFF.md §2 #1
(replace vs merge), and that decision may change what this copy should say.
```

### Task 9 — Stop the branch landfill

**Scope:** `.github/workflows/prune-merged-branches.yml`, `scripts/agent-branch-inventory.mjs`.

```
The repo has 232 remote branches, 200 unmerged into main. 142 are docs/report-only and 103 are
literally zero-diff commits. Inflow is roughly 25/day from the agent fleet.

.github/workflows/prune-merged-branches.yml:36 uses `git branch -r --merged origin/main`. An
empty commit branched off an OLD main is not an ancestor of current main, so it is never
"merged" and can never be pruned. The landfill is structural, not incidental.

Fix the workflow so a branch is deletable when it carries no content delta against main —
compare the tree, not ancestry: a branch whose `git diff $(git merge-base main $b) $b` is empty
has nothing to lose. Add an age floor (do not delete something pushed in the last N hours, so an
in-flight session is safe) and a protected-prefix allowlist. Log what it deleted.

Do not delete the 197 existing dead branches from CI on the first run — make the workflow
dry-run by default with an input to arm it, so Ranvir can read one report before anything is
destroyed. The one-time cleanup commands are already written out in docs/ops/PR_TRIAGE.md §6.
```

### Task 10 — Make the test suite type-sound

**Scope:** `src/**/__tests__/**` and `src/**/*.test.ts` only. No application code.

```
`npx tsc --noEmit` is clean across application code but reports errors in 31 test files. vitest
never typechecks, so these pass green while being type-unsound. The concrete failure mode: a
signature change in a money module lands green because the test passes a wrong-shaped mock.

Fix all 31. The dominant patterns are mocked HubSessionUser objects missing the required `email`
field, `[]` cast to a tuple type, and mock return types that do not satisfy
Record<string, string>.

Two rules:
- Do not change application code to make a test compile. If a test cannot be typed without an
  app change, that is a finding — list it in the PR and leave the test failing to compile.
- Do not weaken types to `any` or add `@ts-expect-error` to silence a real mismatch. Build
  correctly-typed fixture factories instead; several files need the same HubSessionUser factory,
  so write it once.

Then add `tsc --noEmit` as a CI gate so this cannot regress (coordinate with Task 4, which owns
.github/workflows — if that PR has not merged, note the gate as a follow-up rather than editing
the workflow yourself).
```

---

## Wave 3 — draft the onboarding runbook

### Task 11 — `docs/onboarding-runbook.md`

**Scope:** `docs/onboarding-runbook.md` (new) only.

```
Mission A is "a third carrier can be onboarded end to end in under 2 hours." That target is
currently unmeasurable: docs/onboarding-runbook.md does not exist, and no file matching *runbook*
exists anywhere in the repo.

Write the runbook by walking the real code path and recording every step, decision and piece of
information the operator must have in hand before they start:

  src/app/hub/signup/page.tsx
    -> src/app/hub/_actions/onboarding.ts:94 createWorkspaceAction (carrier, owner user,
       settings, and a 6-line default accessorial price book at :32-40)
    -> src/app/hub/welcome/page.tsx
    -> src/app/hub/(office)/setup/page.tsx (Smart Setup document extraction)
    -> the 15-step checklist in src/lib/hub/setup-guide.ts:57-228
  plus the 8 bulk importers in src/app/hub/_actions/import.ts (loads, trucks, drivers,
  customers, fuel, tolls, positions, mileage) and the CSV column shapes each expects.

Known friction to document honestly rather than paper over:
- The FMCSA authority check degrades to manual entry when FMCSA_WEBKEY is unset
  (onboarding.ts:59), so the operator may be typing everything by hand.
- The integrations settings page shows 10 provider cards and zero are connected
  (hub.api_credentials is empty). A new carrier's first hour is CSV imports. Say so up front
  or it reads as broken.
- src/app/hub/welcome/page.tsx:11-18 still tells brokers and shippers their portal is "on the
  way" even though /hub/portal is built and works.

Structure it as a timed checklist with a running clock and a "you are here" marker, so the
2-hour claim can be measured on a real run rather than asserted. Mark every step that needs
something from outside the app (a document, a login, a phone call) — those are what actually
blow the budget.

This is a documentation task. Do not change application code; log anything broken as a finding
at the end of the runbook.
```

---

## §4 — Do NOT hand these to an agent yet

| Item | Blocked on |
|---|---|
| Legacy public-blob production migration | **Ranvir's call** — migrating hard-breaks every document URL already sent to a broker or factor. Pick (a) accept breakage or (b) build signed share links first. HANDOFF.md §1. |
| IFTA re-import: replace vs merge | **Ranvir's call.** Changes what a re-upload means for a mixed-vendor fleet. |
| Auto-invoice on `pod_received` + settlement guard | **Ranvir's call.** Policy change touching payroll — `runSettlements` currently pays a driver for a load nobody billed. |
| Chasing draft invoices in the dunning ladder | **Ranvir's call.** Right, or embarrassing. |
| `costPerMileCents` (still on the 185 default vs ATRI $2.336) | **Ranvir's number**, from his books. One settings field, but it moves every lane margin. |
| Owner dashboard: restore a payroll-inclusive net margin | **Ranvir's call** on what his first screen leads with. |
| Portal access to legacy files | Product call + depends on the blob migration above. |
| Env vars, Vercel Pro, branch deletion, IFTA quarter audit, LLM smoke test | **Production access.** HANDOFF.md §3. |
| Anything sized in dollars | **Data.** Fuel-card CSV first — it converts the largest lever from an assumption into a number. HANDOFF.md §4. |

---

## Suggested order

**Wave 1** (parallel): 1, 2, 3, 4 — the biggest lever, the cash cycle, an open door, and a safety net.
**Wave 2** (parallel): 5, 6, 7, 8, 9, 10.
**Wave 3**: 11, once something in Waves 1–2 has actually been deployed and the runbook can be walked for real.

Answer the §4 decisions in parallel with Wave 1 — several Wave 2+ tasks unlock behind them.

```
FILES:    docs/ops/AGENT_TASKS.md (created)
PR:       none — GitHub token rejected (403) this session
IMPACT:   11 ready-to-run agent briefs with disjoint write scopes, so Waves 1 and 2 can
          run in parallel without merge conflicts; the 9 items that must NOT be delegated
          are separated out with the reason
NEXT:     Run Wave 1 Task 1 — it is TOP_10 #3, the largest lever, and it needs no data
          from you to build
BLOCKED:  The nine decisions in §4; GitHub write access for any of these to open a PR
```

---

## Appendix (2026-08-08): finalize-pass backlog — small, unblocked, any session can take one

From the reconciled 6-patch handoff (FINALIZE.md, session 017JBR7WV8…). Each stands alone:

1. ~~**Ratchet the test-file tsc errors toward 0**~~ *Done 2026-08-08: 35 → 23 → **0**;
   `npx tsc --noEmit` is clean repo-wide. Baseline locked at 0 (the gate now enforces total
   cleanliness; kept because drain-integrator.yml and fleet docs invoke it). En route it
   exposed that PROVIDERS' `: readonly ProviderSpec[]` annotation had disarmed
   registry.test.ts's ProviderId ↔ IntegrationProvider canary — now `as const satisfies`.*
2. ~~**Settings-UI toggle for `nav.small_carrier_mode`**~~ *Done 2026-08-08: setCarrierFlag
   write path in flags.ts (null clears the row — empty table stays "defaults everywhere"),
   owner-gated setNavigationModeAction, NavModePanel on Settings → Company & users
   (small-fleet / full / deploy-default radio), flags-write.test.ts.*
3. ~~**`npm run embed:verify` in a network-enabled CI job**~~ *Done 2026-08-08: e2e job step
   "Toolbox frame promises still hold" — fails on header regressions (exit 1), tolerates
   no-egress runners (exit 2).*
4. ~~**Renumber the duplicate `024_*` migration pair**~~ *Done 2026-08-08 as document-only:
   migrations/hub/README.md records the rules, why the pair must NOT be renumbered, and the
   next-number protocol.*
5. **security.txt contact → `security@thindtransport.com`** once domain mail exists
   (blocked on the owner's SPF/DKIM/DMARC + mailbox task; keep `Expires` a year out).

From research wave 2 (`docs/research/2026-08b/`, verified 2026-08-08):

6. ~~**Insurance renewal-packet export**~~ *Done 2026-08-08: renewal-packet.ts
   (collectRenewalData + renderRenewalPdf pure over data + buildRenewalPacket storing a
   carrier document, kind insurance_renewal), owner-only generateRenewalPacketAction,
   RenewalPacketPanel on /hub/compliance. Covers fleet w/ VINs, drivers w/ CDL+med dates,
   IFTA quarters, 24-month incidents w/ DOT-recordable flags, claims, DVIR + maintenance
   posture; the PDF names loss runs + dec pages as the only missing attachments.*
7. **Stripe Billing integration (ADR 0004)** — Checkout session + webhook receiver +
   `invoice.paid` → `BillingRow` bridge into `computeSaasMonth` + hosted portal link +
   WA-only Stripe Tax. ~4–6 agent-days. Blocked on owner gates: Stripe account
   activation, WA DOR check, `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` env-var names
   in Vercel. Include the NACHA ≥10-day variable-amount notice via `invoice.upcoming`.

From the Datatruck teardown (`docs/research/2026-08b/datatruck-teardown.md`, 2026-08-14).
Ordered — each enables the next:

8. **ETA from position pings + stop appointments** — `hub.position_pings` and
   `hub.stops.appt_start` both exist; the derivation doesn't. Feeds broker updates,
   detention prediction, and late-delivery warnings. Pure module + tests, no schema change.
9. **Automated broker status updates** — on `load_events` stage transitions, email the
   broker "picked up / in transit, ETA hh:mm" carrying the existing share link. The single
   highest-value gap against Datatruck's "AI Updater", and every input already exists.
   Must respect `isEmailConfigured()` and degrade silently (SMTP is owner-blocked),
   per-customer opt-out, never on cancelled loads.
10. **Per-truck / per-driver profit rollup** — compose `lanes.ts` lane RPM with
    `operating-cost.ts` CPM into a "which truck earned what this month" report view.
    Mostly assembly of parts already built.
11. **Natural-language report picker** — NL → parameters over the typed functions in
    `reports.ts`. **Explicitly NOT text-to-SQL:** every hub query is `carrier_id = $n` by
    construction, and an LLM emitting raw SQL discards that guarantee — the cross-tenant
    harness exists precisely to prevent this class of hole. Write the ADR recording that
    decision before any code. Do not start until 8–10 have landed.

From the OSS-TMS + shell-UX review (`docs/research/2026-08b/oss-tms-and-shell-ux.md`, 2026-08-14):

12. **Collapsible sidebar rail** — `HubNav.tsx` is a fixed 212px with no collapse; on a
    1280px dispatcher laptop that is 17% of the width permanently spent while reading a
    dense load board. Add a 56px icon rail toggle, persisted per user in
    `hub.user_preferences` (table exists, migration 026). Keep 212px expanded — it is
    deliberately narrower than the 256px convention and that density is a win, not a defect.
13. **Group the utility links** — `HUB_UTILITY_LINKS` is 13 items in one flat list mixing
    daily work (Messages, Tasks, Compliance, Safety, Reports) with one-time setup (Smart
    Setup, Setup guide, Import, Carrier packet) and reference (Toolbox, Help). Group into
    Work / Reference / Setup, with Setup auto-collapsing once the setup guide completes.
    Complements small-carrier mode, which only trims; this fixes full mode.
14. **Pickup verification** — mirror of the customer-side double-broker checklist in
    `vetting.ts`, aimed at the fastest-growing loss in freight: confirm at pickup that the
    driver and truck that arrived match the dispatch, using the driver PWA's existing photo
    capture + geolocation. Concept validated by LoadPartner's "Truck Verify"; build it from
    LoadOff's own primitives (their code is Fair Core licensed — ideas only, never source).

**Licensing note for anyone researching competitors:** Fleetbase is AGPL-3.0 and
LoadPartner is Fair Core (source-available). Neither may be vendored into this repo under
the MIT/Apache/BSD rule — AGPL's network clause alone would force LoadOff's source open.
Study their design freely; copy no code, schema DDL, or UI copy.

## E2E anchor drift after the Today/chrome redesign (found 2026-08-14)

The nightly full rig is at **43/55**. The unit job — the per-push gate — is green; this is
the e2e job only. Triage done, with the archaeology below so this is a pickup-ready job.

**Cause:** the "Today screen + app chrome" redesign (`d9ceecf4`) and the custom-fields work
(`f98a3c79`) moved/renamed UI that ~7 smokes assert against. **The product appears intact —
this is test drift.** Spot-checked the scariest one: `qbo-iif` reports "found 0 export
links" because the standalone `/hub/reports/export` page was removed and the four
QuickBooks .IIF exports now live in `ExportSheet.tsx`; the API routes and the feature are
fine. Do not "fix" the app to match the tests — update each assertion to the new surface,
and only treat it as a product bug if the affordance genuinely no longer exists anywhere.

Per-smoke findings:

15. **`e2e-sweep` + `e2e-users-smoke` + `e2e-office-smoke`** — all three assert the Today
    page renders `"in one calm place"` (PRODUCT.tagline). The redesign removed that
    subtitle from `(office)/page.tsx` ("chrome that recedes"); the string still exists in
    `product.ts`/`setup-guide.ts`, so grep alone is misleading. Pick a new anchor from
    always-rendered Today content, and follow e2e-sweep.mjs's own rule: never a word the
    sidebar renders.
16. **`e2e-qbo-iif-smoke`** — rewrite to open `ExportSheet` rather than visiting the deleted
    export page. Assert the four `kind` values from `ExportSheet.tsx`.
17. **`e2e-compliance-smoke`** — `readSummary()` returns null for all three tiles; the
    summary-tile markup changed (`font-display text-3xl font-extrabold` → `text-3xl
    font-semibold`). Re-anchor on something structural, not a font class.
18. **`e2e-duplicate-load-smoke`** (8 checks null) and **`e2e-tasks-smoke`** (priority badge,
    checklist) — load-detail and task-card markup drift. Same treatment.
19. **`e2e-onboarding-smoke`, `e2e-planner-smoke`** — `waitForText` timeouts; anchors moved.

**Not in scope:** `e2e-driver-offline-smoke` and `e2e-dispatch-driver-notify-smoke` appeared
in the CI failure list but pass locally and consistently — CI-side flake, already covered by
the launch-crash retry in `e2e-run-all.mjs`.

**Prevention worth considering:** these anchors are stringly-typed across ~55 scripts. A
shared `ANCHORS` map in `e2e-lib.mjs` (page → text) would turn "redesign broke 7 smokes"
into a one-file edit.

## Owner requests from the mobile screenshots (2026-08-14)

20. ~~**Delete or wire `HubAppearanceMenu.tsx`**~~ **DONE 2026-08-30** — deleted. It was a
    strict duplicate of the mode + accent controls `UserMenu` (the avatar) already
    renders, and nothing imported it. The avatar menu is the one reachable control.
21. ~~**Automation: email → load, finish the last mile.**~~ **DONE 2026-08-30.** The
    framing above was half wrong and worth recording: `pollDocsMailbox` filed attachments
    only onto loads that ALREADY existed. Mail for freight not yet booked hit `if (load)`
    and its attachments were **discarded** behind a "file it by hand" notification — so
    the missing piece was not just a surface, it was the staging step underneath one.
    Shipped: `hub.intake_drafts` (migration 029), server-side PDF text extraction, the
    `!load` branch staging parsed rate cons instead of dropping them, and `/hub/inbox` —
    a review queue where nothing becomes a load until a human taps Accept. The
    `ParsedRateCon → LoadForm` mapping was extracted to `lib/hub/rate-con-to-form.ts` so
    paste and email prefill through one translation. Manual entry untouched.
    Still owner-blocked on the Gmail App Password before real mail flows in.
22. **AI-in-app roadmap** — the honest sequence, cheapest and safest first: (a) the doc
    parser already in place, surfaced through 21's review queue — **(a) is now shipped**;
    the Inbox calls `analyzeDocumentEnhanced`, so a set `ANTHROPIC_API_KEY` upgrades every
    emailed rate con's parse with no code change and no key means a silent heuristic
    fallback; (b) ETA + broker
    auto-updates (tasks 8–9), which need no model at all; (c) the natural-language report
    picker (task 11), typed params only, never text-to-SQL. Anything that writes to the
    database from a model output goes through a human-confirm step until it has earned
    otherwise.
23. **Practice mode polish** — partly **DONE 2026-08-30**, and the remaining item was
    already shipped: `SandboxBanner` puts "Sandbox — nothing here is real" plus a Reset
    button on every sandbox screen, so both asks in the original entry existed already.
    What the nav link actually introduced was a hazard, now fixed: taking a seat calls
    `signIn` and REPLACES the session, so an owner mid-shift was one tap from being
    signed out of their own company. `/hub/sandbox` now resolves the visitor's real
    carrier and warns before the swap, with a "Back to <carrier>" link
    (sandbox-seat-swap-warning.test.ts). Still open: nothing — reopen if the seat picker
    grows a way to preview without signing in.
