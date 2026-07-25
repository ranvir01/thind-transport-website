# RUN_COST

What it costs per month to run LoadOff (software) and to run the trucks (carrier ops), what to cut, and what to renegotiate.

Generated 2026-07-25 against main@c52ec254. **Measured live in this session:** cron inventory and Hobby-legality (`scripts/hobby-cron-guard.mjs` run against `vercel.json`), deployment rate and lambda count (Vercel API), Postgres row counts and table sizes (`psql` against the seeded `hub` schema), Anthropic call path and token caps (source read), integration credential state (`npm run connections:check`). **List price (verified against vendor pages July 2026, not against Ranvir's bills):** every dollar figure in the Monthly $ column. **Inference:** anything labeled so inline. No line in this document is Ranvir's actual invoice — see the MISSING rows.

---

## 0. The one-paragraph answer

Software is nearly free and is not the problem: measured spend today is **$0/mo** on Vercel (Hobby), **$0/mo** on Anthropic (key unset *and* the coded model is retired), **$0/mo** on Blob (zero blob-backed documents), **$0/mo** on all ten integrations (`creds:0` on every provider). Realistic software spend after go-live is **$20–45/mo**. Carrier operations at 12 trucks are **~$20.6–21.6k/mo at list**, and **~97–99% of that is insurance + factoring** — but the factoring half of that rests on an assumed $180k/mo gross that nobody has measured (§B). The only software line worth an argument is the $20/mo Vercel Pro seat, and the argument for it is not performance — it is that Hobby forbids commercial use and its deploy quota has already taken production down once.

---

## A. SOFTWARE / PLATFORM — what running LoadOff costs

| Line item | Plan / assumption | Monthly $ | Confidence | Cut or renegotiate | Payback or saving (assumption stated) |
|---|---|---|---|---|---|
| Vercel hosting | Hobby, free tier, 1 project `prj_QKMg8o77Do…` | **$0** | measured — `get_project` returns no plan field, so "Hobby" comes from the personal-account scope (`rjkind01-gmailcoms-projects` in every `inspectorUrl`) + `docs/claude-routines.md:111` naming the Hobby quota outage | **Upgrade, do not cut** — Hobby is non-commercial-only | +$20/mo. Buys 6,000 deploys/day vs 100 ([vercel.com/docs/limits](https://vercel.com/docs/limits) General limits table), sub-daily cron, and removes ToS exposure. See §C1 |
| Vercel Pro (if upgraded) | $20/developer seat/mo, incl. $20 usage credit | $20 | list price ([vercel.com/pricing](https://vercel.com/pricing)) | 1 seat only. Do not add seats | Usage stays inside the $20 credit at this traffic — 17 crons ≈ 455 invocations/mo (§C2) |
| Postgres | Provider not determinable from repo; `.env.local` points at localhost | **$0 measured / MISSING** | MISSING | Move to Neon Launch if not already | DB is **12 MB** total (`pg_database_size`). Neon storage $0.35/GB-mo → **<$0.01/mo** of storage. Compute is the only real cost |
| Postgres compute | Neon Launch $0.106/CU-hr; assume 0.25 CU autoscale, ~200 active hrs/mo | ~$5 | list price ([neon.com/pricing](https://neon.com/pricing)) | Set autosuspend aggressively | 17 crons + one owner + a few drivers do not need a pinned always-on CU |
| Anthropic API (doc intake) | `ANTHROPIC_API_KEY` unset; feature off | **$0** | measured (`npm run connections:check`; `src/lib/hub/doc-intake/llm-parser.ts:143`) | Leave off until §C3 is fixed | — |
| Anthropic API (if enabled) | Sonnet 4.6 @ $3/$15 per MTok. Measured cap is a **12,000-character** slice (`llm-parser.ts:146`); assuming 4 chars/token that is ~3,000 input tok + ~250 prompt, ~300 output | **$0.014/doc** → $2.85/mo @ 200 docs | list price ([platform.claude.com pricing](https://platform.claude.com/docs/en/about-claude/pricing)) + measured token caps | Keep. Cheapest line on the page | Worst case is $0.041/doc if the model returns the full `max_tokens: 2048` (`llm-parser.ts:157`). Even 1,000 docs/mo = $14–40 |
| Vercel Blob | `BLOB_READ_WRITE_TOKEN` unset; **all 6 documents are `storage='local'`** | **$0** | measured (`select storage,count(*) from hub.documents` → `local\|6`) | **Set the token before real driver data** | $0.023/GB-mo storage, $0.05/GB transfer; Pro includes 5 GB + 100 GB transfer ([Blob pricing](https://vercel.com/docs/vercel-blob/usage-and-pricing)). 12 trucks of PODs ≈ well under 5 GB/yr → **$0 incremental** |
| Email (SMTP) | Gmail app password on an existing mailbox | $0 incremental | measured (`.env.example:14-17`; `docs/integrations/creds-shopping-list.md:13`) | Keep. Do not buy a transactional ESP | Volume is invoices + AR reminders + digests, well inside Gmail limits |
| Google Workspace (if not already owned) | Business Starter, 1–2 users | $7/user annual, $8.40 flexible | list price ([name.com/blog/google-workspace-pricing](https://www.name.com/blog/google-workspace-pricing)) | Annual billing, not flexible | Saves $1.40/user/mo = **$34/yr for two users**. Too small to bother with alone; do it when renewing |
| Mapbox | `NEXT_PUBLIC_MAPBOX_TOKEN` unset → OSM tiles + OSRM fallback | **$0** | measured (`src/lib/hub/mapbox.ts:13`) | Enable free tier | 50k map loads + 100k Directions/mo free ([apicostcalc.com/mapbox](https://apicostcalc.com/mapbox.html)). 12 trucks will not approach either |
| Free government APIs | FMCSA QCMobile, EIA, OSRM, Nominatim, NWS, NHTSA | **$0** | measured (`docs/integrations/creds-shopping-list.md:22-24`) | Keep | Six data sources at zero cost. Nothing to do |
| Web Push (VAPID) | `web-push` self-hosted, no vendor | **$0** | measured (`package.json:78`) | Keep | Replaces a $15–50/mo push vendor |
| Domain `thindtransport.com` | Registrar unknown | MISSING | MISSING | — | **MISSING: registrar renewal invoice — check Vercel Domains or the original registrar under the account at rjkind01@gmail.com** |
| Vercel invoice reality check | — | MISSING | MISSING | — | **MISSING: Vercel invoice for June 2026, from vercel.com/team_IZJsCi3NEDTpTCS2adBdxqbd/~/settings/billing** |
| Postgres invoice reality check | — | MISSING | MISSING | — | **MISSING: the production `POSTGRES_URL` host + the provider's June 2026 invoice. The repo cannot tell you who hosts prod — `.env.local` points at 127.0.0.1** |
| **Software total, today** | | **$0** | measured | | |
| **Software total, go-live** | Pro seat + Neon compute + Anthropic on | **~$28/mo** | list price | | |

---

## B. CARRIER OPERATIONS — what running trucks costs

Scope: 12 trucks (`select count(*) from hub.trucks` → 12), 11 drivers, 2 carriers (Thind + ATS). All figures are **list price for a small WA carrier**, not Ranvir's contracts.

| Line item | Plan / assumption | Monthly $ | Confidence | Cut or renegotiate | Payback or saving (assumption stated) |
|---|---|---|---|---|---|
| **Commercial auto liability** | WA semi, clean record, $1M limit: $14,500/truck/yr = $1,208/truck/mo × 12 | **$14,500** | list price ([logrock.com WA](https://www.logrock.com/states/commercial-truck-insurance-cost-in-washington/)) | **Renegotiate — this is the whole budget** | 5% off at renewal = **$8,700/yr**. One broker-shopping day is the highest-paid day on this page |
| Motor truck cargo | $100k limit, dry freight: $800–1,500/truck/yr × 12 trucks ÷ 12 months | $800–1,500 | list price ([truckinginsuranceservices.com](https://www.truckinginsuranceservices.com/blog/how-much-does-cargo-insurance-cost/)) | Bundle with auto at renewal | Usually already bundled. Confirm you are not paying two brokers |
| **Factoring** | 2.8% avg for small carriers (2.5–3.5% range), 95–97% advance | **~$5,040** if gross is $180k/mo | list price ([freightfactoringusa.com Q2 2026 index](https://freightfactoringusa.com/freight-factoring-rate-index-q2-2026/)) — **$180k/mo gross is an unmeasured assumption, and it drives this whole row** | **Renegotiate rate; then reduce what you factor** | Each 0.25% off $180k/mo gross = **$5,400/yr**. Seeded data: 1 of 4 invoices and 3 of 29 loads `factored` (`select count(*) filter (where factored), count(*) from hub.loads` → `3\|29`) — real mix is MISSING |
| ELD / telematics | Motive Starter $20–25/truck/mo × 12 | **$240–300** | list price ([smallfleethq.com](https://smallfleethq.com/elds/motive-vs-samsara)) | Renegotiate at renewal; refuse 3-yr terms | Motive is 1-yr auto-renew, Samsara is 3-yr standard. Samsara Standard is $27–33/truck → **$84–96/mo more for 12 trucks** |
| ELD (Terminal aggregator) | Repo's wired provider (`registry.ts:46`), free/dev tier to start | $0 + underlying ELD | measured (`docs/integrations/creds-shopping-list.md:11`) | Keep — it is the cheapest path to live positions | Aggregator sits on top of the ELD you already pay for; no second per-truck fee |
| Fuel cards | WEX: $2–4/card/mo × 12 cards; $40–50 one-time setup | **$24–48** | list price ([truckingway.com WEX](https://www.truckingway.com/wex-fuel-card-review-2026-the-corporate-giant-that-loves-fees/)) | **Renegotiate the fee schedule, in writing** | Extended-network fee is **up to $3/transaction**. Assuming 200 fuel stops/mo (12 trucks × ~4 fills/wk — an inference; the DB holds only 36 seeded `fuel_transactions` over 78 days ≈ 14/mo, which cannot corroborate it) and a **third** of them off-network, that is ~$200/mo of avoidable fee. Still bigger than the card fee itself |
| Fuel cards (EFS/Comdata) | Out-of-network swipe $1.50–2.00; MoneyCode check $2.50–5.00 | variable | list price ([truckingway.com EFS](https://www.truckingway.com/efs-fuel-card-review/)) | Do not run three cards | Repo wires EFS **and** WEX **and** Comdata (`vercel.json:20-22`). Three fuel-card relationships = three fee schedules. Pick one |
| Load board — DAT | DAT One Select ~$45 / Professional ~$99–149 / Premium ~$199 | $45–199 | list price ([otrucking.com DAT](https://otrucking.com/resources/guides/dat-load-board-pricing-plans/)) | Annual billing saves 10–20% | The repo confirms only the seat requirement: `registry.ts:84` collects `actingUserEmail` "(needs a Connexion + load board seat)". Which *plan* carries API entitlement is vendor-side, not in the repo. Do not buy the API tier until the token exchange is confirmed (`docs/integrations/creds-shopping-list.md:17`) |
| Load board — Truckstop | Basic $42 / Advanced $135 / Pro $159 / Heavy Haul Pro $299 | $42–159 | list price ([truckstop.com pricing](https://truckstop.com/product/load-board/pricing/)) | **Cut — do not run both boards** | **$42–159/mo saved.** Truckstop's integration also needs a signed Systems Integration Agreement and its response parser is still unverified (`docs/integrations/creds-shopping-list.md:20`) |
| QuickBooks Online | Required only to activate `qbo-sync` (status `stub`) | MISSING | MISSING | Defer | `registry.ts:138` status is `"stub"` — you would pay for QBO before the adapter is confirmed against a sandbox |
| **Carrier ops total** | 12 trucks, list price, one load board, one fuel card | **~$20,600–21,600/mo** | list price | | Sum: auto 14,500 + cargo 800–1,500 + factoring 5,040 + ELD 240–300 + cards 24–48 + one board 45–199. Insurance + factoring = **97–99%** of it. Strip the assumed-gross factoring row and the total is **~$15,600–16,500/mo, 98% insurance** |

---

## C. Structural cost risks

### C1. Hobby plan is the wrong plan, and it has already cost uptime

Vercel's own words: *"Hobby teams are restricted to non-commercial personal use only. All commercial usage of the platform requires either a Pro or Enterprise plan… Commercial usage is defined as any Deployment that is used for the purpose of financial gain of anyone involved in any part of the production of the project"* ([fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines)). LoadOff dispatches freight for two revenue-generating FMCSA carriers. That is commercial.

This is not theoretical. `docs/claude-routines.md:111-114` records the outage in the repo's own words:

> **Hobby has a daily deployment quota.** The fleet's per-branch preview builds exhausted it (2026-07-22: production frozen mid-theme-rollout with pushes creating zero deployments).

The mitigation already shipped — `vercel.json:7` sets `"ignoreCommand": "[ \"$VERCEL_GIT_COMMIT_REF\" != \"main\" ]"` so only `main` builds. Re-measured this session (Vercel `list_deployments`, most recent page, created 1784944701052→1784965133710 = **5.68 h**): **20 deployments, of which 6 are `READY`/`target:production` and 14 are `CANCELED`/`target:null`** (the non-`main` builds the ignoreCommand kills).

- Production builds extrapolate to **~25/day** — comfortably under the cap.
- *All* deployment records extrapolate to **~85/day** against the Hobby cap of 100/day ([vercel.com/docs/limits](https://vercel.com/docs/limits): "Deployments per Day — Hobby 100, Pro 6000").
- **Unverified and load-bearing:** whether an ignoreCommand-canceled deployment counts against that 100/day. Vercel's rate-limit table lists "Skipped deployments per minute" as its own separate limit, which hints they are counted apart, but the docs do not say. If canceled builds do *not* count, there is no headroom problem at all; if they do, the fleet is at ~85% of cap. **MISSING: the Usage tab at vercel.com/…/settings/billing showing actual deployments-per-day consumed.**

**Action: upgrade to Pro. $20/mo.** The ToS argument stands on its own regardless of how the quota counts; the deploy-cap headroom is a bonus, not the case.

### C2. 17 cron jobs is not a cost problem — it is fine

| Check | Result | Evidence |
|---|---|---|
| Jobs per project | 17 of 100 allowed on **every** plan | `scripts/hobby-cron-guard.mjs:21` `MAX_CRON_JOBS_PER_PROJECT = 100`, matching [Vercel cron pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing) |
| Hobby daily-frequency rule | **0 violations** | Ran `hobbyIllegalCrons(vercel.json)` → `[]`. 15 fire daily, 1 weekly, 1 monthly |
| Invocation cost | ~455/mo (15×30 + 4 + 1) vs 1,000,000 included on Hobby | `vercel.json:8-26` |

The premise that "Hobby allows only 2 cron jobs/day" is out of date — the repo already knows this and documents it at `scripts/hobby-cron-guard.mjs:4-13`, and [vercel.com/docs/limits](https://vercel.com/docs/limits) now shows "Cron Jobs (per project): Hobby 100, Pro 100". The real Hobby cron constraint is **frequency**: no cron may fire more than once per calendar day (`hobby-cron-guard.mjs:4-6`). That is what caps telematics polling in §C5.

### C3. The Anthropic model in the code is retired — the feature is silently dead

`src/lib/hub/doc-intake/llm-parser.ts:145`:

```ts
const model = process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-20250514"
```

Fetched and confirmed this session: the deprecations table lists `claude-sonnet-4-20250514` as **Retired**, deprecated 2026-04-14, **retirement date 2026-06-15**, recommended replacement `claude-sonnet-4-6` ([model deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations)). `llm-parser.ts:186` is `if (!response.ok) return null` — so the moment Ranvir pastes an API key, every call errors and the parser silently falls back to heuristics with **no log, no error, no bill**. He would pay $0 and never know the feature never ran.

Cost impact today: $0. Cost impact after the key is set: still $0, because nothing succeeds. **The fix is a one-line default change.**

Note the call graph before budgeting: `parseDocumentWithLlm` is reached only from `analyzeDocumentEnhanced` (`analyze-enhanced.ts:6`), which is reached only from `analyzeSmartSetupAction` (`src/app/hub/_actions/setup.ts:283`) — a permission-gated server action behind a manual UI. **No cron calls it.** There is no unattended-spend path. Anthropic cost is bounded by how many documents a human uploads.

### C4. puppeteer + canvas + sharp do NOT bloat the serverless bundle

The premise is wrong, and the repo already handled it:

- `puppeteer` (`package.json:91`) and `sharp` (`:92`) are **devDependencies** — used only by `scripts/e2e-*-smoke.mjs` and `scripts/generate-brand-assets.mjs`. Zero imports under `src/`.
- `canvas` (`package.json:97`) is an **optionalDependency** and `next.config.mjs:19` sets `config.resolve.alias.canvas = false`.
- `pdfjs-dist` is loaded **client-side only** — dynamic `import("pdfjs-dist")` at `src/lib/hub/doc-intake/extract-text-client.ts:17`, worker pulled from `unpkg.com` at `:19`.
- `outputFileTracingIncludes` (`next.config.mjs:12-14`) adds `./migrations/hub/**` to the cron route — **68,499 bytes across 21 `.sql` files** (`du -sb migrations/hub/*.sql`). Negligible.
- Measured: the live production deployment reports `lambdaRuntimeStats: {"nodejs":4}` — **four functions**, not a sprawl.

**No action. This risk does not exist.** One genuine risk hides here though: the pdfjs worker is fetched from `unpkg.com` at runtime, so client-side PDF text extraction breaks if unpkg is down. Free to fix (self-host the worker), $0 to leave.

### C5. position_pings growth is a rounding error — but the data is useless for IFTA

Measured: 543 rows, 176 kB total relation size = **331.9 bytes/row**, spanning 2026-04-29 → 2026-07-25 across 10 trucks.

`runTelematicsSync` writes **one ping per truck per run** — `for (const vehicle of await source.vehicles())` at `src/lib/hub/telematics.ts:211`, a single `INSERT INTO hub.position_pings` at `:219` — and `telematics-sync` runs **once per day** (`vercel.json:18`, `"0 12 * * *"`).

| Scenario | Rows/yr | Storage/yr | Neon cost/yr @ $0.35/GB-mo |
|---|---|---|---|
| 12 trucks, current 1/day cadence | 4,380 | **1.4 MiB** | **< $0.01** |
| 12 trucks, 15-min cadence (Pro plan) | 420,480 | 133 MiB | ~$0.29 |

**Storage is a non-issue at any cadence.** The real finding is the other direction: `migrations/hub/001_foundation.sql:206` declares this table an *"IFTA-grade position store (append-only, four-year retention)"*, but one ping per truck per day cannot reconstruct state-line crossings. Ranvir would be paying $240–300/mo for an ELD feed that LoadOff samples at a rate that cannot produce the IFTA miles the ELD was bought for. **This is a Hobby-plan artifact** (once-per-day cron limit) — it is one of the concrete things the $20 Pro seat unblocks.

Also note: no retention or pruning job exists anywhere (`grep -rn "DELETE FROM hub.position_pings"` → no matches), despite the "four-year retention" comment. At 1.4 MiB/yr, still not worth building.

### C6. Ten wired integrations, zero credentials — every "live" is a future bill

`npm run connections:check`, re-run this session: 8 providers `live` (terminal, truckercloud, mailbox, dat, truckstop, efs, wex, comdata), 2 `stub` (qbo, factor), and **all 10 show `creds:0` and `never synced`**. `live` in `src/lib/hub/integrations/registry.ts:18` means *"client implemented and activatable with credentials"* — it does **not** mean an account exists. Nor does it route to a mock: `activeTelematicsSource` (`telematics.ts:184-190`) returns `null` when neither provider has credentials, so `integrations/mock.ts` is test-only and no fake data reaches production. Current integration spend: **$0**. Each flip costs money (§B). The repo's own value ranking is at `docs/integrations/creds-shopping-list.md:9-20`; the free ones (Terminal dev tier, IMAP mailbox on an existing Gmail) are correctly ranked first.

### C7. Money handling is clean — no float bug to report

Money is integer cents throughout (`hub.invoices.amount_cents INTEGER`, `hub.loads.linehaul_cents`). The floats in `src/lib/hub/kpi.ts:61-66` and `src/lib/hub/money.ts:60` are **ratio and percentage** computations (`operatingRatioPct`, `deadheadPct`, a rate rounder), not money amounts. Correct. Nothing to fix.

### C8. Production build has a hard dependency on Google Fonts

`npm run build` reaches `fonts.googleapis.com` via `next/font`. If Google Fonts is unreachable at build time, the Vercel production build fails. Not a code defect, but it means an outage in a third party you do not pay can block a deploy. One line of risk, zero dollars.

---

## D. Testing Ranvir's prior: deadhead % and DSO

His prior is **wrong on the code for both halves**: deadhead is displayed but not measured, and DSO is not present at all.

**Deadhead is displayed, not measured.** `computeFleetKpis` returns `deadheadPct` (`src/lib/hub/kpi.ts:63`), surfaced on `/hub/reports` (`src/app/hub/(office)/reports/page.tsx:167`) and the owner report (`src/app/hub/(office)/reports/owner/page.tsx:174`). Re-run this session:

```sql
select sum(deadhead_miles) dh, sum(loaded_miles) loaded,
       round(100.0*sum(deadhead_miles)/(sum(deadhead_miles)+sum(loaded_miles)),1)
from hub.loads;
-- 1446 | 18932 | 7.1
```

**That 7.1% is a seed constant, not a signal.** `scripts/seed-demo.mjs:340` inserts `deadhead_miles` as `Math.round(miles * 0.08)` on every load — 0.08/1.08 = 7.4%, dropping to 7.1% because 2 of 29 loads are NULL. It is arithmetic, not fleet performance. And nothing in the app computes deadhead: `deadhead_miles` is a free-text `<input type="number">` on the load form (`src/components/hub/LoadForm.tsx:369`). The metric will only ever be as good as what a dispatcher types.

So the correct read on Ranvir's prior: **the deadhead number is not trustworthy yet, and the cost of making it trustworthy is a mileage source (ELD odometer or Mapbox Directions), not a report.** No dollar figure can be attached until real loads exist.

**DSO does not exist in this codebase.** `grep -rn "\bDSO\b\|daysSalesOutstanding" src/lib/hub` returns **zero matches** (a case-insensitive `dso` grep returns 2 hits, both the substring inside "crowdsourced"). What exists is aging buckets (`agingBucket` at `src/lib/hub/money.ts:35`) and a 30-days-past-due nudge (`src/lib/hub/today.ts:62`). Nobody computes days-sales-outstanding. Measured on seeded invoices (`select status, current_date - issued_on from hub.invoices`): 1 overdue at 52 days, 2 sent at 6 and 9 days, 1 paid at 17 days — 4 invoices, too few to mean anything.

**The cost consequence, which is the point of this document:** if Ranvir factors an invoice, DSO on that invoice collapses to ~1 day and the factoring fee is a **flat percentage of face**, not a per-diem. Cutting DSO therefore saves nothing on factored invoices — it only saves working capital on the ones he carries himself. Seeded data: **1 of 4 invoices** and **3 of 29 loads** carry `factored = true`. The real factored share is the number that decides whether the DSO lever is worth $0 or thousands, and **nobody has measured it**.

**MISSING: the factored share of real invoices, and real monthly gross revenue — from the production database (`select factored, count(*), sum(amount_cents) from hub.invoices group by 1`) or from the factor's monthly statement.** Until that exists, any dollar figure attached to the DSO lever is invented.

---

## E. The cheapest moves, ranked by dollars saved per hour of Ranvir's time

| # | Action | Owner hours | Saving/yr | $/hour |
|---|---|---|---|---|
| 1 | **Shop commercial auto + cargo at renewal.** One day with two brokers, current loss runs and MVRs in hand. Assumption: 5% off a $174k/yr premium (12 trucks × $14,500 list). | 8 | **$8,700** | **$1,088/hr** |
| 2 | **Renegotiate the factoring rate, and get the fuel-card fee schedule in writing.** One call to the factor citing the 2.5% market floor; one call to WEX/EFS to kill the extended-network fee and consolidate to one card. Assumptions, both unmeasured: 0.25% off on **an assumed $180k/mo gross** = $5,400/yr; ~$2,400/yr of avoided off-network swipe fees at **an assumed 200 stops/mo, a third off-network, $3 each**. Scale both by whatever the real gross and real stop count turn out to be. | 3 | **$7,800** *(assumption-driven, not measured)* | **$2,600/hr** |
| 3 | **Cancel the second load board.** Run DAT or Truckstop, not both. Assumption: Truckstop Advanced at $135/mo. | 0.5 | **$1,620** | **$3,240/hr** |
| 4 | **Change one string: the Anthropic model default** (`llm-parser.ts:145`) from the retired `claude-sonnet-4-20250514` to `claude-sonnet-4-6`. Costs nothing, but without it the doc-intake feature is dead the day the key is pasted (§C3). | 0.1 | $0 (unblocks a feature, saves no cash) | n/a |

**Too small to bother with:** the Google Workspace annual-vs-flexible switch (**$34/yr for two users**) and self-hosting the pdfjs worker (**$0**). Both are real, both are correct, neither is worth an hour of an owner's attention — fold them into work that is already happening.

**Not a cut — the one thing to buy:** Vercel Pro at $20/mo ($240/yr). It removes a Terms-of-Service violation on a system that dispatches revenue freight, raises the deploy cap from 100/day to 6,000/day, and unblocks sub-daily telematics polling so the ELD subscription he is already paying for can actually produce IFTA miles. Ranked against the cuts above it is the highest-leverage $20 on the page.

---

```
FILES:    docs/ops/RUN_COST.md (created, then adversarially verified — see §Verification)
PR:       none (no GitHub API or write access this session; no PR numbers can be cited)
IMPACT:   ~$10,320/yr of savings that stand on list price alone (insurance shop $8,700, second load board $1,620) against 8.5 owner-hours. A further ~$7,800/yr (factoring rate + fuel-card fees) is real in kind but its size depends entirely on an assumed $180k/mo gross and an assumed 200 fuel stops/mo, neither measured. Software spend measured at $0/mo today, ~$28/mo at go-live.
NEXT:     Upgrade Vercel to Pro ($20/mo) — Hobby forbids commercial use on a system dispatching revenue freight. Then change one string at llm-parser.ts:145.
BLOCKED:  Vercel usage/billing page, Postgres provider + invoice, insurance and factoring statements, the production POSTGRES_URL host, real monthly gross revenue, and the real factored share. Every dollar in this document is list price, not Ranvir's bill.
```

Sources: [vercel.com/pricing](https://vercel.com/pricing) · [Vercel Hobby plan](https://vercel.com/docs/plans/hobby) · [Vercel fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines) · [Vercel cron usage & pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing) · [Vercel Blob pricing](https://vercel.com/docs/vercel-blob/usage-and-pricing) · [Neon pricing](https://neon.com/pricing) · [Anthropic API pricing](https://platform.claude.com/docs/en/about-claude/pricing) · [Anthropic model deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations) · [Google Workspace pricing 2026](https://www.name.com/blog/google-workspace-pricing) · [Mapbox pricing](https://apicostcalc.com/mapbox.html) · [DAT plan pricing](https://otrucking.com/resources/guides/dat-load-board-pricing-plans/) · [Truckstop load board pricing](https://truckstop.com/product/load-board/pricing/) · [Motive vs Samsara ELD pricing](https://smallfleethq.com/elds/motive-vs-samsara) · [WEX fuel card fees](https://www.truckingway.com/wex-fuel-card-review-2026-the-corporate-giant-that-loves-fees/) · [EFS fuel card fees](https://www.truckingway.com/efs-fuel-card-review/) · [Freight factoring rate index Q2 2026](https://freightfactoringusa.com/freight-factoring-rate-index-q2-2026/) · [WA commercial truck insurance](https://www.logrock.com/states/commercial-truck-insurance-cost-in-washington/) · [Motor truck cargo insurance cost](https://www.truckinginsuranceservices.com/blog/how-much-does-cargo-insurance-cost/)

---

## Verification

Adversarial pass, 2026-07-25. Every file:line opened at the cited line, every SQL re-run against the seeded `hub` schema, every vendor page re-fetched, Vercel re-queried live.

**Killed (deleted, not softened):**

| Claim | Why it died |
|---|---|
| "Carrier ops total ~$16,300–17,200/mo" | Arithmetic. The rows sum to $20,649–21,587. The old total silently dropped the $5,040 factoring row it had just listed. |
| "Insurance + factoring = ~92%" | Follows from the same bad denominator. Correct share is 97–99%. |
| "7.1% deadhead… already excellent… data capture is working" | The 7.1% is `Math.round(miles * 0.08)` at `scripts/seed-demo.mjs:340`. 0.08/1.08 = 7.4%, minus 2 NULL rows = 7.1%. It measures the seed script, not the fleet. `deadhead_miles` is a free-text input (`LoadForm.tsx:369`); nothing computes it. |
| "Hobby cap… running at ~87/day. The guard is holding, with a 13% margin" | 14 of the 20 measured deployments are `CANCELED`/`target:null` ignoreCommand skips. Whether those consume the 100/day quota is undocumented, so the "13% margin" was invented precision. Production-target builds extrapolate to ~25/day. |
| "The real Hobby cron constraint is precision: ±59 min jitter" | No source, in repo or at Vercel. The documented constraint is once-per-calendar-day frequency (`hobby-cron-guard.mjs:4-6`). |
| "$600/mo of avoidable [fuel] fee" vs "$2,400/yr" in §E | The same lever was priced at $7,200/yr in §B and $2,400/yr in §E. Both assumed 100% / 33% off-network with no data. Reconciled to one number with the assumption stated. |
| `grep "dso\|DSO\|…"` → "zero matches" | It returns 2 — the substring inside "crowdsourced". Conclusion (no DSO computation) survives; the evidence string did not. |

**Corrected citations** (all resolved to the wrong line as originally written):

| Was | Is | What is actually there |
|---|---|---|
| `registry.ts:19` | `registry.ts:18` | `\| "live"  // client implemented and activatable with credentials` |
| `registry.ts:129` | `registry.ts:138` | `status: "stub"` for qbo |
| `registry.ts:79-86` | `registry.ts:84` | only the Connexion-seat field; the "API needs a higher tier" part is vendor-side, not in the repo |
| `money.ts:3` | `money.ts:35` | `export function agingBucket(...)` — line 3 is a comment |
| `reports/page.tsx:167` | `src/app/hub/(office)/reports/page.tsx:167` | route group `(office)` was missing from both report paths |
| `telematics.ts:219` | `:211` (loop) and `:219` (INSERT) | the quoted `for` line is at 211 |
| `extract-text-client.ts:17` | `:17` (import), `:19` (unpkg worker) | |
| `hobby-cron-guard.mjs:11-17` | `:4-13` | |
| Vercel window `1784943870349→1784963672094` | `1784944701052→1784965133710` | the cited timestamps do not match any deployment in the API response |
| "2 sent at 8 days" | 6 and 9 days | `select current_date - issued_on from hub.invoices` |
| "128 KB across 21 files" (migrations in the cron bundle) | 68,499 bytes across 21 files | `du -sb migrations/hub/*.sql` |

**Confirmed, left alone** — these were right and are load-bearing:

- `llm-parser.ts:145` default model `claude-sonnet-4-20250514`; `:157` `max_tokens: 2048`; `:186` `if (!response.ok) return null`. Re-fetched the deprecations page: **Retired, deprecation 2026-04-14, retirement 2026-06-15, replacement `claude-sonnet-4-6`.** §C3 is the strongest finding in the document.
- All §C4 bundle claims: `puppeteer` `package.json:91` and `sharp` `:92` are devDependencies with zero `src/` imports; `canvas` `:97` is optional and aliased false at `next.config.mjs:19`; `outputFileTracingIncludes` at `:12-14`; live deployment reports `lambdaRuntimeStats: {"nodejs":4}`.
- All DB measurements: 12 trucks / 11 drivers / 2 carriers, `documents` all `storage='local'` (6 rows), 12 MB database, 543 pings / 180,224 bytes = 331.9 B/row across 10 trucks 2026-04-29→2026-07-25, 29 loads / 1,446 deadhead / 18,932 loaded.
- §C2 cron inventory: 17 jobs, 15 daily + 1 weekly + 1 monthly, ~455 invocations/mo. `MAX_CRON_JOBS_PER_PROJECT = 100` at `hobby-cron-guard.mjs:21` matches the live Vercel limits table.
- §C6: `connections:check` re-run — 8 live, 2 stub, `creds:0` and `never synced` on all 10. Added the check the original missed: no production path falls through to `integrations/mock.ts` (`telematics.ts:184-190` returns `null` without credentials).
- §C7 money-is-cents: the floats at `kpi.ts:61-66` and `money.ts:60` are percentages and a cents-per-mile rate; `fscTotalCents` rounds through `roundHalfAwayFromZero`. No float-in-money bug.
- §C8 Google Fonts: correctly framed as an environment/third-party risk, not a code defect. Left as-is.

**Not double-counted:** `docs/ops/UNIT_ECONOMICS.md` claims none of the insurance / factoring-rate / load-board savings in §E. It does independently reach the same conclusion about seeded deadhead (`UNIT_ECONOMICS.md:33`, `:80`), which is what falsified §D here.

**Still unverifiable in this session:** every vendor list price in §B is a published rate, not Ranvir's contract; the Vercel usage counter; the Postgres provider. No GitHub API access, so no PR can be opened, listed, or referenced by number.
