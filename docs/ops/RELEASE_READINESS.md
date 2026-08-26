# Release Readiness — LoadOff TMS

Ship/Gaps/Stub rating for every feature area, with the exact work left before a paying carrier depends on it.

**Generated 2026-07-25 against main@c52ec254.** Measured live: `npx vitest run` (189 files / 1592 tests, all pass), `npx tsc --noEmit` (0 errors in app code; 108 diagnostic lines across 32 files under `src/**/__tests__`, which vitest never typechecks), `npm run connections:check`, direct SQL against the migrated + seeded Postgres (`hub` schema, 66 tables, 2 carriers), and file-by-file reads of every module named below. Inferred, not measured: hour estimates, and any claim about production Vercel Blob behaviour (no prod access this session). No GitHub API/write access this session — no PR numbers are cited because none can be read.

---

## 1. Scorecard

| Area | Rating | Evidence (file:line) | Work remaining | Est. hours |
|---|---|---|---|---|
| Auth + RBAC | **Gaps** | `src/lib/hub/permissions.ts:25-48` (21 actions × 7 roles); `src/lib/hub/session.ts:166-173` re-checks active user + active carrier per request. 20 of 33 files in `src/app/hub/_actions/` call `requirePermission`. | Apply the matrix to the 7 `requireOfficeUser`-only files; add the active/suspended re-check to `messages.ts`; throttle signup. Full gap list in §2. | 10–14 |
| Tenant isolation | **Ship** (one production break, §3) | 488 raw SQL statements across 90 files scanned (count independently reproduced); 41 lack a literal `carrier_id`, of which 21 are on `carrier_id`-bearing tables — all 21 resolve to an id a carrier-scoped query already validated, or are global by design. `src/lib/hub/tenancy.ts:25-40` `assertCarrierRefs` guards the 11 FK fields declared in `REF_TABLES` at `:11-21`. Live: 0 cross-tenant rows on 4 integrity checks. | Fix `documents.ts` public blob (§3). Add query-level scoping to the 3 latent spots. Wire `scripts/e2e-tenant-isolation-smoke.mjs` into CI (it needs puppeteer + a live server, so `vitest run` does not cover it). | 4–6 |
| Dispatch | **Ship** | `src/app/hub/(office)/dispatch/page.tsx:42-60` board; `planner/page.tsx`; `map/page.tsx`; `capacity/page.tsx`; `src/lib/hub/loads.ts` (420 ln); `src/lib/hub/planner.ts:185-209` empty-ETA from last ping. Weather is best-effort and never blocks the board (`dispatch/page.tsx:36`). | Nothing blocking. `dispatch/page.tsx:24-40` fires up to 10 `getLoadStops` + NWS fetches per render on a `force-dynamic` page — concurrent, not serial (`Promise.all` at `:28`, `slice(0, 10)` at `:27`), so it is a fan-out not a chain. Fine at 20 loads, more DB round-trips than needed at 200. | 0 (2–3 to batch the N+1) |
| Invoicing | **Gaps** | `src/lib/hub/invoices.ts:64` `createInvoiceFromLoad` is manual and gated on status ∈ {pod_received, delivered} (`invoices.ts:72`). Overdue dunning is automated (`invoices.ts:310`, cron `ar-reminders`). No DSO metric exists anywhere in `src/`. | Auto-invoice on `pod_received` (or a cron that does it), plus a DSO number on the money page. Largest lever by mechanism, unsized in dollars — §6. | 6–8 |
| Settlements | **Ship** | `src/lib/hub/pay-rules.ts:285-292` is the only place net is derived (`netCents: grossCents - deductionsCents`, returned at `:292`); `money.ts:104-118` is a thin bridge onto it. Escrow posts a running balance at `settlements.ts:295-302`. Live: both seeded settlements reconcile to residual 0 and their `settlement_lines` sum exactly to `gross_cents`/`deductions_cents`. | None blocking. `settlement_lines` has no `carrier_id` column (confirmed via `\d hub.settlement_lines`) — it is scoped only through its `settlement_id` FK. | 0 |
| Fuel + IFTA | **Gaps** | `src/lib/hub/ifta-core.ts:37-95` computes to the penny (golden fixture `__tests__/ifta.test.ts:14-40` proves $23.60 net incl. IN surcharge). Filing guards are strong: `ifta.ts:240-244` blocks filing with missing rates, `ifta.ts:248-260` blocks filing on rates that changed after compute. **Two real bugs — §4.** | Dedupe the mileage import; make pings and imported miles additive instead of pings-wins. | 5–7 |
| Compliance | **Ship** | `src/lib/hub/compliance.ts:29-123` builds the wall from driver CDL/med-card + truck registration/inspection/insurance expiries; `ifta.ts:176-216` adds the quarterly filing itself. `random-testing.ts:168-190`, `incidents.ts` (145 ln, incl. accident-register CSV at `:124`), `claims.ts:77` with a Carmack 9-month deadline. Cron `compliance-scan` daily. | Live DB has 0 `dvirs`, 0 `random_test_events`, 0 `claims` — the modules are written and unit-tested but have never run against real data. | 0 code; 2 to dry-run |
| Driver PWA | **Ship** | Real, not shells: `public/hub-sw.js` (128 ln, shell cache + push + notification click); `src/components/hub/driver/offline-queue.ts` (222 ln, IndexedDB intent queue; photos serialised to `QueuedFile {name,type,buffer}` at `:40-41` and carried on the intent at `:45`), imported by 8 client files (7 driver forms + `OfflineSync.tsx`). Camera POD at `_actions/driver.ts:127-241` also auto-opens an OS&D cargo claim (`:171-190`) and turns receipts into reimbursable expenses (`:192-215`). Chat, pay stubs (`driver/pay/page.tsx:16`), DVIR, time-off, advances all real. | HOS is display-only and returns null until an ELD lands data (`driver-app.ts:151-165`); live `hos_snapshots` = 0 rows. Not a defect, but the driver home shows no clocks today. | 0 |
| Doc-intake | **Gaps** | `doc-intake/llm-parser.ts:146` calls `redactPiiForLlm` **before** the `fetch` at `:148` — redaction path confirmed to run. But `doc-intake/pii.ts:6-17` only strips SSN, EIN, `CDL #`, and phone: names, street addresses, DOB, MC/DOT and dollar amounts all go to the API verbatim. Only consumer is the setup wizard (`_actions/setup.ts:278`, guarded by `requirePermission("fleet:write")` at `:282`). | No confidence threshold and no human review queue. Confidence is carried end to end in the pipeline (`parsers.ts:21-22`, `llm-parser.ts:27-29,50-51`, `merge-analysis.ts:14` picks the higher-confidence field) and then dropped at the UI: the string `confidence` does not appear anywhere in `SmartSetup.tsx`, which builds its field list at `:143` and renders every one at `:213-215` with no gate. `analyzeSmartSetupAction` has no `low`-confidence branch. Add a threshold + a "needs review" state. Extend redaction to name/address/DOB. | 8–10 |
| Customer portal | **Gaps** | Real and carefully scoped: `session.ts:135-152` `requirePortalUser` binds to `customerId`; `portal.ts:232` `portalFileVisible` holds external users to a portal contract on top of tenancy. Public tracking via `sharelinks.ts:28` (128-bit token, revocable, GPS rounded to ~1.1 km at `:87-93`), and `sharelinks.ts:26` `assertCarrierRefs(carrierId, { load_id })` blocks minting a token for a foreign load. | Surface is 3 pages (`portal/page.tsx`, `portal/loads/[id]/page.tsx`, `portal/accept/[token]/page.tsx`). Live `portal_invitations` = 0 — never exercised end to end. Share links have **no expiry**, only manual revoke (`sharelinks.ts:37-42`); confirmed at the schema level — `\d hub.share_links` has `revoked_at` and no `expires_at`. `welcome/page.tsx:11-17` (`ROLE_COPY.broker/.shipper`) still tells brokers the portal is "on the way". | 5–7 |
| Integrations registry | **Stub in practice** | `integrations/registry.ts:17-21` defines `live` as "client implemented and activatable with credentials" — **not** connected. 8 providers `live`, 2 `stub` (qbo `:138`, factor `:147`). Live DB: `api_credentials` = **0 rows**, `integration_syncs` = **0 rows**. Every provider has a working CSV/manual fallback (`fallback:` on each spec). | Zero integration has ever authenticated. Nothing to build — this is credentials + one sync run per provider Ranvir actually wants. | 1–2 per provider |

---

## 2. RBAC: the named gap list

`requirePermission` (matrix-enforced) in 20 of 33 action files: `loads, money, import, recruiting, people, compliance, fleet, safety, setup, routing, random-testing, fuel, dat-freight, truckstop-freight, portal, vetting, dvir, recurring, planner, loadboard`.

The 13 that do not, and what that means:

| File | Guard used | Consequence |
|---|---|---|
| `_actions/capacity.ts:24,48` | `requireOfficeUser` | An `accountant` (no `loads:write`) can post and delete truck capacity on the public load board. |
| `_actions/comms.ts:28,69,102,121` | `requireOfficeUser` | Accountant can publish company announcements, request driver documents, and approve/deny time off. |
| `_actions/facilities.ts:34,83,106` | `requireOfficeUser` | Accountant can edit facility records and post office notes. |
| `_actions/leads.ts:13` | `requireOfficeUser` | Any office role can move website leads. Low stakes. |
| `_actions/outreach.ts:38,58,84,96,115` | `requireOfficeUser` | Any office role can generate and **send** outbound prospect email under the carrier's name. |
| `_actions/packet.ts:19,47,86,113` | `requireOfficeUser` | Any office role can email the carrier packet and sign agreements. |
| `_actions/tasks.ts:26,50,62,73,84` | `requireOfficeUser` | Any office role can create/complete/delete tasks. Acceptable by design; make it explicit. |
| `_actions/company.ts:37,82` | `requireOwner` | Stricter than the matrix. Means `settings:manage` (`permissions.ts:18`) is never actually consulted. |
| `_actions/integrations.ts:33,69,92,130` | `requireOwner` | Stricter than the matrix. Fine. |
| `_actions/messages.ts:61,99,175` | `getHubUser` only | **Real gap.** Thread ACL at `messages.ts:34-57` is correct, but there is no `isActiveUser`/`isActiveCarrier` re-check. `session.ts:33-38` states that standard for every other guard: a deactivated user or a suspended tenant keeps full read/write messaging for the life of the JWT (~30 days). |
| `_actions/admin.ts:19` | `getHubUser` + `isActivePlatformAdmin` | Correct — platform admin has no `carrier_id`, so it cannot reuse the scoped check. |
| `_actions/onboarding.ts:94` | none (pre-auth by design) | **Real gap.** `createWorkspaceAction` is unauthenticated *and* unthrottled. `auth-throttle.ts` is wired at exactly one place — `src/app/api/auth/[...nextauth]/route.ts:24` (login). Signup is a free carrier+user+settings+price-book insert loop. |
| `_actions/driver.ts` (9 actions) | `requireDriverUser` | Correct for all 9. |

Also: 4 office pages carry no guard of their own and rely solely on `src/app/hub/(office)/layout.tsx:6` (`requireOfficeUser`) — `customers/new`, `drivers/new`, `fleet/trailers/new`, `import`. Authentication is covered; the matrix is not, so an accountant can open forms whose underlying actions will reject. Cosmetic, but it is the only inconsistency in an otherwise uniform `requirePermissionPage` pattern.

---

## 3. Tenant isolation: the one production break

**Every uploaded document is a public, unauthenticated URL in production.**

`src/lib/hub/documents.ts:18` — `await put(\`hub/${safeName}\`, file, { access: "public" })`, and again at `:57` for generated PDFs. Both are inside `if (process.env.BLOB_READ_WRITE_TOKEN)` (`:16`, `:54`), so when the token is set (i.e. on Vercel) this is the storage path for PODs, BOLs, CDL scans, medical cards, W-9s, COIs, driver receipts, invoice PDFs, and settlement statements. The installed `@vercel/blob@2.4.0` accepts `access: 'private'` on `put` — `PutCommandOptions extends CommonCreateBlobOptions` (`node_modules/@vercel/blob/dist/index.d.ts:6`), whose `access: BlobAccessType = 'public' | 'private'` is declared at `node_modules/@vercel/blob/dist/create-folder-DFjrvss1.d.ts:37,44`. (`index.d.ts:128-132` is `GetCommandOptions`, the read side, not the write side.) This is a one-word change plus a signed-read route.

The local dev path is guarded meticulously by comparison: `src/app/api/hub/files/[name]/route.ts:20-36` requires a session, resolves the owning carrier, and holds broker/shipper accounts to `portalFileVisible` on top of tenancy. `__tests__/files-route-tenancy.test.ts` and `portal-file-visibility.test.ts` both test **that** route. Neither exercises the blob path, so the entire test suite passes while production serves the files to anyone with the URL. URLs are unguessable (`randomUUID()` prefix at `documents.ts:14`) but they are shared — into broker email, factoring packets (`invoices.ts:488`), and share links — and once shared they never expire and cannot be revoked.

**Everything else in tenant isolation is sound.** Scan method: extract every backtick template literal in `src/**/*.{ts,tsx}` (excluding `__tests__`) that references `hub.<table>` and contains SELECT/UPDATE/INSERT/DELETE — 488 statements across 90 files (re-run independently: exactly 488/90, of which 41 contain no literal `carrier_id`). 21 of those 41 touch a `carrier_id`-bearing table; the other 20 are on tables with no `carrier_id` column. All 21 triaged by reading the call site:

- **Global by design (6):** `onboarding.ts:124` and `driver-invite.ts:169` and `portal.ts:56` (email uniqueness must be cross-tenant); `portal.ts:37,67` (invitation lookup by secret token); `session.ts:71` (platform admin has no carrier scope); plus 3 `to_regclass` introspection probes (`settlements.ts:53,73`, `driver-app.ts:159`).
- **Id already validated upstream (12):** e.g. `_actions/planner.ts:59` — the `loadId` is proven carrier-scoped at `:38-45` four lines earlier; `random-testing.ts:186` — `row.id` comes from the carrier-scoped SELECT at `:174`; `dvir.ts:183` — the `dvirId` is from the same transaction's own INSERT; `event-processors.ts:74` — `row.id` from the scoped SELECT at `:63`; `notify.ts:101,121` (globally-unique `user_id`).
- **Latent, safe today but relying on caller discipline (3):** `src/app/hub/(office)/facilities/[id]/page.tsx:29` joins `stops → loads` with no carrier predicate on either side (safe only because `facilities` rows are per-carrier and `getFacility` at `:19` already notFound()s a foreign id); `announcements.ts:103` joins `announcement_acks → users` by id alone; `messages.ts:171-177` writes `message_reads` keyed on `thread_id` with no carrier column on the table. Each is one predicate away from defense in depth.

Live confirmation across the seeded two-tenant DB — all four returned 0:

```sql
SELECT count(*) FROM hub.stops s JOIN hub.loads l ON l.id=s.load_id
  JOIN hub.facilities f ON f.id=s.facility_id WHERE f.carrier_id <> l.carrier_id;   -- 0
SELECT count(*) FROM hub.invoices i JOIN hub.loads l ON l.id=i.load_id
  WHERE i.carrier_id <> l.carrier_id;                                               -- 0
SELECT count(*) FROM hub.payments p JOIN hub.invoices i ON i.id=p.invoice_id
  WHERE p.carrier_id <> i.carrier_id;                                               -- 0
SELECT count(*) FROM hub.settlement_lines sl JOIN hub.settlements s
  ON s.id=sl.settlement_id WHERE s.carrier_id IS NULL;                              -- 0
```

---

## 4. Fuel + IFTA: can a quarter close?

**Yes — the math and the guards are production grade.** `computeIfta` (`ifta-core.ts:37-95`) is proven to the penny against a hand-computed golden fixture including an Indiana surcharge line with no tax-paid credit (`__tests__/ifta.test.ts:14-40`: net $23.60). `setIftaStatus` (`ifta.ts:220`) refuses to mark a quarter filed when a traveled jurisdiction has no rate on file (`ifta.ts:240-244`) or when rates were re-imported after the report was computed (`ifta.ts:248-260`, via `staleRateJurisdictions`). Reefer and DEF gallons are correctly excluded from tax-paid gallons and fleet MPG (`ifta.ts:112-116`, filter `fuel_use = 'tractor'` at `:116`). A PDF worksheet with a warnings cover page exists (`ifta-pdf.ts`).

Caveat on "proven": `hub.ifta_reports` is **empty** in the live DB — no quarter has ever actually been computed here. Rates exist for 2026Q2 and 2026Q3 (24 rows, 12 jurisdictions each), with 543 position pings spanning 2026-04-29 → 2026-07-25 and 28 tractor fuel transactions. The inputs are present; the button has never been pressed.

**Bug 1 — re-importing mileage double-counts, and it inflates tax owed.** `_actions/import.ts:579` mints a fresh `run_id` per import and inserts at `:590-593` without deleting prior rows for the same (carrier, quarter). `ifta.ts:99-104` then sums **all** `source='import'` rows for the quarter with no `run_id` filter. Reproduced live in a rolled-back transaction: two identical 1,000-mile WA rows for `2099Q1` returned `WA | 2000.00` from the exact `SELECT jurisdiction, SUM(miles) … WHERE carrier_id = $1 AND quarter = $2 AND source = 'import' GROUP BY jurisdiction` that `computeIftaQuarter` runs. Doubled miles raise taxable gallons in every jurisdiction, so the carrier over-reports and overpays. Fix: delete prior `source='import'` rows for the quarter inside the import transaction, or filter the compute to the latest `run_id`.

**Bug 2 — one ELD-connected truck silently suppresses all imported miles.** `ifta.ts:78` branches on `if (trucks.length > 0)`, where `trucks` is the `SELECT DISTINCT truck_id FROM hub.position_pings` at `:69-73` for the quarter; the imported-mileage read is in the `else` at `:97-106`. A fleet with one telematics-connected truck and four on manual mileage sheets files **only the connected truck's miles** — the imported rows are never read. Understated filing, which is the direction that draws an audit. Fix: make the two sources additive per truck, not mutually exclusive per fleet.

---

## 5. Rate confirmation → invoice → payment → settlement: does it reconcile?

Yes, and there is a single-source invariant behind it.

| Step | Code | Verified |
|---|---|---|
| Rate con → load | `_actions/loads.ts` (13 `requirePermission` calls / 12 actions); paste intake at `loads/paste` | — |
| Load → invoice | `invoices.ts:64` `createInvoiceFromLoad`; total = `money.ts:22-28` `invoiceTotalCents`, `linehaul + FSC + Σ accessorials` | Live: all 4 seeded invoices have `amount_cents − (linehaul + FSC) = 0` |
| Invoice → payment | `invoices.ts:199` `recordPayment` | Live: the one `paid` invoice has payments summing to exactly `amount_cents` (356000) |
| Load → settlement | `pay-rules.ts:285-292` — `netCents = grossCents − deductionsCents` (`:292`), the only derivation in the codebase | Live: both settlements have `gross − deductions − net = 0`, and `settlement_lines` sum exactly to the header's `gross_cents` and `deductions_cents` |
| Escrow | `settlements.ts:295-302` reads the last `balance_cents` and inserts a new running balance row | Live: 4 drivers, balances 150000–155000, no orphans |

Money is integer cents throughout. The only floats in a money path are display formatting (`settlements.ts:347-348`, `invoices.ts:181`, `pay-rules.ts:82`) and one legacy config bridge (`pay-rules.ts:316` `Math.round(payRate * 10000)` → basis points), all correct. `expenses.ts:202` divides by `100.0` for 1099-NEC output — that is a Postgres `numeric` literal, so the division is exact decimal, not float.

Tests that prove it: `__tests__/money.test.ts:82-83`, `pay-rules.test.ts:103-104,116-117,169-170,278,291`, `invoice-double-invoice-race.test.ts`, `record-payment-validation.test.ts`, `settlements-paid-tenancy.test.ts`. There is **no** single end-to-end test that walks rate con → invoice → payment → settlement in one run; the reconciliation above is my own SQL over the seed, plus unit coverage of each hop.

---

## 6. Testing Ranvir's prior: deadhead % and DSO

**Verdict: neither half of the prior can be sized from this repo, but they fail differently.** Deadhead is instrumented and has no lever attached to it. DSO is not instrumented at all and has an obvious mechanical defect behind it. Both dollar figures require production data this session does not have — every number below that is not backed by SQL is marked MISSING rather than estimated.

**Deadhead: measured, not actionable.** `kpi.ts:63` computes `deadheadPct` correctly and derives `loadedPct` from the unrounded share so the pair always sums to 100 (`kpi.ts:64-66` — a nice detail). Live seed: `select sum(loaded_miles), sum(deadhead_miles), count(*), count(deadhead_miles) from hub.loads` → 18,932 loaded + 1,446 deadhead over 29 loads = **7.1% deadhead**, with `deadhead_miles` populated on 27 of 29. MISSING: a sourced industry benchmark — the "10–20% is normal" figure was asserted without a citation and `docs/ops/RUN_COST.md:151` asserts "15–20%" for the same claim, so neither is load-bearing. What is certain is that 7.1% is a *seed-data* number, so it cannot justify or kill the lever on its own. The only code that could move it is `lanes.ts:101` `lanesOutOf` — a historical-margin backhaul hint by origin state. There is no radius search, no empty-point matching against DAT/Truckstop results, and the load board search filters on `origin_city`/`origin_state` only (`loadboard.ts:14-15,124-127`). MISSING: real deadhead % from Thind's actual 2025–2026 load history, not the demo seed — export from the current dispatch spreadsheet or whatever ran before LoadOff. Also MISSING (per `docs/ops/STUB_INVENTORY.md:192-196`): whether real `deadhead_miles` will be routed or hand-typed, since a hand-typed number cannot be optimised.

**DSO: not measured at all.** `grep -rn "dso\|DSO\|daysSales" src/lib/hub` returns 2 hits, both substring false positives on "crow**dso**urced" (`facilities.ts:6`, `types.ts:258`) — no real match. `money.ts:32-45` `agingBucket` buckets AR aging and `invoices.ts:287` `getAgingSummary` summarises it, but nothing computes days-sales-outstanding, so there is no number to steer by. Worse, the mechanism that creates DSO is a manual click: `createInvoiceFromLoad` (`invoices.ts:64`) only runs when a human opens the load and presses the button, and it accepts loads at `pod_received` or `delivered` (`invoices.ts:72`). None of the 17 crons in `vercel.json` auto-invoices. The live seed shows exactly this failure mode: **6 loads sitting at `pod_received` or `delivered` with no invoice row at all** (`select l.id, l.status from hub.loads l left join hub.invoices i on i.load_id=l.id where l.status in ('pod_received','delivered') and i.id is null` → 6 rows), plus one invoice 22 days past due (`THD-INV-1002`, due 2026-07-03, `paid = 0`). Every day a POD sits un-invoiced is a day of DSO that no amount of dunning recovers, and `ar-reminders` (the automated part) only starts working *after* the invoice exists.

Ranked by dollars per hour of Ranvir's time:

1. **Auto-invoice at `pod_received`** — 6–8 hours, and it removes a daily manual step forever. The defensible part is not a dollar figure, it is the defect: **6 of 29 seeded loads are at `pod_received`/`delivered` with no invoice row at all** (SQL above), i.e. the "we never invoiced that load" failure is present in the data, and `ar-reminders` cannot dun an invoice that does not exist. MISSING, and required before any dollar figure is written down: (a) Ranvir's real average lag from POD to invoice send — if he already invoices same-day this lever is worth $0; (b) real monthly invoiced revenue; (c) the **factored share** of invoices — `docs/ops/RUN_COST.md:155` makes the point correctly: a factored invoice's DSO collapses to ~1 day and the factor fee is a flat percentage of face, not a per-diem, so cutting invoice lag saves nothing on the factored portion. The seed is 1 of 4 invoices factored (`select count(*) filter (where factored), count(*) from hub.invoices` → 1, 4). Note the seed cannot size this: its 4 invoices total $12,480 over a 46-day span (`select sum(amount_cents), max(issued_on)-min(issued_on) from hub.invoices` → 1248000, 46), which annualises to ~$99k — demo data, not Thind's book.
2. **Fix the public blob** (§3) — 3–4 hours. Not revenue, but it is the one thing that can end the business rather than cost it money.
3. **IFTA import dedupe** (§4) — 3 hours. Directly prevents overpaying fuel tax on every re-uploaded mileage file.
4. **A DSO number on `/hub/money`** — 2 hours. You cannot manage what you do not display.
5. **Deadhead work** — defer. Not because 7.1% proves it is small (that is seed data), but because there is no product surface to move it: `lanesOutOf` is the whole feature, and no real-history baseline exists to measure against. Cut from the near-term list until Thind's actual load history lands.

---

## 7. What blocks a third carrier going live in under 2 hours

Start with the harder truth: **the second real carrier is not live either.** The live DB's two tenants are `Thind Transport` (MC 876103) and `Cascade Demo Lines` (MC 991283) — a seed fixture. **ATS Transport LLC does not exist in the database.** So "third carrier" is really "second real carrier", and the fastest possible validation of the onboarding path is Ranvir onboarding ATS himself.

The path exists and is mostly good: `src/app/hub/signup/page.tsx` → `_actions/onboarding.ts:94` `createWorkspaceAction` (creates carrier, owner user, settings, and a 6-line default accessorial price book at `onboarding.ts:34-41`, with detention seeded from one constant so billing and accrual can never disagree — `DEFAULT_DETENTION_CENTS_PER_HOUR` at `onboarding.ts:27`) → `src/app/hub/welcome/page.tsx` → `src/app/hub/(office)/setup/page.tsx` (Smart Setup + a live progress query at `setup/page.tsx:12-19`) → the 15-step checklist in `src/lib/hub/setup-guide.ts:57-228`.

Blockers, in order:

1. **`docs/onboarding-runbook.md` does not exist.** Neither does any file matching `*runbook*` anywhere in the repo. There is no written path for a human to follow, so the 2-hour target is unmeasurable. Nearest substitutes: `docs/hub-setup-guide.md`, `docs/hub-go-live-requirements.md`, `docs/OWNER-CHECKLIST.md`. **~2 hours to write, and it should be written by walking ATS through the flow and recording what actually breaks.**
2. **Signup is unauthenticated and unthrottled** (`onboarding.ts:94`; `auth-throttle.ts` is wired only at `src/app/api/auth/[...nextauth]/route.ts:24`). Before the signup page is publicly linked, this needs a rate limit. ~1 hour.
3. **Zero integrations have ever authenticated** — `api_credentials` and `integration_syncs` are both 0 rows. A new carrier's first hour is CSV imports, which is fine (every provider declares a working fallback in `registry.ts`), but the settings page will show 10 disconnected cards and read as broken. Set expectations in the runbook, or hide `planned`/uncredentialed providers. ~1 hour.
4. **The FMCSA authority check silently no-ops without a key.** `onboarding.ts:60` returns `"Live verification isn't configured"` when `FMCSA_WEBKEY` (read at `:59`) is unset. It degrades to manual entry rather than blocking — correct behaviour — but a carrier who expected auto-fill will type everything by hand. MISSING: whether `FMCSA_WEBKEY` is set in Vercel production (no prod env access this session).
5. **`CRON_SECRET` must be set in production or all 17 crons 401.** The route correctly refuses everything when the secret is unset — including a matching header — the guard is `if (!secret || auth !== \`Bearer ${secret}\`)` at `src/app/api/hub/cron/[job]/route.ts:41`, pinned by `__tests__/cron-route.test.ts:126`. It is unset locally. If it is unset in Vercel, compliance scanning, AR reminders, detention alerts, and every fuel sync are silently dead. **Verify this first — it is a 60-second check with the largest blast radius on this list.**
6. **`welcome/page.tsx:11-17` (`ROLE_COPY.broker`, `ROLE_COPY.shipper`) tells brokers and shippers their portal is "on the way"** even though `src/app/hub/portal/` is built and `portalFileVisible` works. Any customer invited during onboarding sees a coming-soon page. ~30 minutes.

Production risk, not a repo defect: `npm run build` has a hard runtime dependency on `fonts.googleapis.com` being reachable at build time (`next/font`). It fails in this sandbox purely from blocked egress. A Google Fonts outage or a Vercel egress change fails the deploy.

---

## 8. Branch backlog (read-only)

232 remote branches (`git branch -r | grep -v HEAD | wc -l`), 200 unmerged into `origin/main` (`git branch -r --no-merged origin/main | wc -l`). Of those, 58 touch `src|services|migrations|scripts|.github` and 142 are docs/report-only. Lists at `/tmp/code_branches.txt` and `/tmp/report_branches.txt`.

No unmerged branch was found that fixes any item in §2–§4. The nearest candidate, `origin/claude/compassionate-bell-8r88rj` ("guard createShareLink against a foreign loadId"), is **already obsolete**: its commit `b152afb` is not an ancestor of `origin/main` (`git merge-base --is-ancestor b152afb origin/main` → false), but the fix it describes is present in main anyway — `git show origin/main:src/lib/hub/sharelinks.ts | grep -n assertCarrierRefs` returns `:3` and `:26`. It was landed independently and the branch should be deleted, not merged. Assume the same is true of an unknown share of the other 57 until each is checked.

I cannot list, read, or merge PRs this session: the GitHub token was rejected (403) and `gh` is unauthenticated. No PR numbers appear anywhere in this document because none can be read. Triage of those 58 needs a session with GitHub read access.

---

## 9. Output contract

```
FILES:    docs/ops/RELEASE_READINESS.md (created)
PR:       none (no GitHub write access this session)
IMPACT:   ~30 engineering hours closes every Gaps rating. The public-blob fix (3-4h) is the
          largest risk. The DSO lever (auto-invoice at pod_received, 6-8h) is the largest
          lever by mechanism but is NOT sized in dollars here — see §6 for the three
          inputs required before any figure is written down.
NEXT:     Change `access: "public"` to `access: "private"` at src/lib/hub/documents.ts:18
          and :57 and add a signed-read route — every POD, CDL scan, and settlement
          statement is currently a public URL in production.
BLOCKED:  Ranvir must confirm (a) whether CRON_SECRET, FMCSA_WEBKEY, and
          BLOB_READ_WRITE_TOKEN are set in Vercel production, (b) his real POD-to-invoice
          lag, real monthly invoiced revenue, factored share of invoices, and real
          deadhead % from actual 2025-2026 history — all four are required before either
          lever can carry a dollar figure, and (c) whether ATS Transport should be
          onboarded now as the live test of the signup path.
```

---

## Verification

Independent adversarial pass, 2026-07-25, same `main@c52ec254`. Every file:line citation above was opened at the cited line; every SQL block was re-run against `$PGURL`; every `git` claim was re-executed.

**Killed (unsupported, deleted rather than softened):**

| Killed claim | Why |
|---|---|
| "~$310k/yr invoiced across 4 invoices in ~6 weeks → a 3-day lag reduction is roughly $2.5k of working capital" | Arithmetic wrong and the base is demo data. `select sum(amount_cents), max(issued_on)-min(issued_on) from hub.invoices` → 1,248,000 cents over 46 days = $12,480, annualising to ~$99k, not $310k. Replaced with MISSING + the three inputs actually needed. |
| "an unmerged branch addresses an item above — `compassionate-bell-8r88rj`" | The fix is already in main (`git show origin/main:src/lib/hub/sharelinks.ts` → `assertCarrierRefs` at `:3`, `:26`), and share-link tenancy was not an item in §2–§4. Rewritten as an obsolete-branch finding. |
| "`grep -rn \"dso\|DSO\|daysSales\" src/lib/hub` returns **zero** hits" | It returns 2 hits (`facilities.ts:6`, `types.ts:258`), both substring matches inside "crow**dso**urced". Conclusion survives, the evidence statement did not. |
| "industry runs 10–20% deadhead" | Unsourced, and `docs/ops/RUN_COST.md:151` asserts 15–20% for the same claim. Replaced with MISSING. |
| "7.1% is already good … further deadhead reduction is a small lever" | 7.1% is seed data; it cannot establish or refute a real-world baseline. Defer recommendation kept, but re-grounded on the absence of any product surface, not on the number. |
| "up to 10 **serial** `getLoadStops` + NWS fetches" | `dispatch/page.tsx:28` is `await Promise.all(candidates.map(...))` — concurrent fan-out, not a serial chain. |
| "`SmartSetup.tsx:275` renders every extraction as an editable chip regardless of `low` confidence" | `:275` is `const processText = useCallback(...)`. The substantive point survives and is stronger than stated: `confidence` exists throughout `doc-intake` (`parsers.ts:21`, `llm-parser.ts:27`, `merge-analysis.ts:14`) and appears **nowhere** in `SmartSetup.tsx`. Re-cited to `:143` and `:213-215`. |
| "queued photo files at `offline-queue.ts:30`" / "wired into 6 driver components" | `:30` is the `upload` payload type. `QueuedFile` is at `:40-41`. Eight non-test files import the module, not six. |

**Corrected citations (claim survived, line number did not):** `documents.ts` blob-private support (`index.d.ts:128-132` is `GetCommandOptions`, the *read* side; `put` takes `access` via `create-folder-DFjrvss1.d.ts:37,44`) · `ifta.ts:69`→`:78` for the pings/import branch · `import.ts:578`→`:579` · `ifta.ts:238-245`→`:240-244`, `:249-267`→`:248-260` · `setup.ts:283`→`:278`/`:282` · cron guard `route.ts:39`→`:41`, `cron-route.test.ts:127`→`:126` · `onboarding.ts:26`→`:27`, `:32-40`→`:34-41`, `:59`→`:60` · `money.ts:23-29`→`:22-28` · `pay-rules.ts:288-292`→`:285-292` · `sharelinks.ts:29`→`:28`, `:36-41`→`:37-42`, `:88-92`→`:87-93` · `pii.ts:6-16`→`:6-17` · `tenancy.ts:26-40`→`:25-40` (fields at `:11-21`) · `welcome/page.tsx:11-18`→`:11-17`.

**Confirmed unchanged — the load-bearing claims all held:**

- **Public blob (§3).** `documents.ts:18` and `:57` are literally `access: "public"`, both gated on `BLOB_READ_WRITE_TOKEN` (`:16`, `:54`). The local route (`api/hub/files/[name]/route.ts:20-36`) is guarded; the blob path has no equivalent. Stands as the top risk.
- **Both IFTA bugs.** Double-count reproduced live in a rolled-back transaction (two 1,000-mile WA rows → `WA | 2000.00`). The pings-vs-import mutual exclusion is real at `ifta.ts:78`.
- **RBAC counts.** `grep -l requirePermission src/app/hub/_actions/*.ts` → exactly 20 of 33, and the 20 names match the list in §2. All 13 guard attributions in the §2 table verified line by line. `createWorkspaceAction` (`onboarding.ts:94`) has no guard; `auth-throttle` is imported at exactly one place repo-wide (`api/auth/[...nextauth]/route.ts:24`). The 4 unguarded office pages have no `require*` call of their own.
- **The §3 scan reproduces exactly.** Re-implementing the stated method independently returned 488 statements / 90 files — identical. 41 lack a literal `carrier_id`, of which 21 are on `carrier_id`-bearing tables, matching the triage. All 21 triage citations spot-checked and resolve.
- **All money SQL re-run and correct:** 4 invoices with `amount_cents − (linehaul + FSC) = 0`; the one `paid` invoice matched by payments to 356000 exactly; both settlements residual 0 with `settlement_lines` summing to header gross/deductions; escrow 4 drivers 150000–155000; all four cross-tenant integrity checks 0.
- **All zero-row claims re-run and true:** `api_credentials`, `integration_syncs`, `ifta_reports`, `portal_invitations`, `dvirs`, `random_test_events`, `claims`, `hos_snapshots` — all 0.
- **Carrier list.** Only `Thind Transport` (MC 876103) and `Cascade Demo Lines` (MC 991283) exist. ATS Transport is genuinely absent. §7's reframing to "second real carrier" is correct.
- **Registry semantics.** `registry.ts:17-21` does define `live` as "activatable with credentials", 8 live / 2 stub. Checked specifically for the filename-implies-feature failure: `integrations/mock.ts` is imported by **test files only** — no production adapter routes to it.
- **Google Fonts.** Correctly recorded as a sandbox egress limitation and a production build-time dependency, not a code defect. Left as written.
- **No PR numbers are invented anywhere in the document.** Confirmed by inspection.
