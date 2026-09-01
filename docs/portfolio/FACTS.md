# LoadOff — verified facts

The single source of truth for every portfolio artifact: README, ADRs, case study,
the 100-word statement, interview answers. **Nothing goes in a portfolio document that
is not on this page or verifiable from the repo.**

Why this file exists: a positioning playbook drafted for this project asserted several
things about LoadOff that are not true of the code. Two of them would have been fatal in
an interview, because they are exactly what a senior engineer probes. Every claim below
was checked against the repository on 2026-07-30 with the command that proves it.

---

## Corrections to the playbook draft — read before writing anything

| Claim in the draft | Reality | How to check |
|---|---|---|
| "hard tenant isolation via **row-level security** keyed on carrier_id" | **False. There is no Postgres RLS.** Zero `ENABLE ROW LEVEL SECURITY`, zero `CREATE POLICY` in 25 migrations. Isolation is application-level: every query carries `WHERE carrier_id = $n`. | `grep -rniE "ENABLE ROW LEVEL SECURITY\|CREATE POLICY" migrations/` → no hits |
| "money stored as integer cents **in bigint**" | **Half true.** Money is integer cents everywhere — correct and load-bearing. But the column type is `INTEGER` for most money columns; only aggregate columns (`revenue_cents`, `margin_cents`) are `BIGINT`. | `grep -rhoE "[a-z_]*cents[a-z_]* (BIGINT\|INTEGER)" migrations/hub/*.sql \| sort \| uniq -c` |
| "**TruckX** (ELD)" integration | **Not an integration.** TruckX appears only as a *CSV import format* for IFTA jurisdiction miles. The ELD/telematics providers in the registry are `terminal` and `truckercloud`. | `grep -rni truckx src/` → import wizard + IFTA page only |
| "**Resend**" for email | **False.** Email is `nodemailer` over SMTP. | `grep -n nodemailer package.json` |
| "**append-only** audit trail" | **Convention, not enforcement.** `hub.audit_log` exists and money mutations write to it, but nothing at the database level prevents `UPDATE`/`DELETE` — no trigger, no `REVOKE`. Say "audit log written on every money mutation," not "append-only." | `grep -rniE "BEFORE UPDATE ON hub.audit\|REVOKE" migrations/` → none |
| "2 live carriers" | **Unverified — do not claim.** The seed script creates one demo carrier plus a second demo tenant for isolation testing. Whether ATS Transport is live in production is Ranvir's to confirm; the repo cannot prove it. | `grep -c "INSERT INTO hub.carriers" scripts/seed-demo.mjs` → 1 |

**Why the isolation correction matters most.** "I used RLS" invites one question — "walk me
through your policies" — that has no answer. The true story is *better*: the isolation is
enforced in application code, an earlier version of it leaked, and the response was to build
an automated harness that inventories all 69 tables and fails the build when a query can
reach a tenant-owned table without naming the carrier. Finding your own architectural weak
spot and building the guard is a stronger signal than turning on a Postgres feature. Lead
with that, and be candid that the database-level wall is on the roadmap and not yet built.

---

## Verified numbers (2026-07-30, commit `ab5379cc`)

| Metric | Value | Command |
|---|---|---|
| Tables in `hub` schema | **69** | `grep -rhoE 'CREATE TABLE IF NOT EXISTS hub\.[a-z_]+' migrations/hub/*.sql \| sort -u \| wc -l` |
| Migrations | **25** | `ls migrations/hub/*.sql \| wc -l` |
| Integration providers in registry | **10** | `grep -cE '^\s+id: "' src/lib/hub/integrations/registry.ts` |
| Automated tests | **2,529** across **278** files | `npx vitest run` |
| Application source files | **551** (.ts/.tsx, excluding tests) | `find src -name '*.ts' -o -name '*.tsx' \| grep -v test \| wc -l` |
| Lines in `src/` | **~121,600** | `find src -name '*.ts' -o -name '*.tsx' \| xargs cat \| wc -l` |
| Authenticated app routes | **87** | `find src/app/hub -name page.tsx \| wc -l` |
| Server-action modules | **36** | `ls src/app/hub/_actions/*.ts \| wc -l` |

Use scope metrics like these rather than invented business outcomes. "69 tables, 10
integrations, 2,529 tests" is checkable in ten seconds and cannot be challenged. "Cut
dispatch time 40%" cannot be defended unless the measurement exists.

---

## Stack — as actually shipped

**Application:** Next.js 16 (App Router), React 19, TypeScript, Tailwind, NextAuth v5,
PostgreSQL, deployed on Vercel.

**Also in the repo — mention this, it is unusual for a solo project:** a Go worker
(`services/go/hauldesk-worker`) for long-running sync, and a Rust compute service
(`services/rust/hauldesk-compute`) for IFTA math and bulk import. Both are optional at
runtime — `src/lib/hub/sidecars.ts` falls back to pure TypeScript when the env vars are
unset. The Rust IFTA math is held in golden-fixture parity with the TypeScript
implementation, enforced by a test that fails if the two ever disagree.

**Integrations (10, in `src/lib/hub/integrations/registry.ts`):** `qbo` (QuickBooks
Online), `terminal` and `truckercloud` (ELD/telematics), `efs`, `wex`, `comdata` (fuel
cards), `dat`, `truckstop` (load boards), `factor` (factoring), `mailbox` (document
intake). Every adapter is built stub-first against a mock plus a shared contract suite
*before* vendor credentials exist — pasting a key is activation, not development.
Several are stubs awaiting credentials; say so.

**Other:** Vercel Blob (documents), Mapbox (`src/lib/hub/mapbox.ts`), nodemailer/SMTP,
web-push (driver notifications).

---

## The engineering stories that are true and defensible

1. **Tenant isolation, and finding the hole.** Application-level `carrier_id` scoping on
   every query. A leak was found in the website-leads path. The fix was not just that
   query: `src/lib/hub/__tests__/cross-tenant-harness.test.ts` now runs three guards —
   a schema census parsing all 25 migrations, a static scan of every query touching a
   tenant-owned table, and a live proof that seeds a second carrier and asserts it cannot
   read or address the first's rows by guessing IDs. Seven tables are exempt, each with a
   written justification. The test **fails loudly without a database** rather than
   skipping, because a silent skip on the test that proves isolation is worse than no test.

2. **Money as integer cents.** No floats anywhere in money paths. User input goes through
   `dollarsToCents`; rounding through `roundHalfAwayFromZero`. A payment form once accepted
   $10,003,360 against a $3,360 invoice; overpayment is now refused.

3. **Trilingual with a parity gate.** TypeScript / Go / Rust with fixed boundaries, and
   IFTA golden fixtures that must match between the TS and Rust suites in the same commit.

4. **Hours-of-service engine (49 CFR 395).** Computes the 11-hour drive limit, 14-hour
   window, 30-minute break, 60/70-hour cycles, 34-hour restart and sleeper-berth split
   from the stored duty log when the ELD feed is silent — labelled as computed, and it
   declines to guess when the log does not reach far enough back.

5. **Build gates that are ratchets.** Type errors in application code are a hard failure
   (currently zero). Test-file type debt is a ratchet that may shrink and never grow. A
   licence audit fails the build on AGPL/GPL/LGPL/SSPL in the dependency tree. A page-weight
   budget measures real bytes in a real browser at a pinned phone viewport.

6. **A bug found by measuring instead of assuming.** The page-weight gate reported
   143–193KB per route for several consecutive runs; the true figure is 236–280KB. The low
   readings came from builds made in a window containing an interrupted build — a partial
   `.next` serves pages with chunks missing and reports a flattering number. The gate now
   documents this at the top and the wrong numbers were retracted in the commit history.
   Interviewers like this one: it is a story about distrusting your own instrument.

---

## Things to say carefully

- **Do not claim RLS.** Say "application-level tenant scoping, enforced by an automated
  harness, with database-level isolation on the roadmap."
- **Do not claim append-only.** Say "audit log written on every money-adjacent mutation."
- **Do not claim TruckX or Resend.**
- **Do not claim user or revenue numbers** that cannot be produced on request.
- **Do say** that several integrations are credential-gated stubs. It is honest and it
  demonstrates the stub-first contract discipline, which is the more interesting point.
- **Do say** the AI-agent orchestration is real: a fleet of scheduled agents work
  disjoint lane branches merged by an integrator, governed by `AGENTS.md` and
  `docs/agent-improvement-loop.md`. That is genuinely unusual and directly relevant to
  "power user of AI models."
