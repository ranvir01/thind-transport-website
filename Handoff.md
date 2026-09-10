# Handoff — LoadOff + Thind Transport website

**Written 2026-09-10 against `main` = `d8476cd4` (2026-09-06, "Free hiring kit: share posts, Google Jobs listings, phone-first apply (#63)").** This is the current-state map for whoever builds next — the Grok bot team booted by `GROK-MASTER-PROMPT.md` in `ranvir01/grok-bot-org`, a Cursor or Claude cloud agent, or a human. Every claim below names the file, commit, PR, issue, or command it came from. Numbers marked *measured* were produced in this session; numbers quoted from older docs say so, and those docs (2026-07-25 audits) predate later commits — verify before acting.

Rulebook, in order: [`AGENTS.md`](AGENTS.md) (standing rules) → [`.cursorrules`](.cursorrules) (exact stack and style constraints) → this file → [`docs/ops/AGENT_INTEROP.md`](docs/ops/AGENT_INTEROP.md) (the clock, who pushes where, the `Backlog:` protocol, credit and telemetry) → [`docs/agent-improvement-loop.md`](docs/agent-improvement-loop.md) (the loop, guardrails §4, lane territories §5) → [`DESIGN.md`](DESIGN.md) → the matching skill in [`.cursor/skills/`](.cursor/skills/). Decisions only the owner makes go to [`docs/ops/DECISIONS.md`](docs/ops/DECISIONS.md) or a `[needs-owner]` line in a commit body.

---

## 1. What this is

One Next.js 16 App Router monorepo, two products, deployed on Vercel from `main`:

1. **LoadOff** (`/hub`) — a multi-tenant transportation management system: dispatch, invoicing, settlements, fuel and IFTA, compliance, customer portals, an installable driver PWA, an integrations registry. Thind Transport (Kent, WA; MC 876103) is tenant #1; the seed adds a demo tenant. Older docs and branch names say *HaulDesk*; same product.
2. **The driver-recruitment site** (`/`) — marketing pages and apply flows that convert CDL drivers into applications. Company facts live only in [`src/lib/constants.ts`](src/lib/constants.ts).

Stack, pinned: Next 16 / React 19 / TypeScript 5.9 strict / Tailwind 3.4 / NextAuth v5 / Postgres via `pg` / vitest 4 / ESLint 9; optional Go worker and Rust compute sidecars ([`docs/architecture/trilingual-stack.md`](docs/architecture/trilingual-stack.md)). Full pin list: [`.cursorrules`](.cursorrules) §1.

---

## 2. State on handoff day

### Verification run (measured, this sandbox: node 22.22.2, npm 10.9.7, Postgres 16.13, Go 1.24.7, cargo 1.94.1)

| Check | Result | Notes |
| --- | --- | --- |
| `npm ci --ignore-scripts && npm rebuild bcrypt sharp` | ok | the CI / Cursor install path |
| `npm run db:migrate` → `npm run seed:demo` | ok | against a local `postgres:16`-equivalent cluster |
| `npx vitest run` | **375 files, 3,625 tests, 0 skipped, all passed** | with `POSTGRES_URL` set, so the three DB-gated isolation suites ran instead of skipping (`portal-isolation`, `driver-file-isolation`, `cross-tenant-harness`) |
| `node scripts/typecheck-gate.mjs` | pass | app code 0 errors; test files 0 errors; ratchet baseline 0 |
| `npm run lint` | **1 error, pre-existing** | `react-hooks/set-state-in-effect` in `src/components/application/CopyPostButton.tsx:19` (introduced by `d8476cd4`, PR #63) — not touched by this handoff; untagged backlog item, claimable |
| `npm run license:audit` | pass | no AGPL/SSPL/GPL/LGPL in production deps |
| `node scripts/token-lint.mjs` | pass | |
| `node scripts/cursor-env-check.mjs` | pass | |
| `npm run build` | pass | `fonts.googleapis.com` was reachable here; it is a hard build-time dependency (`e2e-suite.yml` header) |
| `npm run test:sidecars` | pass | Go `vet` + tests; Rust clippy + 29 tests |
| `src/lib/__tests__` guard suite re-run after the workflow edits in this handoff | 26 files, 397 tests, pass | |

### CI on `main` (GitHub Actions, `.github/workflows/e2e-suite.yml`)

- `unit` job on the push of `d8476cd4`: green — [run 34083014595](https://github.com/ranvir01/thind-transport-website/actions/runs/34083014595).
- Nightly full rig (`e2e` job, 03:40 UTC): red 2026-09-07 ([34101527777](https://github.com/ranvir01/thind-transport-website/actions/runs/34101527777)), green 2026-09-08 ([34203836584](https://github.com/ranvir01/thind-transport-website/actions/runs/34203836584)), red 2026-09-09 ([34328713358](https://github.com/ranvir01/thind-transport-website/actions/runs/34328713358)). Tracked as **#68 `[fleet] E2E suite red`** (`should` + `venture:loadoff`). Steve's first ticket in the Grok plan.
- Publishing: `drain-integrator.yml` (`17,47 * * * *` UTC) drains the integrator branch to `main` with `--no-ff` + `.drain-stamp`; last stamp in the tree is `sha=8250d03d`, `2026-09-04T05:06:54Z`.

### Measured inventory

| Thing | Count | Where |
| --- | --- | --- |
| Engine modules | 141 `.ts` files | `src/lib/hub/` |
| Server-action files | 42 | `src/app/hub/_actions/` |
| Office route directories | 27 | `src/app/hub/(office)/` |
| Driver PWA route directories | 7 | `src/app/hub/driver/` |
| Hub API route files | 12 | `src/app/api/hub/**/route.ts` |
| Public marketing route directories | 29 | `src/app/` (excluding `hub`, `api`, `app`) |
| SQL migrations | 34 | `migrations/hub/` — append-only; note two number collisions already in the tree (`024_pay_per_mile_cents` / `024_share_link_expiry`, `029_intake_drafts` / `029_thind_dot_number`); the next migration is `033_` |
| Vercel crons | 19 | `vercel.json` → `src/app/api/hub/cron/[job]/route.ts`, all behind `CRON_SECRET` |
| Integration providers in the registry | 19 (8 `live`, 11 `stub`) | `src/lib/hub/integrations/registry.ts` — `live` means "client implemented, activatable with credentials", not "connected" |
| E2E smoke scripts | 58 | `scripts/e2e-*-smoke.mjs`, run by `scripts/e2e-run-all.mjs` in the nightly job |
| Test files | 375 | `src/**/*.test.ts` |
| Ops audit docs | 14 | `docs/ops/` |

### Open pull requests (2026-09-10)

| PR | Head | Disposition |
| --- | --- | --- |
| #86 Persona theater, preferences, Vercel-safe SMTP | `cursor/loadoff-finalize-polish-618e` | Product PR; review, then drain through the integrator. |
| #84 (draft) Afternoon automation handoff | `cursor/automation-handoff-live-facts-c1a4` | Docs only; superseded for the Grok org by `ranvir01/grok-bot-org` (`fleet/docs/AUTOMATION-HANDOFF-2026-09-01.md` is the copy). |
| #83 (draft) DO NOT MERGE briefing | `cursor/bc-c4841620-…-a1e5` | Close. |
| #64 Chat-bridge pilot (D-017) | `cursor/portfolio-omni-analytics-7a1c`, stacked on #42 | Design until #42 lands; its 14-seat Grok fleet is superseded by v2 in `grok-bot-org`. |
| #61 Recruiting competitive pass | `cursor/recruiting-competitive-pass-3dc5` | Product PR; `[blocked-by]` references in recent backlogs point here. |
| #60 (draft) 25+ years and GBP facts | `cursor/gbp-site-facts-99a0` | Copy claims need owner verification before merge (see `src/__tests__/unverifiable-claims.test.ts`). |
| #59 Restore Cursor automation fleet | `cursor/loadoff-agent-fleet-ba94` | Superseded (D-006 in the fleet decision log — `ranvir01/grok-bot-org/fleet/docs/DECISIONS.md` — and issue #87); close. |
| #58 Cursor Cloud environment docs | `cursor/cloud-dev-environment-agents-b108` | Docs; check against `docs/ops/AGENT_INTEROP.md` §5 before merge. |
| #56 Throttle `/api/hub/role-hint` | `cursor/role-hint-throttle-ba94` | Security hardening; review and drain. |
| #55 Simulation is the default running state | `cursor/bc-8a633086-…-c0cb` | Product decision for the owner. |
| #54, #53 (drafts) Improvement-cycle copy maps | `cursor/hauldesk-improvement-cycle-*` | Stale drafts; close unless the copy is still wanted. |
| #42 Fleet hub: should-queue, 14-seat Grok org, AR Payments, dunning | `cursor/fleet-24-7-liveness-931f` | Base of #64; the Grok part is superseded, the fleet docs (`docs/ops/FLEET.md`, CLAUDE-START, CURSOR-START) live only here — owner decides what to salvage. |
| #41 (draft) stale Dockerfile record | `cursor/env-snapshot-no-docker-931f` | Historical; `docs/ops/AGENT_INTEROP.md` §5 already records it; close. |
| #12 Mobile sandbox launch workflow | `cursor/bc-acca3c16-…-052a` | June; re-evaluate against `.github/workflows/`. |
| #6 (draft) Mobile apply button + DOT application save | `cursor/driver-application-pipeline-mobile-f5d2` | June; the apply flow was rebuilt since (#63); close after checking nothing unique remains. |

### Open issues

#90 and #87 — fleet patches on the issue bus, waiting for a collaborator to label `should` + `venture:loadoff` (patch copies in `grok-bot-org/fleet/patches/`); #85, #81 superseded by #87, close when it lands; #68 nightly E2E red (`should`); #67 Career OS parked (`needs-owner`, never `should`); #66 DVIR `awaiting_repair` not surfaced at dispatch; #65 shared `COMMITTED_STATUSES` for `checkSandboxInvariants`.

### Branches

`npm run agent:branches` lists **158 `claude/*` branches with commits not on `main`** (measured). Most are stale lane branches from July–August with thousands of "unpicked" commits that are really old history; do not mass-merge. Triage is `npm run branches:triage` (reports, never deletes) and the branch reaper (D-001, dry-run). One branch, one writer; the integrator absorbs session branches one at a time.

---

## 3. What is built

Entry points are directories unless a file is named. Tests for each area sit in `src/lib/hub/__tests__/`.

| Area | What exists | Where |
| --- | --- | --- |
| Today + dispatch | Today command center (loads due, unconfirmed drivers, missing PODs, money not yet invoiced), dispatch board, week planner, live map (needs an ELD feed), capacity board, facilities | `src/app/hub/(office)/{page.tsx,dispatch,planner,map,capacity,facilities}`, `src/lib/hub/{today,planner,eta,geo,routing}.ts` |
| Loads + load board | Load CRUD with stops, statuses, duplicate-load guard, load board with inline edit and CSV export, paste-a-rate-con intake, freight search against DAT / Truckstop adapters | `src/app/hub/(office)/{loads,loadboard}`, `src/lib/hub/{loads,loadboard,loadboard-export,rate-con-to-form,parser}.ts`, `_actions/{loads,loadboard,dat-freight,truckstop-freight}.ts` |
| Money | Rate confirmation → invoice → payment → pay-rules settlements; escrow, advances, expenses, 1099-NEC export, QuickBooks IIF export, customer statements, factoring packet, AR aging and reminders (`ar-reminders` cron), auto-invoice cron | `src/lib/hub/{invoices,settlements,pay-rules,pay-rules-db,money,advances-core,expenses,cash-cycle,reports}.ts`, `_actions/money.ts`, `src/app/api/hub/exports/[kind]` |
| Fuel + IFTA | Fuel CSV import, fuel-card adapters (file-drop), MPG and fraud flags, IFTA quarter computation to the penny with filing guards, worksheet PDF, Rust parity engine | `src/lib/hub/{fuel,fuel-core,ifta,ifta-core,ifta-pdf,eld-import}.ts`, `services/rust/hauldesk-compute` |
| Compliance + safety | Expiry wall (CDL, med card, registration, inspection, insurance), HVUT, filings, DOT accident register, claims, random testing, DVIR, safety events and score, FMCSA authority checks (`fmcsa-recheck` cron) | `src/app/hub/(office)/{compliance,safety}`, `src/lib/hub/{compliance,filings,hvut,incidents,claims,random-testing,dvir,safety-score,vetting}.ts` |
| Driver PWA | Installable app at `/hub/driver`: offline shell, IndexedDB intent queue, camera PODs (auto-opens OS&D claims, receipts → expenses), status taps, chat, pay stubs, DVIR, time-off, advances, HOS display (needs ELD data), web push | `src/app/hub/driver`, `src/components/hub/driver/**` (offline queue), `public/hub-sw.js`, `public/hub.webmanifest`, `src/app/api/hub/push` |
| Portals + tracking | Broker/shipper portal with invitation flow, portal file visibility on top of tenancy, public tracking share links with expiry (`migrations/hub/024_share_link_expiry.sql`), status updates to customers | `src/app/hub/portal`, `src/app/track/[token]`, `src/lib/hub/{portal,sharelinks,customers,broker-updates}.ts` |
| Inbox + document intake | Docs mailbox polling (IMAP, Gmail app password or OAuth), attachment classification, staged rate-con drafts at `/hub/inbox` (ADR 0005 — automation stages, humans book), heuristic + LLM parsing with PII redaction and a no-key fallback | `src/lib/hub/{mailbox,mailbox-oauth,intake-drafts}.ts`, `src/lib/hub/doc-intake/`, `src/app/hub/(office)/inbox` |
| Integrations | Registry-driven provider cards and credential vault (`CREDENTIALS_KEY`), 19 providers, per-provider adapters, HMAC-verified webhook receiver, per-run `hub.integration_syncs` rows, sync crons; every provider has a CSV or manual fallback | `src/lib/hub/integrations/`, `src/lib/hub/{credentials,telematics}.ts`, `src/app/api/hub/webhooks/[provider]`, `docs/integrations/` |
| Auth, roles, tenancy | NextAuth v5 credentials + TOTP, role landing, `requirePermission` matrix (owner / dispatcher / accountant / driver / broker / shipper / platform admin), signup throttle, application-level tenant isolation with an automated harness (ADR 0002) | `src/lib/hub/{session,permissions,auth-throttle,totp,tenancy,driver-invite}.ts`, `src/app/hub/_actions/onboarding.ts`, `src/proxy.ts`, `src/app/hub/{login,signup,admin}` |
| Onboarding + setup | Workspace signup, Smart Setup document extraction, 15-step setup guide, demo tenant, sandbox simulation with invariants and a ticker | `src/app/hub/(office)/setup`, `src/lib/hub/{setup-guide,setup-progress,sandbox*,demo*}.ts` |
| Office chrome | Command palette, notifications bell + in-app notifications (compliance alerts and owner digest now write in-app first, then email — `d1541f9`, `273a87f`), help center, tour, custom fields, feature flags, three themes × light/dark token system | `src/components/hub/`, `src/app/hub/hub-theme.css`, `DESIGN.md` |
| Recruiting + CRM | Applicants, recruiting posts, outreach drafts, website leads with attribution, referrals, driver scorecards | `src/app/hub/(office)/{recruiting,leads,outreach}`, `src/lib/hub/{recruiting,recruiting-shared,website-leads}.ts`, `src/lib/hub/outreach/` |
| Marketing site | Home, pay pages, apply / pre-qualify wizard (phone-first, #63), jobs + share posts + refer (#63), state pages under `/cdl-jobs`, resources, tools, trust, brokers/shippers pages, business card, sitemap/robots | `src/app/*`, `src/components/{home,application,driver-form,cinematic,features,fleet,shared}` |
| Sidecars | Go worker (`/health`, `/route/miles`) and Rust compute (`/health`, `/ifta/summary`), shared-secret gated, pure-TS fallback when unset | `services/go/hauldesk-worker`, `services/rust/hauldesk-compute`, `src/lib/hub/sidecars.ts`, `Makefile` |
| Tooling | Migrate, seed, go-live and connections checks, typecheck gate (ratchet at 0), license audit + notices, token lint, JS budget, design QA, a11y and Lighthouse audits, branch inventory / triage / backlog collectors, git identity, e2e runner | `scripts/`, `package.json` scripts |
| CI + automation | `unit` job (vitest + token-lint + cursor-env-check with a Postgres service) on every push/PR; nightly full e2e rig; integrator drain; merged-branch prune; branch reaper (dry-run) | `.github/workflows/`, `.cursor/automation/`, `docs/claude-routines.md` |

---

## 4. Mid-flight and not done

Ordered roughly by consequence. Source in brackets. Tags follow `docs/ops/AGENT_INTEROP.md` §4 — an untagged item is claimable by any agent.

**Production blockers (owner clicks, not code)**
- `[needs-owner]` Production `SMTP_PASS` / `EMAIL_PASS` is a rejected Gmail app password; every mail path (apply form, pre-qualify, invoices, settlements, driver invites, compliance emails, owner digest) is dead until it is rotated in Vercel. In-app fallbacks for compliance alerts and the digest shipped (`d1541f9`, `273a87f`) so the office still sees them. [commit Backlogs 2026-09-03 → 09-06]
- `[needs-owner]` Confirm `CRON_SECRET`, `CREDENTIALS_KEY`, `BLOB_READ_WRITE_TOKEN`, `FMCSA_WEBKEY` are set in Vercel production. Unset `CREDENTIALS_KEY` makes all 19 providers unconnectable; unset `CRON_SECRET` 401s all 19 crons. `npm run go-live:check` against the production URL answers this in one command. [`docs/ops/STUB_INVENTORY.md` §0, `docs/ops/RELEASE_READINESS.md` §7 — 2026-07-25, re-verify]
- `[needs-owner]` Legacy public blob URLs: uploads made while `access: "public"` was in force stay world-readable until the one-time migration in `docs/ops/HANDOFF.md` §1 runs, and it needs the owner's (a)/(b) decision first. Confirm current `src/lib/hub/documents.ts` behaviour before acting — the code half was fixed after that doc was written.

**Integrations**
- `[needs-owner]` DAT: the two-level token exchange is built (`101fc4c3`, `src/lib/hub/integrations/dat.ts`) but unverified against real DAT staging; registry stays `stub` until confirmed. [`docs/ops/STUB_INVENTORY.md`, 2026-09-06 pass]
- EFS / WEX / Comdata REST endpoints do not exist; the working path is the signed file drop, which needs a forwarder built. Factor posts to a placeholder host until `FACTOR_API_BASE` names a real vendor. Truckstop defaults to the sandbox host. Terminal cannot receive webhooks (no `webhookSecret` field, no event processor). QBO cannot mint its first refresh token (no `authorization_code` grant). [`docs/ops/STUB_INVENTORY.md` §1, §4]
- Nine newer registry entries (`axle`, `atob`, `plaid`, `bestpass`, `prepass`, `drivewyze`, `fleetio`, `sambasafety`, `stedi`) are `stub` and are not covered by the 2026-07-25 inventory at all — inventory them before promising anything. [measured from `registry.ts`]

**Product**
- `[needs-owner]` Fuel / toll auto-chargeback into owner-operator settlements: attribution window, who, filter — do not implement until decided. [`docs/qa/_handoff.md`, commit Backlogs]
- Hub seed, `src/lib/hub/outreach` drafts, `public/llms.txt` and a branding SVG still say $0.63/mi while the public site moved to $0.65 (`d5c412b`). `[blocked-by integrator]` — shared files.
- `[needs-owner]` The sign-on bonus line dropped from `PayTable` renders as "$1,000 (First Year)" verbatim; confirm the wording before it returns.
- #66 DVIR `awaiting_repair` not surfaced at dispatch; #65 shared `COMMITTED_STATUSES` for `checkSandboxInvariants`.
- Decisions carried from `docs/ops/HANDOFF.md` §2 (2026-07-25) that may still be open: IFTA re-import REPLACE vs MERGE; chase draft invoices or not; real cost per mile (defaults to 185¢); owner-dashboard net margin; reports net-margin revenue base; signup throttle budget; carrier timezone; 1099 year picker UI. Check each against current code before re-filing.
- Career OS is parked (#67): proof-only hunt, `needs-owner`, never `should`.

**Quality and performance**
- #68 nightly e2e rig red on alternating nights — the two selector fixes in `992edc2` landed; something else still fails. Artifacts upload on every red run.
- `[needs-browser]` 12 marketing routes sit above the 170 KB JS target (worst `/pay-rates` ~255 KB; ceiling ratchet 285 KB in `scripts/js-budget.mjs`). Measure only from a verified-complete `rm -rf .next && npm run build`.
- `/resources` is ~13.8 phone screens; splitting per category is an IA call. FAQ items beyond eight have no page. `.brand-page-shell` / `[data-light]` carry ~78 `!important` overrides.
- Decide the hub token-lint allowlist (QrCode, FleetMap canvas, swatch presets) and flip `TOKEN_LINT_HUB_STRICT` on.
- `npm run lint`: one pre-existing `react-hooks/set-state-in-effect` error (see §2) — fix it and add lint to the local verify chain.
- `TEST_GAPS.md` still-open rows: #11 detention downward revision (owner design decision), #12 `scorecard_bonus` tier table (product decision). Coverage on `src/app/**` (actions and routes) was 20% statements on 2026-07-25 — the engine is well tested, the layer that calls it is thinner.
- Offline-queue replay idempotency for `submitDvirAction` / `fileDriverIncidentReport` (a `clientRequestId` + unique index) — carried from closed PR #19. [`docs/ops/TEST_GAPS.md` tail]

**Fleet and docs**
- `[needs-owner]` Protect `main` on this repo (require a pull request, no direct pushes) now that the Grok bots hold a push-capable token for their `grok/*` branches; confirm `drain-integrator.yml` keeps its bypass first, since it pushes `main` with the Actions token.
- #87 / #90 fleet patches wait on a `should` label; `docs/ops/FLEET.md`, CLAUDE-START and CURSOR-START exist only on PR #42's branch. The Grok org design in `docs/grok-bots/` (on that branch) is superseded by `ranvir01/grok-bot-org` v2.
- `docs/ops/HANDOFF.md`, `RELEASE_READINESS.md`, `TOP_10.md`, `STUB_INVENTORY.md`, `TEST_GAPS.md` are 2026-07-25 audits with later patches; treat their dollar figures as seed-data arithmetic (they say so themselves).
- Mobile app phases 2 (Play via TWA) and 3 (iOS via Capacitor) are documented only; SMS critical-alert fallback is planned, not built. [`README.md`]

---

## 5. Architectural rules — exact, with the thing that enforces each

| Rule | Enforced by |
| --- | --- |
| Money is integer cents; `dollarsToCents` (`src/lib/hub/types.ts`) on input, `roundHalfAwayFromZero` (`src/lib/hub/rounding.ts`) for rounding; a float in a money path is a bug | `money.test.ts`, `pay-rules.test.ts`, `draft-settlements-loads.test.ts`, `pay-per-mile-cents.test.ts` |
| Every hub query is carrier-scoped; cross-table writes guard both sides with `assertCarrierRefs` (`src/lib/hub/tenancy.ts`); new tenant-owned table = isolation test | `*-tenancy.test.ts` (30+ files), `cross-tenant-harness.test.ts`, `portal-isolation.test.ts`, `driver-file-isolation.test.ts`; ADR `docs/decisions/0002` |
| Mutations only in `src/app/hub/_actions/*` behind `requirePermission`; money mutations call `logAudit`; driver and portal have their own guards | `money-actions-permissions.test.ts`, `office-actions-permissions.test.ts`, `portal-actions-validation.test.ts` |
| Office surfaces use semantic tokens only; driver and portal are forced dark and never use `text-fg*` / `bg-surface*` / `border-border*`; no opacity modifiers on CSS-var colours | `driver-accent-tokens.test.ts`, `hub-theme-tokens.test.ts`, `npm run token-lint`, `npm run design-qa` |
| Migrations are append-only `migrations/hub/NNN_*.sql`, idempotent, applied by `npm run db:migrate`; never edit an applied one | `scripts/hub-migrate.mjs`, the `migrate` cron |
| `registry.ts` is the only provider list; adapters are stub-first against `mock.ts`; upsert on `(carrier_id, source, external_id)`; a `hub.integration_syncs` row every run; CSV fallback never removed; webhooks HMAC-only; never log credentials | `integration-contract.test.ts`, per-adapter tests, `webhooks-route.test.ts`, `integration-webhook-url.test.ts`, `credentials.test.ts` |
| Three languages, fixed boundaries: TS gateway, one Go worker, one Rust compute; sidecars never touch Postgres; `HAULDESK_SIDECAR_SECRET` gates work endpoints; Rust/TS golden parity in one commit | `sidecars.test.ts`, `npm run test:sidecars`, `docs/architecture/trilingual-stack.md` |
| Company facts from `src/lib/constants.ts`; no unverifiable public claims | `unverifiable-claims.test.ts`, `pay-figures-in-range.test.ts`, `recruiting-copy.test.ts` |
| Route protection lives in `src/proxy.ts`; the PWA's root-level static assets are never swept into the auth gate | `proxy-routing.test.ts`, `proxy-hub-routing.test.ts`, `installed-app-redirect.test.ts` |
| Crons are declared in `vercel.json` only, served by one route behind `CRON_SECRET`, Hobby-safe | `cron-route.test.ts`, `hobby-cron-guard.test.ts` |
| Type debt ratchets down only (baseline 0); JS budget ratchets down only | `scripts/typecheck-gate.mjs`, `scripts/js-budget.mjs`, `typecheck-hook-guard.test.ts` |
| Every schedule is a row on one clock; two schedulers never share a minute | `docs/ops/AGENT_INTEROP.md` §1, `drain-workflow-guard.test.ts`, `hobby-cron-guard.test.ts` |
| Dependencies: no heavy additions; permissive licenses only per `PERMISSIVE_LICENSES` in `src/lib/license-policy.ts`, no strong copyleft (GPL / AGPL / SSPL / LGPL), weak copyleft (MPL-2.0) only unmodified | `npm run license:audit`, `license-policy.test.ts` |
| Do not build: the list in `docs/small-carrier-v1-master-prompt.md`; no webview shell (ADR 0003); no billing code in the SaaS lane (ADR 0004 is the design, not a build order); no microservice sprawl | review |

---

## 6. How agents work here

1. **Sync** — `npm run git:identity` · `git pull` · `npm run hooks:install` · `npm run agent:status` · `npm run agent:branches` · export the no-phone-home block (end of `.env.example`). Read the newest commits' `Backlog:` (`npm run agent:backlog`).
2. **Pick** — one item: red `main` first, then `should` issues, then §4 above, then untagged `Backlog:` items. `[needs-owner]` goes to `docs/ops/DECISIONS.md`, never to an agent.
3. **Check nobody already fixed it** — `git log --all --oneline --grep="<bug>"`; a fix on an unmerged branch is cited, not rewritten.
4. **Build** — smallest change that ships value, inside the lane territory (`docs/agent-improvement-loop.md` §5), failing test first.
5. **Verify** — §7 below. What the Cursor image cannot run gets `[needs-browser]` / `[needs-sidecars]`, never a silent skip, never a moved ratchet.
6. **Ship** — one finished item per commit on a single-writer branch; never `main` (its writers are listed in `AGENT_INTEROP.md` §2), never the integrator branch. `claude/*` branches are absorbed by the `:00` integrator into the integrator branch, and the `:17`/`:47` drain Action and the `:59` deploy agent publish `main` on the clock (`AGENT_INTEROP.md` §1); `cursor/*` and `grok/*` branches reach `main` through a PR the owner merges. An agent never merges into `main` itself. Do not race the clock.
7. **Record** — commit body ends with `Backlog:` and the four tags. The commit body is the only channel between platforms.

Preambles to paste at the top of an agent prompt: [`docs/claude-routine-preamble.md`](docs/claude-routine-preamble.md), [`docs/cursor-agent-preamble.md`](docs/cursor-agent-preamble.md).

---

## 7. Verification chain

```bash
npm ci --ignore-scripts && npm rebuild bcrypt sharp      # the CI install
cp .env.example .env.local                                # POSTGRES_URL + NEXTAUTH_SECRET minimum; CREDENTIALS_KEY + CRON_SECRET to exercise the vault and crons
npm run db:migrate && npm run seed:demo                   # demo logins are in scripts/seed-demo.mjs
npm run build && npx vitest run && node scripts/typecheck-gate.mjs && npm run lint
npm run token-lint                                        # marketing UI touched
npm run license:audit                                     # dependencies touched
npm run test:sidecars                                     # services/** touched (Go + Rust)
npm run design-qa; npm run js-budget; npm run qa:a11y     # UI; needs a browser and a running production build
npm run connections:check; npm run go-live:check          # env / integration changes
npm run prod:smoke                                        # production health after a deploy
```

Gates that ratchet: `TEST_ERROR_BASELINE` (0) and `CEILING_KB` (285). If a change genuinely needs budget, say so in the commit body; never move the number quietly.

---

## 8. Credit and telemetry policy (owner rule, 2026-09-10)

- Git author **and** committer are the owner (`npm run git:identity`; the `.claude/settings.json` SessionStart hook runs it). No commit trailer, PR line, footer, or badge names a tool, model, vendor, or bot. Nobody states which AI tool wrote code — in commits, PR bodies, issues, docs, or public copy. Pushed history is never rewritten to change attribution.
- Nothing phones home: every agent environment exports the block at the end of `.env.example` (`DO_NOT_TRACK`, `NEXT_TELEMETRY_DISABLED`, `DISABLE_TELEMETRY`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, `SUPERPOWERS_DISABLE_TELEMETRY`) and runs `go telemetry off` once per machine (Go's `GOTELEMETRY` is read-only); the npm-running CI jobs set the two that apply on a GitHub runner (`DO_NOT_TRACK`, `NEXT_TELEMETRY_DISABLED`). Any plugin, skill, MCP server, or CLI is enabled only after `skills/plugin-audit.md` (in `ranvir01/grok-bot-org`) has passed it.
- License notices on vendored third-party code stay — `npm run license:notices` regenerates `THIRD_PARTY_NOTICES.md`. Credit for the work is the owner's; the notice is the law.
- Full text: [`docs/ops/AGENT_INTEROP.md` §8](docs/ops/AGENT_INTEROP.md).

---

## 9. Decisions only the owner makes

Standing queue: [`docs/ops/DECISIONS.md`](docs/ops/DECISIONS.md) on `main` holds D-001 (branch reaper), D-002 (semver-major bumps) and D-003; the later rows (D-004 … D-017, including D-005/D-006 on the Cursor automations) exist only on PR #42's branch and in the reference copy `ranvir01/grok-bot-org/fleet/docs/DECISIONS.md`. Plus, from this file: the production env confirmations in §4, the legacy-blob migration choice, the DAT staging verification, fuel/toll chargebacks, the sign-on bonus wording, IFTA re-import semantics, the real cost per mile, and `main` branch protection now that the Grok team runs in write mode B (`ranvir01/grok-bot-org/GROK-BOT-SETUP-V2.md` rule 2, since 2026-09-10: Dexter, Rex and Steve commit on their own `grok/<seat>-<ticket>` branches and open PRs; the owner merges).

---

## 10. Deliberately not built

The do-not-build list in [`docs/small-carrier-v1-master-prompt.md`](docs/small-carrier-v1-master-prompt.md); embedding third-party sites in-app (ADR 0003 — integrate the data, not the page); Stripe billing code (ADR 0004 is the design; the SaaS lane builds no billing); a second load board; more than one Go and one Rust sidecar; a parallel sync to the previous dispatch spreadsheet; native mobile wrappers before Phase 2 numbers exist; Career OS (#67, parked).

---

## Where the rest lives

| Need | File |
| --- | --- |
| Demo path | `docs/demo-script.md`, `docs/sales-demo.md` |
| Go-live checklist and env | `docs/hub-go-live-requirements.md`, `.env.example`, `docs/deployment.md` |
| Integration credentials, per provider | `docs/integrations/*.md`, `docs/integrations/creds-shopping-list.md` |
| Phase plan and build prompts | `docs/phases/`, `docs/tms-master-prompt.md`, `docs/small-carrier-v1-master-prompt.md` |
| Design system | `DESIGN.md`, `docs/design/`, `.cursor/skills/thind-brand-identity` |
| QA ground truth (settlement worksheets, isolation cases, 1099) | `docs/qa/` |
| Owner engineering workflow | `docs/ops/OWNER_DEV_WORKFLOW.md`, `docs/OWNER-CHECKLIST.md`, `OWNER-TEST-DRIVE.md` |
| The Grok bot org and its boot prompt | `ranvir01/grok-bot-org` — `GROK-MASTER-PROMPT.md`, `GROK-BOT-SETUP-V2.md`, `Handoff.md` |
